import { useNavigate } from 'react-router-dom';
import GenericListPage from '../../components/ui/GenericListPage';
import StatusBadge from '../../components/ui/StatusBadge';

const columns = [
  { key: 'user', label: 'الطالب', render: (v) => v?.fullNameAr || '—' },
  { key: 'vehicle', label: 'المركبة', render: (v) => v?.plateNumber || '—' },
  { key: 'issueType', label: 'نوع المشكلة' },
  { key: 'priority', label: 'الأولوية', render: (v) => <StatusBadge status={v} /> },
  { key: 'description', label: 'الوصف', render: (v) => v?.substring(0, 60) || '—' },
  { key: 'status', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
  { key: 'createdAt', label: 'التاريخ', render: (v) => v ? new Date(v).toLocaleDateString('ar-SA') : '—' },
];

export default function MaintenancePage() {
  const navigate = useNavigate();

  return <GenericListPage title="طلبات الصيانة" apiUrl="/maintenance-requests" columns={columns} onRowClick={(row) => navigate(`/maintenance-requests/${row.id}`)} filters={[
    { key: 'driverName', type: 'text', placeholder: 'اسم السائق' },
    { key: 'status', type: 'select', placeholder: 'الحالة', options: [{ value: 'REQUESTED', label: 'مطلوب' }, { value: 'APPROVED', label: 'مقبول' }, { value: 'IN_PROGRESS', label: 'قيد التنفيذ' }, { value: 'COMPLETED', label: 'مكتمل' }] },
    { key: 'priority', type: 'select', placeholder: 'الأولوية', options: [{ value: 'LOW', label: 'منخفض' }, { value: 'MEDIUM', label: 'متوسط' }, { value: 'HIGH', label: 'عالي' }, { value: 'URGENT', label: 'عاجل' }] },
  ]} />;
}
