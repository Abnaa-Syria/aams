import GenericListPage from '../../components/ui/GenericListPage';
import StatusBadge from '../../components/ui/StatusBadge';
import { useNavigate } from 'react-router-dom';

const typeLabels = { NATIONAL_ID: 'هوية وطنية', IQAMA: 'إقامة', PASSPORT: 'جواز سفر', WORK_CONTRACT: 'عقد عمل', RESIDENCE_PERMIT: 'تصريح إقامة', OTHER: 'أخرى' };

const columns = [
  { key: 'user', label: 'الموظف', render: (v) => v?.fullNameAr || '—' },
  { key: 'type', label: 'النوع', render: (v) => typeLabels[v] || v },
  { key: 'title', label: 'العنوان' },
  { key: 'documentNumber', label: 'رقم المستند' },
  { key: 'expiryDate', label: 'تاريخ الانتهاء', render: (v) => v ? new Date(v).toLocaleDateString('ar-SA') : '—' },
  { key: 'status', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
];

export default function DocumentsPage() {
  const navigate = useNavigate();
  return (
    <GenericListPage
      title="إدارة المستندات"
      apiUrl="/documents"
      columns={columns}
      onRowClick={(row) => row?.id && navigate(`/documents/${row.id}`)}
      filters={[
        { key: 'driverName', type: 'text', placeholder: 'اسم السائق' },
        { key: 'type', type: 'select', placeholder: 'نوع المستند', options: Object.entries(typeLabels).map(([v, l]) => ({ value: v, label: l })) },
        { key: 'status', type: 'select', placeholder: 'الحالة', options: [
          { value: 'PENDING', label: 'معلق' }, { value: 'VALID', label: 'صالح' },
          { value: 'NEAR_EXPIRY', label: 'قارب الانتهاء' }, { value: 'EXPIRED', label: 'منتهي' },
          { value: 'UNDER_REVIEW', label: 'قيد المراجعة' }, { value: 'REJECTED', label: 'مرفوض' },
        ]},
      ]}
    />
  );
}
