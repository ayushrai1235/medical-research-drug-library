import { NextResponse } from 'next/server';
import { zipSync } from 'fflate';
import { getResearchSession } from '@/lib/auth/session';
import { getAdminUser } from '@/lib/auth/admin';
import { getServiceRoleSupabaseClient } from '@/lib/supabase/service-role';
import { zipDownloadRequestSchema } from '@/lib/validation/schemas';
import { logActivityEvent } from '@/lib/activity/tracker';

const BUCKET_NAME = 'research-pdfs';

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

    const zipFiles: Record<string, Uint8Array> = {};
    const includedDrugNames: string[] = [];
    const successfulDrugIds: string[] = [];
    let totalBytes = 0;

    for (const drug of (drugs || []) as any[]) {
      if (!drug.pdf_storage_path || drug.pdf_status !== 'uploaded') {
        continue;
      }

      const { data: fileData, error: downloadError } = await supabase.storage
        .from(BUCKET_NAME)
        .download(drug.pdf_storage_path);

      if (downloadError || !fileData) {
        console.error(`Failed to download ${drug.name} from storage:`, downloadError);
        continue;
      }

      const buffer = await fileData.arrayBuffer();
      const uint8 = new Uint8Array(buffer);
      totalBytes += uint8.length;

      const safeFilename = `${drug.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
      zipFiles[safeFilename] = uint8;
      includedDrugNames.push(drug.name);
      successfulDrugIds.push(drug.id);
    }

    if (Object.keys(zipFiles).length === 0) {
      return NextResponse.json(
        { error: 'None of the selected drug PDFs could be retrieved from storage' },
        { status: 404 }
      );
    }

    // Generate ZIP
    const zippedBuffer = zipSync(zipFiles, { level: 6 });

    // Track ZIP download event with all included drug IDs
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
    console.error('ZIP generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate ZIP archive' },
      { status: 500 }
    );
  }
}
