import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LuChevronLeft, LuDownload, LuFileText, LuUser, LuCalendar } from 'react-icons/lu';

import api, { apiService } from '../../services/api';
import StatusBadge from '../../components/ui/StatusBadge';
import PdfViewer from '../../components/pdf/PdfViewer';
import { resolveUploadUrl } from '../../utils/apiOrigin';

const typeLabels = {
  NATIONAL_ID: 'هوية وطنية',
  IQAMA: 'إقامة',
  PASSPORT: 'جواز سفر',
  WORK_CONTRACT: 'عقد عمل',
  RESIDENCE_PERMIT: 'تصريح إقامة',
  OTHER: 'أخرى',
};

function formatDate(v) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ar-SA');
}

function formatDateTime(v) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('ar-SA');
}

function guessFileKind({ fileUrl, fileName }) {
  const url = String(fileUrl || '');
  if (/images\.unsplash\.com\//i.test(url)) return 'image';
  const s = `${fileName || ''} ${url}`.toLowerCase();
  if (/\.(png|jpe?g|webp|gif)(\?|#|$)/.test(s)) return 'image';
  if (/\.(pdf)(\?|#|$)/.test(s)) return 'pdf';
  return 'other';
}

function Field({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-6 py-3 border-b border-slate-100 last:border-b-0">
      <div className="text-xs font-black text-slate-400 uppercase tracking-widest">{label}</div>
      <div className="text-sm font-bold text-slate-700 text-left break-words">{value ?? '—'}</div>
    </div>
  );
}

function pickFilename({ contentDisposition, fallback }) {
  const cd = contentDisposition || '';
  const mStar = cd.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (mStar?.[1]) {
    try {
      return decodeURIComponent(mStar[1].replace(/(^"|"$)/g, ''));
    } catch {
      return mStar[1].replace(/(^"|"$)/g, '');
    }
  }
  const m = cd.match(/filename\s*=\s*("?)([^";]+)\1/i);
  if (m?.[2]) return m[2];
  return fallback || 'download';
}

function downloadBlob({ blob, filename }) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'download';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export default function DocumentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [pdfBlob, setPdfBlob] = useState(null);
  const [pdfPreviewLoading, setPdfPreviewLoading] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data } = await apiService.get(`/documents/${id}`);
      setDoc(data.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'تعذر تحميل بيانات المستند');
      navigate('/documents');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  const fileSrc = useMemo(() => resolveUploadUrl(doc?.fileUrl), [doc?.fileUrl]);
  const fileKind = useMemo(
    () => guessFileKind({ fileUrl: doc?.fileUrl, fileName: doc?.fileName }),
    [doc?.fileUrl, doc?.fileName],
  );

  const onDownload = useCallback(async () => {
    if (!id) return;
    setDownloading(true);
    try {
      const res = await api.get(`/documents/${id}/download`, { responseType: 'blob' });
      const filename = pickFilename({
        contentDisposition: res.headers?.['content-disposition'],
        fallback: doc?.fileName,
      });
      downloadBlob({ blob: res.data, filename });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'تعذر تنزيل الملف');
    } finally {
      setDownloading(false);
    }
  }, [doc?.fileName, id]);

  useEffect(() => {
    let cancelled = false;

    async function loadPdfBlob() {
      if (!id || fileKind !== 'pdf') {
        setPdfBlob(null);
        setPdfPreviewLoading(false);
        return;
      }
      setPdfPreviewLoading(true);
      try {
        const res = await api.get(`/documents/${id}/download`, { responseType: 'blob' });
        if (!cancelled) setPdfBlob(res.data);
      } catch {
        if (!cancelled) setPdfBlob(null);
      } finally {
        if (!cancelled) setPdfPreviewLoading(false);
      }
    }

    loadPdfBlob();
    return () => {
      cancelled = true;
    };
  }, [fileKind, id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-brand-light border-t-brand-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!doc) return null;

  return (
    <div className="page-container animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">تفاصيل المستند</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-400">ID: {doc.id}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onDownload}
            disabled={!doc.fileUrl || downloading}
            className="btn btn-primary !rounded-2xl flex items-center gap-2 disabled:opacity-60"
          >
            <LuDownload size={18} />
            {downloading ? 'جارٍ التنزيل...' : 'تنزيل'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/documents')}
            className="btn bg-slate-100 text-slate-600 hover:bg-slate-200 !rounded-2xl flex items-center gap-2"
          >
            <LuChevronLeft size={18} />
            عودة
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Preview */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl shadow-premium border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-light text-brand-primary flex items-center justify-center ring-1 ring-brand-primary/10">
                  <LuFileText size={18} />
                </div>
                <div>
                  <div className="text-sm font-black text-slate-800">{doc.title || '—'}</div>
                  <div className="text-xs font-bold text-slate-400">{doc.fileName || '—'}</div>
                </div>
              </div>
              <StatusBadge status={doc.status} />
            </div>

            <div className="p-6">
              {!fileSrc ? (
                <div className="bg-slate-50 rounded-3xl p-10 text-center border border-slate-100">
                  <div className="text-sm font-black text-slate-700 mb-2">لا يوجد ملف مرفق</div>
                  <div className="text-xs font-bold text-slate-400">يمكنك مراجعة بيانات المستند في القسم التالي</div>
                </div>
              ) : fileKind === 'image' ? (
                <div className="rounded-3xl overflow-hidden border border-slate-100 bg-slate-50">
                  <img
                    src={fileSrc}
                    alt={doc.title || doc.fileName || ''}
                    className="w-full max-h-[70vh] object-contain"
                    loading="lazy"
                  />
                </div>
              ) : fileKind === 'pdf' ? (
                <div className="rounded-3xl overflow-hidden border border-slate-100 bg-slate-50 max-h-[80vh] overflow-y-auto">
                  {pdfPreviewLoading ? (
                    <div className="flex items-center justify-center h-[70vh]">
                      <div className="w-10 h-10 border-4 border-brand-light border-t-brand-primary rounded-full animate-spin" />
                    </div>
                  ) : (
                    <PdfViewer
                      file={pdfBlob}
                      emptyLabel="تعذر تحميل معاينة PDF. جرّب التنزيل."
                    />
                  )}
                </div>
              ) : (
                <div className="bg-slate-50 rounded-3xl p-10 text-center border border-slate-100">
                  <div className="text-sm font-black text-slate-700 mb-2">المعاينة غير متاحة لهذا النوع</div>
                  <div className="text-xs font-bold text-slate-400">استخدم زر التنزيل لفتح الملف</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl shadow-premium border border-slate-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-50 text-slate-500 flex items-center justify-center ring-1 ring-slate-200">
                <LuUser size={18} />
              </div>
              <div>
                <div className="text-sm font-black text-slate-800">بيانات المستند</div>
                <div className="text-xs font-bold text-slate-400">كل المعلومات المتاحة عن المستند</div>
              </div>
            </div>

            <div className="px-6 py-2">
              <Field label="الموظف" value={doc.user?.fullNameAr || '—'} />
              <Field label="النوع" value={typeLabels[doc.type] || doc.type || '—'} />
              <Field label="العنوان" value={doc.title || '—'} />
              <Field label="رقم المستند" value={doc.documentNumber || '—'} />
              <Field label="تاريخ الإصدار" value={formatDate(doc.issueDate)} />
              <Field label="تاريخ الانتهاء" value={formatDate(doc.expiryDate)} />
              <Field label="الحالة" value={<StatusBadge status={doc.status} />} />
              <Field label="اسم الملف" value={doc.fileName || '—'} />
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-premium border border-slate-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-50 text-slate-500 flex items-center justify-center ring-1 ring-slate-200">
                <LuCalendar size={18} />
              </div>
              <div>
                <div className="text-sm font-black text-slate-800">المراجعة والتواريخ</div>
                <div className="text-xs font-bold text-slate-400">تتبع التحديثات والمراجعة</div>
              </div>
            </div>

            <div className="px-6 py-2">
              <Field label="تمت المراجعة بواسطة" value={doc.reviewedBy || '—'} />
              <Field label="تاريخ المراجعة" value={formatDateTime(doc.reviewedAt)} />
              <Field label="ملاحظات المراجعة" value={doc.reviewNotes || '—'} />
              <Field label="تاريخ الإنشاء" value={formatDateTime(doc.createdAt)} />
              <Field label="آخر تحديث" value={formatDateTime(doc.updatedAt)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

