import GenericListPage from '../../components/ui/GenericListPage';
import StatusBadge from '../../components/ui/StatusBadge';

const roleLabels = { SUPER_ADMIN: 'مدير عام', OPERATIONS_ADMIN: 'مدير عمليات', HR_ADMIN: 'مدير موارد بشرية', FLEET_ADMIN: 'مدير أسطول', FINANCE_ADMIN: 'مدير مالي' };

const columns = [
  { key: 'identityNumber', label: 'رقم الهوية' },
  { key: 'fullNameAr', label: 'الاسم' },
  { key: 'email', label: 'البريد' },
  { key: 'role', label: 'الصلاحية', render: (v) => roleLabels[v] || v },
  { key: 'accountStatus', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
  { key: 'lastLoginAt', label: 'آخر دخول', render: (v) => v ? new Date(v).toLocaleDateString('ar-SA') : '—' },
];

export default function AdminsPage() {
  return <GenericListPage title="المستخدمين الإداريين" apiUrl="/admin-users" columns={columns} />;
}
