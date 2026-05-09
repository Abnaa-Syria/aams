import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LuChevronLeft } from 'react-icons/lu';

import { apiService } from '../../services/api';
import StatusBadge from '../../components/ui/StatusBadge';

function formatShiftAction(action) {
  switch (action) {
    case 'SHIFT_REQUESTED':
      return 'تم طلب الشفت';
    case 'SHIFT_APPROVED':
      return 'تمت الموافقة على الشفت';
    case 'SHIFT_REJECTED':
      return 'تم رفض الشفت';
    case 'SHIFT_STARTED':
      return 'بدأ الشفت';
    case 'SHIFT_ENDED':
      return 'انتهى الشفت';
    case 'SHIFT_CANCELLED':
      return 'تم إلغاء الشفت';
    case 'SHIFT_CLOSURE_APPROVED':
      return 'تم اعتماد إغلاق الشفت';
    default:
      return action || '—';
  }
}

function formatDateTime(v) {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('ar-SA');
}

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

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-3xl shadow-premium border border-slate-100 overflow-hidden">
      <div className="px-6 pt-6 pb-4 bg-gradient-to-l from-slate-50 via-white to-white">
        <h3 className="text-sm font-black text-slate-800">{title}</h3>
      </div>
      <div className="px-6 pb-6">{children}</div>
    </div>
  );
}

export default function ShiftDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data } = await apiService.get(`/shifts/${id}`);
      setRow(data.data);
    } catch {
      toast.error('تعذر تحميل تفاصيل الشفت');
      navigate('/shifts');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount data fetch
    void load();
  }, [load]);

  const kmText = useMemo(() => {
    const km = row?.kilometersDriven;
    if (km == null) return '—';
    return `${km} كم`;
  }, [row]);

  const breakdown = Array.isArray(row?.platformBreakdown) ? row.platformBreakdown : [];
  const totalOrders = row?.totals?.totalOrders ?? null;
  const totalHours = row?.totals?.totalHours ?? null;

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
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">تفاصيل الشفت</h2>
          <p className="text-xs font-bold text-slate-400 mt-1">عرض البيانات المرتبطة بالشفت</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/shifts')}
          className="btn bg-slate-100 text-slate-600 hover:bg-slate-200 !rounded-2xl flex items-center gap-2"
        >
          <LuChevronLeft size={18} />
          عودة للقائمة
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Section title="ملخص">
            <Field label="رقم الشفت" value={row.id} />
            <Field label="السائق" value={row.user?.fullNameAr || row.user?.fullNameEn} />
            <Field label="المركبة" value={row.vehicle?.plateNumber} />
            <Field
              label="المنصة (الحساب)"
              value={row.platformAccount?.platform?.nameAr || row.platformAccount?.platform?.nameEn}
            />
            <Field label="الحالة" value={<StatusBadge status={row.status} />} />
            <Field label="تاريخ الطلب" value={formatDate(row.requestedAt)} />
            <Field label="وقت البدء" value={formatDateTime(row.startedAt)} />
            <Field label="وقت الانتهاء" value={formatDateTime(row.endedAt)} />
            <Field label="المسافة المقطوعة" value={kmText} />
            <Field
              label="إجمالي الطلبات"
              value={totalOrders == null ? '—' : String(totalOrders)}
            />
            <Field
              label="إجمالي الساعات"
              value={totalHours == null ? '—' : String(totalHours)}
            />
          </Section>

          <Section title="المنصات (الشركات) خلال الشفت">
            {breakdown.length === 0 ? (
              <div className="text-sm font-bold text-slate-500 py-3">لا يوجد تفصيل مسجل لهذا الشفت</div>
            ) : (
              <div className="-mx-6 overflow-x-auto">
                <table className="w-full text-right">
                  <thead className="bg-slate-50/80">
                    <tr>
                      <th className="px-6 py-4 text-xs font-black text-slate-600 uppercase tracking-widest">
                        المنصة
                      </th>
                      <th className="px-6 py-4 text-xs font-black text-slate-600 uppercase tracking-widest">
                        الساعات
                      </th>
                      <th className="px-6 py-4 text-xs font-black text-slate-600 uppercase tracking-widest">
                        الطلبات
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {breakdown.map((b, idx) => (
                      <tr
                        key={`${b.platformName || 'platform'}-${idx}`}
                        className={`transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} hover:bg-brand-light/25`}
                      >
                        <td className="px-6 py-4 text-sm font-black text-slate-800 whitespace-nowrap">
                          {b.platformName || '—'}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-700 whitespace-nowrap">
                          {b.hours ?? '—'}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-700 whitespace-nowrap">
                          {b.orders ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <Section title="سجلات الوقود">
            {Array.isArray(row.fuelLogs) && row.fuelLogs.length > 0 ? (
              <div className="-mx-6 overflow-x-auto">
                <table className="w-full text-right">
                  <thead className="bg-slate-50/80">
                    <tr>
                      <th className="px-6 py-4 text-xs font-black text-slate-600 uppercase tracking-widest">
                        التاريخ
                      </th>
                      <th className="px-6 py-4 text-xs font-black text-slate-600 uppercase tracking-widest">
                        المبلغ
                      </th>
                      <th className="px-6 py-4 text-xs font-black text-slate-600 uppercase tracking-widest">
                        اللترات
                      </th>
                      <th className="px-6 py-4 text-xs font-black text-slate-600 uppercase tracking-widest">
                        الحالة
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {row.fuelLogs.map((f, idx) => (
                      <tr
                        key={f.id}
                        className={`transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} hover:bg-brand-light/25`}
                      >
                        <td className="px-6 py-4 text-sm font-bold text-slate-700 whitespace-nowrap">
                          {formatDate(f.fuelDate)}
                        </td>
                        <td className="px-6 py-4 text-sm font-black text-slate-800 whitespace-nowrap">
                          {f.amount != null ? `${f.amount} ر.س` : '—'}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-700 whitespace-nowrap">
                          {f.liters ?? '—'}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-700 whitespace-nowrap">
                          <StatusBadge status={f.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm font-bold text-slate-500 py-3">لا توجد سجلات وقود مرتبطة بهذا الشفت</div>
            )}
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="تفاصيل إضافية">
            <Field label="عداد البداية" value={row.startOdometer ?? '—'} />
            <Field label="عداد النهاية" value={row.endOdometer ?? '—'} />
            <Field label="ملاحظات" value={row.notes} />
            <Field label="آخر موقع" value={row.lastLocationAt ? formatDateTime(row.lastLocationAt) : '—'} />
          </Section>

          <Section title="السجل">
            {Array.isArray(row.shiftLogs) && row.shiftLogs.length > 0 ? (
              <div className="space-y-2">
                {row.shiftLogs.slice(0, 10).map((l) => (
                  <div key={l.id} className="text-sm font-bold text-slate-700 flex items-center justify-between gap-4">
                    <div className="text-slate-700">{formatShiftAction(l.action)}</div>
                    <div className="text-xs font-black text-slate-400">{formatDateTime(l.createdAt)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm font-bold text-slate-500 py-3">لا يوجد سجل</div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

