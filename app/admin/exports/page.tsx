import { requireAdmin } from '@/lib/auth/admin';
import { Header } from '@/components/library/Header';
import { FileSpreadsheet, Download, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default async function AdminExportsPage() {
  const adminAuth = await requireAdmin();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header
        adminUser={{
          id: adminAuth.user.id,
          email: adminAuth.user.email ?? null,
          displayName: adminAuth.profile.displayName,
        }}
      />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-800 uppercase tracking-wider mb-1">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Compliance & Reporting
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Excel Data Exports
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Export verified researcher activity, download metrics, and comparative analytics to formatted Microsoft Excel (.xlsx) spreadsheets.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Complete Activity Export */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center mb-4">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-slate-900">
                Complete Activity Audit
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Includes all viewing, comparison, and download events with researcher display names, timestamps, and sanitization against spreadsheet formula injection.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                  Detailed Activity worksheet with frozen headers
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                  Executive Summary worksheet with aggregated metrics
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <a
                href="/api/admin/export"
                download
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs sm:text-sm font-bold rounded-lg shadow-sm transition"
              >
                <Download className="w-4 h-4" />
                Download Complete Excel (.xlsx)
              </a>
            </div>
          </div>

          {/* Downloads Only Export */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center mb-4">
                <Download className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-slate-900">
                File Downloads Summary
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Filtered specifically for file download events: individual PDFs, multi-PDF ZIP archives, and generated side-by-side comparison documents.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  Individual PDF downloads
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  Multi-drug ZIP bundles & comparison PDFs
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <a
                href="/api/admin/export?downloadType=individual_pdf"
                download
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-900 hover:bg-blue-800 text-white text-xs sm:text-sm font-bold rounded-lg shadow-sm transition"
              >
                <Download className="w-4 h-4" />
                Download Downloads Only (.xlsx)
              </a>
            </div>
          </div>
        </div>

        {/* Security & Integrity Note */}
        <div className="p-4 bg-slate-100/70 border border-slate-200 rounded-xl flex items-start gap-3 text-xs text-slate-600">
          <ShieldCheck className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-800">Formula Injection Mitigation:</span>
            <p className="mt-0.5 text-slate-500">
              All string fields beginning with sensitive spreadsheet formula prefixes (=, +, -, @, tab) are automatically neutralized before file generation to ensure spreadsheet reader security.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
