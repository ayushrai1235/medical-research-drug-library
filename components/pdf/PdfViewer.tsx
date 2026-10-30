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

type DeviceCategory = 'mobile' | 'tablet' | 'desktop';

function getDeviceCategory(width: number): DeviceCategory {
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
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
  const currentRenderTaskRef = useRef<any>(null);
  const renderRafRef = useRef<number | null>(null);
  const currentPageObjRef = useRef<any>(null);
  const userHasManuallyZoomedRef = useRef<boolean>(false);
  const lastDeviceCategoryRef = useRef<DeviceCategory | null>(null);

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(0.8);
  const [rotation, setRotation] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRenderingPage, setIsRenderingPage] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [hasReportedView, setHasReportedView] = useState<boolean>(false);

  // Calculate Fit to Width based on container and page dimensions
  const calculateFitToWidthScale = useCallback((pageObj?: any): number => {
    if (!containerRef.current) return 0.8;
    const containerWidth = containerRef.current.clientWidth;
    // Horizontal padding in viewport area (e.g. 16px left + 16px right = 32px + 8px leeway)
    const availableWidth = Math.max(containerWidth - 40, 200);

    const targetPage = pageObj || currentPageObjRef.current;
    if (targetPage) {
      try {
        const unscaledViewport = targetPage.getViewport({ scale: 1, rotation });
        if (unscaledViewport.width > 0) {
          const fit = availableWidth / unscaledViewport.width;
          return Math.round(Math.min(Math.max(fit, 0.4), 2.5) * 100) / 100;
        }
      } catch {}
    }

    // Default standard A4 page width estimation (~595px)
    const estimated = availableWidth / 595.28;
    return Math.round(Math.min(Math.max(estimated, 0.4), 2.5) * 100) / 100;
  }, [rotation]);

  // Determine initial scale based on device breakpoint
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const category = getDeviceCategory(window.innerWidth);
    lastDeviceCategoryRef.current = category;

    if (category === 'mobile') {
      setScale(0.6); // 60% default for mobile phones
    } else if (category === 'desktop') {
      setScale(0.8); // 80% default for desktop and laptops
    } else {
      // Tablet default: Fit to width
      setScale(calculateFitToWidthScale());
    }
  }, [calculateFitToWidthScale]);

  // Recalculate zoom when crossing device breakpoints; preserve manual zoom otherwise
  useEffect(() => {
    const handleResize = () => {
      if (typeof window === 'undefined') return;
      const currentCategory = getDeviceCategory(window.innerWidth);

      if (lastDeviceCategoryRef.current !== currentCategory) {
        // Viewport crossed device breakpoint!
        lastDeviceCategoryRef.current = currentCategory;
        userHasManuallyZoomedRef.current = false; // Reset manual override flag

        if (currentCategory === 'mobile') {
          setScale(0.6);
        } else if (currentCategory === 'desktop') {
          setScale(0.8);
        } else {
          setScale(calculateFitToWidthScale(currentPageObjRef.current));
        }
      } else if (currentCategory === 'tablet' && !userHasManuallyZoomedRef.current) {
        // If resized within tablet breakpoint and user hasn't overridden zoom, keep fit-to-width
        setScale(calculateFitToWidthScale(currentPageObjRef.current));
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateFitToWidthScale]);

  // Initialize PDF.js and load document
  useEffect(() => {
    let isMounted = true;
    let loadingTask: any = null;

    async function loadPdf() {
      setLoading(true);
      setError(null);

      try {
        const pdfjsLib = await import('pdfjs-dist');
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

        // Fetch first page to compute exact fit-to-width if needed
        try {
          const firstPage = await doc.getPage(1);
          if (isMounted) {
            currentPageObjRef.current = firstPage;
            if (typeof window !== 'undefined') {
              const category = getDeviceCategory(window.innerWidth);
              if (category === 'tablet' && !userHasManuallyZoomedRef.current) {
                setScale(calculateFitToWidthScale(firstPage));
              }
            }
          }
        } catch {}

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
        setError(err.message || 'Unable to load PDF document. Please check your network or download the file directly.');
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
  }, [url, drugId, drugName, calculateFitToWidthScale, onDocumentLoaded, hasReportedView]);

  // High-DPI, Device-Pixel-Ratio aware rendering with lazy cleanup and RAF scheduling
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;

    // Cancel any existing page render in-flight to prevent race conditions or memory buildup
    if (currentRenderTaskRef.current) {
      try {
        currentRenderTaskRef.current.cancel();
      } catch {}
      currentRenderTaskRef.current = null;
    }

    if (renderRafRef.current) {
      cancelAnimationFrame(renderRafRef.current);
      renderRafRef.current = null;
    }

    setIsRenderingPage(true);

    // Yield to the browser compositor so button taps and scale labels paint in frame 0
    renderRafRef.current = requestAnimationFrame(async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        currentPageObjRef.current = page;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d', { alpha: false });
        if (!context) return;

        // 1. Calculate device pixel ratio (clamped between 1 and 3 for memory safety on high-DPI mobile)
        const rawDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
        const outputScale = Math.min(Math.max(rawDpr, 1), 3);

        // 2. Base viewport at logical CSS zoom level
        const viewport = page.getViewport({ scale, rotation });

        // 3. Separate canvas backing resolution (physical pixels) from CSS display dimensions
        const displayWidth = Math.floor(viewport.width);
        const displayHeight = Math.floor(viewport.height);

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);

        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;

        // 4. Set transform matrix so PDF.js draws into high-resolution buffer with vector crispness
        const transform = outputScale !== 1
          ? [outputScale, 0, 0, outputScale, 0, 0]
          : null;

        const renderContext = {
          canvasContext: context,
          viewport,
          transform,
        };

        const renderTask = page.render(renderContext);
        currentRenderTaskRef.current = renderTask;

        await renderTask.promise;
      } catch (err: any) {
        if (err?.name === 'RenderingCancelledException') {
          // Expected cancellation when user quickly scrolls or resizes
          return;
        }
        console.error('Page render error:', err);
      } finally {
        setIsRenderingPage(false);
        currentRenderTaskRef.current = null;
      }
    });
  }, [pdfDoc, currentPage, scale, rotation]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  // Cleanup render tasks and RAF on unmount
  useEffect(() => {
    return () => {
      if (renderRafRef.current) {
        cancelAnimationFrame(renderRafRef.current);
      }
      if (currentRenderTaskRef.current) {
        try {
          currentRenderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, []);

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

  // Manual Zoom controls - flags that user made an explicit choice
  const handleZoomIn = () => {
    userHasManuallyZoomedRef.current = true;
    setScale((s) => Math.min(Math.round((s + 0.15) * 100) / 100, 3.0));
  };

  const handleZoomOut = () => {
    userHasManuallyZoomedRef.current = true;
    setScale((s) => Math.max(Math.round((s - 0.15) * 100) / 100, 0.4));
  };

  const handleFitWidth = () => {
    userHasManuallyZoomedRef.current = true;
    setScale(calculateFitToWidthScale(currentPageObjRef.current));
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
      className={`flex flex-col bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-sm ${className}`}
      style={{ height }}
    >
      {/* Top Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-slate-800 text-slate-200 border-b border-slate-700 text-xs sm:text-sm">
        {/* Document Info / Title */}
        <div className="flex items-center gap-2 truncate font-medium text-slate-200 min-w-0">
          <FileText className="w-4 h-4 text-blue-400 shrink-0" />
          <span className="truncate max-w-[130px] sm:max-w-[280px]" title={drugName}>
            {drugName}
          </span>
          {isRenderingPage && (
            <span className="hidden sm:inline-flex items-center text-[10px] text-blue-400 gap-1 ml-1 font-normal">
              <Loader2 className="w-3 h-3 animate-spin" />
              Sharpening...
            </span>
          )}
        </div>

        {/* Page Navigation Controls */}
        <div className="flex items-center gap-1 bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-700/80">
          <button
            type="button"
            onClick={handlePrevPage}
            disabled={currentPage <= 1 || loading}
            aria-label="Previous Page"
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-700 active:bg-slate-600 active:scale-90 disabled:opacity-30 disabled:hover:bg-transparent text-slate-200 transition-all duration-75 touch-manipulation cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-1 text-slate-300 tabular-nums text-xs font-semibold">
            {loading ? '-' : `${currentPage} / ${numPages}`}
          </span>
          <button
            type="button"
            onClick={handleNextPage}
            disabled={currentPage >= numPages || loading}
            aria-label="Next Page"
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-700 active:bg-slate-600 active:scale-90 disabled:opacity-30 disabled:hover:bg-transparent text-slate-200 transition-all duration-75 touch-manipulation cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom & View Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 ml-auto sm:ml-0">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={scale <= 0.4 || loading}
            aria-label="Zoom Out"
            title="Zoom Out"
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-700 active:bg-slate-600 active:scale-90 disabled:opacity-30 text-slate-300 transition-all duration-75 touch-manipulation cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleFitWidth}
            disabled={loading}
            aria-label="Fit to Width"
            title="Fit to Width"
            className="px-2.5 h-8 text-xs font-semibold rounded-lg bg-slate-700 hover:bg-slate-600 active:bg-slate-500 active:scale-95 text-slate-200 transition-all duration-75 flex items-center touch-manipulation cursor-pointer"
          >
            Fit
          </button>

          <span className="text-xs text-slate-300 w-10 sm:w-12 text-center tabular-nums font-medium">
            {Math.round(scale * 100)}%
          </span>

          <button
            type="button"
            onClick={handleZoomIn}
            disabled={scale >= 3.0 || loading}
            aria-label="Zoom In"
            title="Zoom In"
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-700 active:bg-slate-600 active:scale-90 disabled:opacity-30 text-slate-300 transition-all duration-75 touch-manipulation cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleRotate}
            disabled={loading}
            aria-label="Rotate Page"
            title="Rotate 90 degrees"
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-700 active:bg-slate-600 active:scale-90 text-slate-300 transition-all duration-75 touch-manipulation cursor-pointer"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            title="Toggle Fullscreen"
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-700 active:bg-slate-600 active:scale-90 text-slate-300 transition-all duration-75 touch-manipulation cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {drugId && (
            <a
              href={`/api/download/individual?drugId=${drugId}`}
              download
              aria-label="Download original PDF"
              title="Download original PDF"
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-700 active:bg-slate-600 active:scale-90 text-blue-400 transition-all duration-75 touch-manipulation cursor-pointer"
            >
              <Download className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {/* Main Canvas Scroll Area (Device-pixel-ratio aware) */}
      <div
        className="flex-1 overflow-auto bg-slate-950 p-2 sm:p-4 flex relative min-h-0"
        style={{
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
        }}
      >
        {loading && (
          <div className="m-auto flex flex-col items-center justify-center gap-3 text-slate-300 p-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-sm font-medium">Loading high-resolution research document...</p>
          </div>
        )}

        {error && (
          <div className="m-auto flex flex-col items-center justify-center p-6 text-center max-w-md bg-slate-900 border border-red-900/50 rounded-xl">
            <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
            <h4 className="text-base font-semibold text-slate-200 mb-1">Document Display Notice</h4>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">{error}</p>
            {drugId && (
              <a
                href={`/api/download/individual?drugId=${drugId}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition"
              >
                <Download className="w-4 h-4" />
                Download Original PDF
              </a>
            )}
          </div>
        )}

        <canvas
          ref={canvasRef}
          className={`m-auto shadow-2xl bg-white max-w-none block shrink-0 ${
            loading || error ? 'hidden' : 'block'
          }`}
        />
      </div>
    </div>
  );
}
