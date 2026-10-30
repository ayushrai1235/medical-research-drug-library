import React from 'react';
import { Loader2, Search } from 'lucide-react';

export default function LibraryLoading() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Skeleton Header */}
      <div className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-200 animate-pulse" />
          <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
        </div>
        <div className="h-8 w-24 bg-slate-200 rounded animate-pulse" />
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Info Banner */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1.5">
            <div className="h-6 w-56 bg-slate-200 rounded animate-pulse" />
            <div className="h-3.5 w-80 bg-slate-100 rounded animate-pulse" />
          </div>
          <div className="h-9 w-32 bg-slate-100 rounded-md animate-pulse" />
        </div>

        {/* Filter Controls Skeleton */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="h-10 w-full sm:max-w-md bg-slate-100 rounded-lg animate-pulse" />
            <div className="h-4 w-36 bg-slate-100 rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-2 overflow-hidden pt-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-7 w-28 bg-slate-100 rounded-full shrink-0 animate-pulse" />
            ))}
          </div>
        </div>

        {/* Categories Skeleton */}
        {[1, 2, 3].map((section) => (
          <div key={section} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="h-4 w-40 bg-slate-200 rounded animate-pulse" />
              <div className="h-4 w-16 bg-slate-200 rounded-full animate-pulse" />
            </div>
            <div className="divide-y divide-slate-100">
              {[1, 2, 3].map((row) => (
                <div key={row} className="px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-slate-200 rounded animate-pulse" />
                    <div className="space-y-1">
                      <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
                      <div className="h-3 w-48 bg-slate-100 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="h-7 w-20 bg-slate-100 rounded-md animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}

