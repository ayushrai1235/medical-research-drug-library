'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  LogOut,
  User,
  Shield,
  Layers,
  BookOpen,
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
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 text-blue-900 font-bold text-base sm:text-lg hover:opacity-90 transition">
            <div className="w-8 h-8 rounded-lg bg-blue-900 text-white flex items-center justify-center font-black">
              M
            </div>
            <div className="flex flex-col">
              <span className="leading-tight">Medical Research</span>
              <span className="text-[11px] font-normal text-slate-500 uppercase tracking-wider">
                Drug Document Library
              </span>
            </div>
          </Link>

          {/* Quick Nav for Library & Admin */}
          <nav className="hidden md:flex items-center gap-2 ml-6 text-xs font-medium text-slate-600">
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
              </>
            )}
          </nav>
        </div>

        {/* User Status and Logout */}
        <div className="flex items-center gap-3 sm:gap-4">
          {adminUser ? (
            <div className="flex items-center gap-3">
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : researchSession ? (
            <div className="flex items-center gap-3">
              <div className="flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-900 flex items-center justify-end gap-1">
                  <User className="w-3 h-3 text-teal-600" />
                  {researchSession.displayName}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  English • Session Active
                </span>
              </div>
              <button
                type="button"
                onClick={handleEndResearchSession}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition"
              >
                <LogOut className="w-3.5 h-3.5 text-red-600" />
                <span className="hidden sm:inline">End Session</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/research-entry"
                className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition"
              >
                Researcher Entry
              </Link>
              <Link
                href="/admin-login"
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition"
              >
                Admin Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
