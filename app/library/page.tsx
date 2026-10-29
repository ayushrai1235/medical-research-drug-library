import { redirect } from 'next/navigation';
import { getResearchSession } from '@/lib/auth/session';
import { getAdminUser } from '@/lib/auth/admin';
import { getServiceRoleSupabaseClient } from '@/lib/supabase/service-role';
import { Header } from '@/components/library/Header';
import { DrugList, CategoryData } from '@/components/library/DrugList';
import { BookOpen } from 'lucide-react';

export default async function LibraryPage() {
  const [researchSession, adminAuth] = await Promise.all([
    getResearchSession(),
    getAdminUser(),
  ]);

  if (!researchSession && !adminAuth) {
    redirect('/research-entry');
  }

  const supabase = getServiceRoleSupabaseClient();

  // Fetch approved 7 categories in order
  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select('id, name, slug, sort_order')
    .order('sort_order', { ascending: true });

  // Fetch approved drugs
  const { data: drugs, error: drugError } = await supabase
    .from('drugs')
    .select('id, category_id, name, slug, description, pdf_storage_path, pdf_status, is_active, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (catError || drugError) {
    throw new Error('Failed to load document catalog.');
  }

  const categoriesList = categories || [];
  const drugsList = drugs || [];

  // Group drugs into their approved categories
  const categoriesWithDrugs: CategoryData[] = categoriesList.map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    sort_order: cat.sort_order,
    drugs: drugsList.filter((d) => d.category_id === cat.id),
  }));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header
        researchSession={researchSession}
        adminUser={
          adminAuth
            ? {
                id: adminAuth.user.id,
                email: adminAuth.user.email ?? null,
                displayName: adminAuth.profile.displayName,
              }
            : null
        }
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-800 uppercase tracking-wider mb-1">
              <BookOpen className="w-3.5 h-3.5" />
              Approved Document Library
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Clinical Research Documents
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Select documents to compare, download individually, or bundle into a single research archive.
            </p>
          </div>
        </div>

        {/* Drug List with Search & Filtering */}
        <DrugList categories={categoriesWithDrugs} />
      </main>
    </div>
  );
}
