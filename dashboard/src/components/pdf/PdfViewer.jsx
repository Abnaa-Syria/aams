import { useCallback, useEffect, useRef, useState } from 'react';
import { Document, Page } from 'react-pdf';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

const MAX_PAGE_WIDTH = 820;

/**
 * Renders a PDF from a Blob (e.g. authenticated download) using react-pdf.
 * @param {{ file: Blob | null | undefined, className?: string, emptyLabel?: string }} props
 */
export default function PdfViewer({ file, className = '', emptyLabel = 'لا يوجد ملف' }) {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(MAX_PAGE_WIDTH);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width;
      if (w && w > 0) setContainerWidth(Math.min(MAX_PAGE_WIDTH, Math.floor(w - 8)));
    });
    ro.observe(el);
    const initial = el.getBoundingClientRect().width;
    if (initial > 0) setContainerWidth(Math.min(MAX_PAGE_WIDTH, Math.floor(initial - 8)));

    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setPageNumber(1);
    setNumPages(0);
    setLoadError(null);
  }, [file]);

  const onDocumentLoadSuccess = useCallback(({ numPages: n }) => {
    setNumPages(n);
    setLoadError(null);
    setPageNumber(1);
  }, []);

  const onDocumentLoadError = useCallback((err) => {
    setLoadError(err);
  }, []);

  const goPrev = useCallback(() => {
    setPageNumber((p) => Math.max(1, p - 1));
  }, []);

  const goNext = useCallback(() => {
    setPageNumber((p) => (numPages ? Math.min(numPages, p + 1) : p));
  }, [numPages]);

  if (!file) {
    return (
      <div className={`flex items-center justify-center min-h-[200px] text-sm font-bold text-slate-500 ${className}`}>
        {emptyLabel}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`flex flex-col items-stretch ${className}`}>
      {numPages > 1 && (
        <div className="flex items-center justify-center gap-3 py-3 border-b border-slate-100 bg-slate-50/80">
          <button
            type="button"
            onClick={goPrev}
            disabled={pageNumber <= 1}
            className="w-10 h-10 rounded-2xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-white disabled:opacity-40"
            aria-label="صفحة سابقة"
          >
            <LuChevronRight size={20} />
          </button>
          <span className="text-xs font-bold text-slate-600 tabular-nums">
            {pageNumber} / {numPages}
          </span>
          <button
            type="button"
            onClick={goNext}
            disabled={pageNumber >= numPages}
            className="w-10 h-10 rounded-2xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-white disabled:opacity-40"
            aria-label="صفحة تالية"
          >
            <LuChevronLeft size={20} />
          </button>
        </div>
      )}

      <div className="flex justify-center overflow-auto bg-slate-100/50 py-4 min-h-[200px]">
        <Document
          file={file}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-brand-light border-t-brand-primary rounded-full animate-spin" />
            </div>
          }
        >
          {!loadError ? (
            <Page
              pageNumber={pageNumber}
              width={containerWidth}
              renderTextLayer
              renderAnnotationLayer
              className="shadow-lg rounded-sm overflow-hidden"
            />
          ) : null}
        </Document>
      </div>

      {loadError ? (
        <div className="text-center text-sm font-bold text-red-600 py-4 px-4">تعذر عرض ملف PDF</div>
      ) : null}
    </div>
  );
}
