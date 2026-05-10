import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LuMessageSquare, LuPencil, LuTrash2, LuPlus, LuKey } from 'react-icons/lu';
import GenericListPage from '../../components/ui/GenericListPage';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { apiService } from '../../services/api';

const ROLE_OPTIONS = [
  { value: 'SUPER_ADMIN', label: 'مدير عام' },
  { value: 'COMPANY_ADMIN', label: 'مدير شركة' },
  { value: 'OPERATIONS_ADMIN', label: 'مدير عمليات' },
  { value: 'HR_ADMIN', label: 'مدير موارد بشرية' },
  { value: 'FLEET_ADMIN', label: 'مدير أسطول' },
  { value: 'FINANCE_ADMIN', label: 'مدير مالي' },
  { value: 'SAFETY_ADMIN', label: 'مدير سلامة' },
];

const roleLabels = Object.fromEntries(ROLE_OPTIONS.map((r) => [r.value, r.label]));

function FormField({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-bold text-slate-600 mb-2">{label}</label>
      {children}
    </div>
  );
}

function AdminForm({ initial, onSubmit, loading }) {
  const [form, setForm] = useState(initial);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <FormField label="رقم الهوية *">
          <input className="form-input" value={form.identityNumber} onChange={set('identityNumber')} placeholder="مثال: 1000000099" />
        </FormField>
        <FormField label={initial.identityNumber ? 'كلمة المرور الجديدة' : 'كلمة المرور *'}>
          <input className="form-input" type="password" value={form.password} onChange={set('password')} placeholder={initial.identityNumber ? 'اتركها فارغة للإبقاء عليها' : '••••••••'} />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="الاسم (عربي) *">
          <input className="form-input" value={form.fullNameAr} onChange={set('fullNameAr')} placeholder="اسمك هنا" />
        </FormField>
        <FormField label="الاسم (إنجليزي)">
          <input className="form-input" value={form.fullNameEn} onChange={set('fullNameEn')} placeholder="Your Name" />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="البريد الإلكتروني">
          <input className="form-input" type="email" value={form.email} onChange={set('email')} placeholder="admin@example.com" />
        </FormField>
        <FormField label="رقم الجوال">
          <input className="form-input" value={form.mobileNumber} onChange={set('mobileNumber')} placeholder="0501234567" />
        </FormField>
      </div>
      <FormField label="الصلاحية *">
        <select className="form-input form-select" value={form.role} onChange={set('role')}>
          <option value="">اختر صلاحية</option>
          {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </FormField>
      <div className="flex justify-end gap-3 pt-4">
        <button type="button" onClick={onSubmit} disabled={loading} className="btn-primary">
          {loading ? 'جارٍ الحفظ...' : 'حفظ'}
        </button>
      </div>
    </div>
  );
}

export default function AdminsPage() {
  const navigate = useNavigate();
  const [reloadToken, setReloadToken] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  const createDefault = { identityNumber: '', password: '', fullNameAr: '', fullNameEn: '', email: '', mobileNumber: '', role: '' };
  const [form, setForm] = useState(createDefault);
  const [resetPassword, setResetPassword] = useState('');

  const reload = useCallback(() => setReloadToken((t) => t + 1), []);

  const openCreate = () => { setForm(createDefault); setCreateOpen(true); };
  const openEdit = (row) => { setSelected(row); setForm({ identityNumber: row.identityNumber, password: '', fullNameAr: row.fullNameAr, fullNameEn: row.fullNameEn || '', email: row.email || '', mobileNumber: row.mobileNumber || '', role: row.role }); setEditOpen(true); };
  const openReset = (row) => { setSelected(row); setResetPassword(''); setResetOpen(true); };
  const openDelete = (row) => { setSelected(row); setDeleteOpen(true); };

  const handleCreate = async () => {
    if (!form.identityNumber || !form.password || !form.fullNameAr || !form.role) { toast.error('الرجاء تعبئة الحقول المطلوبة'); return; }
    setLoading(true);
    try {
      await apiService.post('/admin-users', form);
      toast.success('تم إنشاء المستخدم بنجاح');
      setCreateOpen(false);
      reload();
    } catch { } finally { setLoading(false); }
  };

  const handleEdit = async () => {
    if (!form.fullNameAr || !form.role) { toast.error('الرجاء تعبئة الحقول المطلوبة'); return; }
    setLoading(true);
    try {
      await apiService.put(`/admin-users/${selected.id}`, form);
      toast.success('تم التحديث بنجاح');
      setEditOpen(false);
      reload();
    } catch { } finally { setLoading(false); }
  };

  const handleReset = async () => {
    if (!resetPassword || resetPassword.length < 6) { toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }
    setLoading(true);
    try {
      await apiService.patch(`/admin-users/${selected.id}/reset-password`, { password: resetPassword });
      toast.success('تم تغيير كلمة المرور');
      setResetOpen(false);
    } catch { } finally { setLoading(false); }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await apiService.delete(`/admin-users/${selected.id}`);
      toast.success('تم حذف المستخدم');
      setDeleteOpen(false);
      reload();
    } catch { } finally { setLoading(false); }
  };

  const columns = [
    { key: 'identityNumber', label: 'رقم الهوية' },
    { key: 'fullNameAr', label: 'الاسم' },
    { key: 'email', label: 'البريد' },
    { key: 'role', label: 'الصلاحية', render: (v) => roleLabels[v] || v },
    { key: 'accountStatus', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
    {
      key: 'actions',
      label: 'إجراءات',
      stopRowClick: true,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); navigate(`/chat?userId=${row.id}`); }} className="btn-icon" title="مراسلة"><LuMessageSquare size={16} /></button>
          <button onClick={(e) => { e.stopPropagation(); openEdit(row); }} className="btn-icon" title="تعديل"><LuPencil size={16} /></button>
          <button onClick={(e) => { e.stopPropagation(); openReset(row); }} className="btn-icon" title="إعادة كلمة المرور"><LuKey size={16} /></button>
          <button onClick={(e) => { e.stopPropagation(); openDelete(row); }} className="btn-icon !text-red-500" title="حذف"><LuTrash2 size={16} /></button>
        </div>
      ),
    },
  ];

  const createButton = (
    <button onClick={openCreate} className="btn-primary flex items-center gap-2">
      <LuPlus size={18} /> إضافة مستخدم
    </button>
  );

  return (
    <>
      <GenericListPage title="المستخدمين الإداريين" apiUrl="/admin-users" columns={columns} reloadToken={reloadToken} createButton={createButton} />

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="إضافة مستخدم إداري">
        <AdminForm initial={form} onSubmit={handleCreate} loading={loading} />
      </Modal>

      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="تعديل مستخدم">
        <AdminForm initial={form} onSubmit={handleEdit} loading={loading} />
      </Modal>

      <Modal isOpen={resetOpen} onClose={() => setResetOpen(false)} title={`إعادة كلمة المرور: ${selected?.fullNameAr}`}>
        <div className="space-y-4">
          <FormField label="كلمة المرور الجديدة *">
            <input className="form-input" type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder="••••••••" />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={handleReset} disabled={loading} className="btn-primary">{loading ? 'جارٍ...' : 'تغيير كلمة المرور'}</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="حذف مستخدم"
        message={`هل أنت متأكد من حذف "${selected?.fullNameAr}"؟ سيتم أرشفة الحساب.`}
        confirmLabel="حذف"
        loading={loading}
      />
    </>
  );
}
