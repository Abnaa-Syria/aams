import { useNavigate } from 'react-router-dom';
import GenericListPage from '../../components/ui/GenericListPage';
import StatusBadge from '../../components/ui/StatusBadge';

const columns = [
  { key: 'user', label: 'السائق', render: (v) => v?.fullNameAr || '—' },
  { key: 'reportDate', label: 'تاريخ التقرير', render: (v) => v ? new Date(v).toLocaleDateString('ar-SA') : '—' },
  { key: 'totalHours', label: 'إجمالي الساعات' },
  { key: 'totalOrders', label: 'إجمالي الطلبات' },
  { key: 'status', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
  { key: 'appBreakdowns', label: 'المنصات', render: (v) => v?.length || 0 },
  { key: 'screenshots', label: 'المرفقات', render: (v) => v?.length || 0 },
];

export default function DailyReportsPage() {
  const navigate = useNavigate();
  return <GenericListPage title="التقارير اليومية" apiUrl="/daily-reports" columns={columns} onRowClick={(row) => navigate(`/daily-reports/${row.id}`)} filters={[
    { key: 'driverName', type: 'text', placeholder: 'اسم السائق' },
    { key: 'status', type: 'select', placeholder: 'الحالة', options: [{ value: 'SUBMITTED', label: 'مقدم' }, { value: 'UNDER_REVIEW', label: 'قيد المراجعة' }, { value: 'APPROVED', label: 'مقبول' }, { value: 'REJECTED', label: 'مرفوض' }, { value: 'NEEDS_REVISION', label: 'يحتاج تعديل' }] },
    { key: 'dateFrom', type: 'date', placeholder: 'من تاريخ' },
    { key: 'dateTo', type: 'date', placeholder: 'إلى تاريخ' },
  ]} />;
}
