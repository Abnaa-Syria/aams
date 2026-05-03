import GenericListPage from '../../components/ui/GenericListPage';
import StatusBadge from '../../components/ui/StatusBadge';

const columns = [
  { key: 'user', label: 'الموظف', render: (v) => v?.fullNameAr || '—' },
  { key: 'platform', label: 'المنصة', render: (v) => v?.nameAr || '—' },
  { key: 'username', label: 'اسم المستخدم' },
  { key: 'accountId', label: 'رقم الحساب' },
  { key: 'status', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
];

export default function PlatformAccountsPage() {
  return <GenericListPage title="حسابات المنصات" apiUrl="/platform-accounts" columns={columns} filters={[
    { key: 'status', type: 'select', placeholder: 'الحالة', options: [{ value: 'ACTIVE', label: 'نشط' }, { value: 'INACTIVE', label: 'غير نشط' }, { value: 'PENDING_VERIFICATION', label: 'بانتظار التحقق' }] },
  ]} />;
}
