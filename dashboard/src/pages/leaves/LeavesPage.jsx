import { useState } from 'react';
import GenericListPage from '../../components/ui/GenericListPage';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import UserSelect from '../../components/ui/UserSelect';
import { apiService } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LuPlus } from 'react-icons/lu';

const leaveTypeLabels = { ANNUAL: 'سنوية', SICK: 'مرضية', EMERGENCY: 'طارئة', UNPAID: 'بدون راتب', OTHER: 'أخرى' };
const columns = [
  { key: 'user', label: 'الموظف', render: (v) => v?.fullNameAr || '—' },
  { key: 'leaveType', label: 'النوع', render: (v) => leaveTypeLabels[v] || v },
  { key: 'startDate', label: 'من', render: (v) => v ? new Date(v).toLocaleDateString('ar-SA') : '—' },
  { key: 'endDate', label: 'إلى', render: (v) => v ? new Date(v).toLocaleDateString('ar-SA') : '—' },
  { key: 'totalDays', label: 'عدد الأيام' },
  { key: 'status', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
];

export default function LeavesPage() {
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    userId: '',
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: '',
  });

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.userId || !form.leaveType || !form.startDate || !form.endDate || !form.reason) {
      toast.error('يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }
    setLoading(true);
    try {
      await apiService.post('/leave-requests', {
        userId: form.userId,
        leaveType: form.leaveType,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason,
      });
      toast.success('تم إنشاء طلب الإجازة بنجاح');
      setShowCreate(false);
      setForm({ userId: '', leaveType: '', startDate: '', endDate: '', reason: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  const createButton = (
    <button onClick={() => setShowCreate(true)} className="btn btn-primary flex items-center gap-2">
      <LuPlus size={18} />
      <span>إضافة إجازة</span>
    </button>
  );

  return (
    <>
      <GenericListPage
        title="طلبات الإجازة"
        apiUrl="/leave-requests"
        columns={columns}
        onRowClick={(row) => navigate(`/leaves/${row.id}`)}
        createButton={createButton}
        filters={[
          { key: 'leaveType', type: 'select', placeholder: 'النوع', options: Object.entries(leaveTypeLabels).map(([v, l]) => ({ value: v, label: l })) },
          { key: 'status', type: 'select', placeholder: 'الحالة', options: [{ value: 'PENDING', label: 'معلق' }, { value: 'APPROVED', label: 'مقبول' }, { value: 'REJECTED', label: 'مرفوض' }] },
        ]}
      />

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="إضافة طلب إجازة جديد">
        <form onSubmit={handleCreate} className="space-y-5">
          <UserSelect value={form.userId} onChange={(v) => setForm((f) => ({ ...f, userId: v }))} required />

          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">نوع الإجازة</label>
            <select className="form-input form-select" value={form.leaveType} onChange={handleChange('leaveType')} required>
              <option value="">اختر النوع</option>
              {Object.entries(leaveTypeLabels).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">من تاريخ</label>
              <input type="date" className="form-input" value={form.startDate} onChange={handleChange('startDate')} required />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">إلى تاريخ</label>
              <input type="date" className="form-input" value={form.endDate} onChange={handleChange('endDate')} required />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">السبب</label>
            <textarea className="form-input" rows="3" value={form.reason} onChange={handleChange('reason')} required placeholder="اكتب سبب الإجازة..." />
          </div>

          <div className="flex gap-4 pt-4">
            <button type="submit" disabled={loading} className="btn btn-primary flex-1">
              {loading ? 'جارٍ الإنشاء...' : 'إنشاء'}
            </button>
            <button type="button" className="btn bg-slate-100 text-slate-500" onClick={() => setShowCreate(false)}>إلغاء</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
