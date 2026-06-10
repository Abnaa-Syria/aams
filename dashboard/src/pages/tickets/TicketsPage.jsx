import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';
import PermissionGate from '../../components/auth/PermissionGate';
import GenericListPage from '../../components/ui/GenericListPage';
import { PERMISSIONS as P } from '../../utils/rolePermissions';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import { 
  LuPlus, LuTicket, LuMessageSquare, LuClock, LuSearch, 
  LuUser, LuX, LuRefreshCw, LuSave 
} from 'react-icons/lu';
import toast from 'react-hot-toast';

const STATUS_MAP = {
  OPEN: { label: 'مفتوحة', color: 'blue' },
  IN_PROGRESS: { label: 'قيد المعالجة', color: 'orange' },
  PENDING_CUSTOMER: { label: 'بانتظار المستخدم', color: 'purple' },
  RESOLVED: { label: 'تم الحل', color: 'green' },
  CLOSED: { label: 'مغلقة', color: 'slate' },
};

const PRIORITY_MAP = {
  LOW: { label: 'منخفضة', color: 'slate' },
  MEDIUM: { label: 'متوسطة', color: 'blue' },
  HIGH: { label: 'عالية', color: 'orange' },
  URGENT: { label: 'عاجلة', color: 'red' },
};

const CATEGORY_MAP = {
  TECHNICAL: 'تقنية',
  HR: 'موارد بشرية',
  FINANCIAL: 'مالية',
  FLEET: 'الأسطول',
  OTHER: 'أخرى',
};

const CATEGORIES = [
  { value: 'TECHNICAL', label: 'تقنية' },
  { value: 'HR', label: 'موارد بشرية' },
  { value: 'FINANCIAL', label: 'مالية' },
  { value: 'FLEET', label: 'الأسطول' },
  { value: 'OTHER', label: 'أخرى' },
];

const PRIORITIES = [
  { value: 'LOW', label: 'منخفضة' },
  { value: 'MEDIUM', label: 'متوسطة' },
  { value: 'HIGH', label: 'عالية' },
  { value: 'URGENT', label: 'عاجلة' },
];

