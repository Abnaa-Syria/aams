import { useNavigate } from 'react-router-dom';
import GenericListPage from '../../components/ui/GenericListPage';
import StatusBadge from '../../components/ui/StatusBadge';
import { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { LuPlus, LuPencil } from 'react-icons/lu';
import toast from 'react-hot-toast';

const columns = [
  { key: 'user', label: 'السائق', render: (v) => v?.fullNameAr || '—' },
  { key: 'vehicle', label: 'المركبة', render: (v) => v?.plateNumber || '—' },
  { key: 'reason', label: 'السبب', render: (v) => v?.substring(0, 60) || '—' },
  { key: 'amount', label: 'المبلغ', render: (v) => v ? `${v} ر.س` : '—' },
  { key: 'location', label: 'الموقع' },
  { key: 'status', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
  { key: 'createdAt', label: 'التاريخ', render: (v) => v ? new Date(v).toLocaleDateString('ar-SA') : '—' },
  { key: 'actions', label: 'الإجراءات', render: (v, row) => (
    <button 
      onClick={(e) => { e.stopPropagation(); /* open update modal */ }} 
      className="p-2 text-slate-400 hover:text-primary transition-colors"
    >
      <LuPencil size={16} />
    </button>
  ), stopRowClick: true },
];

function ViolationModal({ isOpen, onClose, violation, onSave }) {
  const [form, setForm] = useState({ userId: '', vehicleId: '', reason: '', amount: '', location: '' });
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadOptions();
      if (violation) {
        setForm({
          userId: violation.userId || '',
          vehicleId: violation.vehicleId || '',
          reason: violation.reason || '',
          amount: violation.amount || '',
          location: violation.location || '',
        });
      } else {
        setForm({ userId: '', vehicleId: '', reason: '', amount: '', location: '' });
      }
    }
  }, [isOpen, violation]);

  const loadOptions = async () => {
    try {
      const [driversRes, vehiclesRes] = await Promise.all([
        apiService.get('/users', { role: 'DRIVER', limit: 500 }),
        apiService.get('/vehicles', { limit: 500 }),
      ]);
      setDrivers(driversRes.data.data);
      setVehicles(vehiclesRes.data.data);
    } catch (error) {
      console.error('Failed to load options', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(form);
      onClose();
      toast.success(violation ? 'تم تحديث المخالفة' : 'تم إنشاء المخالفة');
    } catch (error) {
      toast.error('فشل في الحفظ');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <h3 className="text-lg font-bold mb-4">{violation ? 'تحديث المخالفة' : 'إنشاء مخالفة جديدة'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <select 
            className="form-input form-select" 
            value={form.userId} 
            onChange={(e) => setForm(f => ({ ...f, userId: e.target.value }))}
            required
            disabled={!!violation}
          >
            <option value="">اختر السائق</option>
            {drivers.map(d => <option key={d.id} value={d.id}>{d.fullNameAr}</option>)}
          </select>
          <select 
            className="form-input form-select" 
            value={form.vehicleId} 
            onChange={(e) => setForm(f => ({ ...f, vehicleId: e.target.value }))}
            required
          >
            <option value="">اختر المركبة</option>
            {vehicles.map(v => <option key={v.id} value={v.id}>{v.plateNumber}</option>)}
          </select>
          <textarea 
            className="form-input" 
            placeholder="السبب" 
            value={form.reason} 
            onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))}
            required
          />
          <input 
            type="number" 
            step="0.01" 
            className="form-input" 
            placeholder="المبلغ" 
            value={form.amount} 
            onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
            required
          />
          <input 
            type="text" 
            className="form-input" 
            placeholder="الموقع" 
            value={form.location} 
            onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))}
            required
          />
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary flex-1" disabled={loading}>
              {loading ? 'حفظ...' : 'حفظ'}
            </button>
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ViolationsPage() {
  const navigate = useNavigate();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);

  const handleCreate = async (form) => {
    await apiService.post('/violations', form);
    setReloadToken(t => t + 1);
  };

  const handleUpdate = async (form) => {
    await apiService.put(`/violations/${selectedViolation.id}`, form);
    setReloadToken(t => t + 1);
  };

  const openUpdateModal = (violation) => {
    setSelectedViolation(violation);
    setUpdateModalOpen(true);
  };

  const createButton = (
    <button 
      onClick={() => setCreateModalOpen(true)} 
      className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-2xl hover:bg-primary-dark transition-colors font-bold"
    >
      <LuPlus size={18} />
      إضافة مخالفة
    </button>
  );

  return (
    <>
      <GenericListPage 
        title="المخالفات" 
        apiUrl="/violations" 
        columns={columns.map(col => col.key === 'actions' ? { ...col, render: (v, row) => (
          <button 
            onClick={(e) => { e.stopPropagation(); openUpdateModal(row); }} 
            className="p-2 text-slate-400 hover:text-primary transition-colors"
          >
            <LuPencil size={16} />
          </button>
        ), stopRowClick: true } : col)} 
        onRowClick={(row) => navigate(`/violations/${row.id}`)} 
        createButton={createButton}
        reloadToken={reloadToken}
        filters={[
          { key: 'driverName', type: 'text', placeholder: 'اسم السائق' },
          { key: 'status', type: 'select', placeholder: 'الحالة', options: [{ value: 'REPORTED', label: 'مبلغ عنه' }, { value: 'UNDER_REVIEW', label: 'قيد المراجعة' }, { value: 'CONFIRMED', label: 'مؤكد' }, { value: 'DISMISSED', label: 'مرفوض' }, { value: 'PENALIZED', label: 'معاقب' }] },
        ]} 
      />
      <ViolationModal 
        isOpen={createModalOpen} 
        onClose={() => setCreateModalOpen(false)} 
        onSave={handleCreate} 
      />
      <ViolationModal 
        isOpen={updateModalOpen} 
        onClose={() => setUpdateModalOpen(false)} 
        violation={selectedViolation} 
        onSave={handleUpdate} 
      />
    </>
  );
}
