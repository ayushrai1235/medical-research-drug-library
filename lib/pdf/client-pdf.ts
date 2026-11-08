/**
 * Client-side High-Performance PDF Loader, Cache, and Concurrency Manager
 * Specially optimized for single-page medical publications.
 */

interface CacheEntry {
  buffer: ArrayBuffer;
  updatedAt?: string;
  timestamp: number;
}

// In-memory cache for ultra-fast instant renders (0ms)
const memoryPdfCache = new Map<string, CacheEntry>();

// Deduplicate concurrent in-flight requests for the same drug
const inFlightFetches = new Map<string, Promise<ArrayBuffer>>();

// Singleton PDF.js library promise
let pdfjsPromise: Promise<any> | null = null;

const STORAGE_CACHE_NAME = 'medical-research-pdfs-v1';

/**
 * Returns singleton PDF.js library instance configured with the local worker
 */
export async function getSingletonPdfJs(): Promise<any> {
  if (pdfjsPromise) return pdfjsPromise;

  pdfjsPromise = (async () => {
    const pdfjsLib = await import('pdfjs-dist');
    if (typeof window !== 'undefined') {
      try {
        // Use local static worker for immediate, offline-ready loading without CDN roundtrips
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      } catch (err) {
        console.warn('Falling back to CDN worker:', err);
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
      }
    }
    return pdfjsLib;
  })();

  return pdfjsPromise;
}

/**
 * Open persistent CacheStorage if available in the browser
 */
async function openBrowserCache(): Promise<Cache | null> {
  if (typeof window === 'undefined' || typeof caches === 'undefined') return null;
  try {
    return await caches.open(STORAGE_CACHE_NAME);
  } catch {
    return null;
  }
}

/**
 * Retrieve cached PDF binary by drugId or storagePath
 */
export async function getCachedPdfBuffer(
  drugId: string,
  expectedUpdatedAt?: string
): Promise<ArrayBuffer | null> {
  // 1. Check in-memory Map first (instant 0ms retrieval)
  const mem = memoryPdfCache.get(drugId);
  if (mem) {
    if (!expectedUpdatedAt || !mem.updatedAt || mem.updatedAt === expectedUpdatedAt) {
      return mem.buffer;
    }
    // Document was updated on server, invalidate memory cache
    memoryPdfCache.delete(drugId);
  }

  // 2. Check browser CacheStorage for persistence across tab navigations
  try {
    const cache = await openBrowserCache();
    if (cache) {
      const match = await cache.match(`/cached-pdf/${drugId}`);
      if (match) {
        const storedUpdatedAt = match.headers.get('x-updated-at');
        if (!expectedUpdatedAt || !storedUpdatedAt || storedUpdatedAt === expectedUpdatedAt) {
          const buffer = await match.arrayBuffer();
          memoryPdfCache.set(drugId, {
            buffer,
            updatedAt: storedUpdatedAt || undefined,
            timestamp: Date.now(),
          });
          return buffer;
        } else {
          // Document was updated, delete stale cache entry
          await cache.delete(`/cached-pdf/${drugId}`);
        }
      }
    }
  } catch (err) {
    console.warn('CacheStorage read error:', err);
  }

  return null;
}

/**
 * Store PDF binary in memory and CacheStorage
 */
export async function setCachedPdfBuffer(
  drugId: string,
  buffer: ArrayBuffer,
  updatedAt?: string
): Promise<void> {
  memoryPdfCache.set(drugId, {
    buffer,
    updatedAt,
    timestamp: Date.now(),
  });

  try {
    const cache = await openBrowserCache();
    if (cache) {
      const headers = new Headers();
      headers.set('Content-Type', 'application/pdf');
      if (updatedAt) headers.set('x-updated-at', updatedAt);
      const res = new Response(buffer.slice(0), { headers });
      await cache.put(`/cached-pdf/${drugId}`, res);
    }
  } catch (err) {
    console.warn('CacheStorage write error:', err);
  }
}

/**
 * Clear cached PDF (for explicit invalidation on updates)
 */
export async function invalidateCachedPdf(drugId: string): Promise<void> {
  memoryPdfCache.delete(drugId);
  try {
    const cache = await openBrowserCache();
    if (cache) {
      await cache.delete(`/cached-pdf/${drugId}`);
    }
  } catch {}
}

/**
 * Fetch PDF ArrayBuffer with cache-first lookup, in-flight deduplication, and caching
 */
export async function fetchPdfBuffer(
  drugId: string,
  signedUrl?: string,
  updatedAt?: string
): Promise<ArrayBuffer> {
  // Check cache first
  const cached = await getCachedPdfBuffer(drugId, updatedAt);
  if (cached) {
    return cached;
  }

  // Check if there is an in-flight request for the exact same drug
  if (inFlightFetches.has(drugId)) {
    return inFlightFetches.get(drugId)!;
  }

  const fetchPromise = (async () => {
    try {
      let targetUrl = signedUrl;
      let freshUpdatedAt = updatedAt;

      if (!targetUrl) {
        const res = await fetch('/api/files/signed-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ drugId }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Failed to get signed URL (${res.status})`);
        }
        const data = await res.json();
        targetUrl = data.signedUrl;
        freshUpdatedAt = data.updatedAt || freshUpdatedAt;
      }

      if (!targetUrl) {
        throw new Error('No signed URL returned for document');
      }

      // Single HTTP GET request for the single-page publication
      const pdfRes = await fetch(targetUrl);
      if (!pdfRes.ok) {
        throw new Error(`Failed to download publication file (${pdfRes.status})`);
      }

      const buffer = await pdfRes.arrayBuffer();
      await setCachedPdfBuffer(drugId, buffer, freshUpdatedAt);
      return buffer;
    } finally {
      inFlightFetches.delete(drugId);
    }
  })();

  inFlightFetches.set(drugId, fetchPromise);
  return fetchPromise;
}

