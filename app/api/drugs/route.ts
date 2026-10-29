import { NextResponse } from 'next/server';
import { getServiceRoleSupabaseClient } from '@/lib/supabase/service-role';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categorySlug = searchParams.get('category');
    const query = searchParams.get('q')?.trim().toLowerCase();

    const supabase = getServiceRoleSupabaseClient();

    // Fetch categories
    let catQuery = supabase
      .from('categories')
      .select('id, name, slug, sort_order')
      .order('sort_order', { ascending: true });

    if (categorySlug) {
      catQuery = catQuery.eq('slug', categorySlug);
    }

    const { data: categories, error: catError } = await catQuery;
    if (catError) {
      return NextResponse.json({ error: catError.message }, { status: 500 });
    }

    // Fetch drugs
    let drugQuery = supabase
      .from('drugs')
      .select('id, category_id, name, slug, description, pdf_storage_path, pdf_status, is_active, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    const { data: drugs, error: drugError } = await drugQuery;
    if (drugError) {
      return NextResponse.json({ error: drugError.message }, { status: 500 });
    }

    // Filter by search query if present
    let filteredDrugs = drugs || [];
    if (query) {
      filteredDrugs = filteredDrugs.filter((d) => {
        const drugMatch = d.name.toLowerCase().includes(query);
        const cat = (categories || []).find((c) => c.id === d.category_id);
        const catMatch = cat?.name.toLowerCase().includes(query) ?? false;
        return drugMatch || catMatch;
      });
    }

    // Group drugs by category
    const categoriesWithDrugs = (categories || []).map((cat) => ({
      ...cat,
      drugs: filteredDrugs.filter((d) => d.category_id === cat.id),
    }));

    return NextResponse.json({
      categories: categoriesWithDrugs,
      totalDrugs: filteredDrugs.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch drugs' }, { status: 500 });
  }
}

