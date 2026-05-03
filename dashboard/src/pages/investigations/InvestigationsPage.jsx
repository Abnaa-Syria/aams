import GenericListPage from '../../components/ui/GenericListPage';
import StatusBadge from '../../components/ui/StatusBadge';

const columns = [
  { key: 'user', label: 'الموظف', render: (v) => v?.fullNameAr || '—' },
  { key: 'category', label: 'التصنيف' },
  { key: 'title', label: 'العنوان' },
  { key: 'status', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
  { key: 'createdBy', label: 'أنشئ بواسطة', render: (v) => v?.fullNameAr || '—' },
  { key: '_count', label: 'المرفقات', render: (v) => v?.attachments || 0 },
  { key: 'createdAt', label: 'التاريخ', render: (v) => v ? new Date(v).toLocaleDateString('ar-SA') : '—' },
];

export default function InvestigationsPage() {
  return <GenericListPage title="التحقيقات" apiUrl="/investigations" columns={columns} filters={[
    { key: 'status', type: 'select', placeholder: 'الحالة', options: [{ value: 'OPEN', label: 'مفتوح' }, { value: 'PENDING_RESPONSE', label: 'بانتظار الرد' }, { value: 'UNDER_REVIEW', label: 'قيد المراجعة' }, { value: 'CLOSED', label: 'مغلق' }] },
  ]} />;
}
