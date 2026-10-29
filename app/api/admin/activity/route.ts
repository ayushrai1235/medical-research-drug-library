import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/auth/admin';
import { getServiceRoleSupabaseClient } from '@/lib/supabase/service-role';
import { adminActivityFilterSchema } from '@/lib/validation/schemas';

export async function GET(request: Request) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = adminActivityFilterSchema.safeParse({
      page: searchParams.get('page') || 1,
      pageSize: searchParams.get('pageSize') || 20,
      search: searchParams.get('search') || undefined,
      action: searchParams.get('action') || undefined,
      drugId: searchParams.get('drugId') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      downloadType: searchParams.get('downloadType') || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid filter parameters' }, { status: 400 });
    }

    const { page, pageSize, search, action, drugId, startDate, endDate, downloadType } = parsed.data;
    const supabase = getServiceRoleSupabaseClient();

    let query = supabase
      .from('activity_events')
      .select('id, user_id, display_name_snapshot, session_id, action, drug_id, related_drug_ids, details, created_at, drugs(id, name, slug, categories(id, name, slug))', {
        count: 'exact',
      })
      .order('created_at', { ascending: false });

    if (action) {
      query = query.eq('action', action);
    }

    if (drugId) {
      query = query.or(`drug_id.eq.${drugId},related_drug_ids.cs.{${drugId}}`);
    }

    if (startDate) {
      query = query.gte('created_at', new Date(startDate).toISOString());
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query = query.lte('created_at', end.toISOString());
    }

    if (search) {
      query = query.ilike('display_name_snapshot', `%${search}%`);
    }

    if (downloadType) {
      query = query.filter('details->>downloadType', 'eq', downloadType);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data: events, count, error } = await query.range(from, to);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      events: events || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    });
  } catch (error: any) {
    console.error('Admin activity error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

