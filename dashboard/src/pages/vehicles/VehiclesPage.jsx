import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import GenericListPage from '../../components/ui/GenericListPage';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import RowActions from '../../components/ui/RowActions';
import PermissionGate from '../../components/auth/PermissionGate';
import { PERMISSIONS as P, hasAnyPermission } from '../../utils/rolePermissions';
import { LuPencil, LuPlus, LuTrash2, LuEye } from 'react-icons/lu';

const statusFilter = {
  key: 'status', type: 'select', placeholder: 'حالة المركبة',
  options: [
    { value: 'ACTIVE', label: 'نشطة' },
    { value: 'IN_MAINTENANCE', label: 'في الصيانة' },
    { value: 'OUT_OF_SERVICE', label: 'خارج الخدمة' },
  ],
};

export default function VehiclesPage() {
  const navigate = useNavigate();
  const authUser = useSelector((s) => s.auth.user);
  const canWrite = hasAnyPermission(authUser?.role, [P.FLEET_WRITE]);

  const [reloadToken, setReloadToken] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm] = useState({
    plateNumber: '',
    manufacturer: '',
    model: '',
    year: '',
    color: '',
    status: 'ACTIVE',
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ plateNumber: '', manufacturer: '', model: '', year: '', color: '', status: 'ACTIVE' });
    setShowModal(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      plateNumber: row.plateNumber || '',
      manufacturer: row.manufacturer || '',
      model: row.model || '',
      year: row.year || '',
      color: row.color || '',
      status: row.status || 'ACTIVE',
    });
    setShowModal(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        year: form.year ? parseInt(form.year, 10) : undefined,
      };
      if (editing?.id) {
        await apiService.put(`/vehicles/${editing.id}`, payload);
        toast.success('تم تحديث المركبة');
      } else {
        await apiService.post('/vehicles', payload);
        toast.success('تم إضافة المركبة');
      }
      setShowModal(false);
      setReloadToken((t) => t + 1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل الحفظ');
    }
  };

  const doDelete = async () => {
    try {
      await apiService.delete(`/vehicles/${confirmDelete.id}`);
      toast.success('تم حذف المركبة');
      setConfirmDelete(null);
      setReloadToken((t) => t + 1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل الحذف');
    }
  };

  const columns = useMemo(() => ([
    { key: 'plateNumber', label: 'رقم اللوحة' },
    { key: 'manufacturer', label: 'الشركة المصنعة' },
    { key: 'model', label: 'الموديل' },
    { key: 'year', label: 'السنة' },
    { key: 'color', label: 'اللون' },
    { key: 'status', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
    {
      key: 'assignments',
      label: 'السائق المعين',
      render: (v) => {
        const active = v?.find((a) => a.isActive);
        return active?.user?.fullNameAr || '—';
      },
    },
    {
      key: '__actions',
      label: 'إجراءات',
      stopRowClick: true,
      render: (_, row) => (
        <PermissionGate anyOf={[P.FLEET_WRITE]}>
          <RowActions>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate(`/vehicles/${row.id}`)}>
              <LuEye size={16} />
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(row)}>
              <LuPencil size={16} />
            </button>
            <button type="button" className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(row)}>
              <LuTrash2 size={16} />
            </button>
          </RowActions>
        </PermissionGate>
      ),
    },
  ]), []);

  return (
    <>
      <GenericListPage
        title="إدارة المركبات"
        apiUrl="/vehicles"
        columns={columns}
        reloadToken={reloadToken}
        onRowClick={(row) => navigate(`/vehicles/${row.id}`)}
        filters={[{ key: 'search', placeholder: 'بحث برقم اللوحة...' }, statusFilter]}
        createButton={(
          <PermissionGate anyOf={[P.FLEET_WRITE]}>
            <button className="btn btn-primary" onClick={openCreate}>
              <LuPlus size={16} /> إضافة مركبة
            </button>
          </PermissionGate>
        )}
      />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'تعديل مركبة' : 'إضافة مركبة'}>
        <form onSubmit={submit}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">رقم اللوحة</label>
              <input className="form-input" required value={form.plateNumber} onChange={(e) => setForm((f) => ({ ...f, plateNumber: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">الحالة</label>
              <select className="form-input form-select" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                <option value="ACTIVE">نشطة</option>
                <option value="IN_MAINTENANCE">في الصيانة</option>
                <option value="OUT_OF_SERVICE">خارج الخدمة</option>
                <option value="RESERVED">محجوزة</option>
                <option value="DECOMMISSIONED">مستبعدة</option>
              </select>
            </div>
          </div>
          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">الشركة</label>
              <input className="form-input" value={form.manufacturer} onChange={(e) => setForm((f) => ({ ...f, manufacturer: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">الموديل</label>
              <input className="form-input" value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">السنة</label>
              <input className="form-input" type="number" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">اللون</label>
            <input className="form-input" value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button type="submit" className="btn btn-primary" disabled={!canWrite}>حفظ</button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={doDelete}
        title="حذف مركبة"
        message={`هل أنت متأكد من حذف المركبة (${confirmDelete?.plateNumber || ''})؟`}
        confirmText="حذف"
        danger
      />
    </>
  );
}
