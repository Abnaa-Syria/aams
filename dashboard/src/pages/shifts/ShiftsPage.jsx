import GenericListPage from '../../components/ui/GenericListPage';
import StatusBadge from '../../components/ui/StatusBadge';

const columns = [
  { key: 'id', label: '#' },
  { key: 'user', label: 'السائق', render: (v) => v?.fullNameAr || '—' },
  { key: 'vehicle', label: 'المركبة', render: (v) => v?.plateNumber || '—' },
  { key: 'platformAccount', label: 'المنصة', render: (v) => v?.platform?.nameAr || '—' },
  { key: 'status', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
  { key: 'requestedAt', label: 'تاريخ الطلب', render: (v) => v ? new Date(v).toLocaleDateString('ar-SA') : '—' },
  { key: 'startedAt', label: 'وقت البدء', render: (v) => v ? new Date(v).toLocaleTimeString('ar-SA') : '—' },
  { key: 'endedAt', label: 'وقت الانتهاء', render: (v) => v ? new Date(v).toLocaleTimeString('ar-SA') : '—' },
];

export default function ShiftsPage() {
  return <GenericListPage title="إدارة الشفتات" apiUrl="/shifts" columns={columns} filters={[
    { key: 'status', type: 'select', placeholder: 'الحالة', options: [
      { value: 'REQUESTED', label: 'مطلوب' }, { value: 'APPROVED', label: 'مقبول' },
      { value: 'ACTIVE', label: 'نشط' }, { value: 'ENDED', label: 'منتهي' },
      { value: 'REJECTED', label: 'مرفوض' }, { value: 'CANCELLED', label: 'ملغي' },
    ]},
    { key: 'dateFrom', type: 'date', placeholder: 'من تاريخ' },
    { key: 'dateTo', type: 'date', placeholder: 'إلى تاريخ' },
  ]} />;
}
