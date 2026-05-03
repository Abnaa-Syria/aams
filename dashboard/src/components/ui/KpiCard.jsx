export default function KpiCard({ icon: Icon, label, value, color = 'orange' }) {
  return (
    <div className="kpi-card">
      <div className={`kpi-icon ${color}`}>
        {Icon && <Icon size={22} />}
      </div>
      <div>
        <div className="kpi-value">{value ?? '—'}</div>
        <div className="kpi-label">{label}</div>
      </div>
    </div>
  );
}
