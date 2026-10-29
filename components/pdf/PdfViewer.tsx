'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCw,
  Download,
  AlertCircle,
  Loader2,
  FileText,
} from 'lucide-react';

interface PdfViewerProps {
  url: string;
  drugId?: string;
  drugName?: string;
  onDocumentLoaded?: (pageCount: number) => void;
  className?: string;
  height?: string;
}

export function PdfViewer({
  url,
  drugId,
  drugName = 'Drug Document',
  onDocumentLoaded,
  className = '',
  height = 'calc(100vh - 220px)',
}: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.2);
  const [rotation, setRotation] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [hasReportedView, setHasReportedView] = useState<boolean>(false);

  // Initialize PDF.js
  useEffect(() => {
    let isMounted = true;
    let loadingTask: any = null;

    async function loadPdf() {
      setLoading(true);
      setError(null);

      try {
        const pdfjsLib = await import('pdfjs-dist');
        // Point worker to standard cdnjs/unpkg or use modern ESM worker
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

        loadingTask = pdfjsLib.getDocument({
          url,
          withCredentials: false,
        });

        const doc = await loadingTask.promise;
        if (!isMounted) return;

        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setCurrentPage(1);
        setLoading(false);

        if (onDocumentLoaded) {
          onDocumentLoaded(doc.numPages);
        }

        // Track pdf_viewed event once per document load
        if (drugId && !hasReportedView) {
          setHasReportedView(true);
          fetch('/api/activity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'pdf_viewed',
              drugId,
              details: {
                drugName,
                pageCount: doc.numPages,
              },
            }),
          }).catch((err) => console.error('Error logging pdf_viewed:', err));
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error('PDF load error:', err);
        setError(err.message || 'Unable to load PDF document. Please check the network or download the file directly.');
        setLoading(false);
      }
    }

    if (url) {
      loadPdf();
    }

    return () => {
      isMounted = false;
      if (loadingTask) {
        try {
          loadingTask.destroy();
        } catch {}
      }
    };
  }, [url, drugId, drugName]);

  // Render current page on canvas
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;

    try {
      const page = await pdfDoc.getPage(currentPage);
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      const viewport = page.getViewport({ scale, rotation });
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport,
      };

      await page.render(renderContext).promise;
    } catch (err) {
      console.error('Page render error:', err);
    }
  }, [pdfDoc, currentPage, scale, rotation]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  // Page navigation handlers
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < numPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.2, 3.0));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.2, 0.6));
  const handleFitWidth = () => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth - 48;
      // Default standard page width ~600
      setScale(Math.max(containerWidth / 600, 0.8));
    }
  };

  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrevPage();
      if (e.key === 'ArrowRight') handleNextPage();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, numPages]);

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-slate-900 border border-slate-700 rounded-lg overflow-hidden select-none ${className}`}
      style={{ height }}
    >
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-800 text-slate-200 border-b border-slate-700 text-xs sm:text-sm">
        {/* Document Info / Title */}
        <div className="flex items-center gap-2 truncate font-medium text-slate-300">
          <FileText className="w-4 h-4 text-blue-400 shrink-0" />
          <span className="truncate max-w-[200px] sm:max-w-[300px]" title={drugName}>
            {drugName}
          </span>
        </div>

        {/* Page Controls */}
        <div className="flex items-center gap-1.5 bg-slate-900/60 px-2 py-1 rounded border border-slate-700">
          <button
            type="button"
            onClick={handlePrevPage}
            disabled={currentPage <= 1 || loading}
            aria-label="Previous Page"
            className="p-1 rounded hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-1 text-slate-300 tabular-nums">
            {loading ? '-' : `${currentPage} / ${numPages}`}
          </span>
          <button
            type="button"
            onClick={handleNextPage}
            disabled={currentPage >= numPages || loading}
            aria-label="Next Page"
            className="p-1 rounded hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom & View Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={scale <= 0.6 || loading}
            aria-label="Zoom Out"
            title="Zoom Out"
            className="p-1.5 rounded hover:bg-slate-700 disabled:opacity-40 text-slate-300"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleFitWidth}
            disabled={loading}
            aria-label="Fit to width"
            title="Fit Width"
            className="px-2 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 text-slate-200"
          >
            Fit
          </button>

          <span className="text-xs text-slate-400 w-11 text-center tabular-nums">
            {Math.round(scale * 100)}%
          </span>

          <button
            type="button"
            onClick={handleZoomIn}
            disabled={scale >= 3.0 || loading}
            aria-label="Zoom In"
            title="Zoom In"
            className="p-1.5 rounded hover:bg-slate-700 disabled:opacity-40 text-slate-300"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleRotate}
            disabled={loading}
            aria-label="Rotate Page"
            title="Rotate 90 degrees"
            className="p-1.5 rounded hover:bg-slate-700 text-slate-300"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            title="Toggle Fullscreen"
            className="p-1.5 rounded hover:bg-slate-700 text-slate-300"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {drugId && (
            <a
              href={`/api/download/individual?drugId=${drugId}`}
              download
              aria-label="Download original PDF"
              title="Download original PDF"
              className="p-1.5 rounded hover:bg-slate-700 text-blue-400"
            >
              <Download className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {/* Main PDF Canvas Area */}
      <div className="flex-1 overflow-auto bg-slate-950 p-4 flex items-center justify-center relative">
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 text-slate-300">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-sm font-medium">Loading research document...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center p-6 text-center max-w-md bg-slate-900 border border-red-900/50 rounded-lg">
            <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
            <h4 className="text-base font-semibold text-slate-200 mb-1">Document Display Notice</h4>
            <p className="text-xs text-slate-400 mb-4">{error}</p>
            {drugId && (
              <a
                href={`/api/download/individual?drugId=${drugId}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition"
              >
                <Download className="w-4 h-4" />
                Download Original PDF
              </a>
            )}
          </div>
        )}

        <canvas
          ref={canvasRef}
          className={`shadow-2xl bg-white max-w-none transition-transform duration-75 ${
            loading || error ? 'hidden' : 'block'
          }`}
          style={{ imageRendering: 'crisp-edges' }}
        />
      </div>
    </div>
  );
}
