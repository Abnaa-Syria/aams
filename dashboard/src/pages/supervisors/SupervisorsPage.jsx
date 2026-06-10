import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';
import GenericListPage from '../../components/ui/GenericListPage';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import RowActions from '../../components/ui/RowActions';
import PermissionGate from '../../components/auth/PermissionGate';
import { PERMISSIONS as P, hasAnyPermissionForUser } from '../../utils/rolePermissions';
import { LuPencil, LuPlus, LuTrash2, LuMessageSquare } from 'react-icons/lu';

const statusOptions = [
  { value: 'ACTIVE', label: 'نشط' },
  { value: 'PENDING_APPROVAL', label: 'بانتظار الموافقة' },
  { value: 'TEMPORARILY_SUSPENDED', label: 'موقف مؤقتاً' },
  { value: 'RESTRICTED', label: 'مقيّد' },
  { value: 'UNDER_INVESTIGATION', label: 'تحت التحقيق' },
  { value: 'INCOMPLETE_PROFILE', label: 'ملف غير مكتمل' },
  { value: 'ARCHIVED', label: 'مؤرشف' },
];

export default function SupervisorsPage() {
  const navigate = useNavigate();
  const authUser = useSelector((s) => s.auth.user);
  const canWrite = hasAnyPermissionForUser(authUser, [P.USERS_WRITE]);

  const [reloadToken, setReloadToken] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm] = useState({
    identityNumber: '',
    password: '',
    fullNameAr: '',
    fullNameEn: '',
    mobileNumber: '',
    email: '',
    accountStatus: 'ACTIVE',
  });

  const openCreate = () => {
    setEditing(null);
    setForm({
      identityNumber: '',
      password: '',
      fullNameAr: '',
      fullNameEn: '',
      mobileNumber: '',
      email: '',
      accountStatus: 'ACTIVE',
    });
    setShowModal(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      identityNumber: row.identityNumber || '',
      password: '',
      fullNameAr: row.fullNameAr || '',
      fullNameEn: row.fullNameEn || '',
      mobileNumber: row.mobileNumber || '',
      email: row.email || '',
      accountStatus: row.accountStatus || 'ACTIVE',
    });
    setShowModal(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editing?.id) {
        await apiService.put(`/users/${editing.id}`, {
          fullNameAr: form.fullNameAr,
          fullNameEn: form.fullNameEn?.trim() || undefined,
          mobileNumber: form.mobileNumber?.trim() || undefined,
          email: form.email?.trim() || undefined,
        });
        if (form.accountStatus !== editing.accountStatus) {
          await apiService.patch(`/users/${editing.id}/status`, {
            accountStatus: form.accountStatus,
          });
        }
        toast.success('تم تحديث بيانات المشرف');
      } else {
        await apiService.post('/users', {
          identityNumber: form.identityNumber.trim(),
          password: form.password,
          fullNameAr: form.fullNameAr.trim(),
          fullNameEn: form.fullNameEn?.trim() || undefined,
          mobileNumber: form.mobileNumber?.trim() || undefined,
          email: form.email?.trim() || undefined,
          role: 'SUPERVISOR',
          accountStatus: form.accountStatus,
        });
        toast.success('تم إضافة المشرف');
      }
      setShowModal(false);
      setReloadToken((t) => t + 1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل الحفظ');
    }
  };

  const doDelete = async () => {
    try {
      await apiService.delete(`/users/${confirmDelete.id}`);
      toast.success('تم حذف المشرف');
      setConfirmDelete(null);
      setReloadToken((t) => t + 1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل الحذف');
    }
  };

  const columns = useMemo(() => ([
    { key: 'identityNumber', label: 'رقم الهوية' },
    { key: 'fullNameAr', label: 'الاسم' },
    { key: 'mobileNumber', label: 'الجوال' },
    { key: 'email', label: 'البريد' },
    { key: 'accountStatus', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
    { key: '_count', label: 'عدد السائقين', render: (v) => v?.assignedDrivers ?? 0 },
    {
      key: '__actions',
      label: 'إجراءات',
      stopRowClick: true,
      render: (_, row) => (
        <RowActions>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate(`/chat?userId=${row.id}`)} title="مراسلة">
            <LuMessageSquare size={16} />
          </button>
          <PermissionGate anyOf={[P.USERS_WRITE]}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(row)} title="تعديل">
              <LuPencil size={16} />
            </button>
            <button type="button" className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(row)} title="حذف">
              <LuTrash2 size={16} />
            </button>
          </PermissionGate>
        </RowActions>
      ),
    },
  ]), [navigate]);

  return (
    <>
      <GenericListPage
        title="إدارة المشرفين"
        apiUrl="/supervisors"
        columns={columns}
        reloadToken={reloadToken}
        filters={[{ key: 'search', placeholder: 'بحث...' }]}
        onRowClick={(row) => navigate(`/supervisors/${row.id}`)}
        createButton={(
          <PermissionGate anyOf={[P.USERS_WRITE]}>
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              <LuPlus size={16} /> إضافة مشرف
            </button>
          </PermissionGate>
        )}
      />

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'تعديل مشرف' : 'إضافة مشرف'}
      >
        <form onSubmit={submit}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">رقم الهوية</label>
              <input
                className="form-input"
                required
                disabled={!!editing}
                value={form.identityNumber}
                onChange={(e) => setForm((f) => ({ ...f, identityNumber: e.target.value }))}
              />
            </div>
            {!editing && (
              <div className="form-group">
                <label className="form-label">كلمة المرور</label>
                <input
                  className="form-input"
                  type="password"
                  required={!editing}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                />
              </div>
            )}
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">الاسم بالعربي</label>
              <input
                className="form-input"
                required
                value={form.fullNameAr}
                onChange={(e) => setForm((f) => ({ ...f, fullNameAr: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">الاسم بالإنجليزي</label>
              <input
                className="form-input"
                value={form.fullNameEn}
                onChange={(e) => setForm((f) => ({ ...f, fullNameEn: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">الجوال</label>
              <input
                className="form-input"
                value={form.mobileNumber}
                onChange={(e) => setForm((f) => ({ ...f, mobileNumber: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">البريد</label>
              <input
                className="form-input"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">حالة الحساب</label>
            <select
              className="form-input form-select"
              value={form.accountStatus}
              onChange={(e) => setForm((f) => ({ ...f, accountStatus: e.target.value }))}
            >
              {statusOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
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
        title="حذف مشرف"
        message={`هل أنت متأكد من حذف المشرف (${confirmDelete?.fullNameAr || confirmDelete?.identityNumber || ''})؟`}
        confirmText="حذف"
        danger
      />
    </>
  );
}
