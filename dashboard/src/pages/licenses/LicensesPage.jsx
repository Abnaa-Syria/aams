import GenericListPage from '../../components/ui/GenericListPage';
import StatusBadge from '../../components/ui/StatusBadge';
import { useNavigate } from 'react-router-dom';

const columns = [
  { key: 'user', label: 'الموظف', render: (v) => v?.fullNameAr || '—' },
  { key: 'type', label: 'النوع', render: (v) => ({ DRIVING_LICENSE: 'رخصة قيادة', TRANSPORT_LICENSE: 'رخصة نقل', MEDICAL_CERTIFICATE: 'شهادة طبية', OTHER_CERTIFICATE: 'شهادة أخرى' }[v] || v) },
  { key: 'title', label: 'العنوان' },
  { key: 'licenseNumber', label: 'رقم الرخصة' },
  { key: 'expiryDate', label: 'تاريخ الانتهاء', render: (v) => v ? new Date(v).toLocaleDateString('ar-SA') : '—' },
  { key: 'status', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
];

export default function LicensesPage() {
  const navigate = useNavigate();

  return (
    <GenericListPage
      title="الرخص والشهادات"
      apiUrl="/licenses"
      columns={columns}
      onRowClick={(row) => navigate(`/licenses/${row.id}`)}
      filters={[
        { key: 'driverName', type: 'text', placeholder: 'اسم السائق' },
        { key: 'type', type: 'select', placeholder: 'النوع', options: [{ value: 'DRIVING_LICENSE', label: 'رخصة قيادة' }, { value: 'TRANSPORT_LICENSE', label: 'رخصة نقل' }, { value: 'MEDICAL_CERTIFICATE', label: 'شهادة طبية' }] },
        { key: 'status', type: 'select', placeholder: 'الحالة', options: [{ value: 'PENDING', label: 'معلق' }, { value: 'VALID', label: 'صالح' }, { value: 'EXPIRED', label: 'منتهي' }] },
      ]}
    />
  );
}
