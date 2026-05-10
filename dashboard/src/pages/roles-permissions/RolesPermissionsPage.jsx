import { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { LuShield, LuCheck, LuLoader, LuCircleAlert, LuPlus, LuPencil, LuTrash2 } from 'react-icons/lu';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { apiService } from '../../services/api';
import { getGrantedPermissions } from '../../utils/rolePermissions';
import { updateUserPermissions } from '../../store/authSlice';

const CATEGORY_LABELS = {
  users: 'إدارة الموظفين',
  fleet: 'الأسطول',
  documents: 'المستندات',
  shifts: 'المناوبات',
  hr: 'الموارد البشرية',
  finance: 'الأمور المالية',
  settings: 'الإعدادات',
  audit: 'سجلات التدقيق',
  compliance: 'الامتثال والسلامة',
  inventory: 'المخزون',
  role: 'الأدوار',
  dashboard: 'لوحة التحكم',
};

const ROLE_LABELS = {
  SUPER_ADMIN: 'مدير عام',
  OPERATIONS_ADMIN: 'مدير عمليات',
  HR_ADMIN: 'مدير موارد بشرية',
  FLEET_ADMIN: 'مدير أسطول',
  FINANCE_ADMIN: 'مدير مالي',
  SUPERVISOR: 'مشرف',
  DRIVER: 'سائق',
};

function MyPermissionsCard() {
  const user = useSelector((s) => s.auth.user);
  const granted = user?.permissions ? new Set(user.permissions) : getGrantedPermissions(user?.role);

  const label = ROLE_LABELS[user?.role] || user?.role || '';

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-premium p-6 mb-6">
      <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">صلاحياتي الحالية</h3>
      <div className="flex items-center gap-3 mb-4">
        <span className="px-3 py-1.5 bg-primary/10 text-primary rounded-full font-bold text-sm">{label}</span>
        <span className="text-xs text-slate-400">{granted.size} صلاحية</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {user?.permissions ? (
          [...granted].sort().map((key) => (
            <span key={key} className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-xs font-bold">
              {CATEGORY_LABELS[key.split(':')[0]] || key}
            </span>
          ))
        ) : (
          <span className="text-xs text-slate-400">جارٍ التحميل...</span>
        )}
      </div>
    </div>
  );
}

function PermissionRow({ perm, checked, userHas, onToggle, readOnly }) {
  return (
    <label
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
        readOnly
          ? 'bg-slate-50 border-slate-100 cursor-not-allowed opacity-70'
          : checked
          ? 'bg-emerald-50 border-emerald-200 cursor-pointer hover:border-emerald-300'
          : 'bg-white border-slate-100 cursor-pointer hover:border-slate-200'
      }`}
    >
      <div
        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
          readOnly
            ? 'bg-slate-200 border-slate-300'
            : checked
            ? 'bg-emerald-500 border-emerald-500'
            : 'border-slate-300'
        }`}
      >
        {checked && !readOnly && <LuCheck size={12} className="text-white" />}
        {checked && readOnly && <LuCheck size={12} className="text-slate-500" />}
      </div>
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={() => onToggle(perm.key)}
        disabled={readOnly}
      />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <div className="font-bold text-sm text-slate-700">{perm.label}</div>
          {userHas && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" title="تملك هذه الصلاحية حالياً" />
          )}
        </div>
        {userHas && (
          <div className="text-xs text-emerald-600 font-bold mt-0.5">مفعّلة حالياً</div>
        )}
        {readOnly && (
          <div className="text-xs text-slate-400 mt-0.5">هذا الدور يحاكي صلاحيات الأدوار النظامية ولا يمكن تحريره</div>
        )}
      </div>
    </label>
  );
}

