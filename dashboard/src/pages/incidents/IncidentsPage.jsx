import { useNavigate } from 'react-router-dom';
import GenericListPage from '../../components/ui/GenericListPage';
import StatusBadge from '../../components/ui/StatusBadge';

const typeLabels = { MEDICAL: 'حالة طبية', ACCIDENT: 'حادث', BREAKDOWN: 'عطل', LARGE_ORDER: 'طلب كبير', OTHER: 'أخرى' };

const columns = [
  { key: 'user', label: 'السائق', render: (v) => v?.fullNameAr || '—' },
  { key: 'type', label: 'النوع', render: (v) => typeLabels[v] || v },
  { key: 'title', label: 'العنوان' },
  { key: 'severity', label: 'الخطورة', render: (v) => <StatusBadge status={v} /> },
  { key: 'status', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
  { key: 'location', label: 'الموقع' },
  { key: 'createdAt', label: 'التاريخ', render: (v) => v ? new Date(v).toLocaleDateString('ar-SA') : '—' },
];

export default function IncidentsPage() {
  const navigate = useNavigate();
  return <GenericListPage title="الحوادث والطوارئ" apiUrl="/incidents" columns={columns} onRowClick={(row) => navigate(`/incidents/${row.id}`)} filters={[
    { key: 'type', type: 'select', placeholder: 'النوع', options: Object.entries(typeLabels).map(([v, l]) => ({ value: v, label: l })) },
    { key: 'severity', type: 'select', placeholder: 'الخطورة', options: [{ value: 'LOW', label: 'منخفض' }, { value: 'MEDIUM', label: 'متوسط' }, { value: 'HIGH', label: 'عالي' }, { value: 'CRITICAL', label: 'حرج' }] },
    { key: 'status', type: 'select', placeholder: 'الحالة', options: [{ value: 'OPEN', label: 'مفتوح' }, { value: 'IN_PROGRESS', label: 'قيد التنفيذ' }, { value: 'RESOLVED', label: 'تم الحل' }, { value: 'CLOSED', label: 'مغلق' }] },
  ]} />;
}
