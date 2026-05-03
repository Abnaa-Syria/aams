import GenericListPage from '../../components/ui/GenericListPage';

const columns = [
  { key: 'user', label: 'المستخدم', render: (v) => v?.fullNameAr || 'النظام' },
  { key: 'action', label: 'الإجراء' },
  { key: 'entity', label: 'الكيان' },
  { key: 'entityId', label: 'معرف الكيان' },
  { key: 'ipAddress', label: 'IP' },
  { key: 'createdAt', label: 'التاريخ والوقت', render: (v) => v ? new Date(v).toLocaleString('ar-SA') : '—' },
];

export default function AuditLogsPage() {
  return <GenericListPage title="سجل العمليات" apiUrl="/audit-logs" columns={columns} filters={[
    { key: 'entity', placeholder: 'الكيان' },
    { key: 'action', placeholder: 'الإجراء' },
    { key: 'dateFrom', type: 'date', placeholder: 'من تاريخ' },
    { key: 'dateTo', type: 'date', placeholder: 'إلى تاريخ' },
  ]} />;
}