export default function TicketsPage() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchUsers = useCallback(async (q) => {
    if (!q || q.length < 2) return;
    setLoadingUsers(true);
    try {
      const { data } = await apiService.get('/users', { search: q, limit: 5 });
      setUsers(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchUsers(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchUsers]);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!selectedUser) return toast.error('يرجى اختيار المستخدم');
    
    setSubmitting(true);
    const fd = new FormData(e.target);
    const payload = Object.fromEntries(fd);
    payload.userId = selectedUser.id;

    try {
      const { data } = await apiService.post('/tickets', payload);
      toast.success('تم إنشاء التذكرة بنجاح');
      setIsModalOpen(false);
      setSelectedUser(null);
      setSearchQuery('');
      setRefreshKey(prev => prev + 1);
      navigate(`/tickets/${data.data.id}`);
    } catch (err) {
      toast.error('فشل في إنشاء التذكرة');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { 
      key: 'id', 
      label: 'رقم التذكرة', 
      render: (v) => <span className="font-mono font-bold text-slate-400">#{v}</span> 
    },
    { 
      key: 'title', 
      label: 'الموضوع',
      render: (v, item) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-800">{v}</span>
          <span className="text-xs text-slate-400">{CATEGORY_MAP[item.category] || item.category}</span>
        </div>
      )
    },
    { 
      key: 'user', 
      label: 'بواسطة',
      render: (v) => v?.fullNameAr || '—'
    },
    { 
      key: 'priority', 
      label: 'الأولوية',
      render: (v) => {
        const p = PRIORITY_MAP[v] || { label: v, color: 'slate' };
        return (
          <span className={`px-2.5 py-1 rounded-full text-[0.7rem] font-black uppercase tracking-wider bg-${p.color}-50 text-${p.color}-600 border border-${p.color}-100`}>
            {p.label}
          </span>
        );
      }
    },
    { 
      key: 'status', 
      label: 'الحالة',
      render: (v) => <StatusBadge status={v} />
    },
    { 
      key: '_count', 
      label: 'الردود',
      render: (v) => (
        <div className="flex items-center gap-1 text-slate-400 font-bold">
          <LuMessageSquare size={14} />
          {v?.messages || 0}
        </div>
      )
    },
    { 
      key: 'updatedAt', 
      label: 'آخر تحديث',
      render: (v) => v ? new Date(v).toLocaleDateString('ar-SA') : '—'
    },
  ];

  return (
    <div className="page-container" dir="rtl">
      <GenericListPage
        key={refreshKey}
        title="تذاكر الدعم الفني"
        apiUrl="/tickets"
        columns={columns}
        onRowClick={(item) => navigate(`/tickets/${item.id}`)}
        createButton={
          <PermissionGate anyOf={[P.USERS_WRITE]}>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-brand-primary text-white rounded-2xl font-black text-sm shadow-orange hover:bg-brand-primary-hover transition-all"
            >
              <LuPlus size={18} />
              تذكرة جديدة
            </button>
          </PermissionGate>
        }
        filters={[
          { key: 'status', type: 'select', placeholder: 'الحالة', options: Object.entries(STATUS_MAP).map(([value, { label }]) => ({ value, label })) },
          { key: 'priority', type: 'select', placeholder: 'الأولوية', options: PRIORITIES },
          { key: 'category', type: 'select', placeholder: 'التصنيف', options: CATEGORIES },
        ]}
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="إنشاء تذكرة دعم فني"
      >
        <form onSubmit={handleCreateTicket} className="space-y-5 py-2">
          {/* User Search */}
          <div className="relative">
            <label className="block text-sm font-black text-slate-700 mb-2">المستخدم (صاحب التذكرة)</label>
            {!selectedUser ? (
              <div className="relative">
                <LuSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ابحث بالاسم أو رقم الهوية..."
                  className="form-input pr-12"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery.length >= 2 && (
                  <div className="absolute top-full right-0 left-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden">
                    {loadingUsers ? (
                      <div className="p-4 text-center text-xs font-bold text-slate-400 flex items-center justify-center gap-2">
                        <LuRefreshCw size={14} className="animate-spin" />
                        جاري البحث...
                      </div>
                    ) : users.length > 0 ? (
                      users.map(u => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => { setSelectedUser(u); setUsers([]); setSearchQuery(''); }}
                          className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-b-0 text-right"
                        >
                          <div className="w-8 h-8 rounded-full bg-brand-light text-brand-primary flex items-center justify-center font-black text-xs uppercase">
                            {u.fullNameAr?.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-800">{u.fullNameAr}</span>
                            <span className="text-[0.65rem] font-bold text-slate-400">{u.identityNumber}</span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-xs font-bold text-slate-400">لا توجد نتائج</div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-brand-light/30 border border-brand-primary/10 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-primary text-white flex items-center justify-center font-black">
                    {selectedUser.fullNameAr?.charAt(0)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-slate-800">{selectedUser.fullNameAr}</span>
                    <span className="text-[0.7rem] font-bold text-brand-primary uppercase tracking-widest">{selectedUser.role}</span>
                  </div>
                </div>
                <button type="button" onClick={() => setSelectedUser(null)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                  <LuX size={18} />
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-black text-slate-700 mb-2">الموضوع</label>
            <input name="title" required className="form-input" placeholder="عنوان التذكرة..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-black text-slate-700 mb-2">التصنيف</label>
              <select name="category" required className="form-input select">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-black text-slate-700 mb-2">الأولوية</label>
              <select name="priority" required className="form-input select">
                {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-black text-slate-700 mb-2">الوصف</label>
            <textarea name="description" required rows="4" className="form-input resize-none" placeholder="اكتب تفاصيل المشكلة هنا..."></textarea>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button 
              type="button" 
              onClick={() => setIsModalOpen(false)}
              className="px-6 py-3 border border-slate-200 text-slate-600 rounded-xl font-black text-sm hover:bg-slate-50 transition-all"
            >
              إلغاء
            </button>
            <button 
              type="submit" 
              disabled={submitting}
              className="flex items-center gap-2 px-8 py-3 bg-brand-primary text-white rounded-xl font-black text-sm shadow-orange hover:bg-brand-primary-hover disabled:opacity-50 transition-all"
            >
              {submitting ? <LuRefreshCw size={18} className="animate-spin" /> : <LuSave size={18} />}
              إنشاء التذكرة
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

