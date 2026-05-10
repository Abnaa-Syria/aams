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

const typeLabels = { FINANCIAL: 'خصم مالي', WARNING: 'إنذار', SUSPENSION: 'إيقاف', TERMINATION: 'إنهاء خدمة', ASSET_DAMAGE: 'تلف العهد', MISCONDUCT: 'سوء سلوك', OTHER: 'أخرى' };
const columns = [
  { key: 'user', label: 'الموظف', render: (v) => v?.fullNameAr || '—' },
  { key: 'type', label: 'النوع', render: (v) => typeLabels[v] || v },
  { key: 'amount', label: 'المبلغ', render: (v) => v ? `${v} ر.س` : '—' },
  { key: 'reason', label: 'السبب', render: (v) => v?.substring(0, 60) || '—' },
  { key: 'status', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
  { key: 'penaltyDate', label: 'التاريخ', render: (v) => v ? new Date(v).toLocaleDateString('ar-SA') : '—' },
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
  { value: 'APPLIED', label: 'مطبق' },
  { value: 'APPEALED', label: 'معترض' },
  { value: 'CANCELLED', label: 'ملغي' },
];

function PenaltyModal({ isOpen, onClose, penalty, onSave }) {
  const [form, setForm] = useState({
    userId: '',
    type: '',
    amount: '',
    reason: '',
    penaltyDate: new Date().toISOString().split('T')[0],
    status: 'PENDING',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!penalty && (!form.userId || !form.type || !form.reason)) {
      toast.error('يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }
    setLoading(true);
    try {
      await onSave({
        userId: form.userId,
        type: form.type,
        amount: form.amount ? parseFloat(form.amount) : undefined,
        reason: form.reason,
        penaltyDate: form.penaltyDate,
        status: form.status,
        notes: form.notes,
      });
      toast.success(penalty ? 'تم تحديث الجزاء' : 'تم إنشاء الجزاء بنجاح');
      onClose();
      setForm({ userId: '', type: '', amount: '', reason: '', penaltyDate: new Date().toISOString().split('T')[0], status: 'PENDING', notes: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  if (isOpen) {
    if (penalty && form.userId === '') {
      setForm({
        userId: penalty.userId || '',
        type: penalty.type || '',
        amount: penalty.amount || '',
        reason: penalty.reason || '',
        penaltyDate: penalty.penaltyDate ? new Date(penalty.penaltyDate).toISOString().split('T')[0] : '',
        status: penalty.status || 'PENDING',
        notes: penalty.notes || '',
      });
    } else if (!penalty && form.userId === '') {
      setForm({ userId: '', type: '', amount: '', reason: '', penaltyDate: new Date().toISOString().split('T')[0], status: 'PENDING', notes: '' });
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={penalty ? 'تحديث الجزاء' : 'إضافة جزاء جديد'}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <UserSelect value={form.userId} onChange={(v) => setForm((f) => ({ ...f, userId: v }))} required disabled={!!penalty} />

        <div>
          <label className="block text-sm font-bold text-slate-600 mb-2">نوع الجزاء</label>
          <select className="form-input form-select" value={form.type} onChange={handleChange('type')} required disabled={!!penalty}>
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
          <textarea className="form-input" rows="3" value={form.reason} onChange={handleChange('reason')} required placeholder="اكتب سبب الجزاء..." disabled={!!penalty} />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-600 mb-2">تاريخ الجزاء</label>
          <input type="date" className="form-input" value={form.penaltyDate} onChange={handleChange('penaltyDate')} disabled={!!penalty} />
        </div>

        {penalty && (
          <>
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">الحالة</label>
              <select className="form-input form-select" value={form.status} onChange={handleChange('status')}>
                {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">ملاحظات</label>
              <textarea className="form-input" rows="3" value={form.notes} onChange={handleChange('notes')} placeholder="ملاحظات إضافية..." />
            </div>
          </>
        )}

        <div className="flex gap-4 pt-4">
          <button type="submit" disabled={loading} className="btn btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? 'جارٍ...' : 'حفظ'}
          </button>
          <button type="button" className="btn bg-slate-100 text-slate-500" onClick={onClose}>إلغاء</button>
        </div>
      </form>
    </Modal>
  );
}

export default function PenaltiesPage() {
  const navigate = useNavigate();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedPenalty, setSelectedPenalty] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const [form, setForm] = useState({
    userId: '',
    type: '',
    amount: '',
    reason: '',
    penaltyDate: new Date().toISOString().split('T')[0],
    status: 'PENDING',
    notes: '',
  });

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleCreate = async (data) => {
    await apiService.post('/penalties', data);
    setReloadToken((t) => t + 1);
  };

  const handleUpdate = async (data) => {
    await apiService.patch(`/penalties/${selectedPenalty.id}`, data);
    setReloadToken((t) => t + 1);
  };

  const openEditModal = (penalty) => {
    setSelectedPenalty(penalty);
    setEditModalOpen(true);
  };

  const createButton = (
    <button onClick={() => setCreateModalOpen(true)} className="btn btn-primary flex items-center gap-2">
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
        columns={columns.map(col => col.key === 'actions' ? { ...col, render: (v, row) => (
          <button 
            onClick={(e) => { e.stopPropagation(); openEditModal(row); }} 
            className="p-2 text-slate-400 hover:text-primary transition-colors"
          >
            <LuPencil size={16} />
          </button>
        ), stopRowClick: true } : col).length > 0 ? columns : [...columns.slice(0, -1), actionsColumn]}
        onRowClick={(row) => navigate(`/penalties/${row.id}`)}
        createButton={createButton}
        reloadToken={reloadToken}
        filters={[
          { key: 'driverName', type: 'text', placeholder: 'اسم السائق' },
          { key: 'type', type: 'select', placeholder: 'النوع', options: Object.entries(typeLabels).map(([v, l]) => ({ value: v, label: l })) },
          { key: 'status', type: 'select', placeholder: 'الحالة', options: statusOptions },
        ]}
      />

      <PenaltyModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSave={handleCreate}
      />
      <PenaltyModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        penalty={selectedPenalty}
        onSave={handleUpdate}
      />
    </>
  );
}