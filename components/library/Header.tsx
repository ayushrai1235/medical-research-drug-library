'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  LogOut,
  User,
  Shield,
  Layers,
  BookOpen,
  Menu,
  X,
  FileSpreadsheet,
} from 'lucide-react';

interface HeaderProps {
  researchSession?: {
    id: string;
    displayName: string;
    preferredLanguage: string;
  } | null;
  adminUser?: {
    id: string;
    email?: string | null;
    displayName: string;
  } | null;
}

export function Header({ researchSession, adminUser }: HeaderProps) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleEndResearchSession = async () => {
    try {
      await fetch('/api/research/logout', { method: 'POST' });
      router.push('/');
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdminLogout = async () => {
    try {
      const { createBrowserSupabaseClient } = await import('@/lib/supabase/client');
      const supabase = createBrowserSupabaseClient();
      await supabase.auth.signOut();
      router.push('/admin-login');
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((o) => !o)}
            className="p-1.5 rounded-md md:hidden text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition mr-1"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link href="/" className="flex items-center gap-2 sm:gap-2.5 text-blue-900 font-bold text-sm sm:text-lg hover:opacity-90 transition">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-900 text-white flex items-center justify-center font-black text-xs sm:text-base shrink-0">
              M
            </div>
            <div className="flex flex-col">
              <span className="leading-tight truncate max-w-[150px] sm:max-w-none">Medical Research</span>
              <span className="text-[10px] sm:text-[11px] font-normal text-slate-500 uppercase tracking-wider hidden xs:inline">
                Drug Document Library
              </span>
            </div>
          </Link>

          {/* Quick Nav for Library & Admin (Desktop) */}
          <nav className="hidden md:flex items-center gap-1.5 ml-6 text-xs font-medium text-slate-600">
            <Link
              href="/library"
              className="px-3 py-1.5 rounded hover:bg-slate-100 hover:text-slate-900 transition flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
              Document Library
            </Link>

            {adminUser && (
              <>
                <Link
                  href="/admin/dashboard"
                  className="px-3 py-1.5 rounded hover:bg-slate-100 hover:text-slate-900 transition flex items-center gap-1.5"
                >
                  <Shield className="w-3.5 h-3.5 text-blue-600" />
                  Dashboard
                </Link>
                <Link
                  href="/admin/activity"
                  className="px-3 py-1.5 rounded hover:bg-slate-100 hover:text-slate-900 transition flex items-center gap-1.5"
                >
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  Activity Explorer
                </Link>
                <Link
                  href="/admin/exports"
                  className="px-3 py-1.5 rounded hover:bg-slate-100 hover:text-slate-900 transition flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600" />
                  Excel Exports
                </Link>
              </>
            )}
          </nav>
        </div>

        {/* User Status and Logout */}
        <div className="flex items-center gap-2 sm:gap-4">
          {adminUser ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-900 flex items-center justify-end gap-1">
                  <Shield className="w-3 h-3 text-blue-600" />
                  {adminUser.displayName || 'Administrator'}
                </span>
                <span className="text-[10px] text-slate-500">
                  {adminUser.email}
                </span>
              </div>
              <button
                type="button"
                onClick={handleAdminLogout}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : researchSession ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-900 flex items-center justify-end gap-1 truncate max-w-[120px] sm:max-w-none">
                  <User className="w-3 h-3 text-teal-600 shrink-0" />
                  <span className="truncate">{researchSession.displayName}</span>
                </span>
                <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">
                  English • Session Active
                </span>
              </div>
              <button
                type="button"
                onClick={handleEndResearchSession}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition"
              >
                <LogOut className="w-3.5 h-3.5 text-red-600" />
                <span className="hidden sm:inline">End Session</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link
                href="/research-entry"
                className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition whitespace-nowrap"
              >
                Researcher
              </Link>
              <Link
                href="/admin-login"
                className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition whitespace-nowrap"
              >
                Admin
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-2 text-xs font-medium animate-in fade-in slide-in-from-top-2 duration-150">
          <Link
            href="/library"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 text-slate-700"
          >
            <BookOpen className="w-4 h-4 text-blue-600" />
            Document Library
          </Link>

          {adminUser && (
            <>
              <Link
                href="/admin/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 text-slate-700"
              >
                <Shield className="w-4 h-4 text-blue-600" />
                Admin Dashboard
              </Link>
              <Link
                href="/admin/activity"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 text-slate-700"
              >
                <Layers className="w-4 h-4 text-blue-600" />
                Activity Explorer
              </Link>
              <Link
                href="/admin/exports"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 text-slate-700"
              >
                <FileSpreadsheet className="w-4 h-4 text-teal-600" />
                Excel Exports
              </Link>
            </>
          )}

          {!researchSession && !adminUser && (
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-1.5">
              <Link
                href="/research-entry"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded bg-blue-50 text-blue-700 font-semibold"
              >
                Continue as Research User
              </Link>
              <Link
                href="/admin-login"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded bg-slate-100 text-slate-700 font-semibold"
              >
                Admin Login
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
