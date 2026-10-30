'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, ArrowLeft, Loader2, Info, Check, Globe, Shield } from 'lucide-react';

export default function ResearchEntryPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
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
      setError('Display name must be under 50 characters.');
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
        throw new Error(data.error || 'Failed to start research session');
      }

      router.push('/library');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Selection
        </Link>

        {/* Header Icon & Title */}
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-blue-900 text-white flex items-center justify-center mx-auto mb-3 shadow-sm">
            <BookOpen className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Research User Access
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Enter your display name to begin your research session.
          </p>
        </div>

        {/* Card Form */}
        <div className="mt-6 bg-white py-8 px-6 sm:px-8 border border-slate-200 rounded-xl shadow-xs">
          {error && (
            <div className="mb-5 p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Display Name Input */}
            <div>
              <label htmlFor="displayName" className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Display Name <span className="text-red-500">*</span>
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Dr. Jane Smith, Clinical Investigator"
                required
                autoFocus
                maxLength={50}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Visible in your session and associated with document access activity logs.
              </p>
            </div>

            {/* Language Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-600" />
                Select Language
              </label>
              <div className="grid grid-cols-1 gap-2.5">
                {/* English - Active */}
                <label
                  onClick={() => setLanguage('en')}
                  className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition ${
                    language === 'en'
                      ? 'border-blue-600 bg-blue-50/50 text-blue-900'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    <div>
                      <p className="text-xs font-bold">English</p>
                      <p className="text-[11px] text-slate-500">Complete library publications available</p>
                    </div>
                  </div>
                  {language === 'en' && <Check className="w-4 h-4 text-blue-600" />}
                </label>

                {/* Hindi - Disabled */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/80 text-slate-400 cursor-not-allowed opacity-75">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                    <div>
                      <p className="text-xs font-semibold">हिन्दी (Hindi)</p>
                      <p className="text-[11px] text-slate-400">Translations in review</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-200 text-slate-600 rounded">
                    Coming Soon
                  </span>
                </div>

                {/* Gujarati - Disabled */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/80 text-slate-400 cursor-not-allowed opacity-75">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                    <div>
                      <p className="text-xs font-semibold">ગુજરાતી (Gujarati)</p>
                      <p className="text-[11px] text-slate-400">Translations in review</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-200 text-slate-600 rounded">
                    Coming Soon
                  </span>
                </div>
              </div>
            </div>

            {/* Note on Research Session Identity */}
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                A unique internal session UUID is generated for every user. The display name is not identity verification and does not require an email or password.
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-xs sm:text-sm font-bold text-white bg-blue-900 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 disabled:opacity-50 transition"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Initializing Research Session...
                </>
              ) : (
                'Enter Library'
              )}
            </button>
          </form>

          {/* Admin Navigation */}
          <div className="mt-6 pt-5 border-t border-slate-200 text-center">
            <p className="text-xs text-slate-500 font-medium">
              Are you an Admin?
            </p>
            <div className="mt-2">
              <Link
                href="/admin-login"
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-300 rounded-lg text-xs font-semibold transition"
              >
                <Shield className="w-3.5 h-3.5 text-slate-600" />
                <span>Admin Sign In</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

