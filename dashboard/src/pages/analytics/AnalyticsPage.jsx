import { useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import KpiCard from '../../components/ui/KpiCard';
import { LuFuel, LuBan, LuFileText } from 'react-icons/lu';

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

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div className="page-container">
      <div className="page-header"><h2 className="page-title">التقارير والتحليلات</h2></div>

      {/* Fuel Summary */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><h4 className="card-title">ملخص الوقود</h4></div>
        <div className="kpi-grid">
          <KpiCard icon={LuFuel} label="إجمالي المبلغ" value={`${fuelData?.total?._sum?.amount || 0} ر.س`} color="orange" />
          <KpiCard icon={LuFuel} label="إجمالي اللترات" value={fuelData?.total?._sum?.liters || 0} color="blue" />
          <KpiCard icon={LuFuel} label="عدد السجلات" value={fuelData?.total?._count || 0} color="green" />
        </div>
      </div>

      {/* Penalties summary */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><h4 className="card-title">ملخص الجزاءات</h4></div>
        <div className="kpi-grid">
          {(penaltyData?.byType || []).map((item) => (
            <KpiCard
              key={item.type}
              icon={LuBan}
              label={{ FINANCIAL: 'مالي', WARNING: 'إنذار', SUSPENSION: 'إيقاف', TERMINATION: 'إنهاء', OTHER: 'أخرى' }[item.type] || item.type}
              value={`${item._sum?.amount || 0} ر.س (${item._count})`}
              color="red"
            />
          ))}
          {(!penaltyData?.byType || penaltyData.byType.length === 0) && (
            <p style={{ padding: 16, color: 'var(--muted)' }}>لا توجد جزاءات مطبّقة في الفترة الحالية</p>
          )}
        </div>
      </div>

      {/* Incidents summary */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><h4 className="card-title">ملخص الحوادث</h4></div>
        <div className="grid-3">
          <div>
            <h5 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 12 }}>حسب النوع</h5>
            {incidentData?.byType?.map((item) => (
              <div key={item.type} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
                <span>{{ MEDICAL: 'حالة طبية', ACCIDENT: 'حادث', BREAKDOWN: 'عطل', LARGE_ORDER: 'طلب كبير', OTHER: 'أخرى' }[item.type] || item.type}</span>
                <strong>{item._count}</strong>
              </div>
            ))}
          </div>
          <div>
            <h5 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 12 }}>حسب الخطورة</h5>
            {incidentData?.bySeverity?.map((item) => (
              <div key={item.severity} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
                <span>{{ LOW: 'منخفض', MEDIUM: 'متوسط', HIGH: 'عالي', CRITICAL: 'حرج' }[item.severity]}</span>
                <strong>{item._count}</strong>
              </div>
            ))}
          </div>
          <div>
            <h5 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 12 }}>حسب الحالة</h5>
            {incidentData?.byStatus?.map((item) => (
              <div key={item.status} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
                <span>{{ OPEN: 'مفتوح', IN_PROGRESS: 'قيد التنفيذ', RESOLVED: 'تم الحل', CLOSED: 'مغلق', ESCALATED: 'مصعّد' }[item.status] || item.status}</span>
                <strong>{item._count}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Expiring Documents */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><h4 className="card-title">المستندات المنتهية قريباً</h4></div>
        <div className="kpi-grid">
          <KpiCard icon={LuFileText} label="مستندات" value={expiringData?.documents?.length || 0} color="orange" />
          <KpiCard icon={LuFileText} label="رخص" value={expiringData?.licenses?.length || 0} color="red" />
        </div>
      </div>
    </div>
  );
}
