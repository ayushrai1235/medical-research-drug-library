import { NextResponse } from 'next/server';
import { getServiceRoleSupabaseClient } from '@/lib/supabase/service-role';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getServiceRoleSupabaseClient();

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    let query = supabase
      .from('drugs')
      .select('id, category_id, name, slug, description, pdf_storage_path, pdf_status, is_active, sort_order, categories(id, name, slug)');

    if (isUuid) {
      query = query.eq('id', id);
    } else {
      query = query.eq('slug', id);
    }

    const { data: drug, error } = await query.single();

    if (error || !drug) {
      return NextResponse.json({ error: 'Drug document not found' }, { status: 404 });
    }

    return NextResponse.json({ drug });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch drug' }, { status: 500 });
  }
}
