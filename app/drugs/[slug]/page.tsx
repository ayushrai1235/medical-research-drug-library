import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getResearchSession } from '@/lib/auth/session';
import { getAdminUser } from '@/lib/auth/admin';
import { getServiceRoleSupabaseClient } from '@/lib/supabase/service-role';
import { Header } from '@/components/library/Header';
import { PdfViewer } from '@/components/pdf/PdfViewer';
import { logActivityEvent } from '@/lib/activity/tracker';
import {
  ArrowLeft,
  Download,
  ArrowLeftRight,
  ShieldCheck,
  Calendar,
  Layers,
  AlertTriangle,
} from 'lucide-react';

const BUCKET_NAME = 'research-pdfs';

export default async function DrugDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [researchSession, adminAuth] = await Promise.all([
    getResearchSession(),
    getAdminUser(),
  ]);

  if (!researchSession && !adminAuth) {
    redirect('/research-entry');
  }

  const supabase = getServiceRoleSupabaseClient();

  // Look up drug by slug
  const { data: drug, error: drugError } = await supabase
    .from('drugs')
    .select('id, name, slug, description, pdf_storage_path, pdf_status, is_active, categories(id, name, slug)')
    .eq('slug', slug)
    .single();

  if (drugError || !drug) {
    redirect('/library');
  }

  // Record drug_opened event
  await logActivityEvent({
    action: 'drug_opened',
    drugId: drug.id,
    details: {
      drugName: drug.name,
      slug: drug.slug,
      category: (drug.categories as any)?.name,
    },
  });

  // Generate signed URL
  let signedUrl: string | null = null;
  let signErrorMsg: string | null = null;

  if (drug.pdf_storage_path && drug.pdf_status === 'uploaded') {
    const { data: signData, error: signError } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(drug.pdf_storage_path, 600); // 10 minutes

    if (signError || !signData?.signedUrl) {
      signErrorMsg = signError?.message || 'Failed to create document access token';
    } else {
      signedUrl = signData.signedUrl;
    }
  }

  const categoryName = (drug.categories as any)?.name || 'General';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header
        researchSession={researchSession}
        adminUser={adminAuth ? { id: adminAuth.user.id, email: adminAuth.user.email ?? null, displayName: adminAuth.profile.displayName } : null}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col space-y-4">
        {/* Navigation & Actions Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <Link href="/library" className="hover:text-blue-700 flex items-center gap-1 transition">
                <ArrowLeft className="w-3.5 h-3.5" />
                Library
              </Link>
              <span>/</span>
              <span className="text-slate-700">{categoryName}</span>
              <span>/</span>
              <span className="text-blue-900 font-bold">{drug.name}</span>
            </div>

            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                {drug.name}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                {categoryName}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            <Link
              href={`/compare?ids=${drug.id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 active:scale-[0.97] border border-slate-300 rounded-lg transition-all duration-75 touch-manipulation cursor-pointer"
            >
              <ArrowLeftRight className="w-4 h-4 text-slate-600" />
              Compare with Another Drug
            </Link>

            <a
              href={`/api/download/individual?drugId=${drug.id}`}
              download
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-900 hover:bg-blue-800 active:bg-blue-950 active:scale-[0.97] rounded-lg shadow-sm transition-all duration-75 touch-manipulation cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </a>
          </div>
        </div>

        {/* PDF Viewer or Unavailable Banner */}
        {signedUrl ? (
          <div className="flex-1 min-h-[650px] shadow-sm rounded-lg overflow-hidden">
            <PdfViewer
              url={signedUrl}
              drugId={drug.id}
              drugName={`${drug.name} (${categoryName})`}
              height="calc(100vh - 200px)"
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white border border-slate-200 rounded-xl text-center">
            <AlertTriangle className="w-12 h-12 text-amber-500 mb-3" />
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              PDF Document Unavailable
            </h2>
            <p className="text-xs text-slate-500 max-w-md mb-6">
              {signErrorMsg || `The document status for ${drug.name} is '${drug.pdf_status}'. Please contact the repository administrator or run the verification script.`}
            </p>
            <Link
              href="/library"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-md"
            >
              Return to Library
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
