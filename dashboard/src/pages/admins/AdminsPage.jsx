import { useNavigate } from 'react-router-dom';
import GenericListPage from '../../components/ui/GenericListPage';
import StatusBadge from '../../components/ui/StatusBadge';
import { LuMessageSquare } from 'react-icons/lu';

const roleLabels = { SUPER_ADMIN: 'مدير عام', OPERATIONS_ADMIN: 'مدير عمليات', HR_ADMIN: 'مدير موارد بشرية', FLEET_ADMIN: 'مدير أسطول', FINANCE_ADMIN: 'مدير مالي' };

export default function AdminsPage() {
  const navigate = useNavigate();

  const columns = [
    { key: 'identityNumber', label: 'رقم الهوية' },
    { key: 'fullNameAr', label: 'الاسم' },
    { key: 'email', label: 'البريد' },
    { key: 'role', label: 'الصلاحية', render: (v) => roleLabels[v] || v },
    { key: 'accountStatus', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
    { 
      key: 'actions', 
      label: 'مراسلة', 
      stopRowClick: true,
      render: (_, row) => (
        <button 
          onClick={(e) => { e.stopPropagation(); navigate(`/chat?userId=${row.id}`); }}
          className="w-10 h-10 rounded-xl bg-brand-light text-brand-primary flex items-center justify-center hover:bg-brand-primary hover:text-white transition-all shadow-sm"
          title="بدء محادثة"
        >
          <LuMessageSquare size={18} />
        </button>
      )
    },
  ];

  return <GenericListPage title="المستخدمين الإداريين" apiUrl="/admin-users" columns={columns} />;
}
