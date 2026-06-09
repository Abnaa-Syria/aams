import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { hasAnyPermissionForUser, PERMISSIONS } from '../../utils/rolePermissions';
import { 
  LuChevronLeft, LuUser, LuTruck, LuActivity, LuClock, LuFuel, 
  LuTriangleAlert, LuCircleAlert, LuClipboardList, LuEye, LuMapPin,
  LuImage, LuInfo, LuArrowRight, LuCheck, LuPackage, LuTimer
} from 'react-icons/lu';

import { apiService } from '../../services/api';
import StatusBadge from '../../components/ui/StatusBadge';
import { resolveUploadUrl } from '../../utils/apiOrigin';

function formatShiftAction(action) {
  const actions = {
    'SHIFT_REQUESTED': 'طلب شفت',
    'SHIFT_APPROVED': 'موافقة على الشفت',
    'SHIFT_REJECTED': 'رفض الشفت',
    'SHIFT_STARTED': 'بداية العمل',
    'SHIFT_ENDED': 'نهاية العمل',
    'SHIFT_CANCELLED': 'إلغاء الشفت',
    'SHIFT_CLOSURE_APPROVED': 'اعتماد الإغلاق',
  };
  return actions[action] || action || '—';
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

function MetricCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className={`bg-white p-6 rounded-[2rem] shadow-premium border border-slate-100 flex items-start gap-4 hover:scale-[1.02] transition-all group`}>
      <div className={`w-12 h-12 rounded-2xl ${color || 'bg-brand-light text-brand-primary'} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
         <Icon size={24} />
      </div>
      <div>
         <div className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</div>
         <div className="text-xl font-black text-slate-800 leading-tight mb-0.5">{value || '—'}</div>
         {sub && <div className="text-[0.7rem] font-bold text-slate-400 tracking-tight">{sub}</div>}
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children, badge }) {
  return (
    <div className="bg-white rounded-[2.5rem] shadow-premium border border-slate-100 overflow-hidden mb-8">
      <div className="px-8 py-6 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {Icon && <div className="w-8 h-8 rounded-xl bg-white text-brand-primary flex items-center justify-center shadow-sm"><Icon size={18} /></div>}
          <h3 className="text-lg font-black text-slate-800">{title}</h3>
        </div>
        {badge}
      </div>
      <div className="p-8">{children}</div>
    </div>
  );
}

function PhotoItem({ label, url }) {
  if (!url) return null;
  return (
    <div className="space-y-2">
      <div className="text-xs font-black text-slate-400 uppercase tracking-widest">{label}</div>
      <a href={resolveUploadUrl(url)} target="_blank" rel="noreferrer" className="block relative group overflow-hidden rounded-2xl border-4 border-white shadow-md aspect-video">
        <img src={resolveUploadUrl(url)} alt={label} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
          <LuEye size={24} />
        </div>
      </a>
    </div>
  );
}

export default function ShiftDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);
  const canApprove = hasAnyPermissionForUser(user, [PERMISSIONS.SHIFTS_APPROVE]);
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleShiftAction = async (action, body = {}) => {
    try {
      if (action === 'approve') await apiService.post(`/shifts/${id}/approve`);
      else if (action === 'reject') await apiService.post(`/shifts/${id}/reject`, body);
      else if (action === 'force-end') await apiService.post(`/shifts/${id}/force-end`, body);
      toast.success('تم تنفيذ الإجراء');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل الإجراء');
    }
  };

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

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    if (!row) return null;
    const km = (row.endOdometer && row.startOdometer) ? row.endOdometer - row.startOdometer : null;
    const fuelCost = Array.isArray(row.fuelLogs) ? row.fuelLogs.reduce((sum, f) => sum + (f.amount || 0), 0) : 0;
    const totalOrders = row.totals?.totalOrders ?? 0;
    const totalHours = row.totals?.totalHours ?? 0;
    
    return {
      km: km != null ? `${km} كم` : '—',
      fuel: `${fuelCost} ر.س`,
      orders: totalOrders,
      hours: `${totalHours} س`,
      violations: row.violations?.length || 0,
      incidents: row.incidents?.length || 0,
      canceled: row.canceledOrderLogs?.length || 0,
    };
  }, [row]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-brand-light border-t-brand-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!row) return null;

  const breakdown = Array.isArray(row.platformBreakdown) ? row.platformBreakdown : [];

  return (
    <div className="page-container animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Header */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-premium border border-slate-100 mb-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-light/40 rounded-full blur-3xl -mr-32 -mt-32 opacity-60 pointer-events-none"></div>
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 relative z-10">
          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/shifts')} className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-brand-primary hover:bg-brand-light transition-all">
              <LuArrowRight size={24} />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">شفت #{row.id}</h1>
                <StatusBadge status={row.status} />
              </div>
              <p className="text-slate-500 font-bold flex items-center gap-2">
                <LuUser size={16} /> {row.user?.fullNameAr} • <LuTruck size={16} /> {row.vehicle?.plateNumber}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="flex flex-col items-end">
              <div className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest mb-1">تاريخ الطلب</div>
              <div className="text-sm font-black text-slate-700">{formatDate(row.requestedAt)}</div>
            </div>
            {canApprove && (
              <div className="flex flex-wrap gap-2 justify-end">
                {row.status === 'REQUESTED' && (
                  <>
                    <button type="button" onClick={() => handleShiftAction('approve')} className="btn btn-primary !py-2 !px-4 text-sm">موافقة</button>
                    <button type="button" onClick={() => handleShiftAction('reject', { reason: 'مرفوض من المشرف' })} className="btn bg-rose-50 text-rose-700 !py-2 !px-4 text-sm">رفض</button>
                  </>
                )}
                {row.status === 'ACTIVE' && (
                  <button type="button" onClick={() => handleShiftAction('force-end', { reason: 'إنهاء اضطراري من المشرف' })} className="btn bg-amber-50 text-amber-800 !py-2 !px-4 text-sm">إنهاء اضطراري</button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 mb-8">
        <MetricCard icon={LuPackage} label="إجمالي الطلبات" value={stats.orders} sub="طلب ناجح" color="bg-blue-50 text-blue-600" />
        <MetricCard icon={LuTimer} label="إجمالي الساعات" value={stats.hours} sub="وقت التشغيل" color="bg-emerald-50 text-emerald-600" />
        <MetricCard icon={LuActivity} label="المسافة المقطوعة" value={stats.km} sub="كيلومتر" color="bg-orange-50 text-orange-600" />
        <MetricCard icon={LuFuel} label="تكلفة الوقود" value={stats.fuel} sub="إجمالي الشفت" color="bg-slate-100 text-slate-700" />
        <MetricCard icon={LuTriangleAlert} label="تنبيهات" value={stats.violations + stats.incidents + stats.canceled} sub="مخالفات/حوادث/إلغاء" color="bg-rose-50 text-rose-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-2">
          
          <Section title="بيانات التشغيل" icon={LuActivity}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
               <div className="flex flex-col border-b border-slate-100 pb-3">
                 <span className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest mb-1">المنصة الرئيسية</span>
                 <span className="text-sm font-bold text-slate-800">{row.platformAccount?.platform?.nameAr || '—'}</span>
               </div>
               <div className="flex flex-col border-b border-slate-100 pb-3">
                 <span className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest mb-1">رقم الحساب</span>
                 <span className="text-sm font-bold text-slate-800">{row.platformAccount?.username || '—'}</span>
               </div>
               <div className="flex flex-col border-b border-slate-100 pb-3">
                 <span className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest mb-1">وقت البدء الفعلي</span>
                 <span className="text-sm font-bold text-slate-800">{formatDateTime(row.startedAt)}</span>
               </div>
               <div className="flex flex-col border-b border-slate-100 pb-3">
                 <span className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest mb-1">وقت الانتهاء الفعلي</span>
                 <span className="text-sm font-bold text-slate-800">{formatDateTime(row.endedAt)}</span>
               </div>
               <div className="flex flex-col border-b border-slate-100 pb-3">
                 <span className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest mb-1">عداد البداية</span>
                 <span className="text-sm font-bold text-slate-800">{row.startOdometer ? `${row.startOdometer} كم` : '—'}</span>
               </div>
               <div className="flex flex-col border-b border-slate-100 pb-3">
                 <span className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest mb-1">عداد النهاية</span>
                 <span className="text-sm font-bold text-slate-800">{row.endOdometer ? `${row.endOdometer} كم` : '—'}</span>
               </div>
            </div>
          </Section>

          <Section title="توزيع العمل على المنصات" icon={LuClipboardList}>
            {breakdown.length === 0 ? (
               <div className="text-center py-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                  <LuPackage className="mx-auto text-slate-300 mb-2" size={32} />
                  <p className="text-sm font-bold text-slate-400">لا يوجد تفصيل مسجل للمنصات</p>
               </div>
            ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {breakdown.map((b, i) => (
                    <div key={i} className="p-5 bg-white ring-1 ring-slate-100 rounded-3xl flex items-center justify-between shadow-sm hover:shadow-md transition-all">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-brand-light text-brand-primary flex items-center justify-center">
                             <LuActivity size={18} />
                          </div>
                          <div>
                             <div className="text-sm font-black text-slate-800">{b.platformName}</div>
                             <div className="text-[0.65rem] font-bold text-slate-400">توزيع الطلبات والساعات</div>
                          </div>
                       </div>
                       <div className="flex items-center gap-6">
                          <div className="text-center">
                             <div className="text-lg font-black text-brand-primary leading-none">{b.orders || 0}</div>
                             <div className="text-[0.6rem] font-black text-slate-400 uppercase">طلب</div>
                          </div>
                          <div className="text-center">
                             <div className="text-lg font-black text-slate-700 leading-none">{b.hours || 0}</div>
                             <div className="text-[0.6rem] font-black text-slate-400 uppercase">ساعة</div>
                          </div>
                       </div>
                    </div>
                  ))}
               </div>
            )}
          </Section>

          <Section title="سجلات منتصف الشفت" icon={LuCheck}>
             {Array.isArray(row.midShiftRecords) && row.midShiftRecords.length > 0 ? (
                <div className="space-y-4">
                   {row.midShiftRecords.map((rec) => (
                     <div key={rec.id} className="p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100">
                        <div className="flex justify-between items-start mb-4">
                           <div className="flex items-center gap-3">
                              <LuClock className="text-slate-400" size={18} />
                              <span className="text-sm font-bold text-slate-600">{formatDateTime(rec.createdAt)}</span>
                           </div>
                           {rec.screenshotUrl && (
                             <a href={resolveUploadUrl(rec.screenshotUrl)} target="_blank" rel="noreferrer" className="text-xs font-black text-brand-primary hover:underline flex items-center gap-1">
                                <LuEye size={14} /> عرض اللقطة
                             </a>
                           )}
                        </div>
                        {rec.notes && <p className="text-sm font-medium text-slate-700 bg-white p-4 rounded-2xl border border-slate-100 mb-4">{rec.notes}</p>}
                        {rec.checklistData && (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                             {Object.entries(typeof rec.checklistData === 'string' ? JSON.parse(rec.checklistData) : rec.checklistData).map(([k, v]) => (
                               <div key={k} className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                  <div className={`w-2 h-2 rounded-full ${v ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                  <span>{k}</span>
                               </div>
                             ))}
                          </div>
                        )}
                     </div>
                   ))}
                </div>
             ) : (
                <div className="text-center py-6 text-slate-400 font-bold italic">لا توجد سجلات أثناء الشفت</div>
             )}
          </Section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <Section title="المخالفات والحوادث" icon={LuTriangleAlert}>
                {([...(row.violations || []), ...(row.incidents || [])]).length === 0 ? (
                   <p className="text-sm font-bold text-emerald-600 flex items-center gap-2">
                      <LuCheck size={18} /> سجل نظيف لهذا الشفت
                   </p>
                ) : (
                   <div className="space-y-3">
                      {row.violations?.map(v => (
                        <div key={`v-${v.id}`} className="flex items-center justify-between p-3 bg-rose-50 rounded-xl border border-rose-100">
                           <div className="text-xs font-black text-rose-700">{v.reason}</div>
                           <StatusBadge status="VIOLATION" />
                        </div>
                      ))}
                      {row.incidents?.map(i => (
                        <div key={`i-${i.id}`} className="flex items-center justify-between p-3 bg-orange-50 rounded-xl border border-orange-100">
                           <div className="text-xs font-black text-orange-700">{i.type}</div>
                           <StatusBadge status="INCIDENT" />
                        </div>
                      ))}
                   </div>
                )}
             </Section>
             <Section title="سجل الوقود" icon={LuFuel}>
                {Array.isArray(row.fuelLogs) && row.fuelLogs.length > 0 ? (
                   <div className="space-y-3">
                      {row.fuelLogs.map(f => (
                         <div key={f.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="text-xs font-black text-slate-700">{f.amount} ر.س</div>
                            <div className="text-[0.6rem] font-bold text-slate-400">{formatDate(f.fuelDate)}</div>
                         </div>
                      ))}
                   </div>
                ) : (
                   <p className="text-sm font-bold text-slate-400">لا توجد سجلات وقود</p>
                )}
             </Section>
          </div>
        </div>

        <div className="space-y-6">
           <Section title="صور الشفت" icon={LuImage}>
              <div className="space-y-6">
                 <PhotoItem label="عداد البداية" url={row.startPhotoUrl} />
                 <PhotoItem label="صورة المركبة (بداية)" url={row.startVehiclePhotoUrl} />
                 <PhotoItem label="صورة التطبيق (بداية)" url={row.startAppPhotoUrl} />
                 <PhotoItem label="عداد النهاية" url={row.endPhotoUrl} />
                 <PhotoItem label="صورة التطبيق (نهاية)" url={row.endAppPhotoUrl} />
                 {(!row.startPhotoUrl && !row.endPhotoUrl) && (
                   <div className="text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 font-bold">لا توجد صور مرفقة</div>
                 )}
              </div>
           </Section>

           <Section title="تتبع الحالة" icon={LuClock}>
              {Array.isArray(row.shiftLogs) && row.shiftLogs.length > 0 ? (
                <div className="relative space-y-6 before:absolute before:inset-y-0 before:right-[1.15rem] before:w-0.5 before:bg-slate-100">
                   {row.shiftLogs.map((l, i) => (
                     <div key={l.id} className="relative pr-10">
                        <div className={`absolute right-0 top-1 w-2.5 h-2.5 rounded-full ring-4 ring-white ${i === 0 ? 'bg-brand-primary scale-125' : 'bg-slate-300'}`} />
                        <div className="text-sm font-black text-slate-800 mb-0.5">{formatShiftAction(l.action)}</div>
                        <div className="text-[0.65rem] font-bold text-slate-400">{formatDateTime(l.createdAt)}</div>
                     </div>
                   ))}
                </div>
              ) : (
                <div className="text-sm font-bold text-slate-500 py-3">لا يوجد سجل تتبع</div>
              )}
           </Section>

           {row.notes && (
             <Section title="ملاحظات" icon={LuInfo}>
                <p className="text-sm font-medium text-slate-700 leading-relaxed italic">
                  "{row.notes}"
                </p>
             </Section>
           )}
        </div>
      </div>
    </div>
  );
}
