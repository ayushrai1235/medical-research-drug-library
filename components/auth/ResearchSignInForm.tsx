'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  ArrowRight,
  Globe,
  Check,
  Loader2,
  Shield,
  BookOpen,
} from 'lucide-react';

interface ResearchSignInFormProps {
  activeSession?: {
    id: string;
    displayName: string;
    preferredLanguage: string;
  } | null;
}

export function ResearchSignInForm({ activeSession }: ResearchSignInFormProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(activeSession?.displayName || '');
  const [language, setLanguage] = useState<'en' | 'hi' | 'gu'>('en');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = displayName.trim();
    if (trimmed.length < 2) {
      setError('Please enter a display name with at least 2 characters.');
      return;
    }
    if (trimmed.length > 50) {
      setError('Display name must be 50 characters or fewer.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/research/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: trimmed,
          language,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to initialize research session');
      }

      router.push('/library');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Existing Session Alert if active */}
      {activeSession && (
        <div className="mb-4 p-4 rounded-xl bg-blue-50/90 border border-blue-200 text-left shadow-2xs">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <div className="truncate">
                <p className="text-xs text-blue-700 font-medium">Active Research Session</p>
                <p className="text-sm font-bold text-blue-950 truncate">
                  {activeSession.displayName}
                </p>
              </div>
            </div>
            <Link
              href="/library"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-2xs transition shrink-0"
            >
              Open Library
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Primary Card: Research User Sign-In */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 text-left">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
              Research User Sign In
            </h2>
            <p className="text-xs text-slate-500">
              Enter your display name to start or resume exploring
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium leading-relaxed">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Display Name Input */}
          <div>
            <label
              htmlFor="landingDisplayName"
              className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5"
            >
              Researcher Display Name <span className="text-red-500">*</span>
            </label>
            <input
              id="landingDisplayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Dr. Jane Smith, Clinical Investigator"
              required
              maxLength={50}
              className="w-full h-11 sm:h-12 px-3.5 text-sm sm:text-base bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Visible during your session and recorded in document access telemetry.
            </p>
          </div>

          {/* Language Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-blue-600" />
              Language Preference
            </label>
            <div className="space-y-2">
              {/* English */}
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl border-2 text-left transition ${
                  language === 'en'
                    ? 'border-blue-600 bg-blue-50/40 text-blue-950 font-semibold'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold">English</p>
                    <p className="text-[11px] text-slate-500">Full 19 drug publications active</p>
                  </div>
                </div>
                {language === 'en' && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
              </button>

              {/* Hindi & Gujarati - Disabled */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 sm:p-2.5 rounded-xl border border-slate-200 bg-slate-50/80 text-slate-400 flex items-center justify-between text-left opacity-75 cursor-not-allowed">
                  <div>
                    <p className="text-[11px] font-semibold">हिन्दी (Hindi)</p>
                    <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-500">
                      Coming Soon
                    </span>
                  </div>
                </div>

                <div className="p-2 sm:p-2.5 rounded-xl border border-slate-200 bg-slate-50/80 text-slate-400 flex items-center justify-between text-left opacity-75 cursor-not-allowed">
                  <div>
                    <p className="text-[11px] font-semibold">ગુજરાતી (Gujarati)</p>
                    <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-500">
                      Coming Soon
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 sm:h-12 inline-flex items-center justify-center gap-2 px-5 py-3 bg-blue-900 hover:bg-blue-800 disabled:opacity-60 text-white text-sm sm:text-base font-bold rounded-xl shadow-xs hover:shadow-md transition-all active:scale-[0.99] touch-manipulation"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Initializing Session...</span>
              </>
            ) : (
              <>
                <span>Continue as Research User</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Separator & Admin Navigation */}
        <div className="mt-6 pt-5 border-t border-slate-200 text-center">
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Are you an Admin?
          </p>
          <div className="mt-2.5">
            <Link
              href="/admin-login"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-300 hover:border-slate-400 rounded-xl text-xs sm:text-sm font-semibold transition shadow-2xs touch-manipulation"
            >
              <Shield className="w-4 h-4 text-slate-600" />
              <span>Admin Sign In</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
