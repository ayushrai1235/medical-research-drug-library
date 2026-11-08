import { NextResponse } from 'next/server';
import { getServiceRoleSupabaseClient } from '@/lib/supabase/service-role';

/**
 * Conservative shared cache policy for public, non-personal catalog metadata:
 * - Browser cache: 60 seconds (max-age=60)
 * - Vercel / Shared Edge CDN cache: 300 seconds (s-maxage=300)
 * - Stale-while-revalidate: 600 seconds (background revalidation)
 */
const CATALOG_CACHE_CONTROL = 'public, max-age=60, s-maxage=300, stale-while-revalidate=600';
const NO_STORE_CACHE_CONTROL = 'no-store, no-cache, must-revalidate';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categorySlug = searchParams.get('category');
    const query = searchParams.get('q')?.trim().toLowerCase();

    const supabase = getServiceRoleSupabaseClient();

    // Prepare category query
    let catQuery = supabase
      .from('categories')
      .select('id, name, slug, sort_order')
      .order('sort_order', { ascending: true });

    if (categorySlug) {
      catQuery = catQuery.eq('slug', categorySlug);
    }

    // Prepare drugs query
    const drugQuery = supabase
      .from('drugs')
      .select('id, category_id, name, slug, description, pdf_storage_path, pdf_status, is_active, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    // Fetch categories and drugs concurrently
    const [
      { data: categories, error: catError },
      { data: drugs, error: drugError },
    ] = await Promise.all([catQuery, drugQuery]);

    if (catError) {
      return NextResponse.json(
        { error: catError.message },
        { status: 500, headers: { 'Cache-Control': NO_STORE_CACHE_CONTROL } }
      );
    }

    if (drugError) {
      return NextResponse.json(
        { error: drugError.message },
        { status: 500, headers: { 'Cache-Control': NO_STORE_CACHE_CONTROL } }
      );
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

    return NextResponse.json(
      {
        categories: categoriesWithDrugs,
        totalDrugs: filteredDrugs.length,
      },
      {
        headers: {
          'Cache-Control': CATALOG_CACHE_CONTROL,
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch drugs' },
      { status: 500, headers: { 'Cache-Control': NO_STORE_CACHE_CONTROL } }
    );
  }
}

