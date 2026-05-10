import { useState } from 'react';
import GenericListPage from '../../components/ui/GenericListPage';
import StatusBadge from '../../components/ui/StatusBadge';
import StatusSelect from '../../components/ui/StatusSelect';
import Modal from '../../components/ui/Modal';
import UserSelect from '../../components/ui/UserSelect';
import { apiService } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LuPlus, LuPencil, LuEye } from 'react-icons/lu';

const columns = [
  { key: 'user', label: 'الموظف', render: (v) => v?.fullNameAr || '—' },
  { key: 'amount', label: 'المبلغ', render: (v) => v ? `${v} ر.س` : '—' },
  { key: 'reason', label: 'السبب', render: (v) => v?.substring(0, 60) || '—' },
  { key: 'status', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
  { key: 'createdAt', label: 'التاريخ', render: (v) => v ? new Date(v).toLocaleDateString('ar-SA') : '—' },
  { key: 'actions', label: 'الإجراءات', render: (v, row) => (
    <button 
      onClick={(e) => { e.stopPropagation(); }} 
      className="p-2 text-slate-400 hover:text-primary transition-colors"
    >
      <LuPencil size={16} />
    </button>
  ), stopRowClick: true },
];

const statusOptions = [
  { value: 'PENDING', label: 'معلق' },
  { value: 'APPROVED', label: 'مقبول' },
  { value: 'REJECTED', label: 'مرفوض' },
  { value: 'CANCELLED', label: 'ملغي' },
];

export default function SalaryAdvancesPage() {
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedAdvance, setSelectedAdvance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [form, setForm] = useState({
    userId: '',
    amount: '',
    reason: '',
    notes: '',
    numberOfMonths: '1',
    installmentAmount: '',
    deductFromCurrent: false,
    status: 'PENDING',
  });

  const handleChange = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: val }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.userId || !form.amount || !form.reason) {
      toast.error('يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }
    setLoading(true);
    try {
      await apiService.post('/salary-advances', {
        userId: form.userId,
        amount: parseFloat(form.amount),
        reason: form.reason,
        notes: form.notes || undefined,
        numberOfMonths: form.numberOfMonths ? parseInt(form.numberOfMonths, 10) : undefined,
        installmentAmount: form.installmentAmount ? parseFloat(form.installmentAmount) : undefined,
        deductFromCurrent: form.deductFromCurrent,
      });
      toast.success('تم إنشاء طلب السلف بنجاح');
      setShowCreate(false);
      setForm({ userId: '', amount: '', reason: '', notes: '', numberOfMonths: '1', installmentAmount: '', deductFromCurrent: false });
      setReloadToken((t) => t + 1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (data) => {
    await apiService.patch(`/salary-advances/${selectedAdvance.id}`, data);
    setReloadToken((t) => t + 1);
  };

  const openEditModal = (advance) => {
    setSelectedAdvance(advance);
    setForm({
      userId: advance.userId || '',
      amount: advance.amount || '',
      reason: advance.reason || '',
      notes: advance.notes || '',
      numberOfMonths: advance.numberOfMonths?.toString() || '1',
      installmentAmount: advance.installmentAmount || '',
      deductFromCurrent: advance.deductFromCurrent || false,
    });
    setEditModalOpen(true);
  };

  const createButton = (
    <button onClick={() => setShowCreate(true)} className="btn btn-primary flex items-center gap-2">
      <LuPlus size={18} />
      <span>إضافة سلفة</span>
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
          apiUrl={`/salary-advances/${row.id}/review`}
          options={statusOptions}
          size="xs"
          onSuccess={() => setReloadToken((t) => t + 1)}
        />
        <button
          onClick={() => navigate(`/salary-advances/${row.id}`)}
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
        title="طلبات السلف"
        apiUrl="/salary-advances"
        columns={[...columns, actionsColumn]}
        onRowClick={(row) => navigate(`/salary-advances/${row.id}`)}
        createButton={createButton}
        reloadToken={reloadToken}
        filters={[
          { key: 'driverName', type: 'text', placeholder: 'اسم السائق' },
          { key: 'status', type: 'select', placeholder: 'الحالة', options: [{ value: 'PENDING', label: 'معلق' }, { value: 'APPROVED', label: 'مقبول' }, { value: 'REJECTED', label: 'مرفوض' }] },
        ]}
      />

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="إضافة طلب سلفة جديد">
        <form onSubmit={handleCreate} className="space-y-5">
          <UserSelect value={form.userId} onChange={(v) => setForm((f) => ({ ...f, userId: v }))} required />

          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">المبلغ (ر.س)</label>
            <input type="number" step="0.01" className="form-input" value={form.amount} onChange={handleChange('amount')} required placeholder="0.00" />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">السبب</label>
            <textarea className="form-input" rows="3" value={form.reason} onChange={handleChange('reason')} required placeholder="اكتب سبب طلب السلفة..." />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">ملاحظات</label>
            <input type="text" className="form-input" value={form.notes} onChange={handleChange('notes')} placeholder="ملاحظات إضافية (اختياري)" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">عدد الأشهر</label>
              <input type="number" min="1" className="form-input" value={form.numberOfMonths} onChange={handleChange('numberOfMonths')} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">قسط شهري (ر.س)</label>
              <input type="number" step="0.01" className="form-input" value={form.installmentAmount} onChange={handleChange('installmentAmount')} placeholder="0.00" />
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="form-checkbox" checked={form.deductFromCurrent} onChange={handleChange('deductFromCurrent')} />
            <span className="text-sm font-bold text-slate-600">خصم من الراتب الحالي</span>
          </label>

          <div className="flex gap-4 pt-4">
            <button type="submit" disabled={loading} className="btn btn-primary flex-1">
              {loading ? 'جارٍ الإنشاء...' : 'إنشاء'}
            </button>
            <button type="button" className="btn bg-slate-100 text-slate-500" onClick={() => setShowCreate(false)}>إلغاء</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="تحديث طلب السلفة">
        <form onSubmit={async (e) => { e.preventDefault(); setLoading(true); try { await handleUpdate({ status: form.status || 'PENDING', notes: form.notes }); toast.success('تم التحديث'); setEditModalOpen(false); } catch (err) { toast.error(err.response?.data?.message || 'حدث خطأ'); } setLoading(false); }} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">الحالة</label>
            <select className="form-input form-select" value={form.status} onChange={handleChange('status')}>
              {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">ملاحظات المراجعة</label>
            <textarea className="form-input" rows="3" value={form.notes} onChange={handleChange('notes')} placeholder="أضف ملاحظاتك..." />
          </div>

          <div className="flex gap-4 pt-4">
            <button type="submit" disabled={loading} className="btn btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? 'جارٍ...' : 'تحديث'}
            </button>
            <button type="button" className="btn bg-slate-100 text-slate-500" onClick={() => setEditModalOpen(false)}>إلغاء</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
