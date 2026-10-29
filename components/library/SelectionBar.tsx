'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftRight,
  Download,
  X,
  FileArchive,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

interface SelectionBarProps {
  selectedDrugIds: string[];
  onClearSelection: () => void;
}

export function SelectionBar({
  selectedDrugIds,
  onClearSelection,
}: SelectionBarProps) {
  const router = useRouter();
  const [downloadingZip, setDownloadingZip] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (selectedDrugIds.length === 0) {
    return null;
  }

  const handleCompare = () => {
    if (selectedDrugIds.length < 2) {
      alert('Please select at least two drugs to compare.');
      return;
    }
    const query = selectedDrugIds.join(',');
    router.push(`/compare?ids=${encodeURIComponent(query)}`);
  };

  const handleDownloadZip = async () => {
    setDownloadingZip(true);
    setToastMessage(null);

    try {
      const res = await fetch('/api/download/zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drugIds: selectedDrugIds }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to download ZIP');
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `medical_research_selected_drugs_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);

      setToastMessage(`Successfully downloaded ${selectedDrugIds.length} PDFs as ZIP!`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      alert(`ZIP Download Error: ${err.message}`);
    } finally {
      setDownloadingZip(false);
    }
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="bg-slate-900 text-white rounded-xl shadow-2xl p-3 sm:p-4 border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Count */}
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
            {selectedDrugIds.length}
          </span>
          <span className="text-xs sm:text-sm font-semibold text-slate-100">
            {selectedDrugIds.length === 1 ? '1 Drug Selected' : `${selectedDrugIds.length} Drugs Selected`}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCompare}
            disabled={selectedDrugIds.length < 2}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white text-xs font-semibold rounded-md shadow transition"
            title={selectedDrugIds.length < 2 ? 'Select at least 2 drugs to compare' : 'Compare selected documents'}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            Compare {selectedDrugIds.length >= 2 ? `(${selectedDrugIds.length})` : ''}
          </button>

          <button
            type="button"
            onClick={handleDownloadZip}
            disabled={downloadingZip}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-semibold rounded-md shadow transition"
          >
            {downloadingZip ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileArchive className="w-3.5 h-3.5" />
            )}
            Download ZIP
          </button>

          <button
            type="button"
            onClick={onClearSelection}
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition"
            aria-label="Clear selection"
            title="Clear Selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="mt-2 text-center">
          <span className="inline-flex items-center gap-1.5 bg-emerald-700 text-white text-xs px-3 py-1 rounded-full shadow">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {toastMessage}
          </span>
        </div>
      )}
    </div>
  );
}

