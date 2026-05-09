import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { LuChevronLeft, LuChevronRight, LuDownload, LuFileQuestion } from 'react-icons/lu';

import api from '../../services/api';
import PdfViewer from '../pdf/PdfViewer';
import { resolveUploadUrl } from '../../utils/apiOrigin';
import { guessFileKind, pickFilename, downloadBlob } from '../../utils/attachments';

/**
 * @typedef {{ key: string, label: string, fileUrl: string, fileName?: string, mimeType?: string, downloadUrl: string }} GalleryItem
 */
function AttachmentGalleryInner({ list, title = 'المرفقات' }) {
  const [index, setIndex] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [pdfBlob, setPdfBlob] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const safeIndex = list.length ? Math.min(index, list.length - 1) : 0;
  const current = list[safeIndex];

  const kind = useMemo(
    () =>
      current
        ? guessFileKind({
            fileUrl: current.fileUrl,
            fileName: current.fileName,
            mimeType: current.mimeType,
          })
        : 'other',
    [current],
  );

  const imgSrc = useMemo(() => (current ? resolveUploadUrl(current.fileUrl) : ''), [current]);

  useEffect(() => {
    let cancelled = false;

    async function loadPdf() {
      if (!current || kind !== 'pdf' || !current.downloadUrl) {
        setPdfBlob(null);
        setPdfLoading(false);
        return;
      }
      setPdfLoading(true);
      try {
        const res = await api.get(current.downloadUrl, { responseType: 'blob' });
        if (!cancelled) setPdfBlob(res.data);
      } catch {
        if (!cancelled) {
          setPdfBlob(null);
          toast.error('تعذر معاينة ملف PDF');
        }
      } finally {
        if (!cancelled) setPdfLoading(false);
      }
    }

    loadPdf();
    return () => {
      cancelled = true;
    };
  }, [current, kind, current?.downloadUrl]);

  const goPrev = useCallback(() => {
    setIndex((i) => (list.length ? (i - 1 + list.length) % list.length : 0));
  }, [list.length]);

  const goNext = useCallback(() => {
    setIndex((i) => (list.length ? (i + 1) % list.length : 0));
  }, [list.length]);

  const onDownload = useCallback(async () => {
    if (!current?.downloadUrl) return;
    setDownloading(true);
    try {
      const res = await api.get(current.downloadUrl, { responseType: 'blob' });
      const filename = pickFilename({
        contentDisposition: res.headers?.['content-disposition'],
        fallback: current.fileName,
      });
      downloadBlob({ blob: res.data, filename });
    } catch {
      toast.error('تعذر تنزيل الملف');
    } finally {
      setDownloading(false);
    }
  }, [current]);

  const showArrows = list.length > 1;

  return (
    <div className="bg-white rounded-3xl shadow-premium border border-slate-100 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 gap-4 flex-wrap">
        <div className="text-sm font-black text-slate-800">{title}</div>
        <div className="flex items-center gap-2">
          {showArrows && (
            <>
              <button
                type="button"
                onClick={goNext}
                className="w-10 h-10 rounded-2xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
                aria-label="التالي"
              >
                <LuChevronRight size={20} />
              </button>
              <span className="text-xs font-bold text-slate-500 tabular-nums">
                {safeIndex + 1} / {list.length}
              </span>
              <button
                type="button"
                onClick={goPrev}
                className="w-10 h-10 rounded-2xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
                aria-label="السابق"
              >
                <LuChevronLeft size={20} />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onDownload}
            disabled={downloading}
            className="btn btn-primary !rounded-2xl !py-2 !px-4 flex items-center gap-2 text-sm disabled:opacity-60"
          >
            <LuDownload size={16} />
            {downloading ? 'جارٍ التنزيل...' : 'تنزيل'}
          </button>
        </div>
      </div>

      <div className="px-6 py-2 border-b border-slate-50">
        <div className="text-xs font-bold text-slate-500">{current.label}</div>
        {current.fileName && <div className="text-xs text-slate-400 mt-0.5">{current.fileName}</div>}
      </div>

      <div className="p-6">
        {kind === 'image' && (
          <div className="rounded-2xl overflow-hidden border border-slate-100 bg-slate-50">
            <img src={imgSrc} alt={current.label} className="w-full max-h-[70vh] object-contain" loading="lazy" />
          </div>
        )}
        {kind === 'pdf' && (
          <div className="rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 max-h-[75vh] overflow-y-auto">
            {pdfLoading ? (
              <div className="flex items-center justify-center h-[50vh]">
                <div className="w-10 h-10 border-4 border-brand-light border-t-brand-primary rounded-full animate-spin" />
              </div>
            ) : (
              <PdfViewer file={pdfBlob} emptyLabel="تعذر عرض المعاينة" />
            )}
          </div>
        )}
        {kind === 'other' && (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-10 flex flex-col items-center gap-3 text-slate-500">
            <LuFileQuestion size={40} />
            <p className="text-sm font-bold">معاينة غير متاحة لهذا النوع</p>
            <p className="text-xs">استخدم زر التنزيل لحفظ الملف</p>
          </div>
        )}
      </div>

      {showArrows && (
        <div className="flex justify-center gap-2 pb-6 flex-wrap px-6">
          {list.map((item, i) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setIndex(i)}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                i === safeIndex ? 'bg-brand-primary scale-125' : 'bg-slate-300 hover:bg-slate-400'
              }`}
              aria-label={item.label}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * @param {{ items: GalleryItem[], title?: string }} props
 */
export default function AttachmentGallery({ items, title = 'المرفقات' }) {
  const list = useMemo(() => (items || []).filter((i) => i?.fileUrl), [items]);
  const remountKey = useMemo(() => list.map((i) => i.key).join('|'), [list]);

  if (!list.length) {
    return (
      <div className="bg-white rounded-3xl shadow-premium border border-slate-100 p-8 text-center">
        <div className="text-sm font-black text-slate-500">{title}</div>
        <p className="text-xs font-bold text-slate-400 mt-2">لا توجد مرفقات</p>
      </div>
    );
  }

  return <AttachmentGalleryInner key={remountKey} list={list} title={title} />;
}
