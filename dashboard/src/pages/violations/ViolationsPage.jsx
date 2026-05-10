import { useNavigate } from 'react-router-dom';
import GenericListPage from '../../components/ui/GenericListPage';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import FileUploadField from '../../components/ui/FileUploadField';
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
      onClick={(e) => { e.stopPropagation(); }} 
      className="p-2 text-slate-400 hover:text-primary transition-colors"
    >
      <LuPencil size={16} />
    </button>
  ), stopRowClick: true },
];

function ViolationModal({ isOpen, onClose, violation, onSave }) {
  const [form, setForm] = useState({
    userId: '',
    vehicleId: '',
    reason: '',
    amount: '',
    location: '',
    vehicleImageUrl: null,
    violationImageUrl: null,
    bikeImageUrl: null,
    reviewNotes: '',
  });
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
          vehicleImageUrl: violation.vehicleImageUrl || null,
          violationImageUrl: violation.violationImageUrl || null,
          bikeImageUrl: violation.bikeImageUrl || null,
          reviewNotes: violation.reviewNotes || '',
        });
      } else {
        setForm({
          userId: '',
          vehicleId: '',
          reason: '',
          amount: '',
          location: '',
          vehicleImageUrl: null,
          violationImageUrl: null,
          bikeImageUrl: null,
          reviewNotes: '',
        });
      }
    }
  }, [isOpen, violation]);

  const loadOptions = async () => {
    try {
      const [driversRes, vehiclesRes] = await Promise.all([
        apiService.get('/users', { role: 'DRIVER', limit: 500 }),
        apiService.get('/vehicles', { limit: 500 }),
      ]);
      setDrivers(driversRes.data?.data || driversRes.data || []);
      setVehicles(vehiclesRes.data?.data || vehiclesRes.data || []);
    } catch (error) {
      console.error('Failed to load options', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.userId || !form.vehicleId || !form.reason || !form.amount || !form.location) {
      toast.error('الرجاء تعبئة جميع الحقول المطلوبة');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('userId', form.userId);
      formData.append('vehicleId', form.vehicleId);
      formData.append('reason', form.reason);
      formData.append('amount', form.amount);
      formData.append('location', form.location);
      formData.append('reviewNotes', form.reviewNotes);

      if (form.vehicleImageUrl instanceof File) formData.append('vehicleImageUrl', form.vehicleImageUrl);
      if (form.violationImageUrl instanceof File) formData.append('violationImageUrl', form.violationImageUrl);
      if (form.bikeImageUrl instanceof File) formData.append('bikeImageUrl', form.bikeImageUrl);

      await onSave(formData);
      onClose();
      toast.success(violation ? 'تم تحديث المخالفة' : 'تم إنشاء المخالفة');
    } catch (error) {
      toast.error('فشل في الحفظ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={violation ? 'تحديث المخالفة' : 'إنشاء مخالفة جديدة'}>
      <form onSubmit={handleSubmit} className="space-y-5 max-h-[calc(100vh-200px)] overflow-y-auto">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">السائق *</label>
            <select
              className="form-input form-select"
              value={form.userId}
              onChange={(e) => setForm(f => ({ ...f, userId: e.target.value }))}
              disabled={!!violation}
              required
            >
              <option value="">اختر السائق</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.fullNameAr}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">المركبة *</label>
            <select
              className="form-input form-select"
              value={form.vehicleId}
              onChange={(e) => setForm(f => ({ ...f, vehicleId: e.target.value }))}
              required
            >
              <option value="">اختر المركبة</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.plateNumber}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-600 mb-2">السبب *</label>
          <textarea
            className="form-input"
            placeholder="وصف تفصيلي للمخالفة"
            value={form.reason}
            onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))}
            required
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">المبلغ (ر.س) *</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">الموقع *</label>
            <input
              type="text"
              className="form-input"
              placeholder="الموقع الجغرافي"
              value={form.location}
              onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))}
              required
            />
          </div>
        </div>

        <FileUploadField
          label="صورة المركبة"
          value={form.vehicleImageUrl}
          onChange={(file) => setForm(f => ({ ...f, vehicleImageUrl: file }))}
          multiple={false}
          accept="image/*"
          optional={true}
        />

        <FileUploadField
          label="صورة المخالفة"
          value={form.violationImageUrl}
          onChange={(file) => setForm(f => ({ ...f, violationImageUrl: file }))}
          multiple={false}
          accept="image/*"
          optional={true}
        />

        <FileUploadField
          label="صورة الدراجة"
          value={form.bikeImageUrl}
          onChange={(file) => setForm(f => ({ ...f, bikeImageUrl: file }))}
          multiple={false}
          accept="image/*"
          optional={true}
        />

        {violation && (
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">ملاحظات المراجعة</label>
            <textarea
              className="form-input"
              placeholder="أضف ملاحظاتك على المخالفة"
              value={form.reviewNotes}
              onChange={(e) => setForm(f => ({ ...f, reviewNotes: e.target.value }))}
              rows={3}
            />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'جارٍ الحفظ...' : 'حفظ'}
          </button>
        </div>
      </form>
    </Modal>
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
