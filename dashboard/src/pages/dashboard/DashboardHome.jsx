import { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiService } from '../../services/api';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import { isSupervisorUser } from '../../utils/rolePermissions';
import {
  LuUsers, LuTruck, LuClock, LuCircleAlert, LuFileText, LuCalendarOff,
  LuDollarSign, LuWrench, LuSearch, LuTriangleAlert, LuActivity,
  LuShield, LuIdCard, LuFuel
} from 'react-icons/lu';

export default function DashboardHome() {
  const user = useSelector((s) => s.auth.user);
  const navigate = useNavigate();
  const supervisor = isSupervisorUser(user);
  const [data, setData] = useState(null);
  const [supervisorData, setSupervisorData] = useState(null);
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      if (supervisor) {
        const { data: supRes } = await apiService.get('/supervisors/me/dashboard');
        setSupervisorData(supRes.data);
      } else {
        const [dashRes, actRes] = await Promise.all([
          apiService.get('/dashboard'),
          apiService.get('/dashboard/recent-activity'),
        ]);
        setData(dashRes.data.data);
        setActivity(actRes.data.data);
      }
      if (isRefresh) toast.success('تم تحديث البيانات');
    } catch {
      if (isRefresh) toast.error('فشل تحديث البيانات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [supervisor]);

  useEffect(() => {
    if (user) loadDashboard();
  }, [user, loadDashboard]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-12 h-12 border-4 border-brand-light border-t-brand-primary rounded-full animate-spin"></div>
    </div>
  );

  if (supervisor) {
    if (!supervisorData) {
      return (
        <div className="page-container flex flex-col items-center justify-center min-h-[400px] text-center">
          <LuActivity size={48} className="text-slate-300 mb-4 animate-pulse" />
          <h3 className="text-xl font-bold text-slate-700 mb-2">فشل تحميل لوحة التحكم التشغيلية</h3>
          <p className="text-slate-500 mb-6 text-sm">لم نتمكن من جلب بيانات المشرف الخاصة بك. يرجى التأكد من ارتباط حسابك التشغيلي بشكل صحيح.</p>
          <button type="button" onClick={() => loadDashboard(true)} className="btn btn-primary">إعادة المحاولة</button>
        </div>
      );
    }
    const s = supervisorData;
    return (
      <div className="page-container animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-10">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">لوحة المشرف التشغيلية</h2>
          <p className="text-slate-500 text-[0.95rem] font-medium">متابعة فريقك، الشفتات النشطة، والطلبات المعلقة.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <KpiCard icon={LuUsers} label="السائقين التابعين" value={s.assignedDrivers} color="blue" />
          <KpiCard icon={LuClock} label="شفتات نشطة" value={s.activeShifts} color="green" />
          <KpiCard icon={LuActivity} label="طلبات شفت معلقة" value={s.pendingShiftRequests} color="orange" />
          <KpiCard icon={LuCircleAlert} label="حوادث مفتوحة" value={s.openIncidents} color="red" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <KpiCard icon={LuCalendarOff} label="إجازات بانتظار التوصية" value={s.pendingLeaves} color="emerald" />
          <KpiCard icon={LuDollarSign} label="سلف بانتظار التوصية" value={s.pendingAdvances} color="orange" />
          <KpiCard icon={LuFuel} label="وقود بانتظار المراجعة" value={s.pendingFuel} color="blue" />
          <KpiCard icon={LuWrench} label="صيانة معلقة" value={s.pendingMaintenance} color="red" />
        </div>

        <div className="card !p-8 border-none ring-1 ring-slate-200/50">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black text-slate-800">السائقون النشطون الآن</h3>
            <button type="button" onClick={() => navigate('/shifts')} className="text-sm font-bold text-brand-primary hover:underline">عرض الشفتات</button>
          </div>
          <div className="flex flex-col gap-3">
            {(s.activeShiftRows || []).length === 0 ? (
              <p className="text-sm font-bold text-slate-400">لا يوجد سائقون نشطون حالياً</p>
            ) : (
              s.activeShiftRows.map((shift) => (
                <button
                  key={shift.id}
                  type="button"
                  onClick={() => navigate(`/shifts/${shift.id}`)}
                  className="flex justify-between items-center p-4 bg-slate-50 hover:bg-white rounded-2xl border border-slate-100 transition-all text-right"
                >
                  <div>
                    <div className="font-black text-slate-800">{shift.user?.fullNameAr}</div>
                    <div className="text-xs font-bold text-slate-400">{shift.vehicle?.plateNumber}</div>
                  </div>
                  <StatusBadge status={shift.status} />
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

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
          <button
            type="button"
            onClick={() => loadDashboard(true)}
            disabled={refreshing}
            className="btn bg-white border border-slate-200 shadow-sm hover:bg-slate-50 text-slate-700 disabled:opacity-60"
          >
            <LuActivity size={18} className={`text-brand-primary ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'جاري التحديث...' : 'تحديث البيانات'}
          </button>
          <button type="button" onClick={() => navigate('/analytics')} className="btn btn-primary">
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
            <PendingActionItem icon={LuClock} label="طلبات شفت معلقة" value={pending.pendingShiftRequests} color="text-amber-600" bg="bg-amber-50" onClick={() => navigate('/shifts?status=REQUESTED')} />
            <PendingActionItem icon={LuFileText} label="مستندات بانتظار المراجعة" value={pending.pendingDocReviews} color="text-blue-600" bg="bg-blue-50" onClick={() => navigate('/documents?status=PENDING')} />
            <PendingActionItem
              icon={LuTruck}
              label="طلبات مركبات السائقين"
              value={pending.pendingVehicleSubmissions}
              color="text-cyan-600"
              bg="bg-cyan-50"
              onClick={() => navigate('/vehicles?statusIn=PENDING_VERIFICATION,PENDING_REPLACEMENT')}
            />
            <PendingActionItem icon={LuCalendarOff} label="طلبات إجازة" value={pending.pendingLeaveRequests} color="text-emerald-600" bg="bg-emerald-50" onClick={() => navigate('/leaves?status=PENDING')} />
            <PendingActionItem icon={LuDollarSign} label="طلبات سلف" value={pending.pendingSalaryAdvances} color="text-orange-600" bg="bg-orange-50" onClick={() => navigate('/salary-advances?status=PENDING')} />
            <PendingActionItem icon={LuWrench} label="طلبات صيانة" value={pending.pendingMaintenanceReqs} color="text-red-600" bg="bg-red-50" onClick={() => navigate('/maintenance-requests?status=REQUESTED')} />
          </div>
        </div>

        {/* Alerts */}
        <div className="card !p-8 border-none ring-1 ring-slate-200/50">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black text-slate-800">تنبيهات حرجة</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <AlertSquare icon={LuCircleAlert} label="حوادث اليوم" value={alerts.todayIncidents} color="red" onClick={() => navigate('/incidents')} />
            <AlertSquare icon={LuShield} label="تحقيقات مفتوحة" value={alerts.openInvestigations} color="orange" onClick={() => navigate('/investigations?status=OPEN')} />
            <AlertSquare icon={LuTriangleAlert} label="مستندات تنتهي قريباً" value={alerts.expiringDocuments} color="orange" onClick={() => navigate('/documents')} />
            <AlertSquare icon={LuIdCard} label="رخص تنتهي قريباً" value={alerts.expiringLicenses} color="red" onClick={() => navigate('/licenses')} />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card border-none ring-1 ring-slate-200/50">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-lg font-black text-slate-800">آخر الشفتات</h4>
            <button
              type="button"
              onClick={() => navigate('/shifts')}
              className="text-sm font-bold text-brand-primary hover:underline"
            >
              عرض الكل
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {activity?.recentShifts?.slice(0, 5).map((shift) => (
              <button
                key={shift.id}
                type="button"
                onClick={() => navigate(`/shifts/${shift.id}`)}
                className="w-full flex justify-between items-center p-4 bg-slate-50/50 hover:bg-white rounded-2xl border border-slate-100 transition-all duration-300 group hover:shadow-premium text-right"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center font-black text-brand-primary group-hover:border-brand-primary group-hover:bg-brand-light transition-all">
                    {shift.user?.fullNameAr?.charAt(0) || 'U'}
                  </div>
                  <span className="text-[0.95rem] font-bold text-slate-700">{shift.user?.fullNameAr}</span>
                </div>
                <StatusBadge status={shift.status} />
              </button>
            ))}
            {(!activity?.recentShifts || activity.recentShifts.length === 0) && (
              <div className="text-center py-12 text-slate-400 border border-dashed border-slate-200 rounded-3xl font-medium">لا يوجد شفتات حديثة</div>
            )}
          </div>
        </div>

        <div className="card border-none ring-1 ring-slate-200/50">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-lg font-black text-slate-800">آخر الحوادث</h4>
            <button
              type="button"
              onClick={() => navigate('/incidents')}
              className="text-sm font-bold text-brand-primary hover:underline"
            >
              عرض الكل
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {activity?.recentIncidents?.slice(0, 5).map((incident) => (
              <button
                key={incident.id}
                type="button"
                onClick={() => navigate(`/incidents/${incident.id}`)}
                className="w-full flex justify-between items-center p-4 bg-slate-50/50 hover:bg-white rounded-2xl border border-slate-100 transition-all duration-300 group hover:shadow-premium text-right"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center group-hover:bg-red-100 transition-all shadow-sm">
                    <LuCircleAlert size={20} />
                  </div>
                  <span className="text-[0.95rem] font-bold text-slate-700">{incident.title || incident.user?.fullNameAr}</span>
                </div>
                <StatusBadge status={incident.status} />
              </button>
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

function PendingActionItem({ icon: Icon, label, value, color, bg, onClick }) {
  const Component = onClick ? 'button' : 'div';
  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className="w-full flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 transition-all duration-300 text-right cursor-pointer hover:bg-white hover:shadow-premium hover:-translate-y-1 group"
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl ${bg} ${color} flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-sm`}>
          <Icon size={24} />
        </div>
        <span className="text-base font-bold text-slate-700">{label}</span>
      </div>
      <div className={`text-xl font-black ${color}`}>
        {value || 0}
      </div>
    </Component>
  );
}

function AlertSquare({ icon: Icon, label, value, color, onClick }) {
  const isRed = color === 'red';
  const isOrange = color === 'orange';
  
  const bg = isRed ? 'bg-red-50' : isOrange ? 'bg-orange-50' : 'bg-brand-light';
  const textColor = isRed ? 'text-red-600' : isOrange ? 'text-orange-600' : 'text-brand-primary';
  const ringColor = isRed ? 'ring-red-100' : isOrange ? 'ring-orange-100' : 'ring-brand-primary/10';

  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`${bg} ring-1 ${ringColor} rounded-[2rem] p-6 flex flex-col items-center justify-center text-center gap-4 transition-all duration-500 hover:shadow-premium hover:-translate-y-2 group relative overflow-hidden w-full ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className={`bg-white w-14 h-14 rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-transform ${textColor}`}>
        <Icon size={28} />
      </div>
      <div className={`text-3xl font-black ${textColor} leading-none tracking-tight`}>
        {value || 0}
      </div>
      <div className="text-[0.8rem] font-black text-slate-800 uppercase tracking-widest">
        {label}
      </div>
    </Component>
  );
}
