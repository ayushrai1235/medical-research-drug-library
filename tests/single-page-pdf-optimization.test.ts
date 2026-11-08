import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCachedPdfBuffer,
  setCachedPdfBuffer,
  invalidateCachedPdf,
  fetchPdfBuffer,
  fetchParallelComparisonPdfs,
} from '../lib/pdf/client-pdf';
import { clampZoom } from '../lib/pdf/zoom-utils';
import { signedUrlRequestSchema } from '../lib/validation/schemas';

describe('Single-Page PDF Performance Optimization', () => {
  beforeEach(async () => {
    // Clear any test cached entries
    await invalidateCachedPdf('test-drug-1');
    await invalidateCachedPdf('test-drug-2');
  });

  describe('Client Binary In-Memory Cache', () => {
    it('stores and retrieves binary buffer with 0ms memory hit', async () => {
      const dummyBuffer = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55]).buffer; // %PDF-1.7
      await setCachedPdfBuffer('test-drug-1', dummyBuffer, '2026-11-08T00:00:00Z');

      const retrieved = await getCachedPdfBuffer('test-drug-1', '2026-11-08T00:00:00Z');
      expect(retrieved).not.toBeNull();
      expect(new Uint8Array(retrieved!)[0]).toBe(37); // '%'
    });

    it('invalidates cache when server updatedAt timestamp changes', async () => {
      const dummyBuffer = new Uint8Array([1, 2, 3]).buffer;
      await setCachedPdfBuffer('test-drug-1', dummyBuffer, '2026-11-08T00:00:00Z');

      // Request with newer server timestamp
      const staleCheck = await getCachedPdfBuffer('test-drug-1', '2026-11-08T12:00:00Z');
      expect(staleCheck).toBeNull();
    });

    it('manually invalidates cache when document is updated', async () => {
      const dummyBuffer = new Uint8Array([1, 2, 3]).buffer;
      await setCachedPdfBuffer('test-drug-1', dummyBuffer);

      await invalidateCachedPdf('test-drug-1');
      const retrieved = await getCachedPdfBuffer('test-drug-1');
      expect(retrieved).toBeNull();
    });
  });

  describe('Concurrent Parallel Comparison Loading', () => {
    it('returns immediately from cache when documents are pre-cached', async () => {
      const buf1 = new Uint8Array([10, 20]).buffer;
      const buf2 = new Uint8Array([30, 40]).buffer;
      await setCachedPdfBuffer('test-drug-1', buf1);
      await setCachedPdfBuffer('test-drug-2', buf2);

      const result = await fetchParallelComparisonPdfs('test-drug-1', 'test-drug-2');
      expect(result.fromCache1).toBe(true);
      expect(result.fromCache2).toBe(true);
      expect(new Uint8Array(result.buffer1)[0]).toBe(10);
      expect(new Uint8Array(result.buffer2)[0]).toBe(30);
    });
  });

  describe('Zoom Bounds and Clamp Rules', () => {
    it('clamps zoom strictly within 40% (0.4) and 300% (3.0)', () => {
      expect(clampZoom(0.2)).toBe(0.4);
      expect(clampZoom(0.39)).toBe(0.4);
      expect(clampZoom(0.6)).toBe(0.6);
      expect(clampZoom(1.25)).toBe(1.25);
      expect(clampZoom(3.0)).toBe(3.0);
      expect(clampZoom(3.5)).toBe(3.0);
      expect(clampZoom(5.0)).toBe(3.0);
    });

    it('rounds scale values to 2 decimal places to avoid floating point drift', () => {
      expect(clampZoom(0.8000000000000002)).toBe(0.8);
      expect(clampZoom(0.9500000000000001)).toBe(0.95);
    });
  });

  describe('Batch and Single Signed URL Schemas', () => {
    it('validates single drug UUID requests', () => {
      const single = signedUrlRequestSchema.safeParse({
        drugId: 'a25501fb-9457-41a7-8a48-5c4d32e6a4b1',
      });
      expect(single.success).toBe(true);
    });

    it('validates batch drug UUID requests for comparison', () => {
      const batch = signedUrlRequestSchema.safeParse({
        drugIds: [
          'a25501fb-9457-41a7-8a48-5c4d32e6a4b1',
          'b25501fb-9457-41a7-8a48-5c4d32e6a4b2',
        ],
      });
      expect(batch.success).toBe(true);
    });

    it('rejects empty drugIds array', () => {
      const emptyBatch = signedUrlRequestSchema.safeParse({
        drugIds: [],
      });
      expect(emptyBatch.success).toBe(false);
    });
  });
});