/**
 * Concurrently fetch both PDF documents for Side-by-Side comparison.
 * - Reuses cached documents immediately if either was previously opened.
 * - Requests missing URLs in parallel and downloads both binaries concurrently.
 * - Neither document waits for the other.
 */
export async function fetchParallelComparisonPdfs(
  drug1Id: string,
  drug2Id: string
): Promise<{
  buffer1: ArrayBuffer;
  buffer2: ArrayBuffer;
  fromCache1: boolean;
  fromCache2: boolean;
}> {
  // 1. Check existing caches simultaneously
  const [cached1, cached2] = await Promise.all([
    getCachedPdfBuffer(drug1Id),
    getCachedPdfBuffer(drug2Id),
  ]);

  const missingIds: string[] = [];
  if (!cached1) missingIds.push(drug1Id);
  if (!cached2 && drug1Id !== drug2Id) missingIds.push(drug2Id);

  let signedUrls: Record<string, { signedUrl: string; updatedAt?: string }> = {};

  if (missingIds.length > 0) {
    try {
      const res = await fetch('/api/files/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drugIds: missingIds }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.urls) {
          signedUrls = data.urls;
        }
      }
    } catch (err) {
      console.warn('Batch signed URL fetch error:', err);
    }
  }

  // 2. Concurrently fetch both buffers in parallel
  const [buffer1, buffer2] = await Promise.all([
    cached1
      ? Promise.resolve(cached1)
      : fetchPdfBuffer(drug1Id, signedUrls[drug1Id]?.signedUrl, signedUrls[drug1Id]?.updatedAt),
    cached2
      ? Promise.resolve(cached2)
      : fetchPdfBuffer(drug2Id, signedUrls[drug2Id]?.signedUrl, signedUrls[drug2Id]?.updatedAt),
  ]);

  return {
    buffer1,
    buffer2,
    fromCache1: Boolean(cached1),
    fromCache2: Boolean(cached2),
  };
}

/**
 * Concurrently streams both documents to the comparison view with individual readiness callbacks.
 * Does not wait for Drug A before starting Drug B, and immediately signals ready documents from cache.
 */
export function loadComparisonConcurrently(
  drug1Id: string,
  drug2Id: string,
  onDrug1Ready: (buffer: ArrayBuffer) => void,
  onDrug2Ready: (buffer: ArrayBuffer) => void,
  onError1: (err: any) => void,
  onError2: (err: any) => void
): () => void {
  let isCancelled = false;

  (async () => {
    // 1. Check in-memory/CacheStorage caches first
    const [c1, c2] = await Promise.all([
      getCachedPdfBuffer(drug1Id),
      getCachedPdfBuffer(drug2Id),
    ]);

    if (isCancelled) return;

    if (c1) onDrug1Ready(c1);
    if (c2) onDrug2Ready(c2);

    const missingIds: string[] = [];
    if (!c1) missingIds.push(drug1Id);
    if (!c2 && drug1Id !== drug2Id) missingIds.push(drug2Id);

    if (missingIds.length === 0) return;

    // 2. Fetch missing signed URLs in one batch request
    let signedUrls: Record<string, { signedUrl: string; updatedAt?: string }> = {};
    try {
      const res = await fetch('/api/files/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drugIds: missingIds }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.urls) signedUrls = data.urls;
      }
    } catch (err) {
      console.warn('Batch signed URL fetch error:', err);
    }

    if (isCancelled) return;

    // 3. Download missing binaries concurrently in parallel
    if (!c1) {
      fetchPdfBuffer(drug1Id, signedUrls[drug1Id]?.signedUrl, signedUrls[drug1Id]?.updatedAt)
        .then((buf) => {
          if (!isCancelled) onDrug1Ready(buf);
        })
        .catch((err) => {
          if (!isCancelled) onError1(err);
        });
    }

    if (!c2) {
      fetchPdfBuffer(drug2Id, signedUrls[drug2Id]?.signedUrl, signedUrls[drug2Id]?.updatedAt)
        .then((buf) => {
          if (!isCancelled) onDrug2Ready(buf);
        })
        .catch((err) => {
          if (!isCancelled) onError2(err);
        });
    }
  })();

  return () => {
    isCancelled = true;
  };
}

/**
 * Load a single-page PDF document and retrieve page 1 immediately
 */
export async function loadSinglePagePdf(input: {
  buffer?: ArrayBuffer;
  url?: string;
}): Promise<{
  doc: any;
  page: any;
  numPages: number;
}> {
  const pdfjsLib = await getSingletonPdfJs();
  const loadingTask = pdfjsLib.getDocument(
    input.buffer
      ? { data: input.buffer.slice(0) }
      : { url: input.url, withCredentials: false }
  );

  const doc = await loadingTask.promise;
  // All approved publications contain exactly 1 page
  const page = await doc.getPage(1);

  return { doc, page, numPages: doc.numPages };
}
