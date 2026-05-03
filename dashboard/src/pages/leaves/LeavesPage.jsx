import GenericListPage from '../../components/ui/GenericListPage';
import StatusBadge from '../../components/ui/StatusBadge';

const leaveTypeLabels = { ANNUAL: 'سنوية', SICK: 'مرضية', EMERGENCY: 'طارئة', UNPAID: 'بدون راتب', OTHER: 'أخرى' };
const columns = [
  { key: 'user', label: 'الموظف', render: (v) => v?.fullNameAr || '—' },
  { key: 'leaveType', label: 'النوع', render: (v) => leaveTypeLabels[v] || v },
  { key: 'startDate', label: 'من', render: (v) => v ? new Date(v).toLocaleDateString('ar-SA') : '—' },
  { key: 'endDate', label: 'إلى', render: (v) => v ? new Date(v).toLocaleDateString('ar-SA') : '—' },
  { key: 'totalDays', label: 'عدد الأيام' },
  { key: 'status', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
];

export default function LeavesPage() {
  return <GenericListPage title="طلبات الإجازة" apiUrl="/leave-requests" columns={columns} filters={[
    { key: 'leaveType', type: 'select', placeholder: 'النوع', options: Object.entries(leaveTypeLabels).map(([v, l]) => ({ value: v, label: l })) },
    { key: 'status', type: 'select', placeholder: 'الحالة', options: [{ value: 'PENDING', label: 'معلق' }, { value: 'APPROVED', label: 'مقبول' }, { value: 'REJECTED', label: 'مرفوض' }] },
  ]} />;
}
