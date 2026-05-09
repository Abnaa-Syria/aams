import { useNavigate } from 'react-router-dom';
import GenericListPage from '../../components/ui/GenericListPage';
import StatusBadge from '../../components/ui/StatusBadge';

const columns = [
  { key: 'user', label: 'السائق', render: (v) => v?.fullNameAr || '—' },
  { key: 'vehicle', label: 'المركبة', render: (v) => v?.plateNumber || '—' },
  { key: 'reason', label: 'السبب', render: (v) => v?.substring(0, 60) || '—' },
  { key: 'amount', label: 'المبلغ', render: (v) => v ? `${v} ر.س` : '—' },
  { key: 'location', label: 'الموقع' },
  { key: 'status', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
  { key: 'createdAt', label: 'التاريخ', render: (v) => v ? new Date(v).toLocaleDateString('ar-SA') : '—' },
];

export default function ViolationsPage() {
  const navigate = useNavigate();
  return <GenericListPage title="المخالفات" apiUrl="/violations" columns={columns} onRowClick={(row) => navigate(`/violations/${row.id}`)} filters={[
    { key: 'status', type: 'select', placeholder: 'الحالة', options: [{ value: 'REPORTED', label: 'مبلغ عنه' }, { value: 'UNDER_REVIEW', label: 'قيد المراجعة' }, { value: 'CONFIRMED', label: 'مؤكد' }, { value: 'DISMISSED', label: 'مرفوض' }, { value: 'PENALIZED', label: 'معاقب' }] },
  ]} />;
}
