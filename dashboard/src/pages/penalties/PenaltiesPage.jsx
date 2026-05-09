import GenericListPage from '../../components/ui/GenericListPage';
import StatusBadge from '../../components/ui/StatusBadge';
import { useNavigate } from 'react-router-dom';

const typeLabels = { FINANCIAL: 'خصم مالي', WARNING: 'إنذار', SUSPENSION: 'إيقاف', TERMINATION: 'إنهاء خدمة', OTHER: 'أخرى' };
const columns = [
  { key: 'user', label: 'الموظف', render: (v) => v?.fullNameAr || '—' },
  { key: 'type', label: 'النوع', render: (v) => typeLabels[v] || v },
  { key: 'amount', label: 'المبلغ', render: (v) => v ? `${v} ر.س` : '—' },
  { key: 'reason', label: 'السبب', render: (v) => v?.substring(0, 60) || '—' },
  { key: 'status', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
  { key: 'penaltyDate', label: 'التاريخ', render: (v) => v ? new Date(v).toLocaleDateString('ar-SA') : '—' },
];

export default function PenaltiesPage() {
  const navigate = useNavigate();

  return <GenericListPage title="الجزاءات" apiUrl="/penalties" columns={columns} onRowClick={(row) => navigate(`/penalties/${row.id}`)} filters={[
    { key: 'type', type: 'select', placeholder: 'النوع', options: Object.entries(typeLabels).map(([v, l]) => ({ value: v, label: l })) },
    { key: 'status', type: 'select', placeholder: 'الحالة', options: [{ value: 'PENDING', label: 'معلق' }, { value: 'APPLIED', label: 'مطبق' }, { value: 'APPEALED', label: 'معترض' }, { value: 'CANCELLED', label: 'ملغي' }] },
  ]} />;
}
