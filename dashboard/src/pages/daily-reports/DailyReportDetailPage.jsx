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

export default function DailyReportDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data } = await apiService.get(`/daily-reports/${id}`);
      setRow(data.data);
    } catch {
      toast.error('تعذر تحميل التقرير');
      navigate('/daily-reports');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount data fetch
    void load();
  }, [load]);

  const galleryItems = useMemo(() => {
    if (!row?.screenshots?.length || !id) return [];
    return row.screenshots.map((shot, idx) => ({
      key: `shot-${shot.id ?? idx}`,
      label: shot.fileName || `لقطة ${idx + 1}`,
      fileUrl: shot.fileUrl,
      fileName: shot.fileName,
      downloadUrl: `/daily-reports/${id}/screenshots/${shot.id}/download`,
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
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">تفاصيل التقرير اليومي</h2>
          <p className="text-xs font-bold text-slate-400 mt-1">لقطات الشاشة وتفصيل المنصات</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/daily-reports')}
          className="btn bg-slate-100 text-slate-600 hover:bg-slate-200 !rounded-2xl flex items-center gap-2"
        >
          <LuChevronLeft size={18} />
          عودة للقائمة
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <AttachmentGallery items={galleryItems} title="لقطات التقرير" />
          {row.appBreakdowns?.length > 0 && (
            <div className="bg-white rounded-3xl shadow-premium border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 text-sm font-black text-slate-800">تفصيل المنصات</div>
              <div className="table-responsive">
                <table className="w-full text-start text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs font-bold text-slate-500">
                      <th className="px-4 py-3">المنصة</th>
                      <th className="px-4 py-3">الطلبات</th>
                      <th className="px-4 py-3">الساعات</th>
                      <th className="px-4 py-3">الأرباح</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {row.appBreakdowns.map((b) => (
                      <tr key={b.id ?? `${b.platformName}-${b.orders}`}>
                        <td className="px-4 py-3 font-bold text-slate-700">{b.platformName}</td>
                        <td className="px-4 py-3">{b.orders ?? '—'}</td>
                        <td className="px-4 py-3">{b.hours ?? '—'}</td>
                        <td className="px-4 py-3">{b.earnings != null ? `${b.earnings} ر.س` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        <div className="bg-white rounded-3xl shadow-premium border border-slate-100 p-6 h-fit">
          <h3 className="text-sm font-black text-slate-800 mb-2">البيانات</h3>
          <Field label="السائق" value={row.user?.fullNameAr} />
          <Field label="تاريخ التقرير" value={formatDate(row.reportDate)} />
          <Field label="إجمالي الساعات" value={row.totalHours != null ? String(row.totalHours) : '—'} />
          <Field label="إجمالي الطلبات" value={row.totalOrders != null ? String(row.totalOrders) : '—'} />
          <Field label="الحالة" value={<StatusBadge status={row.status} />} />
          <Field label="ملاحظات" value={row.notes} />
          <Field label="ملاحظات المراجعة" value={row.reviewNotes} />
          <Field label="تاريخ الإنشاء" value={formatDate(row.createdAt)} />
          {row.shift && (
            <>
              <Field label="بداية الشفت" value={formatDate(row.shift.startedAt)} />
              <Field label="نهاية الشفت" value={formatDate(row.shift.endedAt)} />
              <Field label="عداد البداية" value={row.shift.startOdometer != null ? String(row.shift.startOdometer) : '—'} />
              <Field label="عداد النهاية" value={row.shift.endOdometer != null ? String(row.shift.endOdometer) : '—'} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
