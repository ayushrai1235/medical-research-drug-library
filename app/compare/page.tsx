import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getResearchSession } from '@/lib/auth/session';
import { getAdminUser } from '@/lib/auth/admin';
import { getServiceRoleSupabaseClient } from '@/lib/supabase/service-role';
import { Header } from '@/components/library/Header';
import { ComparisonView, ComparisonDrug } from '@/components/comparison/ComparisonView';
import { ArrowLeft, ArrowLeftRight } from 'lucide-react';

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const [researchSession, adminAuth] = await Promise.all([
    getResearchSession(),
    getAdminUser(),
  ]);

  if (!researchSession && !adminAuth) {
    redirect('/research-entry');
  }

  const { ids } = await searchParams;
  const initialIds = (ids || '').split(',').map((s) => s.trim()).filter(Boolean);

  const supabase = getServiceRoleSupabaseClient();

  // Fetch all active drugs for comparison dropdown selection
  const { data: allDrugs, error } = await supabase
    .from('drugs')
    .select('id, name, slug, categories(name)')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error || !allDrugs || allDrugs.length === 0) {
    redirect('/library');
  }

  const mappedDrugs: ComparisonDrug[] = allDrugs.map((d: any) => ({
    id: d.id,
    name: d.name,
    slug: d.slug,
    categoryName: d.categories?.name,
  }));

  const initialDrug1Id = initialIds[0] || mappedDrugs[0]?.id;
  const initialDrug2Id = initialIds[1] || (mappedDrugs.length > 1 ? mappedDrugs[1]?.id : mappedDrugs[0]?.id);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header
        researchSession={researchSession}
        adminUser={adminAuth ? { id: adminAuth.user.id, email: adminAuth.user.email ?? null, displayName: adminAuth.profile.displayName } : null}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col space-y-4">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Link href="/library" className="hover:text-blue-700 flex items-center gap-1 transition">
            <ArrowLeft className="w-3.5 h-3.5" />
            Library
          </Link>
          <span>/</span>
          <span className="text-blue-900 font-bold flex items-center gap-1">
            <ArrowLeftRight className="w-3.5 h-3.5" />
            Comparison Analysis
          </span>
        </div>

        {/* Side-by-Side Comparison Container */}
        <ComparisonView
          drugs={mappedDrugs}
          initialDrug1Id={initialDrug1Id}
          initialDrug2Id={initialDrug2Id}
        />
      </main>
    </div>
  );
}
