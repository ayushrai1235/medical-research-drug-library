import { NextResponse } from 'next/server';
import { getResearchSession } from '@/lib/auth/session';
import { getAdminUser } from '@/lib/auth/admin';
import { getServiceRoleSupabaseClient } from '@/lib/supabase/service-role';
import { signedUrlRequestSchema } from '@/lib/validation/schemas';

const BUCKET_NAME = 'research-pdfs';

export async function POST(request: Request) {
  try {
    // 1. Authorize user (must have active research session or admin auth)
    const [researchSession, adminAuth] = await Promise.all([
      getResearchSession(),
      getAdminUser(),
    ]);

    if (!researchSession && !adminAuth) {
      return NextResponse.json(
        { error: 'Unauthorized: active research session or admin login required' },
        { status: 401 }
      );
    }

    // 2. Validate input
    const body = await request.json();
    const parsed = signedUrlRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid drug ID' },
        { status: 400 }
      );
    }

    const { drugId } = parsed.data;
    const supabase = getServiceRoleSupabaseClient();

    // 3. Look up drug record
    const { data: drug, error: dbError } = await supabase
      .from('drugs')
      .select('id, name, slug, pdf_storage_path, pdf_status, is_active')
      .eq('id', drugId)
      .single();

    if (dbError || !drug) {
      return NextResponse.json({ error: 'Drug record not found' }, { status: 404 });
    }

    if (!drug.pdf_storage_path || drug.pdf_status !== 'uploaded') {
      return NextResponse.json(
        { error: `PDF document for ${drug.name} is currently unavailable (${drug.pdf_status})` },
        { status: 404 }
      );
    }

    // 4. Generate short-lived signed URL (5 minutes)
    const { data: signedData, error: signError } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(drug.pdf_storage_path, 300);

    if (signError || !signedData?.signedUrl) {
      return NextResponse.json(
        { error: `Failed to generate secure URL: ${signError?.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      signedUrl: signedData.signedUrl,
      drugName: drug.name,
      slug: drug.slug,
      storagePath: drug.pdf_storage_path,
      expiresInSeconds: 300,
    });
  } catch (error: any) {
    console.error('Signed URL generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error generating document link' },
      { status: 500 }
    );
  }
}

