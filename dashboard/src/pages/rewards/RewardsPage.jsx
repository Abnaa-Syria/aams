import { useState, useCallback } from 'react';
import GenericListPage from '../../components/ui/GenericListPage';
import StatusBadge from '../../components/ui/StatusBadge';
import StatusSelect from '../../components/ui/StatusSelect';
import Modal from '../../components/ui/Modal';
import UserSelect from '../../components/ui/UserSelect';
import { apiService } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LuPlus, LuEye } from 'react-icons/lu';

const columns = [
  { key: 'user', label: 'الموظف', render: (v) => v?.fullNameAr || '—' },
  { key: 'category', label: 'التصنيف' },
  { key: 'amount', label: 'المبلغ', render: (v) => v ? `${v} ر.س` : '—' },
  { key: 'points', label: 'النقاط' },
  { key: 'reason', label: 'السبب', render: (v) => v?.substring(0, 60) || '—' },
  { key: 'status', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
  { key: 'createdAt', label: 'التاريخ', render: (v) => v ? new Date(v).toLocaleDateString('ar-SA') : '—' },
];

const statusOptions = [
  { value: 'PENDING', label: 'معلق' },
  { value: 'APPROVED', label: 'مقبول' },
  { value: 'REJECTED', label: 'مرفوض' },
];

export default function RewardsPage() {
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [form, setForm] = useState({
    userId: '',
    category: '',
    amount: '',
    points: '',
    reason: '',
    periodStart: '',
    periodEnd: '',
  });

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.userId || !form.category || !form.reason) {
      toast.error('يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }
    setLoading(true);
    try {
      await apiService.post('/rewards', {
        userId: form.userId,
        category: form.category,
        amount: form.amount || undefined,
        points: form.points ? parseInt(form.points, 10) : undefined,
        reason: form.reason,
        periodStart: form.periodStart || undefined,
        periodEnd: form.periodEnd || undefined,
      });
      toast.success('تم إنشاء المكافأة بنجاح');
      setShowCreate(false);
      setForm({ userId: '', category: '', amount: '', points: '', reason: '', periodStart: '', periodEnd: '' });
      setReloadToken((t) => t + 1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  const createButton = (
    <button
      onClick={() => setShowCreate(true)}
      className="btn btn-primary flex items-center gap-2"
    >
      <LuPlus size={18} />
      <span>إضافة مكافأة</span>
    </button>
  );

  const actionsColumn = {
    key: 'actions',
    label: '',
    stopRowClick: true,
    render: (_, row) => (
      <div className="flex items-center gap-2">
        <StatusSelect
          id={row.id}
          currentStatus={row.status}
          apiUrl={`/rewards/${row.id}/status`}
          options={statusOptions}
          size="xs"
          onSuccess={() => setReloadToken((t) => t + 1)}
        />
        <button
          onClick={() => navigate(`/rewards/${row.id}`)}
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-primary hover:bg-primary-light/10 transition-all"
        >
          <LuEye size={16} />
        </button>
      </div>
    ),
  };

  return (
    <>
      <GenericListPage
        title="المكافآت"
        apiUrl="/rewards"
        columns={[...columns, actionsColumn]}
        onRowClick={(row) => navigate(`/rewards/${row.id}`)}
        createButton={createButton}
        reloadToken={reloadToken}
        filters={[
          { key: 'status', type: 'select', placeholder: 'الحالة', options: [{ value: 'PENDING', label: 'معلق' }, { value: 'APPROVED', label: 'مقبول' }, { value: 'REJECTED', label: 'مرفوض' }] },
        ]}
      />

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="إضافة مكافأة جديدة">
        <form onSubmit={handleCreate} className="space-y-5">
          <UserSelect value={form.userId} onChange={(v) => setForm((f) => ({ ...f, userId: v }))} required />

          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">التصنيف</label>
            <select className="form-input form-select" value={form.category} onChange={handleChange('category')} required>
              <option value="">اختر التصنيف</option>
              <option value="PERFORMANCE">أداء</option>
              <option value="SAFETY">سلامة</option>
              <option value="LOYALTY">ولاء</option>
              <option value="INCENTIVE">تحفيز</option>
              <option value="OTHER">أخرى</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">المبلغ (ر.س)</label>
              <input type="number" step="0.01" className="form-input" value={form.amount} onChange={handleChange('amount')} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">النقاط</label>
              <input type="number" className="form-input" value={form.points} onChange={handleChange('points')} placeholder="0" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">السبب</label>
            <textarea className="form-input" rows="3" value={form.reason} onChange={handleChange('reason')} required placeholder="اكتب سبب المكافأة..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">من تاريخ</label>
              <input type="date" className="form-input" value={form.periodStart} onChange={handleChange('periodStart')} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">إلى تاريخ</label>
              <input type="date" className="form-input" value={form.periodEnd} onChange={handleChange('periodEnd')} />
            </div>
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
