import { requireAdmin } from '@/lib/auth/admin';
import { getServiceRoleSupabaseClient } from '@/lib/supabase/service-role';
import { Header } from '@/components/library/Header';
import Link from 'next/link';
import {
  Users,
  FileText,
  Eye,
  Download,
  FileArchive,
  Layers,
  ArrowRight,
  TrendingUp,
  Clock,
  Shield,
  FileSpreadsheet,
} from 'lucide-react';

export default async function AdminDashboardPage() {
  const adminAuth = await requireAdmin();
  const supabase = getServiceRoleSupabaseClient();

  // 1. Database real metrics
  const [categoriesRes, drugsRes, sessionsRes, viewsRes, indDownRes, zipDownRes, compDownRes, totalEventsRes] =
    await Promise.all([
      supabase.from('categories').select('id', { count: 'exact', head: true }),
      supabase.from('drugs').select('id', { count: 'exact', head: true }),
      supabase.from('research_sessions').select('id', { count: 'exact', head: true }),
      supabase.from('activity_events').select('id', { count: 'exact', head: true }).eq('action', 'pdf_viewed'),
      supabase.from('activity_events').select('id', { count: 'exact', head: true }).eq('action', 'pdf_downloaded'),
      supabase.from('activity_events').select('id', { count: 'exact', head: true }).eq('action', 'zip_downloaded'),
      supabase.from('activity_events').select('id', { count: 'exact', head: true }).eq('action', 'comparison_pdf_downloaded'),
      supabase.from('activity_events').select('id', { count: 'exact', head: true }),
    ]);

  // 2. Recent activity events (last 8)
  const { data: recentEvents } = await supabase
    .from('activity_events')
    .select('id, user_id, display_name_snapshot, action, created_at, drug_id, details, drugs(name, categories(name))')
    .order('created_at', { ascending: false })
    .limit(8);

  // 3. Most popular drugs by view + download
  const { data: popularActivity } = await supabase
    .from('activity_events')
    .select('action, drug_id, drugs(id, name, slug, categories(name))')
    .in('action', ['pdf_viewed', 'pdf_downloaded'])
    .not('drug_id', 'is', null);

  const drugStatsMap = new Map<string, { id: string; name: string; category: string; views: number; downloads: number }>();
  for (const item of (popularActivity || []) as any[]) {
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
    const stat = drugStatsMap.get(d.id)!;
    if (item.action === 'pdf_viewed') stat.views++;
    if (item.action === 'pdf_downloaded') stat.downloads++;
  }

  const topDrugs = Array.from(drugStatsMap.values())
    .sort((a, b) => b.views + b.downloads - (a.views + a.downloads))
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header
        adminUser={{
          id: adminAuth.user.id,
          email: adminAuth.user.email ?? null,
          displayName: adminAuth.profile.displayName,
        }}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Title & Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-800 uppercase tracking-wider mb-1">
              <Shield className="w-3.5 h-3.5" />
              Verified Administrator Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Executive Analytics Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Real-time platform metrics, researcher document engagements, and download statistics.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/admin/activity"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 active:scale-[0.98] border border-slate-300 rounded-lg shadow-2xs transition-all duration-75 touch-manipulation cursor-pointer"
            >
              Activity Explorer
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <a
              href="/api/admin/export"
              download
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 active:bg-teal-900 active:scale-[0.98] rounded-lg shadow-sm transition-all duration-75 touch-manipulation cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export Excel Report
            </a>
          </div>
        </div>

        {/* Real Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Research Sessions */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Research Sessions</span>
              <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">{sessionsRes.count || 0}</span>
              <p className="text-[11px] text-slate-400 mt-1">Unique researcher entries</p>
            </div>
          </div>

          {/* PDF Views */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">PDF Views</span>
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
                <Eye className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">{viewsRes.count || 0}</span>
              <p className="text-[11px] text-slate-400 mt-1">In-app document opens</p>
            </div>
          </div>

          {/* Total Downloads */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Direct Downloads</span>
              <div className="p-2 rounded-lg bg-teal-50 text-teal-700">
                <Download className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">{indDownRes.count || 0}</span>
              <p className="text-[11px] text-slate-400 mt-1">Individual PDF saves</p>
            </div>
          </div>

          {/* Comparison / ZIP Downloads */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Archives & Pairs</span>
              <div className="p-2 rounded-lg bg-purple-50 text-purple-700">
                <FileArchive className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">
                {(zipDownRes.count || 0) + (compDownRes.count || 0)}
              </span>
              <p className="text-[11px] text-slate-400 mt-1">
                {zipDownRes.count || 0} ZIPs • {compDownRes.count || 0} Combined PDFs
              </p>
            </div>
          </div>
        </div>

        {/* Secondary Stat Badges */}
        <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-slate-400">Total Activity Events:</span>{' '}
              <strong className="text-white font-bold">{totalEventsRes.count || 0}</strong>
            </div>
            <div>
              <span className="text-slate-400">Categories Seeded:</span>{' '}
              <strong className="text-white font-bold">{categoriesRes.count || 0} of 7</strong>
            </div>
            <div>
              <span className="text-slate-400">Drug Documents:</span>{' '}
              <strong className="text-white font-bold">{drugsRes.count || 0} of 19</strong>
            </div>
          </div>
          <span className="text-emerald-400 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            Live Supabase Telemetry
          </span>
        </div>

        {/* Two-Column Layout: Popular Drugs & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Most Engaged Drugs */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Top Engaged Drug Documents
            </h2>
            {topDrugs.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">
                No view or download activity recorded yet.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {topDrugs.map((drug) => (
                  <div key={drug.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-900">{drug.name}</p>
                      <p className="text-[11px] text-slate-400">{drug.category}</p>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <span className="text-slate-600">
                        <strong>{drug.views}</strong> views
                      </span>
                      <span className="text-slate-600">
                        <strong>{drug.downloads}</strong> downloads
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity Log */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Recent Platform Events
              </h2>
              <Link href="/admin/activity" className="text-xs font-semibold text-blue-700 hover:text-blue-800">
                View All
              </Link>
            </div>

            {(!recentEvents || recentEvents.length === 0) ? (
              <p className="text-xs text-slate-400 py-8 text-center">
                No recent activity events.
              </p>
            ) : (
              <div className="space-y-3">
                {recentEvents.map((ev: any) => (
                  <div key={ev.id} className="flex items-center justify-between text-xs p-2 rounded-lg hover:bg-slate-50 transition">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900">
                        {ev.display_name_snapshot}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {ev.action.replace(/_/g, ' ')}
                        {ev.drugs?.name ? ` • ${ev.drugs.name}` : ''}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
