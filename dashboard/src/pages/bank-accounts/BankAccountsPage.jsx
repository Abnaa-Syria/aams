import GenericListPage from '../../components/ui/GenericListPage';
import StatusBadge from '../../components/ui/StatusBadge';
import { useNavigate } from 'react-router-dom';

const columns = [
  { key: 'user', label: 'الموظف', render: (v) => v?.fullNameAr || '—' },
  { key: 'bankName', label: 'البنك' },
  { key: 'iban', label: 'IBAN' },
  { key: 'accountOwnerName', label: 'صاحب الحساب' },
  { key: 'isDefault', label: 'افتراضي', render: (v) => v ? 'نعم' : 'لا' },
  { key: 'verificationStatus', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
];

export default function BankAccountsPage() {
  const navigate = useNavigate();

  return <GenericListPage title="الحسابات البنكية" apiUrl="/bank-accounts" columns={columns} onRowClick={(row) => navigate(`/bank-accounts/${row.id}`)} filters={[
    { key: 'driverName', type: 'text', placeholder: 'اسم السائق' },
    { key: 'verificationStatus', type: 'select', placeholder: 'حالة التحقق', options: [{ value: 'PENDING', label: 'معلق' }, { value: 'VERIFIED', label: 'موثق' }, { value: 'REJECTED', label: 'مرفوض' }] },
  ]} />;
}
