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

    const supabase = getServiceRoleSupabaseClient();

    // 3. Batch request support (parallel processing for comparison)
    if ('drugIds' in parsed.data) {
      const { drugIds } = parsed.data;
      const { data: drugs, error: dbError } = await supabase
        .from('drugs')
        .select('id, name, slug, pdf_storage_path, pdf_status, updated_at, is_active')
        .in('id', drugIds);

      if (dbError || !drugs) {
        return NextResponse.json({ error: 'Failed to look up drug records' }, { status: 500 });
      }

      const urls: Record<
        string,
        { signedUrl: string; drugName: string; slug: string; updatedAt: string }
      > = {};

      await Promise.all(
        drugs.map(async (drug: any) => {
          if (drug.pdf_storage_path && drug.pdf_status === 'uploaded') {
            const { data: signedData } = await supabase.storage
              .from(BUCKET_NAME)
              .createSignedUrl(drug.pdf_storage_path, 600);
            if (signedData?.signedUrl) {
              urls[drug.id] = {
                signedUrl: signedData.signedUrl,
                drugName: drug.name,
                slug: drug.slug,
                updatedAt: drug.updated_at,
              };
            }
          }
        })
      );

      return NextResponse.json(
        {
          success: true,
          urls,
          count: Object.keys(urls).length,
        },
        {
          headers: {
            'Cache-Control': 'private, no-cache',
          },
        }
      );
    }

    // 4. Single drug request
    const { drugId } = parsed.data;
    const { data: drug, error: dbError } = await supabase
      .from('drugs')
      .select('id, name, slug, pdf_storage_path, pdf_status, updated_at, is_active')
      .eq('id', drugId)
      .single();

    if (dbError || !drug) {
      return NextResponse.json({ error: 'Drug record not found' }, { status: 404 });
    }

    const drugData = drug as any;
    if (!drugData.pdf_storage_path || drugData.pdf_status !== 'uploaded') {
      return NextResponse.json(
        { error: `PDF document for ${drugData.name} is currently unavailable (${drugData.pdf_status})` },
        { status: 404 }
      );
    }

    // Generate short-lived signed URL (10 minutes)
    const { data: signedData, error: signError } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(drugData.pdf_storage_path, 600);

    if (signError || !signedData?.signedUrl) {
      return NextResponse.json(
        { error: `Failed to generate secure URL: ${signError?.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        signedUrl: signedData.signedUrl,
        drugName: drugData.name,
        slug: drugData.slug,
        storagePath: drugData.pdf_storage_path,
        updatedAt: drugData.updated_at,
        expiresInSeconds: 600,
      },
      {
        headers: {
          'Cache-Control': 'private, no-cache',
        },
      }
    );
  } catch (error: any) {
    console.error('Signed URL generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error generating document link' },
      { status: 500 }
    );
  }
}

