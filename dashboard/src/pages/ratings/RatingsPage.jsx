import GenericListPage from '../../components/ui/GenericListPage';

const columns = [
  { key: 'user', label: 'الموظف', render: (v) => v?.fullNameAr || '—' },
  { key: 'overallScore', label: 'التقييم العام', render: (v) => v ? `${v}/5` : '—' },
  { key: 'punctuality', label: 'الالتزام', render: (v) => v ? `${v}/5` : '—' },
  { key: 'customerHandling', label: 'خدمة العملاء', render: (v) => v ? `${v}/5` : '—' },
  { key: 'communication', label: 'التواصل', render: (v) => v ? `${v}/5` : '—' },
  { key: 'period', label: 'الفترة' },
  { key: 'ratedBy', label: 'المقيّم', render: (v) => v?.fullNameAr || '—' },
  { key: 'createdAt', label: 'التاريخ', render: (v) => v ? new Date(v).toLocaleDateString('ar-SA') : '—' },
];

export default function RatingsPage() {
  return <GenericListPage title="التقييمات" apiUrl="/ratings" columns={columns} />;
}
