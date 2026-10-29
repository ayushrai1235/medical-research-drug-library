import { NextResponse } from 'next/server';
import { getResearchSession } from '@/lib/auth/session';
import { getAdminUser } from '@/lib/auth/admin';
import { getServiceRoleSupabaseClient } from '@/lib/supabase/service-role';
import { logActivityEvent } from '@/lib/activity/tracker';

const BUCKET_NAME = 'research-pdfs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const drugId = searchParams.get('drugId');

    if (!drugId) {
      return NextResponse.json({ error: 'Missing drugId parameter' }, { status: 400 });
    }

    const [researchSession, adminAuth] = await Promise.all([
      getResearchSession(),
      getAdminUser(),
    ]);

    if (!researchSession && !adminAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceRoleSupabaseClient();
    const { data: drug, error: dbError } = await supabase
      .from('drugs')
      .select('id, name, slug, pdf_storage_path, pdf_status')
      .eq('id', drugId)
      .single();

    const drugData = drug as any;
    if (dbError || !drugData || !drugData.pdf_storage_path) {
      return NextResponse.json({ error: 'Drug PDF not found' }, { status: 404 });
    }

    // Download from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(BUCKET_NAME)
      .download(drugData.pdf_storage_path);

    if (downloadError || !fileData) {
      return NextResponse.json(
        { error: `Failed to download file from storage: ${downloadError?.message}` },
        { status: 500 }
      );
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Track download event
    await logActivityEvent({
      action: 'pdf_downloaded',
      drugId: drugData.id,
      details: {
        drugName: drugData.name,
        downloadType: 'individual_pdf',
        fileSizeBytes: buffer.length,
      },
    });

    const safeFilename = `${drugData.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeFilename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Download individual PDF error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to download PDF' },
      { status: 500 }
    );
  }
}
