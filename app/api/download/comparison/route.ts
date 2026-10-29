import { NextResponse } from 'next/server';
import { getResearchSession } from '@/lib/auth/session';
import { getAdminUser } from '@/lib/auth/admin';
import { getServiceRoleSupabaseClient } from '@/lib/supabase/service-role';
import { comparisonDownloadRequestSchema } from '@/lib/validation/schemas';
import { generateCombinedComparisonPdf } from '@/lib/pdf/combine';
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
    const parsed = comparisonDownloadRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid comparison request' },
        { status: 400 }
      );
    }

    const { drugId1, drugId2 } = parsed.data;
    if (drugId1 === drugId2) {
      return NextResponse.json(
        { error: 'Please select two different drugs for comparison' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleSupabaseClient();
    const { data: drugs, error: dbError } = await supabase
      .from('drugs')
      .select('id, name, slug, pdf_storage_path, pdf_status')
      .in('id', [drugId1, drugId2]);

    if (dbError || !drugs || drugs.length < 2) {
      return NextResponse.json(
        { error: 'One or both requested comparison drugs were not found' },
        { status: 404 }
      );
    }

    const drugList = (drugs || []) as any[];
    const drug1 = drugList.find((d) => d.id === drugId1)!;
    const drug2 = drugList.find((d) => d.id === drugId2)!;

    if (!drug1.pdf_storage_path || !drug2.pdf_storage_path) {
      return NextResponse.json(
        { error: 'PDF storage path missing for one or both comparison documents' },
        { status: 404 }
      );
    }

    // Download both PDFs
    const [file1Res, file2Res] = await Promise.all([
      supabase.storage.from(BUCKET_NAME).download(drug1.pdf_storage_path),
      supabase.storage.from(BUCKET_NAME).download(drug2.pdf_storage_path),
    ]);

    if (file1Res.error || !file1Res.data || file2Res.error || !file2Res.data) {
      return NextResponse.json(
        { error: 'Failed to retrieve one or both PDF files from storage' },
        { status: 500 }
      );
    }

    const [buffer1, buffer2] = await Promise.all([
      file1Res.data.arrayBuffer(),
      file2Res.data.arrayBuffer(),
    ]);

    // Generate combined PDF
    const combinedBytes = await generateCombinedComparisonPdf({
      drug1Name: drug1.name,
      drug2Name: drug2.name,
      pdf1Buffer: Buffer.from(buffer1),
      pdf2Buffer: Buffer.from(buffer2),
    });

    // Track comparison PDF download event
    await logActivityEvent({
      action: 'comparison_pdf_downloaded',
      drugId: drug1.id,
      relatedDrugIds: [drug1.id, drug2.id],
      details: {
        drug1: drug1.name,
        drug2: drug2.name,
        downloadType: 'combined_comparison_pdf',
        sizeBytes: combinedBytes.length,
      },
    });

    const filename = `comparison_${drug1.slug}_vs_${drug2.slug}.pdf`;

    return new Response(combinedBytes as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': combinedBytes.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Comparison PDF generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate comparison PDF' },
      { status: 500 }
    );
  }
}
