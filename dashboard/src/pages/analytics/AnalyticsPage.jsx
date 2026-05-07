import { useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import KpiCard from '../../components/ui/KpiCard';
import { LuFuel, LuBan, LuFileText, LuActivity, LuTrendingUp, LuTriangleAlert, LuCircleCheck } from 'react-icons/lu';

export default function AnalyticsPage() {
  const [fuelData, setFuelData] = useState(null);
  const [incidentData, setIncidentData] = useState(null);
  const [penaltyData, setPenaltyData] = useState(null);
  const [expiringData, setExpiringData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadReports = async () => {
    try {
      const [fuel, incidents, penalties, expiring] = await Promise.all([
        apiService.get('/reports/fuel-summary'),
        apiService.get('/reports/incidents-summary'),
        apiService.get('/reports/penalties-summary'),
        apiService.get('/reports/expiring-documents'),
      ]);
      setFuelData(fuel.data.data);
      setIncidentData(incidents.data.data);
      setPenaltyData(penalties.data.data);
      setExpiringData(expiring.data.data);
    } catch { /* handled */ } finally { setLoading(false); }
  };

  useEffect(() => {
    loadReports();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-12 h-12 border-4 border-brand-light border-t-brand-primary rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="page-container animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4 mb-10">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">التقارير والتحليلات</h2>
          <p className="text-slate-500 text-[0.95rem] font-medium">تحليل ذكي لأداء الأسطول، استهلاك الوقود، والالتزام التشغيلي.</p>
        </div>
        <div className="flex gap-3">
          <button className="btn bg-white border border-slate-200 shadow-sm hover:bg-slate-50 text-slate-700">
            <LuTrendingUp size={18} className="text-brand-primary" />
            تحميل التقرير الكامل
          </button>
        </div>
      </div>

      {/* Fuel Summary Section */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-6">
           <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shadow-sm ring-1 ring-orange-100">
              <LuFuel size={20} />
           </div>
           <h3 className="text-xl font-black text-slate-800">ملخص استهلاك الوقود</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KpiCard icon={LuFuel} label="إجمالي التكلفة" value={`${fuelData?.total?._sum?.amount?.toLocaleString() || 0} ر.س`} color="orange" />
          <KpiCard icon={LuFuel} label="إجمالي اللترات" value={`${fuelData?.total?._sum?.liters?.toLocaleString() || 0} لتر`} color="blue" />
          <KpiCard icon={LuActivity} label="عدد عمليات التزويد" value={fuelData?.total?._count || 0} color="green" />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        {/* Penalties Summary */}
        <div className="card !p-8 border-none ring-1 ring-slate-200/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-50/50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
          <div className="flex justify-between items-center mb-8 relative z-10">
            <h3 className="text-xl font-black text-slate-800">إحصائيات الجزاءات</h3>
            <span className="text-[0.65rem] font-black text-red-600 bg-red-50 px-3 py-1 rounded-full uppercase tracking-widest ring-1 ring-red-100">تحليل مالي</span>
          </div>
          <div className="space-y-4 relative z-10">
            {(penaltyData?.byType || []).map((item) => (
              <div key={item.type} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-premium transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-red-500 shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                    <LuBan size={20} />
                  </div>
                  <div>
                    <div className="text-[0.95rem] font-black text-slate-700">
                      {{ FINANCIAL: 'مالي', WARNING: 'إنذار', SUSPENSION: 'إيقاف', TERMINATION: 'إنهاء', OTHER: 'أخرى' }[item.type] || item.type}
                    </div>
                    <div className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-wide">العدد: {item._count}</div>
                  </div>
                </div>
                <div className="text-lg font-black text-red-600">
                  {item._sum?.amount?.toLocaleString() || 0} <span className="text-xs">ر.س</span>
                </div>
              </div>
            ))}
            {(!penaltyData?.byType || penaltyData.byType.length === 0) && (
              <div className="text-center py-10 text-slate-400 font-medium">لا توجد جزاءات مطبّقة حالياً</div>
            )}
          </div>
        </div>

        {/* Expiring Docs */}
        <div className="card !p-8 border-none ring-1 ring-slate-200/50">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black text-slate-800">المستندات المنتهية قريباً</h3>
            <span className="text-[0.65rem] font-black text-orange-600 bg-orange-50 px-3 py-1 rounded-full uppercase tracking-widest ring-1 ring-orange-100">تنبيه انتهاء</span>
          </div>
          <div className="grid grid-cols-2 gap-6">
             <div className="bg-orange-50/50 rounded-3xl p-6 text-center border border-orange-100 hover:-translate-y-1 transition-transform group">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-orange-600 mx-auto mb-4 shadow-sm group-hover:scale-110 transition-transform">
                   <LuFileText size={24} />
                </div>
                <div className="text-3xl font-black text-orange-600 mb-1">{expiringData?.documents?.length || 0}</div>
                <div className="text-xs font-black text-slate-800 uppercase tracking-widest">مستندات</div>
             </div>
             <div className="bg-red-50/50 rounded-3xl p-6 text-center border border-red-100 hover:-translate-y-1 transition-transform group">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-red-600 mx-auto mb-4 shadow-sm group-hover:scale-110 transition-transform">
                   <LuFileText size={24} />
                </div>
                <div className="text-3xl font-black text-red-600 mb-1">{expiringData?.licenses?.length || 0}</div>
                <div className="text-xs font-black text-slate-800 uppercase tracking-widest">رخص قيادة</div>
             </div>
          </div>
          <div className="mt-8 p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex items-center gap-3 text-slate-500">
             <LuTriangleAlert size={20} className="text-amber-500" />
             <p className="text-xs font-bold leading-relaxed">يرجى مراجعة ملفات السائقين وتحديث المستندات لتجنب الغرامات أو إيقاف العمليات.</p>
          </div>
        </div>
      </div>

      {/* Incident Deep Dive */}
      <div className="card !p-8 border-none ring-1 ring-slate-200/50">
        <div className="flex items-center gap-3 mb-8">
           <div className="w-10 h-10 rounded-xl bg-brand-light text-brand-primary flex items-center justify-center shadow-sm">
              <LuActivity size={20} />
           </div>
           <h3 className="text-xl font-black text-slate-800">تحليل الحوادث والبلاغات</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="space-y-6">
            <h5 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> حسب النوع
            </h5>
            <div className="space-y-3">
              {incidentData?.byType?.map((item) => (
                <div key={item.type} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:shadow-sm transition-all group">
                  <span className="text-[0.9rem] font-bold text-slate-600 group-hover:text-slate-900 transition-colors">
                    {{ MEDICAL: 'حالة طبية', ACCIDENT: 'حادث', BREAKDOWN: 'عطل', LARGE_ORDER: 'طلب كبير', OTHER: 'أخرى' }[item.type] || item.type}
                  </span>
                  <span className="text-base font-black text-slate-900 bg-slate-50 px-3 py-1 rounded-lg ring-1 ring-slate-100">{item._count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <h5 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> حسب الخطورة
            </h5>
            <div className="space-y-3">
              {incidentData?.bySeverity?.map((item) => {
                const isCritical = item.severity === 'CRITICAL' || item.severity === 'HIGH';
                return (
                  <div key={item.severity} className={`flex items-center justify-between p-3 border rounded-xl hover:shadow-sm transition-all group ${isCritical ? 'bg-red-50/30 border-red-100' : 'bg-white border-slate-100'}`}>
                    <span className={`text-[0.9rem] font-bold ${isCritical ? 'text-red-700' : 'text-slate-600'}`}>
                      {{ LOW: 'منخفض', MEDIUM: 'متوسط', HIGH: 'عالي', CRITICAL: 'حرج' }[item.severity]}
                    </span>
                    <span className={`text-base font-black px-3 py-1 rounded-lg ring-1 ${isCritical ? 'text-red-800 bg-white ring-red-100' : 'text-slate-900 bg-slate-50 ring-slate-100'}`}>
                      {item._count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-6">
            <h5 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> حسب الحالة التشغيلية
            </h5>
            <div className="space-y-3">
              {incidentData?.byStatus?.map((item) => (
                <div key={item.status} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:shadow-sm transition-all group">
                  <span className="text-[0.9rem] font-bold text-slate-600">
                    {{ OPEN: 'مفتوح', IN_PROGRESS: 'قيد التنفيذ', RESOLVED: 'تم الحل', CLOSED: 'مغلق', ESCALATED: 'مصعّد' }[item.status] || item.status}
                  </span>
                  <div className="flex items-center gap-2">
                     <LuCircleCheck className={item.status === 'RESOLVED' ? 'text-emerald-500' : 'text-slate-200'} size={14} />
                     <span className="text-base font-black text-slate-900 bg-slate-50 px-3 py-1 rounded-lg ring-1 ring-slate-100">{item._count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
