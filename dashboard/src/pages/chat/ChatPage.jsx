import GenericListPage from '../../components/ui/GenericListPage';

const columns = [
  { key: 'sender', label: 'المرسل', render: (v) => v?.fullNameAr || '—' },
  { key: 'receiver', label: 'المستقبل', render: (v) => v?.fullNameAr || '—' },
  { key: 'message', label: 'الرسالة', render: (v) => v?.substring(0, 80) || '—' },
  { key: 'isRead', label: 'مقروء', render: (v) => v ? 'نعم' : 'لا' },
  { key: 'createdAt', label: 'التاريخ', render: (v) => v ? new Date(v).toLocaleDateString('ar-SA') : '—' },
];

export default function ChatPage() {
  return <GenericListPage title="المحادثات" apiUrl="/chat/admin/conversations" columns={columns} />;
}
