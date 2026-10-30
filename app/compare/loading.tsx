import React from 'react';
import { Loader2 } from 'lucide-react';

export default function CompareLoading() {
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

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        {/* Top Control Bar Skeleton */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1.5 w-full sm:w-auto">
            <div className="h-5 w-52 bg-slate-200 rounded animate-pulse" />
            <div className="h-3.5 w-72 bg-slate-100 rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <div className="h-9 w-44 bg-blue-200 rounded-md animate-pulse" />
            <div className="h-9 w-36 bg-slate-200 rounded-md animate-pulse" />
          </div>
        </div>

        {/* Dual Pane Skeletons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-h-[600px]">
          <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden flex flex-col">
            <div className="h-10 bg-slate-800 border-b border-slate-700 px-4 flex items-center justify-between">
              <div className="h-4 w-28 bg-slate-700 rounded animate-pulse" />
            </div>
            <div className="flex-1 flex flex-col items-center justify-center p-8 gap-3">
              <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
              <p className="text-xs text-slate-400">Loading document comparison...</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden flex flex-col">
            <div className="h-10 bg-slate-800 border-b border-slate-700 px-4 flex items-center justify-between">
              <div className="h-4 w-28 bg-slate-700 rounded animate-pulse" />
            </div>
            <div className="flex-1 flex flex-col items-center justify-center p-8 gap-3">
              <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
              <p className="text-xs text-slate-400">Loading document comparison...</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
