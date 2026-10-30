import Link from 'next/link';
import { FileCheck, Search, Download, Shield, BookOpen } from 'lucide-react';
import { getResearchSession } from '@/lib/auth/session';
import { getAdminUser } from '@/lib/auth/admin';
import { Header } from '@/components/library/Header';
import { ResearchSignInForm } from '@/components/auth/ResearchSignInForm';

export default async function LandingPage() {
  const [researchSession, adminAuth] = await Promise.all([
    getResearchSession(),
    getAdminUser(),
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
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

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 sm:py-14 flex flex-col items-center justify-center text-center">
        {/* Verification Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold uppercase tracking-wider mb-4 sm:mb-6">
          <FileCheck className="w-4 h-4 text-blue-600" />
          Official Medical Research Repository
        </div>

        {/* Heading & Subheading */}
        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight max-w-3xl leading-tight">
          Medical Research Drug Library
        </h1>
        <p className="mt-2.5 sm:mt-3 text-sm sm:text-base text-slate-600 max-w-xl font-normal leading-relaxed">
          Access verified clinical publications across 7 therapeutic categories and 19 drug publications.
        </p>

        {/* Primary Research Sign-In Section */}
        <div className="mt-8 sm:mt-10 w-full flex justify-center">
          <ResearchSignInForm activeSession={researchSession} />
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-12 sm:mt-16 pt-8 border-t border-slate-200 w-full grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6 text-left">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/70 border border-slate-200/80 shadow-2xs">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-700 shrink-0">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                7 Approved Categories
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Biguanides, DPP-4, TZDs, Sulfonylureas, Alpha-glucosidase, SGLT-2, and Non-Sulphonylureas.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/70 border border-slate-200/80 shadow-2xs">
            <div className="p-2 rounded-lg bg-teal-50 text-teal-700 shrink-0">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Crisp High-DPI PDF Viewer
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Device-pixel-ratio vector rendering with device-tailored zoom (60% mobile, 80% desktop, Fit tablet).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/70 border border-slate-200/80 shadow-2xs">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700 shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Export & Comparison
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Mobile-optimized dual-pane viewer, multi-PDF ZIP archives, and combined landscape comparison PDFs.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
