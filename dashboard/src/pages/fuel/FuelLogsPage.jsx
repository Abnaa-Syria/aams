import GenericListPage from '../../components/ui/GenericListPage';
import StatusBadge from '../../components/ui/StatusBadge';

const columns = [
  { key: 'user', label: 'السائق', render: (v) => v?.fullNameAr || '—' },
  { key: 'vehicle', label: 'المركبة', render: (v) => v?.plateNumber || '—' },
  { key: 'amount', label: 'المبلغ', render: (v) => v ? `${v} ر.س` : '—' },
  { key: 'liters', label: 'اللترات' },
  { key: 'fuelDate', label: 'التاريخ', render: (v) => v ? new Date(v).toLocaleDateString('ar-SA') : '—' },
  { key: 'status', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
  { key: 'isDuplicate', label: 'مكرر', render: (v) => v ? <span className="badge badge-warning">مشبوه</span> : '—' },
];

export default function FuelLogsPage() {
  return <GenericListPage title="سجلات الوقود" apiUrl="/fuel-logs" columns={columns} filters={[
    { key: 'status', type: 'select', placeholder: 'الحالة', options: [{ value: 'PENDING', label: 'معلق' }, { value: 'APPROVED', label: 'مقبول' }, { value: 'REJECTED', label: 'مرفوض' }, { value: 'FLAGGED', label: 'مشبوه' }] },
    { key: 'dateFrom', type: 'date', placeholder: 'من تاريخ' },
    { key: 'dateTo', type: 'date', placeholder: 'إلى تاريخ' },
  ]} />;
}
