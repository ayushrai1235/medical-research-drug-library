'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Shield, ArrowLeft, Loader2, Eye, EyeOff, Lock, KeyRound } from 'lucide-react';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fillDefaultCredentials = () => {
    setEmail('admin@medicalresearch.org');
    setPassword('MedicalAdmin2026!');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed. Please verify credentials.');
      }

      // Hard redirect to ensure all HTTP cookies are passed cleanly
      window.location.href = data.redirect || '/admin/dashboard';
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
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

        {/* Header */}
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center mx-auto mb-3 shadow-sm">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Administrator Portal
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Sign in with authorized credentials to inspect researcher activity logs and manage the repository.
          </p>
        </div>

        {/* Quick Credentials Helper Card */}
        <div className="mt-5 p-3.5 bg-blue-50/80 border border-blue-200 rounded-lg text-xs text-blue-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-blue-700 shrink-0" />
            <div>
              <p className="font-bold">Initial Admin Account:</p>
              <p className="text-[11px] text-blue-800 font-mono">admin@medicalresearch.org</p>
            </div>
          </div>
          <button
            type="button"
            onClick={fillDefaultCredentials}
            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded text-[11px] transition shrink-0"
          >
            Auto-fill
          </button>
        </div>

        {/* Form Card */}
        <div className="mt-4 bg-white py-8 px-6 sm:px-8 border border-slate-200 rounded-xl shadow-xs">
          {error && (
            <div className="mb-5 p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label htmlFor="adminEmail" className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Admin Email Address
              </label>
              <input
                id="adminEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@medicalresearch.org"
                required
                autoComplete="email"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent transition"
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="adminPassword" className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="adminPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-xs sm:text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-800 disabled:opacity-50 transition"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Verifying Credentials...
                  </>
                ) : (
                  'Sign In to Admin Dashboard'
                )}
              </button>
            </div>
          </form>

          {/* Security Notice */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-400 justify-center">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Public self-registration is permanently disabled.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
