'use client';

import React, { useState, useEffect } from 'react';
import { PdfViewer } from '@/components/pdf/PdfViewer';
import {
  Download,
  FileArchive,
  ArrowLeftRight,
  Layers,
  Loader2,
  AlertCircle,
  FileText,
  CheckCircle2,
} from 'lucide-react';

export interface ComparisonDrug {
  id: string;
  name: string;
  slug: string;
  categoryName?: string;
}

interface ComparisonViewProps {
  drugs: ComparisonDrug[];
  initialDrug1Id?: string;
  initialDrug2Id?: string;
}

export function ComparisonView({
  drugs,
  initialDrug1Id,
  initialDrug2Id,
}: ComparisonViewProps) {
  const [drug1Id, setDrug1Id] = useState<string>(
    initialDrug1Id || drugs[0]?.id || ''
  );
  const [drug2Id, setDrug2Id] = useState<string>(
    initialDrug2Id || (drugs.length > 1 ? drugs[1]?.id : drugs[0]?.id || '')
  );

  const [url1, setUrl1] = useState<string | null>(null);
  const [url2, setUrl2] = useState<string | null>(null);
  const [loading1, setLoading1] = useState<boolean>(true);
  const [loading2, setLoading2] = useState<boolean>(true);
  const [error1, setError1] = useState<string | null>(null);
  const [error2, setError2] = useState<string | null>(null);

  const [activeMobileTab, setActiveMobileTab] = useState<'left' | 'right'>('left');
  const [downloadingZip, setDownloadingZip] = useState<boolean>(false);
  const [downloadingCombined, setDownloadingCombined] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const selectedDrug1 = drugs.find((d) => d.id === drug1Id);
  const selectedDrug2 = drugs.find((d) => d.id === drug2Id);

  // Fetch signed URL for Drug 1
  useEffect(() => {
    if (!drug1Id) return;
    setLoading1(true);
    setError1(null);

    fetch('/api/files/signed-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drugId: drug1Id }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.signedUrl) {
          setUrl1(data.signedUrl);
        } else {
          setError1(data.error || 'Failed to get document URL');
        }
      })
      .catch((err) => setError1(err.message))
      .finally(() => setLoading1(false));
  }, [drug1Id]);

  // Fetch signed URL for Drug 2
  useEffect(() => {
    if (!drug2Id) return;
    setLoading2(true);
    setError2(null);

    fetch('/api/files/signed-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drugId: drug2Id }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.signedUrl) {
          setUrl2(data.signedUrl);
        } else {
          setError2(data.error || 'Failed to get document URL');
        }
      })
      .catch((err) => setError2(err.message))
      .finally(() => setLoading2(false));
  }, [drug2Id]);

  // Track comparison_opened event
  useEffect(() => {
    if (drug1Id && drug2Id && drug1Id !== drug2Id) {
      fetch('/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'comparison_opened',
          drugId: drug1Id,
          relatedDrugIds: [drug1Id, drug2Id],
          details: {
            drug1: selectedDrug1?.name,
            drug2: selectedDrug2?.name,
          },
        }),
      }).catch((e) => console.error('Error logging comparison_opened:', e));
    }
  }, [drug1Id, drug2Id, selectedDrug1?.name, selectedDrug2?.name]);

  // Handle Download Combined Comparison PDF
  const handleDownloadCombined = async () => {
    if (!drug1Id || !drug2Id) return;
    setDownloadingCombined(true);
    setSuccessToast(null);

    try {
      const res = await fetch('/api/download/comparison', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drugId1: drug1Id, drugId2: drug2Id }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to generate comparison PDF');
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `comparison_${selectedDrug1?.slug || 'drug1'}_vs_${selectedDrug2?.slug || 'drug2'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);

      setSuccessToast('Combined comparison PDF generated and downloaded successfully!');
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setDownloadingCombined(false);
    }
  };

  // Handle Download Originals as ZIP
  const handleDownloadZip = async () => {
    const idsToDownload = Array.from(new Set([drug1Id, drug2Id])).filter(Boolean);
    if (idsToDownload.length === 0) return;

    setDownloadingZip(true);
    setSuccessToast(null);

    try {
      const res = await fetch('/api/download/zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drugIds: idsToDownload }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to download ZIP archive');
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `original_research_pdfs_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);

      setSuccessToast('Original PDFs archive downloaded successfully!');
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setDownloadingZip(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top Header & Actions Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-blue-600" />
              Side-by-Side Research Comparison
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Compare two original research documents with synchronized or independent view controls.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleDownloadCombined}
              disabled={downloadingCombined || !url1 || !url2}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-xs sm:text-sm font-medium rounded-md shadow-sm transition"
            >
              {downloadingCombined ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Layers className="w-4 h-4" />
              )}
              Download Combined Comparison PDF
            </button>

            <button
              type="button"
              onClick={handleDownloadZip}
              disabled={downloadingZip}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-xs sm:text-sm font-medium rounded-md border border-slate-300 transition"
            >
              {downloadingZip ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileArchive className="w-4 h-4 text-slate-600" />
              )}
              Download Originals (ZIP)
            </button>
          </div>
        </div>

        {/* Success Alert Banner */}
        {successToast && (
          <div className="mt-3 flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-2 rounded-md text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            {successToast}
          </div>
        )}

        {/* Drug Selection Pickers (for 3+ or changing pair) */}
        <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Drug 1 Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pane A Document:
            </label>
            <select
              value={drug1Id}
              onChange={(e) => setDrug1Id(e.target.value)}
              className="w-full text-xs sm:text-sm border border-slate-300 rounded px-2.5 py-1.5 bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              {drugs.map((d) => (
                <option key={`drug1-${d.id}`} value={d.id}>
                  {d.name} {d.categoryName ? `(${d.categoryName})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Drug 2 Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pane B Document:
            </label>
            <select
              value={drug2Id}
              onChange={(e) => setDrug2Id(e.target.value)}
              className="w-full text-xs sm:text-sm border border-slate-300 rounded px-2.5 py-1.5 bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              {drugs.map((d) => (
                <option key={`drug2-${d.id}`} value={d.id}>
                  {d.name} {d.categoryName ? `(${d.categoryName})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="flex sm:hidden border-b border-slate-200 bg-white rounded-t-lg">
        <button
          type="button"
          onClick={() => setActiveMobileTab('left')}
          className={`flex-1 py-2 text-xs font-medium text-center border-b-2 ${
            activeMobileTab === 'left'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          {selectedDrug1?.name || 'Pane A'}
        </button>
        <button
          type="button"
          onClick={() => setActiveMobileTab('right')}
          className={`flex-1 py-2 text-xs font-medium text-center border-b-2 ${
            activeMobileTab === 'right'
              ? 'border-blue-600 text-blue-600 bg-blue-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          {selectedDrug2?.name || 'Pane B'}
        </button>
      </div>

      {/* Dual Viewer Panes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 min-h-[600px]">
        {/* Left Pane (Drug 1) */}
        <div
          className={`flex flex-col bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm ${
            activeMobileTab === 'right' ? 'hidden sm:flex' : 'flex'
          }`}
        >
          <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-800">
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              {selectedDrug1?.name}
            </span>
            <span className="text-slate-500 text-[11px]">Original Document</span>
          </div>
          <div className="flex-1 min-h-[500px]">
            {loading1 ? (
              <div className="h-full flex items-center justify-center p-8 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mr-2 text-blue-600" />
                Loading {selectedDrug1?.name}...
              </div>
            ) : error1 ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center text-red-600">
                <AlertCircle className="w-8 h-8 mb-2" />
                <p className="text-xs font-medium">{error1}</p>
              </div>
            ) : url1 ? (
              <PdfViewer
                url={url1}
                drugId={drug1Id}
                drugName={selectedDrug1?.name}
                height="100%"
              />
            ) : null}
          </div>
        </div>

        {/* Right Pane (Drug 2) */}
        <div
          className={`flex flex-col bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm ${
            activeMobileTab === 'left' ? 'hidden sm:flex' : 'flex'
          }`}
        >
          <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-800">
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              {selectedDrug2?.name}
            </span>
            <span className="text-slate-500 text-[11px]">Original Document</span>
          </div>
          <div className="flex-1 min-h-[500px]">
            {loading2 ? (
              <div className="h-full flex items-center justify-center p-8 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mr-2 text-blue-600" />
                Loading {selectedDrug2?.name}...
              </div>
            ) : error2 ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center text-red-600">
                <AlertCircle className="w-8 h-8 mb-2" />
                <p className="text-xs font-medium">{error2}</p>
              </div>
            ) : url2 ? (
              <PdfViewer
                url={url2}
                drugId={drug2Id}
                drugName={selectedDrug2?.name}
                height="100%"
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

