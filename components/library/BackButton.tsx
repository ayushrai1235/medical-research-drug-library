'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  fallbackHref?: string;
  label?: string;
  className?: string;
}

export function BackButton({
  fallbackHref = '/library',
  label = 'Library',
  className = 'hover:text-blue-700 flex items-center gap-1 transition touch-manipulation cursor-pointer text-xs font-semibold text-slate-500',
}: BackButtonProps) {
  const router = useRouter();

  const handleBack = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    // Verify if document.referrer indicates the user navigated from the library within this site
    if (typeof document !== 'undefined' && document.referrer) {
      try {
        const refUrl = new URL(document.referrer);
        if (
          refUrl.origin === window.location.origin &&
          refUrl.pathname.startsWith('/library')
        ) {
          // Native browser back preserves BFcache and existing DOM scroll position
          router.back();
          return;
        }
      } catch {
        // Fall through to explicit router.push
      }
    }

    // Direct visit, bookmark, or external referral fallback (with preserved query params)
    router.push(fallbackHref);
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className={className}
      aria-label={`Back to ${label}`}
    >
      <ArrowLeft className="w-3.5 h-3.5" />
      <span>{label}</span>
    </button>
  );
}

