import { requireAdmin } from '@/lib/auth/admin';
import { getServiceRoleSupabaseClient } from '@/lib/supabase/service-role';
import { Header } from '@/components/library/Header';
import { ActivityExplorer } from '@/components/admin/ActivityExplorer';
import { Layers } from 'lucide-react';

export default async function AdminActivityPage() {
  const adminAuth = await requireAdmin();
  const supabase = getServiceRoleSupabaseClient();

  const { data: drugs } = await supabase
    .from('drugs')
    .select('id, name, slug, categories(name)')
    .order('name');

  const drugsList = (drugs || []).map((d: any) => ({
    id: d.id,
    name: d.name,
    categoryName: d.categories?.name,
  }));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header
        adminUser={{
          id: adminAuth.user.id,
          email: adminAuth.user.email ?? null,
          displayName: adminAuth.profile.displayName,
        }}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-800 uppercase tracking-wider mb-1">
            <Layers className="w-3.5 h-3.5" />
            Audit & Engagement Log
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Activity Explorer
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Search, filter, and audit all document views, comparisons, and file downloads with live Excel export.
          </p>
        </div>

        <ActivityExplorer drugsList={drugsList} />
      </main>
    </div>
  );
}
