import { useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import {
  LuUsers, LuTruck, LuClock, LuCircleAlert, LuFileText, LuCalendarOff,
  LuDollarSign, LuWrench, LuSearch, LuTriangleAlert, LuActivity
} from 'react-icons/lu';

export default function DashboardHome() {
  const [data, setData] = useState(null);
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    try {
      const [dashRes, actRes] = await Promise.all([
        apiService.get('/dashboard'),
        apiService.get('/dashboard/recent-activity'),
      ]);
      setData(dashRes.data.data);
      setActivity(actRes.data.data);
    } catch {
      // Handle gracefully
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-12 h-12 border-4 border-brand-light border-t-brand-primary rounded-full animate-spin"></div>
    </div>
  );

  const d = data || {};
  const overview = d.overview || {};
  const pending = d.pending || {};
  const alerts = d.alerts || {};

  return (
    <div className="page-container animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Section */}
      <div className="flex justify-between items-center flex-wrap gap-4 mb-10">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">نظرة عامة على العمليات</h2>
          <p className="text-slate-500 text-[0.95rem] font-medium">
            مرحباً بك في لوحة تحكم AAMS اللوجستية. إليك ملخص لأداء أسطولك اليوم.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="btn bg-white border border-slate-200 shadow-sm hover:bg-slate-50 text-slate-700">
            <LuActivity size={18} className="text-brand-primary" />
            تحديث البيانات
          </button>
          <button className="btn btn-primary">
            تصدير التقرير
          </button>
        </div>
      </div>

      {/* Overview KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <KpiCard icon={LuUsers} label="إجمالي السائقين" value={overview.totalDrivers} color="blue" />
        <KpiCard icon={LuUsers} label="السائقين النشطين" value={overview.activeDrivers} color="green" />
        <KpiCard icon={LuTruck} label="المركبات النشطة" value={overview.totalVehicles} color="orange" />
        <KpiCard icon={LuClock} label="الشفتات النشطة" value={overview.activeShifts} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        {/* Pending Actions */}
        <div className="card !p-8 border-none ring-1 ring-slate-200/50">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black text-slate-800">إجراءات معلقة</h3>
            <span className="text-[0.7rem] font-black text-brand-primary bg-brand-light px-3 py-1 rounded-full uppercase tracking-widest ring-1 ring-brand-primary/10">مراجعة فورية</span>
          </div>
          <div className="flex flex-col gap-4">
            <PendingActionItem icon={LuClock} label="طلبات شفت معلقة" value={pending.pendingShiftRequests} color="text-amber-600" bg="bg-amber-50" />
            <PendingActionItem icon={LuFileText} label="مستندات بانتظار المراجعة" value={pending.pendingDocReviews} color="text-blue-600" bg="bg-blue-50" />
            <PendingActionItem icon={LuCalendarOff} label="طلبات إجازة" value={pending.pendingLeaveRequests} color="text-emerald-600" bg="bg-emerald-50" />
            <PendingActionItem icon={LuDollarSign} label="طلبات سلف" value={pending.pendingSalaryAdvances} color="text-orange-600" bg="bg-orange-50" />
            <PendingActionItem icon={LuWrench} label="طلبات صيانة" value={pending.pendingMaintenanceReqs} color="text-red-600" bg="bg-red-50" />
          </div>
        </div>

        {/* Alerts */}
        <div className="card !p-8 border-none ring-1 ring-slate-200/50">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black text-slate-800">تنبيهات حرجة</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <AlertSquare icon={LuCircleAlert} label="حوادث اليوم" value={alerts.todayIncidents} color="red" />
            <AlertSquare icon={LuSearch} label="تحقيقات مفتوحة" value={alerts.openInvestigations} color="orange" />
            <AlertSquare icon={LuTriangleAlert} label="مستندات تنتهي قريباً" value={alerts.expiringDocuments} color="orange" />
            <AlertSquare icon={LuTriangleAlert} label="رخص تنتهي قريباً" value={alerts.expiringLicenses} color="red" />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card border-none ring-1 ring-slate-200/50">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-lg font-black text-slate-800">آخر الشفتات</h4>
            <button className="text-sm font-bold text-brand-primary hover:underline">عرض الكل</button>
          </div>
          <div className="flex flex-col gap-3">
            {activity?.recentShifts?.slice(0, 5).map((shift) => (
              <div key={shift.id} className="flex justify-between items-center p-4 bg-slate-50/50 hover:bg-white rounded-2xl border border-slate-100 transition-all duration-300 group hover:shadow-premium">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center font-black text-brand-primary group-hover:border-brand-primary group-hover:bg-brand-light transition-all">
                    {shift.user?.fullNameAr?.charAt(0) || 'U'}
                  </div>
                  <span className="text-[0.95rem] font-bold text-slate-700">{shift.user?.fullNameAr}</span>
                </div>
                <StatusBadge status={shift.status} />
              </div>
            ))}
            {(!activity?.recentShifts || activity.recentShifts.length === 0) && (
              <div className="text-center py-12 text-slate-400 border border-dashed border-slate-200 rounded-3xl font-medium">لا يوجد شفتات حديثة</div>
            )}
          </div>
        </div>

        <div className="card border-none ring-1 ring-slate-200/50">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-lg font-black text-slate-800">آخر الحوادث</h4>
            <button className="text-sm font-bold text-brand-primary hover:underline">عرض الكل</button>
          </div>
          <div className="flex flex-col gap-3">
            {activity?.recentIncidents?.slice(0, 5).map((incident) => (
              <div key={incident.id} className="flex justify-between items-center p-4 bg-slate-50/50 hover:bg-white rounded-2xl border border-slate-100 transition-all duration-300 group hover:shadow-premium">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center group-hover:bg-red-100 transition-all shadow-sm">
                    <LuCircleAlert size={20} />
                  </div>
                  <span className="text-[0.95rem] font-bold text-slate-700">{incident.title || incident.user?.fullNameAr}</span>
                </div>
                <StatusBadge status={incident.status} />
              </div>
            ))}
            {(!activity?.recentIncidents || activity.recentIncidents.length === 0) && (
              <div className="text-center py-12 text-slate-400 border border-dashed border-slate-200 rounded-3xl font-medium">لا يوجد حوادث مسجلة</div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

function PendingActionItem({ icon: Icon, label, value, color, bg }) {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 transition-all duration-300 cursor-pointer hover:bg-white hover:shadow-premium hover:-translate-y-1 group">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl ${bg} ${color} flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-sm`}>
          <Icon size={24} />
        </div>
        <span className="text-base font-bold text-slate-700">{label}</span>
      </div>
      <div className={`text-xl font-black ${color}`}>
        {value || 0}
      </div>
    </div>
  );
}

function AlertSquare({ icon: Icon, label, value, color }) {
  const isRed = color === 'red';
  const bg = isRed ? 'bg-red-50' : 'bg-brand-light';
  const textColor = isRed ? 'text-red-600' : 'text-brand-primary';
  const ringColor = isRed ? 'ring-red-100' : 'ring-brand-primary/10';

  return (
    <div className={`${bg} ring-1 ${ringColor} rounded-[2rem] p-6 flex flex-col items-center justify-center text-center gap-4 transition-all duration-500 hover:shadow-premium hover:-translate-y-2 group relative overflow-hidden`}>
      <div className={`text-white bg-white w-14 h-14 rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-transform ${textColor}`}>
        <Icon size={28} />
      </div>
      <div className={`text-3xl font-black ${textColor} leading-none tracking-tight`}>
        {value || 0}
      </div>
      <div className="text-[0.8rem] font-black text-slate-800 uppercase tracking-widest">
        {label}
      </div>
    </div>
  );
}
