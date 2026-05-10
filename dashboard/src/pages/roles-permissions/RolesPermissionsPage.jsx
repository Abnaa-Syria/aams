import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { LuShield, LuCheck, LuLoader, LuCircleAlert } from 'react-icons/lu';
import { apiService } from '../../services/api';

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
};

export default function RolesPermissionsPage() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState(null);
  const [dirtyPerms, setDirtyPerms] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiService.get('/permissions/matrix');
      const { roles: r, permissions: p } = res.data.data;
      setRoles(r);
      setPermissions(p);
      if (r.length && !selectedKey) setSelectedKey(r[0].key);
    } catch { toast.error('فشل تحميل البيانات'); }
    finally { setLoading(false); }
  }, [selectedKey]);

  useEffect(() => { load(); }, []);

  const selectedRole = roles.find((r) => r.key === selectedKey);

  const handleToggle = (permKey) => {
    if (selectedKey === 'SUPER_ADMIN') return;
    setDirtyPerms((prev) => {
      const current = prev || (selectedRole?.permissions || []);
      const next = current.includes(permKey)
        ? current.filter((k) => k !== permKey)
        : [...current, permKey];
      return next;
    });
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
      setDirtyPerms(null);
      await load();
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
      <div className="flex justify-between items-center flex-wrap gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">الأدوار والصلاحيات</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-400">إدارة صلاحيات النظام</span>
          </div>
        </div>
        {dirtyPerms !== null && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-amber-600 font-bold flex items-center gap-1">
              <LuCircleAlert size={16} /> هناك تغييرات غير محفوظة
            </span>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <><LuLoader className="animate-spin" size={16} />جارٍ الحفظ...</> : <><LuCheck size={16} />حفظ التغييرات</>}
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-6" style={{ minHeight: 'calc(100vh - 200px)' }}>
        <div className="w-80 flex-shrink-0 space-y-2">
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
                <div className="font-bold text-sm">{r.labelAr}</div>
                <div className={`text-xs ${selectedKey === r.key ? 'text-white/70' : 'text-slate-400'}`}>{r.labelEn}</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {r.isSystem && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${selectedKey === r.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    نظام
                  </span>
                )}
                <span className={`text-xs font-bold ${selectedKey === r.key ? 'text-white/80' : 'text-slate-400'}`}>
                  {dirtyPerms !== null && selectedKey === r.key ? dirtyPerms.length : r.permissions.length} صلاحية
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="flex-1 bg-white rounded-3xl border border-slate-100 shadow-premium overflow-hidden">
          {selectedRole ? (
            <>
              <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-800">{selectedRole.labelAr}</h3>
                    <p className="text-sm text-slate-400">{selectedRole.labelEn}</p>
                  </div>
                  {selectedKey === 'SUPER_ADMIN' && (
                    <span className="flex items-center gap-2 text-xs text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">
                      <LuCircleAlert size={14} /> صلاحيات المدير العام مرجعية فقط
                    </span>
                  )}
                </div>
              </div>

              <div className="p-6 max-h-[calc(100vh-320px)] overflow-y-auto">
                {permissions.map(({ category, permissions: perms }) => (
                  <div key={category} className="mb-8 last:mb-0">
                    <h4 className="text-sm font-black text-slate-500 uppercase tracking-wider mb-3">
                      {CATEGORY_LABELS[category] || category}
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                      {perms.map((p) => {
                        const currentPerms = dirtyPerms !== null && selectedKey === selectedKey ? dirtyPerms : (selectedRole?.permissions || []);
                        const checked = currentPerms.includes(p.key);
                        const readOnly = selectedKey === 'SUPER_ADMIN';

                        return (
                          <label
                            key={p.key}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all cursor-pointer ${
                              readOnly
                                ? 'bg-slate-50 border-slate-100 cursor-not-allowed opacity-70'
                                : checked
                                ? 'bg-emerald-50 border-emerald-200 cursor-pointer hover:border-emerald-300'
                                : 'bg-white border-slate-100 cursor-pointer hover:border-slate-200'
                            }`}
                          >
                            <div
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
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
                              onChange={() => handleToggle(p.key)}
                              disabled={readOnly}
                            />
                            <div className="flex-1">
                              <div className="font-bold text-sm text-slate-700">{p.labelAr}</div>
                              <div className="text-xs text-slate-400">{p.labelEn}</div>
                            </div>
                            <code className="text-[10px] text-slate-300 font-mono">{p.key}</code>
                          </label>
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
    </div>
  );
}
