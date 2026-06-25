import { useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import GenericListPage from '../../components/ui/GenericListPage';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';
import { LuPlus } from 'react-icons/lu';

const statusOptions = [
  { value: 'PENDING', label: 'قيد المراجعة' },
  { value: 'APPROVED', label: 'موافق' },
  { value: 'REJECTED', label: 'مرفوض' },
  { value: 'CANCELLED', label: 'ملغي' },
];

const columns = [
  { key: 'user', label: 'السائق', render: (v) => v?.fullNameAr || '—' },
  { key: 'permissionDate', label: 'التاريخ', render: (v) => v ? new Date(v).toLocaleDateString('ar-SA') : '—' },
  { key: 'startTime', label: 'من', render: (v) => v || '—' },
  { key: 'endTime', label: 'إلى', render: (v) => v || '—' },
  { key: 'reason', label: 'السبب', render: (v) => (v?.length > 40 ? `${v.slice(0, 40)}…` : v) },
  { key: 'status', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
];

function PermissionModal({ isOpen, onClose, onSave }) {
  const [form, setForm] = useState({
    permissionDate: '',
    startTime: '',
    endTime: '',
    reason: '',
    userId: '',
  });
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    apiService.get('/users', { role: 'DRIVER', limit: 500 }).then((r) => setDrivers(r.data.data || []));
    setForm({ permissionDate: '', startTime: '', endTime: '', reason: '', userId: '' });
  }, [isOpen]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(form);
      onClose();
      toast.success('تم إرسال طلب الاستئذان');
    } catch {
      toast.error('فشل الحفظ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="طلب استئذان جديد">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-bold mb-1">السائق</label>
          <select className="form-input form-select" required value={form.userId} onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}>
            <option value="">اختر سائقاً</option>
            {drivers.map((d) => <option key={d.id} value={d.id}>{d.fullNameAr}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold mb-1">تاريخ الاستئذان</label>
          <input type="date" className="form-input" required value={form.permissionDate} onChange={(e) => setForm((f) => ({ ...f, permissionDate: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-bold mb-1">من</label>
            <input type="time" className="form-input" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">إلى</label>
            <input type="time" className="form-input" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold mb-1">السبب</label>
          <textarea className="form-input" required rows={3} value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
        </div>
        <button type="submit" disabled={loading} className="btn btn-primary w-full">{loading ? 'حفظ...' : 'إرسال'}</button>
      </form>
    </Modal>
  );
}

export default function PermissionRequestsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const handleCreate = async (body) => {
    await apiService.post('/permission-requests', body);
    setReloadToken((t) => t + 1);
  };

  const review = async (id, status) => {
    await apiService.patch(`/permission-requests/${id}/review`, { status });
    setReloadToken((t) => t + 1);
    toast.success('تمت المراجعة');
  };

  return (
    <>
      <GenericListPage
        title="طلبات الاستئذان"
        apiUrl="/permission-requests"
        reloadToken={reloadToken}
        defaultParams={{}}
        filters={[
          { key: 'driverName', type: 'text', label: 'اسم السائق', placeholder: 'اسم السائق' },
          { key: 'status', type: 'select', label: 'الحالة', placeholder: 'الحالة', options: statusOptions },
        ]}
        columns={[
          ...columns,
          {
            key: 'actions',
            label: 'مراجعة',
            stopRowClick: true,
            render: (_, row) => row.status === 'PENDING' ? (
              <div className="flex gap-2">
                <button type="button" className="text-emerald-600 text-sm font-bold" onClick={() => review(row.id, 'APPROVED')}>موافقة</button>
                <button type="button" className="text-red-600 text-sm font-bold" onClick={() => review(row.id, 'REJECTED')}>رفض</button>
              </div>
            ) : null,
          },
        ]}
        createButton={(
          <button type="button" onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-2xl font-bold">
            <LuPlus size={18} /> طلب استئذان
          </button>
        )}
      />
      <PermissionModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSave={handleCreate} />
    </>
  );
}
