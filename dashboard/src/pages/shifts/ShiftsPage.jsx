import GenericListPage from '../../components/ui/GenericListPage';
import StatusBadge from '../../components/ui/StatusBadge';
import StatusSelect from '../../components/ui/StatusSelect';
import Modal from '../../components/ui/Modal';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { LuPlus, LuPencil, LuTriangleAlert } from 'react-icons/lu';
import toast from 'react-hot-toast';

const statusOptions = [
  { value: 'REQUESTED', label: 'مطلوب' },
  { value: 'APPROVED', label: 'مقبول' },
  { value: 'REJECTED', label: 'مرفوض' },
  { value: 'ACTIVE', label: 'نشط' },
  { value: 'ENDED', label: 'منتهي' },
  { value: 'CANCELLED', label: 'ملغي' },
];

const columns = [
  { key: 'id', label: '#' },
  { key: 'user', label: 'السائق', render: (v) => v?.fullNameAr || '—' },
  { key: 'vehicle', label: 'المركبة', render: (v, r) => (
    <div>
      <div>{v?.plateNumber || '—'}</div>
      {r.conflictingActiveShift && (
        <div className="text-[10px] font-bold text-red-500 mt-0.5 flex items-center gap-1">
          <LuTriangleAlert size={10} />
          <span>مع {r.conflictingActiveShift.driverName}</span>
        </div>
      )}
    </div>
  ) },
  { key: 'platformAccount', label: 'المنصة', render: (v) => v?.platform?.nameAr || '—' },
  { key: 'status', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
  { key: 'requestedAt', label: 'تاريخ الطلب', render: (v) => v ? new Date(v).toLocaleDateString('ar-SA') : '—' },
  { key: 'startedAt', label: 'وقت البدء', render: (v) => v ? new Date(v).toLocaleTimeString('ar-SA') : '—' },
  { key: 'endedAt', label: 'وقت الانتهاء', render: (v) => v ? new Date(v).toLocaleTimeString('ar-SA') : '—' },
  { key: 'actions', label: 'الإجراءات', render: (v, row) => (
    <button 
      onClick={(e) => { e.stopPropagation(); }} 
      className="p-2 text-slate-400 hover:text-primary transition-colors"
    >
      <LuPencil size={16} />
    </button>
  ), stopRowClick: true },
];

function ShiftModal({ isOpen, onClose, shift, onSave }) {
  const [form, setForm] = useState({ userId: '', vehicleId: '', platformAccountId: '', status: 'REQUESTED', notes: '' });
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadOptions();
      if (shift) {
        setForm({
          userId: shift.userId || '',
          vehicleId: shift.vehicleId || '',
          platformAccountId: shift.platformAccountId || '',
          status: shift.status || 'REQUESTED',
          notes: shift.notes || '',
        });
      } else {
        setForm({ userId: '', vehicleId: '', platformAccountId: '', status: 'REQUESTED', notes: '' });
      }
    }
  }, [isOpen, shift]);

  const loadOptions = async () => {
    try {
      const [driversRes, vehiclesRes, platformsRes] = await Promise.all([
        apiService.get('/users', { role: 'DRIVER', limit: 500 }),
        apiService.get('/vehicles', { limit: 500 }),
        apiService.get('/platform-accounts', { limit: 500 }),
      ]);
      setDrivers(driversRes.data?.data || []);
      setVehicles(vehiclesRes.data?.data || []);
      setPlatforms(platformsRes.data?.data || []);
    } catch (error) {
      console.error('Failed to load options', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('userId', form.userId);
      formData.append('vehicleId', form.vehicleId);
      formData.append('platformAccountId', form.platformAccountId);
      formData.append('notes', form.notes);
      
      if (shift) {
        formData.append('status', form.status);
      }
      
      await onSave(formData);
      onClose();
      toast.success(shift ? 'تم تحديث الشفت' : 'تم إنشاء الشفت');
    } catch (error) {
      toast.error('فشل في الحفظ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={shift ? 'تحديث الشفت' : 'إنشاء شفت جديد'}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <select 
          className="form-input form-select" 
          value={form.userId} 
          onChange={(e) => setForm(f => ({ ...f, userId: e.target.value }))}
          required
          disabled={!!shift}
        >
          <option value="">اختر السائق</option>
          {drivers.map(d => <option key={d.id} value={d.id}>{d.fullNameAr}</option>)}
        </select>
        <select 
          className="form-input form-select" 
          value={form.vehicleId} 
          onChange={(e) => setForm(f => ({ ...f, vehicleId: e.target.value }))}
          required
          disabled={!!shift}
        >
          <option value="">اختر المركبة</option>
          {vehicles.map(v => <option key={v.id} value={v.id}>{v.plateNumber}</option>)}
        </select>
        <select 
          className="form-input form-select" 
          value={form.platformAccountId} 
          onChange={(e) => setForm(f => ({ ...f, platformAccountId: e.target.value }))}
          required
          disabled={!!shift}
        >
          <option value="">اختر المنصة</option>
          {platforms.map(p => <option key={p.id} value={p.id}>{p.platform?.nameAr}</option>)}
        </select>

        {shift && (
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">الحالة</label>
            <select
              className="form-input form-select"
              value={form.status}
              onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}
            >
              {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-bold text-slate-600 mb-2">ملاحظات</label>
          <textarea 
            className="form-input" 
            placeholder="ملاحظات" 
            value={form.notes} 
            onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={3}
          />
        </div>

        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary flex-1" disabled={loading}>
            {loading ? 'حفظ...' : 'حفظ'}
          </button>
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1">إلغاء</button>
        </div>
      </form>
    </Modal>
  );
}

export default function ShiftsPage() {
  const navigate = useNavigate();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);

  const handleCreate = async (formData) => {
    await apiService.upload('/shifts/request-start', formData);
    setReloadToken(t => t + 1);
  };

  const handleUpdate = async (formData) => {
    await apiService.upload(`/shifts/${selectedShift.id}`, formData);
    setReloadToken(t => t + 1);
  };

  const openUpdateModal = (shift) => {
    setSelectedShift(shift);
    setUpdateModalOpen(true);
  };

  const createButton = (
    <button 
      onClick={() => setCreateModalOpen(true)} 
      className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-2xl hover:bg-primary-dark transition-colors font-bold"
    >
      <LuPlus size={18} />
      إنشاء شفت
    </button>
  );

  return (
    <>
      <GenericListPage
        title="إدارة الشفتات"
        apiUrl="/shifts"
        columns={[...columns.slice(0, -1), {
          key: 'actions',
          label: '',
          stopRowClick: true,
          render: (_, row) => (
            <div className="flex items-center gap-2">
              <StatusSelect
                id={row.id}
                currentStatus={row.status}
                apiUrl={`/shifts/${row.id}`}
                options={statusOptions}
                size="xs"
                onSuccess={() => setReloadToken((t) => t + 1)}
              />
              <button 
                onClick={(e) => { e.stopPropagation(); openUpdateModal(row); }} 
                className="p-2 text-slate-400 hover:text-primary transition-colors"
              >
                <LuPencil size={16} />
              </button>
            </div>
          ),
        }]}
        onRowClick={(row) => navigate(`/shifts/${row.id}`)}
        createButton={createButton}
        reloadToken={reloadToken}
        filters={[
          { key: 'driverName', type: 'text', placeholder: 'اسم السائق' },
          { key: 'status', type: 'select', placeholder: 'الحالة', options: statusOptions },
          { key: 'dateFrom', type: 'date', placeholder: 'من تاريخ' },
          { key: 'dateTo', type: 'date', placeholder: 'إلى تاريخ' },
        ]}
      />
      <ShiftModal 
        isOpen={createModalOpen} 
        onClose={() => setCreateModalOpen(false)} 
        onSave={handleCreate} 
      />
      <ShiftModal 
        isOpen={updateModalOpen} 
        onClose={() => setUpdateModalOpen(false)} 
        shift={selectedShift} 
        onSave={handleUpdate} 
      />
    </>
  );
}