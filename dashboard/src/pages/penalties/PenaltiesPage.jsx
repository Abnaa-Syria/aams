import { useState } from 'react';
import GenericListPage from '../../components/ui/GenericListPage';
import StatusBadge from '../../components/ui/StatusBadge';
import StatusSelect from '../../components/ui/StatusSelect';
import Modal from '../../components/ui/Modal';
import UserSelect from '../../components/ui/UserSelect';
import { apiService } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LuPlus, LuEye } from 'react-icons/lu';

const typeLabels = { FINANCIAL: 'خصم مالي', WARNING: 'إنذار', SUSPENSION: 'إيقاف', TERMINATION: 'إنهاء خدمة', OTHER: 'أخرى' };
const columns = [
  { key: 'user', label: 'الموظف', render: (v) => v?.fullNameAr || '—' },
  { key: 'type', label: 'النوع', render: (v) => typeLabels[v] || v },
  { key: 'amount', label: 'المبلغ', render: (v) => v ? `${v} ر.س` : '—' },
  { key: 'reason', label: 'السبب', render: (v) => v?.substring(0, 60) || '—' },
  { key: 'status', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
  { key: 'penaltyDate', label: 'التاريخ', render: (v) => v ? new Date(v).toLocaleDateString('ar-SA') : '—' },
];

const statusOptions = [
  { value: 'PENDING', label: 'معلق' },
  { value: 'APPROVED', label: 'مطبق' },
  { value: 'APPEALED', label: 'معترض' },
  { value: 'CANCELLED', label: 'ملغي' },
];

export default function PenaltiesPage() {
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [form, setForm] = useState({
    userId: '',
    type: '',
    amount: '',
    reason: '',
    penaltyDate: new Date().toISOString().split('T')[0],
  });

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.userId || !form.type || !form.reason) {
      toast.error('يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }
    setLoading(true);
    try {
      await apiService.post('/penalties', {
        userId: form.userId,
        type: form.type,
        amount: form.amount ? parseFloat(form.amount) : undefined,
        reason: form.reason,
        penaltyDate: form.penaltyDate,
      });
      toast.success('تم إنشاء الجزاء بنجاح');
      setShowCreate(false);
      setForm({ userId: '', type: '', amount: '', reason: '', penaltyDate: new Date().toISOString().split('T')[0] });
      setReloadToken((t) => t + 1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  const createButton = (
    <button onClick={() => setShowCreate(true)} className="btn btn-primary flex items-center gap-2">
      <LuPlus size={18} />
      <span>إضافة جزاء</span>
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
          apiUrl={`/penalties/${row.id}/status`}
          options={statusOptions}
          size="xs"
          onSuccess={() => setReloadToken((t) => t + 1)}
        />
        <button
          onClick={() => navigate(`/penalties/${row.id}`)}
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
        title="الجزاءات"
        apiUrl="/penalties"
        columns={[...columns, actionsColumn]}
        onRowClick={(row) => navigate(`/penalties/${row.id}`)}
        createButton={createButton}
        reloadToken={reloadToken}
        filters={[
          { key: 'type', type: 'select', placeholder: 'النوع', options: Object.entries(typeLabels).map(([v, l]) => ({ value: v, label: l })) },
          { key: 'status', type: 'select', placeholder: 'الحالة', options: [{ value: 'PENDING', label: 'معلق' }, { value: 'APPLIED', label: 'مطبق' }, { value: 'APPEALED', label: 'معترض' }, { value: 'CANCELLED', label: 'ملغي' }] },
        ]}
      />

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="إضافة جزاء جديد">
        <form onSubmit={handleCreate} className="space-y-5">
          <UserSelect value={form.userId} onChange={(v) => setForm((f) => ({ ...f, userId: v }))} required />

          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">نوع الجزاء</label>
            <select className="form-input form-select" value={form.type} onChange={handleChange('type')} required>
              <option value="">اختر النوع</option>
              {Object.entries(typeLabels).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">المبلغ (ر.س)</label>
            <input type="number" step="0.01" className="form-input" value={form.amount} onChange={handleChange('amount')} placeholder="0.00" />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">السبب</label>
            <textarea className="form-input" rows="3" value={form.reason} onChange={handleChange('reason')} required placeholder="اكتب سبب الجزاء..." />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">تاريخ الجزاء</label>
            <input type="date" className="form-input" value={form.penaltyDate} onChange={handleChange('penaltyDate')} />
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
