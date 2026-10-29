import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/auth/admin';
import { getServiceRoleSupabaseClient } from '@/lib/supabase/service-role';

export async function GET() {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required' }, { status: 403 });
    }

    const supabase = getServiceRoleSupabaseClient();

    // 1. Total categories and drugs
    const [categoriesRes, drugsRes, sessionsRes] = await Promise.all([
      supabase.from('categories').select('id', { count: 'exact', head: true }),
      supabase.from('drugs').select('id', { count: 'exact', head: true }),
      supabase.from('research_sessions').select('id', { count: 'exact', head: true }),
    ]);

    const totalCategories = categoriesRes.count || 0;
    const totalDrugs = drugsRes.count || 0;
    const totalResearchSessions = sessionsRes.count || 0;

    // 2. Counts of distinct events
    const [viewsRes, indDownloadsRes, zipDownloadsRes, compDownloadsRes, totalEventsRes] = await Promise.all([
      supabase.from('activity_events').select('id', { count: 'exact', head: true }).eq('action', 'pdf_viewed'),
      supabase.from('activity_events').select('id', { count: 'exact', head: true }).eq('action', 'pdf_downloaded'),
      supabase.from('activity_events').select('id', { count: 'exact', head: true }).eq('action', 'zip_downloaded'),
      supabase.from('activity_events').select('id', { count: 'exact', head: true }).eq('action', 'comparison_pdf_downloaded'),
      supabase.from('activity_events').select('id', { count: 'exact', head: true }),
    ]);

    // 3. Most viewed & downloaded drugs
    const { data: drugActivity } = await supabase
      .from('activity_events')
      .select('action, drug_id, drugs(id, name, slug, categories(name))')
      .in('action', ['pdf_viewed', 'pdf_downloaded'])
      .not('drug_id', 'is', null);

    const drugStatsMap = new Map<string, { id: string; name: string; category: string; views: number; downloads: number }>();

    for (const item of (drugActivity || []) as any[]) {
      if (!item.drugs) continue;
      const d = item.drugs as any;
      if (!drugStatsMap.has(d.id)) {
        drugStatsMap.set(d.id, {
          id: d.id,
          name: d.name,
          category: d.categories?.name || 'General',
          views: 0,
          downloads: 0,
        });
      }
      const entry = drugStatsMap.get(d.id)!;
      if (item.action === 'pdf_viewed') entry.views++;
      if (item.action === 'pdf_downloaded') entry.downloads++;
    }

    const popularDrugs = Array.from(drugStatsMap.values())
      .sort((a, b) => b.views + b.downloads - (a.views + a.downloads))
      .slice(0, 5);

    // 4. Recent activity events (last 10)
    const { data: recentEvents } = await supabase
      .from('activity_events')
      .select('id, user_id, display_name_snapshot, action, created_at, drug_id, details, drugs(name, categories(name))')
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      metrics: {
        totalCategories,
        totalDrugs,
        totalResearchSessions,
        totalEvents: totalEventsRes.count || 0,
        pdfViews: viewsRes.count || 0,
        individualDownloads: indDownloadsRes.count || 0,
        zipDownloads: zipDownloadsRes.count || 0,
        comparisonDownloads: compDownloadsRes.count || 0,
      },
      popularDrugs,
      recentEvents: recentEvents || [],
    });
  } catch (error: any) {
    console.error('Admin metrics error:', error);
    return NextResponse.json({ error: error.message || 'Metrics error' }, { status: 500 });
  }
}
