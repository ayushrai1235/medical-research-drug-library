import React from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function DrugDetailLoading() {
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

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col space-y-4">
        {/* Skeleton Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div>
            <div className="h-3 w-40 bg-slate-200 rounded mb-2 animate-pulse" />
            <div className="flex items-center gap-3">
              <div className="h-7 w-48 bg-slate-200 rounded animate-pulse" />
              <div className="h-5 w-24 bg-slate-100 rounded-full animate-pulse" />
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-36 bg-slate-200 rounded-md animate-pulse" />
            <div className="h-9 w-28 bg-blue-200 rounded-md animate-pulse" />
          </div>
        </div>

        {/* Skeleton PDF Canvas Area */}
        <div className="flex-1 min-h-[650px] bg-slate-900 border border-slate-700 rounded-xl overflow-hidden flex flex-col">
          <div className="h-10 bg-slate-800 border-b border-slate-700 px-4 flex items-center justify-between">
            <div className="h-4 w-40 bg-slate-700 rounded animate-pulse" />
            <div className="h-6 w-32 bg-slate-700 rounded animate-pulse" />
          </div>
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-sm font-medium text-slate-400">Loading document...</p>
          </div>
        </div>
      </main>
    </div>
  );
}

