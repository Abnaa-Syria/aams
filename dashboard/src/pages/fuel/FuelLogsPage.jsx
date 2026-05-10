import { useNavigate } from 'react-router-dom';
import GenericListPage from '../../components/ui/GenericListPage';
import StatusBadge from '../../components/ui/StatusBadge';
import StatusSelect from '../../components/ui/StatusSelect';
import Modal from '../../components/ui/Modal';
import FileUploadField from '../../components/ui/FileUploadField';
import { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { LuPlus, LuPencil } from 'react-icons/lu';
import toast from 'react-hot-toast';

const statusOptions = [
  { value: 'PENDING', label: 'معلق' },
  { value: 'APPROVED', label: 'مقبول' },
  { value: 'REJECTED', label: 'مرفوض' },
  { value: 'FLAGGED', label: 'مشبوه' },
];

const columns = [
  { key: 'user', label: 'السائق', render: (v) => v?.fullNameAr || '—' },
  { key: 'vehicle', label: 'المركبة', render: (v) => v?.plateNumber || '—' },
  { key: 'amount', label: 'المبلغ', render: (v) => v ? `${v} ر.س` : '—' },
  { key: 'liters', label: 'اللترات' },
  { key: 'fuelDate', label: 'التاريخ', render: (v) => v ? new Date(v).toLocaleDateString('ar-SA') : '—' },
  { key: 'status', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
  { key: 'isDuplicate', label: 'مكرر', render: (v) => v ? <span className="badge badge-warning">مشبوه</span> : '—' },
  { key: 'actions', label: 'الإجراءات', render: (v, row) => (
    <button 
      onClick={(e) => { e.stopPropagation(); /* open update modal */ }} 
      className="p-2 text-slate-400 hover:text-primary transition-colors"
    >
      <LuPencil size={16} />
    </button>
  ), stopRowClick: true },
];

function FuelLogModal({ isOpen, onClose, fuelLog, onSave }) {
  const [form, setForm] = useState({ 
    userId: '', 
    vehicleId: '', 
    amount: '', 
    liters: '', 
    fuelDate: '',
    status: 'PENDING',
    reviewNotes: '',
  });
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadOptions();
      if (fuelLog) {
        setForm({
          userId: fuelLog.userId || '',
          vehicleId: fuelLog.vehicleId || '',
          amount: fuelLog.amount || '',
          liters: fuelLog.liters || '',
          fuelDate: fuelLog.fuelDate ? new Date(fuelLog.fuelDate).toISOString().split('T')[0] : '',
          status: fuelLog.status || 'PENDING',
          reviewNotes: fuelLog.reviewNotes || '',
        });
      } else {
        setForm({ 
          userId: '', 
          vehicleId: '', 
          amount: '', 
          liters: '', 
          fuelDate: '',
          status: 'PENDING',
          reviewNotes: '',
        });
      }
      setReceipt(null);
    }
  }, [isOpen, fuelLog]);

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
      const formData = new FormData();
      formData.append('userId', form.userId);
      formData.append('vehicleId', form.vehicleId);
      formData.append('amount', form.amount);
      formData.append('liters', form.liters);
      formData.append('fuelDate', form.fuelDate);
      
      if (fuelLog) {
        formData.append('status', form.status);
        formData.append('reviewNotes', form.reviewNotes);
      }
      
      if (receipt instanceof File) {
        formData.append('receipt', receipt);
      }
      
      await onSave(formData);
      onClose();
      toast.success(fuelLog ? 'تم تحديث سجل الوقود' : 'تم إنشاء سجل الوقود');
    } catch (error) {
      toast.error('فشل في الحفظ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={fuelLog ? 'تحديث سجل الوقود' : 'إنشاء سجل وقود جديد'}>
      <form onSubmit={handleSubmit} className="space-y-5 max-h-[calc(100vh-200px)] overflow-y-auto">
        <select 
          className="form-input form-select" 
          value={form.userId} 
          onChange={(e) => setForm(f => ({ ...f, userId: e.target.value }))}
          required
          disabled={!!fuelLog}
        >
          <option value="">اختر السائق</option>
          {drivers.map(d => <option key={d.id} value={d.id}>{d.fullNameAr}</option>)}
        </select>
        <select 
          className="form-input form-select" 
          value={form.vehicleId} 
          onChange={(e) => setForm(f => ({ ...f, vehicleId: e.target.value }))}
          required
          disabled={!!fuelLog}
        >
          <option value="">اختر المركبة</option>
          {vehicles.map(v => <option key={v.id} value={v.id}>{v.plateNumber}</option>)}
        </select>
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
          type="number" 
          step="0.01" 
          className="form-input" 
          placeholder="اللترات" 
          value={form.liters} 
          onChange={(e) => setForm(f => ({ ...f, liters: e.target.value }))}
          required
        />
        <input 
          type="date" 
          className="form-input" 
          value={form.fuelDate} 
          onChange={(e) => setForm(f => ({ ...f, fuelDate: e.target.value }))}
          required
        />

        <FileUploadField
          label="صورة الإيصال"
          value={receipt || (fuelLog?.receiptUrl && !Array.isArray(fuelLog?.receiptUrl) ? [fuelLog.receiptUrl] : null)}
          onChange={setReceipt}
          multiple={false}
          accept="image/*,.pdf"
          optional={true}
        />

        {fuelLog && (
          <>
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

            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">ملاحظات المراجعة</label>
              <textarea
                className="form-input"
                placeholder="أضف ملاحظاتك على السجل"
                value={form.reviewNotes}
                onChange={(e) => setForm(f => ({ ...f, reviewNotes: e.target.value }))}
                rows={3}
              />
            </div>
          </>
        )}

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

export default function FuelLogsPage() {
  const navigate = useNavigate();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedFuelLog, setSelectedFuelLog] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);

  const handleCreate = async (form) => {
    await apiService.upload('/fuel-logs', form);
    setReloadToken(t => t + 1);
  };

  const handleUpdate = async (form) => {
    await apiService.upload(`/fuel-logs/${selectedFuelLog.id}`, form);
    setReloadToken(t => t + 1);
  };

  const openUpdateModal = (fuelLog) => {
    setSelectedFuelLog(fuelLog);
    setUpdateModalOpen(true);
  };

  const createButton = (
    <button 
      onClick={() => setCreateModalOpen(true)} 
      className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-2xl hover:bg-primary-dark transition-colors font-bold"
    >
      <LuPlus size={18} />
      إضافة سجل وقود
    </button>
  );

  return (
    <>
      <GenericListPage 
        title="سجلات الوقود" 
        apiUrl="/fuel-logs" 
        columns={[...columns.slice(0, -1), {
          key: 'actions',
          label: '',
          stopRowClick: true,
          render: (_, row) => (
            <div className="flex items-center gap-2">
              <StatusSelect
                id={row.id}
                currentStatus={row.status}
                apiUrl={`/fuel-logs/${row.id}`}
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
        onRowClick={(row) => navigate(`/fuel/${row.id}`)} 
        createButton={createButton}
        reloadToken={reloadToken}
        filters={[
          { key: 'driverName', type: 'text', placeholder: 'اسم السائق' },
          { key: 'status', type: 'select', placeholder: 'الحالة', options: statusOptions },
          { key: 'dateFrom', type: 'date', placeholder: 'من تاريخ' },
          { key: 'dateTo', type: 'date', placeholder: 'إلى تاريخ' },
        ]} 
      />
      <FuelLogModal 
        isOpen={createModalOpen} 
        onClose={() => setCreateModalOpen(false)} 
        onSave={handleCreate} 
      />
      <FuelLogModal 
        isOpen={updateModalOpen} 
        onClose={() => setUpdateModalOpen(false)} 
        fuelLog={selectedFuelLog} 
        onSave={handleUpdate} 
      />
    </>
  );
}
