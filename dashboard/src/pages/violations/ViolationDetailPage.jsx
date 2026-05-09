import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LuChevronLeft } from 'react-icons/lu';

import { apiService } from '../../services/api';
import StatusBadge from '../../components/ui/StatusBadge';
import AttachmentGallery from '../../components/attachments/AttachmentGallery';

function formatDate(v) {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('ar-SA');
}

function Field({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-6 py-3 border-b border-slate-100 last:border-b-0">
      <div className="text-xs font-black text-slate-400 uppercase tracking-widest shrink-0">{label}</div>
      <div className="text-sm font-bold text-slate-700 text-left break-words">{value ?? '—'}</div>
    </div>
  );
}

export default function ViolationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data } = await apiService.get(`/violations/${id}`);
      setRow(data.data);
    } catch {
      toast.error('تعذر تحميل المخالفة');
      navigate('/violations');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount data fetch
    void load();
  }, [load]);

  const galleryItems = useMemo(() => {
    if (!row || !id) return [];
    const slots = [
      { key: 'vehicle', label: 'صورة المركبة', url: row.vehicleImageUrl },
      { key: 'violation', label: 'صورة المخالفة', url: row.violationImageUrl },
      { key: 'bike', label: 'صورة الدراجة', url: row.bikeImageUrl },
    ];
    return slots
      .filter((s) => s.url)
      .map((s) => ({
        key: s.key,
        label: s.label,
        fileUrl: s.url,
        fileName: String(s.url).split('/').pop(),
        downloadUrl: `/violations/${id}/files/${s.key}/download`,
      }));
  }, [row, id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-brand-light border-t-brand-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!row) return null;

  return (
    <div className="page-container animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">تفاصيل المخالفة</h2>
          <p className="text-xs font-bold text-slate-400 mt-1">الصور والبيانات</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/violations')}
          className="btn bg-slate-100 text-slate-600 hover:bg-slate-200 !rounded-2xl flex items-center gap-2"
        >
          <LuChevronLeft size={18} />
          عودة للقائمة
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <AttachmentGallery items={galleryItems} title="صور المخالفة" />
        </div>
        <div className="bg-white rounded-3xl shadow-premium border border-slate-100 p-6 h-fit">
          <h3 className="text-sm font-black text-slate-800 mb-2">البيانات</h3>
          <Field label="السائق" value={row.user?.fullNameAr} />
          <Field label="حالة الحساب" value={row.user?.accountStatus ? <StatusBadge status={row.user.accountStatus} /> : '—'} />
          <Field label="المركبة" value={row.vehicle?.plateNumber} />
          <Field label="السبب" value={row.reason} />
          <Field label="المبلغ" value={row.amount != null ? `${row.amount} ر.س` : '—'} />
          <Field label="الموقع" value={row.location} />
          <Field label="تاريخ المخالفة" value={formatDate(row.violationDate)} />
          <Field label="الحالة" value={<StatusBadge status={row.status} />} />
          <Field label="ملاحظات المراجعة" value={row.reviewNotes} />
          <Field label="تاريخ التسجيل" value={formatDate(row.createdAt)} />
          {row.penalty && (
            <>
              <Field label="نوع الجزاء" value={row.penalty.type} />
              <Field label="مبلغ الجزاء" value={row.penalty.amount != null ? `${row.penalty.amount} ر.س` : '—'} />
              <Field label="حالة الجزاء" value={<StatusBadge status={row.penalty.status} />} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
