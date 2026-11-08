import { NextResponse } from 'next/server';
import { zipSync } from 'fflate';
import { getResearchSession } from '@/lib/auth/session';
import { getAdminUser } from '@/lib/auth/admin';
import { getServiceRoleSupabaseClient } from '@/lib/supabase/service-role';
import { zipDownloadRequestSchema } from '@/lib/validation/schemas';
import { logActivityEvent } from '@/lib/activity/tracker';

const BUCKET_NAME = 'research-pdfs';

/**
 * Configurable concurrency limit for parallel Supabase Storage downloads.
 * Bounded to prevent socket exhaustion and excessive peak memory while
 * keeping total archive generation duration safely within serverless timeouts.
 */
export const DEFAULT_DOWNLOAD_CONCURRENCY = 4;

/**
 * Helper to execute asynchronous tasks with bounded concurrency.
 * Guarantees at most `concurrency` promises run concurrently.
 */
async function mapConcurrent<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      results[index] = await fn(items[index], index);
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  const workers = Array.from({ length: workerCount }, () => worker());
  await Promise.all(workers);
  return results;
}

export async function POST(request: Request) {
  try {
    const [researchSession, adminAuth] = await Promise.all([
      getResearchSession(),
      getAdminUser(),
    ]);

    if (!researchSession && !adminAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = zipDownloadRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid selection for ZIP download' },
        { status: 400 }
      );
    }

    const { drugIds } = parsed.data;
    const supabase = getServiceRoleSupabaseClient();

    // Query drugs from database
    const { data: drugs, error: dbError } = await supabase
      .from('drugs')
      .select('id, name, slug, pdf_storage_path, pdf_status, is_active')
      .in('id', drugIds);

    if (dbError || !drugs || drugs.length === 0) {
      return NextResponse.json({ error: 'Selected drugs not found' }, { status: 404 });
    }

    // Verify all requested drugs were found in database
    if (drugs.length !== drugIds.length) {
      const foundIds = new Set(drugs.map((d: any) => d.id));
      const missingCount = drugIds.length - foundIds.size;
      return NextResponse.json(
        { error: `${missingCount} requested document(s) could not be located in the catalog` },
        { status: 404 }
      );
    }

    // Verify document availability before attempting downloads
    for (const drug of drugs as any[]) {
      if (!drug.pdf_storage_path || drug.pdf_status !== 'uploaded') {
        return NextResponse.json(
          { error: `Document for "${drug.name}" is currently unavailable for download` },
          { status: 502 }
        );
      }
    }

    // Execute storage downloads with bounded concurrency
    const downloadedFiles = await mapConcurrent(
      drugs as any[],
      DEFAULT_DOWNLOAD_CONCURRENCY,
      async (drug) => {
        const { data: fileData, error: downloadError } = await supabase.storage
          .from(BUCKET_NAME)
          .download(drug.pdf_storage_path);

        if (downloadError || !fileData) {
          console.error(`Failed to download ${drug.name} from storage:`, downloadError?.message);
          throw new Error(`Failed to retrieve document for "${drug.name}" from storage`);
        }

        const buffer = await fileData.arrayBuffer();
        const uint8 = new Uint8Array(buffer);
        const safeFilename = `${drug.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

        return {
          id: drug.id,
          name: drug.name,
          safeFilename,
          uint8,
        };
      }
    );

    // Build ZIP archive dictionary ensuring every requested PDF is present exactly once
    const zipFiles: Record<string, Uint8Array> = {};
    const includedDrugNames: string[] = [];
    const successfulDrugIds: string[] = [];
    let totalBytes = 0;

    for (const item of downloadedFiles) {
      zipFiles[item.safeFilename] = item.uint8;
      includedDrugNames.push(item.name);
      successfulDrugIds.push(item.id);
      totalBytes += item.uint8.length;
    }

    if (Object.keys(zipFiles).length === 0) {
      return NextResponse.json(
        { error: 'None of the selected drug PDFs could be retrieved from storage' },
        { status: 404 }
      );
    }

    // Generate ZIP archive in memory
    const zippedBuffer = zipSync(zipFiles, { level: 6 });

    // Track ZIP download event with all included drug IDs after successful archive generation
    await logActivityEvent({
      action: 'zip_downloaded',
      relatedDrugIds: successfulDrugIds,
      details: {
        drugCount: successfulDrugIds.length,
        drugNames: includedDrugNames,
        totalBytes,
        downloadType: 'zip_archive',
      },
    });

    const dateStr = new Date().toISOString().split('T')[0];
    const zipFilename = `medical_research_pdfs_${dateStr}.zip`;

    return new Response(zippedBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFilename}"`,
        'Content-Length': zippedBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('ZIP generation error:', error?.message);
    return NextResponse.json(
      { error: error.message || 'Failed to generate ZIP archive' },
      { status: 500 }
    );
  }
}
