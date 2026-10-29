import Link from 'next/link';
import { ArrowRight, BookOpen, Shield, FileCheck, Search, Download } from 'lucide-react';
import { getResearchSession } from '@/lib/auth/session';
import { getAdminUser } from '@/lib/auth/admin';
import { Header } from '@/components/library/Header';

export default async function LandingPage() {
  const [researchSession, adminAuth] = await Promise.all([
    getResearchSession(),
    getAdminUser(),
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header
        researchSession={researchSession}
        adminUser={adminAuth ? { id: adminAuth.user.id, email: adminAuth.user.email ?? null, displayName: adminAuth.profile.displayName } : null}
      />

      <main className="flex-1 max-w-5xl mx-auto px-4 py-12 sm:py-20 flex flex-col items-center justify-center text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold uppercase tracking-wider mb-6">
          <FileCheck className="w-4 h-4 text-blue-600" />
          Official Medical Research Repository
        </div>

        {/* Heading & Subheading */}
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight max-w-3xl leading-tight">
          Medical Research Drug Library
        </h1>
        <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl font-normal">
          Access research documents and drug information across 7 therapeutic categories and 19 verified drug publications.
        </p>

        {/* First Screen Entry Options: Research User vs Admin Login */}
        <div className="mt-10 sm:mt-12 w-full max-w-xl grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
          {/* Research User Card */}
          <Link
            href="/research-entry"
            className="group relative flex flex-col justify-between p-6 bg-white border-2 border-slate-200 hover:border-blue-600 rounded-xl shadow-xs hover:shadow-md transition-all duration-150"
          >
            <div>
              <div className="w-12 h-12 rounded-lg bg-blue-50 group-hover:bg-blue-600 text-blue-700 group-hover:text-white flex items-center justify-center transition-colors mb-4">
                <BookOpen className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 group-hover:text-blue-900 transition">
                Continue as Research User
              </h2>
              <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                Enter your display name to browse the 19 drug documents, view PDFs, and run side-by-side comparisons.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs font-bold text-blue-700 group-hover:text-blue-800">
              <span>Enter Research Library</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          {/* Admin Login Card */}
          <Link
            href="/admin-login"
            className="group relative flex flex-col justify-between p-6 bg-white border-2 border-slate-200 hover:border-slate-800 rounded-xl shadow-xs hover:shadow-md transition-all duration-150"
          >
            <div>
              <div className="w-12 h-12 rounded-lg bg-slate-100 group-hover:bg-slate-900 text-slate-700 group-hover:text-white flex items-center justify-center transition-colors mb-4">
                <Shield className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 group-hover:text-slate-900 transition">
                Admin Login
              </h2>
              <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                Sign in with authorized credentials to inspect researcher activity logs, view live metrics, and export data.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs font-bold text-slate-700 group-hover:text-slate-900">
              <span>Access Administrator Portal</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        </div>

        {/* Feature Highlights Footer */}
        <div className="mt-16 sm:mt-24 pt-8 border-t border-slate-200 w-full grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded bg-blue-50 text-blue-700">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">7 Clinical Categories</h3>
              <p className="text-xs text-slate-500 mt-1">Preserved approved groupings including Biguanides, SGLT-2, and DPP-4 inhibitors.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded bg-teal-50 text-teal-700">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">In-App PDF Viewer</h3>
              <p className="text-xs text-slate-500 mt-1">High-fidelity original documents rendered with page navigation, zoom, and fullscreen.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded bg-slate-100 text-slate-700">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Export & Compare</h3>
              <p className="text-xs text-slate-500 mt-1">Side-by-side comparison, combined landscape PDF generation, and multi-PDF ZIP archives.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