export default function RolesPermissionsPage() {
  const dispatch = useDispatch();
  const currentUser = useSelector((s) => s.auth.user);

  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState(null);
  const [dirtyPerms, setDirtyPerms] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteRoleOpen, setDeleteRoleOpen] = useState(false);
  const [deletingRoleKey, setDeletingRoleKey] = useState(null);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleModalMode, setRoleModalMode] = useState('create');
  const [roleForm, setRoleForm] = useState({ key: '', labelAr: '', labelEn: '' });
  const [roleLoading, setRoleLoading] = useState(false);

  const selectedRole = roles.find((r) => r.key === selectedKey);
  const currentUserPermissions = currentUser?.permissions || getGrantedPermissions(currentUser?.role) || [];
  const myPermSet = new Set(currentUserPermissions);

  const load = useCallback(async () => {
    const [matrixRes, permsRes] = await Promise.all([
      apiService.get('/permissions/matrix'),
      apiService.get('/permissions'),
    ]);
    setRoles(matrixRes.data.roles || []);
    setPermissions(permsRes.data || []);
    return matrixRes.data.roles || [];
  }, []);

  useEffect(() => {
    (async () => {
      const loadedRoles = await load();
      if (loadedRoles.length && !selectedKey) {
        setSelectedKey(loadedRoles[0].key);
      }
      setLoading(false);
    })();
  }, [load, selectedKey]);

  const handleToggle = (key) => {
    if (selectedKey === 'SUPER_ADMIN' || selectedRole?.isSystem) return;
    setDirtyPerms((prev) => {
      const next = new Set(prev !== null ? prev : (selectedRole?.permissions || []));
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return [...next];
    });
  };

  const openEditRole = (r) => {
    setRoleModalMode('edit');
    setRoleForm({ key: r.key, labelAr: r.labelAr || '', labelEn: r.labelEn || '' });
    setRoleModalOpen(true);
  };

  const openCreateRole = () => {
    setRoleModalMode('create');
    setRoleForm({ key: '', labelAr: '', labelEn: '' });
    setRoleModalOpen(true);
  };

  const openDeleteRole = (key) => {
    setDeletingRoleKey(key);
    setDeleteRoleOpen(true);
  };

  const setRoleField = (field) => (e) => setRoleForm((f) => ({ ...f, [field]: e.target.value }));

  const handleCreateRole = async () => {
    if (!roleForm.key || !roleForm.labelAr || !roleForm.labelEn) {
      toast.error('الرجاء تعبئة الحقول المطلوبة');
      return;
    }
    setRoleLoading(true);
    try {
      await apiService.post('/roles', { key: roleForm.key, labelAr: roleForm.labelAr, labelEn: roleForm.labelEn });
      toast.success('تم إنشاء الدور بنجاح');
      setRoleModalOpen(false);
      await load();
    } catch {
      toast.error('فشل إنشاء الدور');
    } finally {
      setRoleLoading(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!roleForm.labelAr || !roleForm.labelEn) {
      toast.error('الرجاء تعبئة الحقول المطلوبة');
      return;
    }
    setRoleLoading(true);
    try {
      await apiService.put(`/roles/${roleForm.key}`, { labelAr: roleForm.labelAr, labelEn: roleForm.labelEn });
      toast.success('تم تحديث الدور بنجاح');
      setRoleModalOpen(false);
      await load();
      setDirtyPerms(null);
    } catch {
      toast.error('فشل تحديث الدور');
    } finally {
      setRoleLoading(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!deletingRoleKey) return;
    setRoleLoading(true);
    try {
      await apiService.delete(`/roles/${deletingRoleKey}`);
      toast.success('تم حذف الدور بنجاح');
      setDeleteRoleOpen(false);
      setDeletingRoleKey(null);
      const loadedRoles = await load();
      setSelectedKey((prev) => (loadedRoles.some((r) => r.key === prev) ? prev : loadedRoles[0]?.key || null));
      setDirtyPerms(null);
    } catch {
      toast.error('فشل حذف الدور');
    } finally {
      setRoleLoading(false);
    }
  };

  const isDirty = (roleKey) => {
    const r = roles.find((x) => x.key === roleKey);
    if (!r) return false;
    if (dirtyPerms !== null && selectedKey === roleKey) {
      return JSON.stringify([...dirtyPerms].sort()) !== JSON.stringify([...r.permissions].sort());
    }
    return false;
  };

  const handleSave = async () => {
    if (!dirtyPerms) return;
    setSaving(true);
    try {
      await apiService.put(`/permissions/matrix/${selectedKey}`, { permissions: dirtyPerms });
      toast.success('تم حفظ التغييرات بنجاح');
      const saved = dirtyPerms;
      setDirtyPerms(null);
      await load();
      if (currentUser.role === selectedKey) {
        dispatch(updateUserPermissions(saved));
      }
    } catch { toast.error('فشل حفظ التغييرات'); }
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-64">
        <LuLoader className="animate-spin text-3xl text-primary" />
      </div>
    );
  }

  return (
    <div className="page-container animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-8">
        <div className="w-full xl:w-auto">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">الأدوار والصلاحيات</h2>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-400">إدارة صلاحيات النظام</span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto">
          <button onClick={openCreateRole} className="btn btn-primary flex items-center gap-2 w-full sm:w-auto justify-center">
            <LuPlus size={18} /> إنشاء دور جديد
          </button>
          {dirtyPerms !== null && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
              <span className="text-sm text-amber-600 font-bold flex items-center gap-1">
                <LuCircleAlert size={16} /> هناك تغييرات غير محفوظة
              </span>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn btn-primary flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60 w-full sm:w-auto justify-center"
              >
                {saving ? <><LuLoader className="animate-spin" size={16} />جارٍ الحفظ...</> : <><LuCheck size={16} />حفظ التغييرات</>}
              </button>
            </div>
          )}
        </div>
      </div>

      <MyPermissionsCard />

      {(() => {
        const myPermSet = new Set(currentUserPermissions);
        const savedPerms = selectedRole?.permissions || [];
        const currentPerms = dirtyPerms !== null ? dirtyPerms : savedPerms;
        const removedPerms = savedPerms.filter((p) => myPermSet.has(p) && !currentPerms.includes(p));
        if (!removedPerms.length) return null;
        return (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <LuCircleAlert size={16} className="text-amber-600" />
              <span className="font-bold text-amber-700 text-sm">الصلاحيات التالية ستُزال من صلاحياتك:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {removedPerms.map((key) => {
                const permData = permissions.flatMap((c) => c.permissions).find((p) => p.key === key);
                return (
                  <span key={key} className="px-2.5 py-1 bg-amber-100 border border-amber-300 text-amber-700 rounded-full text-xs font-bold">
                    {permData?.label || key}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })()}

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full max-w-full lg:w-80 flex-shrink-0 space-y-2">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3">الأدوار</h3>
          {roles.map((r) => (
            <button
              key={r.key}
              onClick={() => {
                if (r.key !== selectedKey && isDirty(selectedKey)) {
                  toast.error('احفظ التغييرات أولاً قبل التبديل بين الأدوار');
                  return;
                }
                setSelectedKey(r.key);
                setDirtyPerms(null);
              }}
              className={`w-full text-right px-4 py-3 rounded-2xl flex items-center justify-between transition-all ${
                selectedKey === r.key
                  ? 'bg-primary text-white shadow-lg'
                  : isDirty(r.key)
                  ? 'bg-amber-50 border-2 border-amber-400 text-slate-700'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-100'
              }`}
            >
              <div>
                <div className="font-bold text-sm">{r.label || ROLE_LABELS[r.key] || r.key}</div>
                <div className={`text-xs ${selectedKey === r.key ? 'text-white/70' : 'text-slate-400'}`}>
                  {dirtyPerms !== null && selectedKey === r.key ? dirtyPerms.length : r.permissions.length} صلاحية
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {r.isSystem && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${selectedKey === r.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    نظام
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="flex-1 bg-white rounded-3xl border border-slate-100 shadow-premium overflow-hidden">
          {selectedRole ? (
            <>
              <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-lg font-black text-slate-800">{selectedRole.label || ROLE_LABELS[selectedKey] || selectedKey}</h3>
                    <p className="text-sm text-slate-400">{selectedRole.permissions.length} صلاحية مفعّلة</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 justify-end">
                    {!selectedRole.isSystem && (
                      <>
                        <button type="button" onClick={() => openEditRole(selectedRole)} className="btn-icon" title="تعديل الدور"><LuPencil size={18} /></button>
                        <button type="button" onClick={() => openDeleteRole(selectedRole.key)} className="btn-icon !text-red-500" title="حذف الدور"><LuTrash2 size={18} /></button>
                      </>
                    )}
                    {selectedKey === 'SUPER_ADMIN' && (
                      <span className="flex items-center gap-2 text-xs text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">
                        <LuCircleAlert size={14} /> صلاحيات المدير العام مرجعية فقط
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-6 max-h-[calc(100vh-420px)] overflow-y-auto">
                {permissions.map(({ category, categoryLabel, permissions: perms }) => (
                  <div key={category} className="mb-8 last:mb-0">
                    <h4 className="text-sm font-black text-slate-500 uppercase tracking-wider mb-3">
                      {categoryLabel}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                      {perms.map((p) => {
                        const currentPerms = dirtyPerms !== null ? dirtyPerms : (selectedRole?.permissions || []);
                        const checked = currentPerms.includes(p.key);
                        const readOnly = selectedKey === 'SUPER_ADMIN' || selectedRole?.isSystem;
                        const userHas = myPermSet.has(p.key);

                        return (
                          <PermissionRow
                            key={p.key}
                            perm={p}
                            checked={checked}
                            userHas={userHas}
                            onToggle={handleToggle}
                            readOnly={readOnly}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-16">
              <LuShield size={48} className="mb-4" />
              <p className="font-bold">اختر دوراً من القائمة</p>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={roleModalOpen} onClose={() => setRoleModalOpen(false)} title={roleModalMode === 'create' ? 'إنشاء دور جديد' : 'تعديل الدور'}>
        <div className="space-y-5">
          {roleModalMode === 'create' && (
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">مفتاح الدور *</label>
              <input
                className="form-input"
                value={roleForm.key}
                onChange={setRoleField('key')}
                placeholder="مثال: OPERATIONS_ADMIN"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">الاسم العربي *</label>
            <input
              className="form-input"
              value={roleForm.labelAr}
              onChange={setRoleField('labelAr')}
              placeholder="مثال: مدير عمليات"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">الاسم الإنجليزي *</label>
            <input
              className="form-input"
              value={roleForm.labelEn}
              onChange={setRoleField('labelEn')}
              placeholder="مثال: Operations Admin"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={roleModalMode === 'create' ? handleCreateRole : handleUpdateRole}
              disabled={roleLoading}
              className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {roleLoading
                ? 'جارٍ الحفظ...'
                : roleModalMode === 'create'
                  ? 'إنشاء الدور'
                  : 'حفظ التعديلات'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={deleteRoleOpen}
        onClose={() => setDeleteRoleOpen(false)}
        onConfirm={handleDeleteRole}
        title="حذف الدور"
        message={`هل أنت متأكد من حذف الدور "${deletingRoleKey}"؟ هذا الإجراء لا يمكن التراجع عنه.`}
        confirmLabel="حذف الدور"
        loading={roleLoading}
      />
    </div>
  );
}