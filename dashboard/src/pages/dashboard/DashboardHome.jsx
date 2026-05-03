import { useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import KpiCard from '../../components/ui/KpiCard';
import StatusBadge from '../../components/ui/StatusBadge';
import {
  LuUsers, LuTruck, LuClock, LuCircleAlert, LuFileText, LuCalendarOff,
  LuDollarSign, LuWrench, LuSearch, LuTriangleAlert, LuGift, LuBan,
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

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  const d = data || {};
  const overview = d.overview || {};
  const pending = d.pending || {};
  const alerts = d.alerts || {};

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">لوحة التحكم</h2>
      </div>

      {/* Overview KPIs */}
      <div className="kpi-grid">
        <KpiCard icon={LuUsers} label="إجمالي السائقين" value={overview.totalDrivers} color="blue" />
        <KpiCard icon={LuUsers} label="السائقين النشطين" value={overview.activeDrivers} color="green" />
        <KpiCard icon={LuTruck} label="المركبات النشطة" value={overview.totalVehicles} color="orange" />
        <KpiCard icon={LuClock} label="الشفتات النشطة" value={overview.activeShifts} color="blue" />
      </div>

      {/* Pending Actions */}
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16 }}>الإجراءات المعلقة</h3>
      <div className="kpi-grid">
        <KpiCard icon={LuClock} label="طلبات شفت معلقة" value={pending.pendingShiftRequests} color="orange" />
        <KpiCard icon={LuFileText} label="مستندات بانتظار المراجعة" value={pending.pendingDocReviews} color="blue" />
        <KpiCard icon={LuCalendarOff} label="طلبات إجازة" value={pending.pendingLeaveRequests} color="green" />
        <KpiCard icon={LuDollarSign} label="طلبات سلف" value={pending.pendingSalaryAdvances} color="orange" />
        <KpiCard icon={LuWrench} label="طلبات صيانة" value={pending.pendingMaintenanceReqs} color="red" />
      </div>

      {/* Alerts */}
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16, marginTop: 8 }}>التنبيهات</h3>
      <div className="kpi-grid">
        <KpiCard icon={LuCircleAlert} label="حوادث اليوم" value={alerts.todayIncidents} color="red" />
        <KpiCard icon={LuSearch} label="تحقيقات مفتوحة" value={alerts.openInvestigations} color="orange" />
        <KpiCard icon={LuTriangleAlert} label="مستندات تنتهي قريباً" value={alerts.expiringDocuments} color="orange" />
        <KpiCard icon={LuTriangleAlert} label="رخص تنتهي قريباً" value={alerts.expiringLicenses} color="red" />
      </div>

      {/* Recent Activity */}
      <div className="grid-2" style={{ marginTop: 24 }}>
        <div className="card">
          <div className="card-header">
            <h4 className="card-title">آخر الشفتات</h4>
          </div>
          {activity?.recentShifts?.slice(0, 5).map((shift) => (
            <div key={shift.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.85rem' }}>{shift.user?.fullNameAr}</span>
              <StatusBadge status={shift.status} />
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header">
            <h4 className="card-title">آخر الحوادث</h4>
          </div>
          {activity?.recentIncidents?.slice(0, 5).map((incident) => (
            <div key={incident.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.85rem' }}>{incident.title || incident.user?.fullNameAr}</span>
              <StatusBadge status={incident.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
