import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateUser } from '../../store/authSlice';
import { apiService } from '../../services/api';
import { 
  LuUser, LuSettings, LuSmartphone, LuDatabase, LuPlus, LuPencil, 
  LuToggleLeft, LuToggleRight, LuCheck, LuX, LuCircleAlert, LuSave, LuRefreshCw,
  LuShield, LuBell, LuWrench, LuHardDrive, LuFileText, LuChartColumnIncreasing,
  LuBuilding2, LuGrid3X3, LuLock
} from 'react-icons/lu';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/ui/StatusBadge';

const CATEGORY_LABELS = {
  general: { label: 'الإعدادات العامة', icon: LuSettings },
  session: { label: 'الجلسات', icon: LuSettings },
  password: { label: 'كلمة المرور', icon: LuLock },
  otp: { label: 'التحقق', icon: LuShield },
  rate_limit: { label: 'حدود الاستخدام', icon: LuSettings },
  notifications: { label: 'الإشعارات', icon: LuBell },
  maintenance: { label: 'الصيانة', icon: LuWrench },
  backup: { label: 'النسخ الاحتياطي', icon: LuHardDrive },
  logs: { label: 'السجلات', icon: LuFileText },
  analytics: { label: 'التحليلات', icon: LuChartColumnIncreasing },
  features: { label: 'الميزات', icon: LuGrid3X3 },
  company: { label: 'معلومات الشركة', icon: LuBuilding2 },
  api: { label: 'API', icon: LuSettings },
  shifts: { label: 'الشفتات', icon: LuSettings },
  documents: { label: 'المستندات', icon: LuFileText },
  fuel: { label: 'الوقود', icon: LuSettings },
  leaves: { label: 'الإجازات', icon: LuSettings },
};

function getCategoryLabel(category) {
  return CATEGORY_LABELS[category]?.label || 'إعدادات إضافية';
}

function getCategoryIcon(category) {
  return CATEGORY_LABELS[category]?.icon || LuSettings;
}

function ToggleSwitch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 ${
        checked ? 'bg-brand-primary' : 'bg-slate-200'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-all duration-300 ${
        checked ? 'ltr:translate-x-6 rtl:-translate-x-6' : 'ltr:translate-x-1 rtl:-translate-x-1'
      }`} />
    </button>
  );
}

function SettingsSection({ title, icon: Icon, children }) {
  return (
    <div className="bg-slate-50/50 rounded-3xl p-6 border border-slate-100">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
        <div className="w-10 h-10 rounded-xl bg-brand-light flex items-center justify-center text-brand-primary">
          <Icon size={20} />
        </div>
        <h3 className="text-lg font-black text-slate-800">{title}</h3>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function SettingRow({ setting, onUpdate, onEdit }) {
  const { type, options } = setting;
  const editable = setting.isEditable !== false;
  const label = setting.labelAr || setting.key;
  const description = setting.descriptionAr || '';
  const isBoolean = type === 'boolean';
  const isSelect = type === 'select';
  const isNumber = type === 'number';
  
  const selectOptions = isSelect && options ? JSON.parse(options) : [];

  return (
    <div className="flex items-center justify-between py-3 px-4 bg-white rounded-2xl border border-slate-100 hover:border-slate-200 transition-all">
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold text-slate-800 mb-1">{label}</h4>
        <p className="text-xs font-medium text-slate-400">{description}</p>
      </div>
      <div className="flex items-center gap-3 ml-4">
        {isBoolean ? (
          <ToggleSwitch
            checked={setting.value === 'true'}
            onChange={(val) => onUpdate(setting.key, val.toString())}
            disabled={!editable}
          />
        ) : isSelect ? (
          <select
            value={setting.value}
            onChange={(e) => onUpdate(setting.key, e.target.value)}
            disabled={!editable}
            className="form-input form-select w-40 text-sm py-2"
          >
            {selectOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ) : isNumber && editable ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="any"
              className="form-input w-28 text-sm py-2 text-center"
              defaultValue={setting.value}
              key={`${setting.key}-${setting.value}`}
              onBlur={(e) => {
                const next = e.target.value.trim();
                if (next && next !== String(setting.value)) onUpdate(setting.key, next);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.target.blur();
                }
              }}
            />
            <button type="button" onClick={() => onEdit(setting)} className="p-2 text-slate-400 hover:text-brand-primary hover:bg-brand-light rounded-xl transition-all" title="تعديل متقدم">
              <LuPencil size={16} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg ltr:text-left">
              {setting.value}
            </span>
            {editable && (
              <button type="button" onClick={() => onEdit(setting)} className="p-2 text-slate-400 hover:text-brand-primary hover:bg-brand-light rounded-xl transition-all">
                <LuPencil size={16} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileSection({ title, children, onEdit }) {
  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-black text-slate-800">{title}</h3>
        {onEdit && (
          <button onClick={onEdit} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-brand-primary bg-brand-light rounded-xl hover:bg-brand-primary hover:text-white transition-all">
            <LuPencil size={16} />
            تعديل
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{children}</div>
    </div>
  );
}

function ProfileField({ label, value }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</label>
      <p className="text-sm font-bold text-slate-700">{value || '—'}</p>
    </div>
  );
}

export default function SettingsPage() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [settings, setSettings] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [masterData, setMasterData] = useState([]);
  const [tab, setTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [platformModal, setPlatformModal] = useState({ open: false, mode: 'create', data: null });
  const [settingsModal, setSettingsModal] = useState({ open: false, setting: null });
  const [profileModal, setProfileModal] = useState({ open: false, section: null });
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', onConfirm: null });
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [s, p, m] = await Promise.all([
          apiService.get('/settings'),
          apiService.get('/platforms'),
          apiService.get('/settings/master-data'),
        ]);
        if (cancelled) return;
        setSettings(s.data.data || []);
        setPlatforms(p.data.data || []);
        setMasterData(m.data.data || []);
      } catch { /* handled */ } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSettingUpdate = async (key, value) => {
    setSaving(true);
    try {
      const setting = settings.find(s => s.key === key);
      await apiService.put('/settings', { 
        key, 
        value,
        labelAr: setting?.labelAr,
        descriptionAr: setting?.descriptionAr,
        type: setting?.type,
        category: setting?.category,
        options: setting?.options,
        isEditable: setting?.isEditable
      });
      setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
      showToast('تم تحديث الإعداد بنجاح');
    } catch { showToast('فشل تحديث الإعداد', 'error'); } finally { setSaving(false); }
  };

  const handlePlatformSave = async (formData) => {
    setSaving(true);
    try {
      if (platformModal.mode === 'create') {
        await apiService.post('/platforms', formData);
        showToast('تم إنشاء المنصة بنجاح');
      } else {
        await apiService.put(`/platforms/${platformModal.data.id}`, formData);
        showToast('تم تحديث المنصة بنجاح');
      }
      const { data } = await apiService.get('/platforms');
      setPlatforms(data.data || []);
      setPlatformModal({ open: false, mode: 'create', data: null });
    } catch { showToast('فشل حفظ المنصة', 'error'); } finally { setSaving(false); }
  };

  const handlePlatformToggle = async (platform) => {
    try {
      await apiService.patch(`/platforms/${platform.id}/toggle`);
      setPlatforms(prev => prev.map(p => p.id === platform.id ? { ...p, isActive: !p.isActive } : p));
      showToast(platform.isActive ? 'تم تعطيل المنصة' : 'تم تفعيل المنصة');
    } catch { showToast('فشل تحديث الحالة', 'error'); }
  };

  const handleProfileUpdate = async (formData) => {
    setSaving(true);
    try {
      const { data } = await apiService.put('/auth/me', formData);
      dispatch(updateUser(data.data));
      showToast('تم تحديث الملف الشخصي بنجاح');
      setProfileModal({ open: false, section: null });
    } catch { showToast('فشل تحديث الملف', 'error'); } finally { setSaving(false); }
  };

  const groupedSettings = settings.reduce((acc, s) => {
    const group = s.category || 'other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(s);
    return acc;
  }, {});

  // Sort each group by sortOrder
  Object.keys(groupedSettings).forEach(group => {
    groupedSettings[group].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  });

  const tabs = [
    { key: 'profile', label: 'الملف الشخصي', icon: LuUser },
    { key: 'settings', label: 'إعدادات النظام', icon: LuSettings },
    { key: 'platforms', label: 'المنصات اللوجستية', icon: LuSmartphone },
  ];

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-12 h-12 border-4 border-brand-light border-t-brand-primary rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="page-container animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">الإعدادات</h2>
          <p className="text-slate-500 text-[0.95rem] font-medium">إدارة إعدادات النظام والمنصات والبيانات الأساسية</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-8 bg-slate-100/50 p-1.5 rounded-2xl w-fit">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button 
              key={t.key} 
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
                tab === t.key 
                  ? 'bg-white text-brand-primary shadow-sm ring-1 ring-slate-200/50' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
              }`} 
              onClick={() => setTab(t.key)}
            >
              <Icon size={18} />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="animate-in fade-in zoom-in-95 duration-300 text-right">
        {tab === 'profile' && user && (
          <div className="space-y-6">
            <div className="bg-gradient-to-l from-brand-light to-white rounded-3xl p-8 border border-brand-primary/10">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-full bg-brand-primary text-white flex items-center justify-center text-4xl font-black shadow-lg">
                  {user.fullNameAr?.charAt(0) || 'م'}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800 mb-1">{user.fullNameAr}</h3>
                  <p className="text-slate-500 font-medium">{user.role}</p>
                  <div className="mt-2">
                    <StatusBadge status={user.accountStatus || 'ACTIVE'} />
                  </div>
                </div>
              </div>
            </div>

            <ProfileSection title="المعلومات الشخصية" onEdit={() => setProfileModal({ open: true, section: 'personal' })}>
              <ProfileField label="الاسم بالعربية" value={user.fullNameAr} />
              <ProfileField label="الاسم بالإنجليزية" value={user.fullNameEn} />
              <ProfileField label="الجنس" value={user.gender === 'MALE' ? 'ذكر' : user.gender === 'FEMALE' ? 'أنثى' : '—'} />
              <ProfileField label="تاريخ الميلاد" value={user.dateOfBirth?.split('T')[0] || '—'} />
              <ProfileField label="الجنسية" value={user.nationality || '—'} />
              <ProfileField label="رقم الهوية" value={user.identityNumber || '—'} />
            </ProfileSection>

            <ProfileSection title="معلومات الاتصال" onEdit={() => setProfileModal({ open: true, section: 'contact' })}>
              <ProfileField label="رقم الجوال" value={user.mobileNumber || '—'} />
              <ProfileField label="البريد الإلكتروني" value={user.email || '—'} />
              <ProfileField label="رقم الغرفة" value={user.roomNumber || '—'} />
            </ProfileSection>

            <ProfileSection title="معلومات العمل" onEdit={() => setProfileModal({ open: true, section: 'work' })}>
              <ProfileField label="المسمى الوظيفي" value={user.jobTitle || '—'} />
              <ProfileField label="رقم الموظف" value={user.employeeNumber || '—'} />
              <ProfileField label="تاريخ التعيين" value={user.joinDate?.split('T')[0] || '—'} />
              <ProfileField label="نوع النقل" value={user.transportType || '—'} />
              <ProfileField label="رقم 700" value={user.sevenHundredNumber || '—'} />
            </ProfileSection>

            <ProfileSection title="الاتصال الطارئ" onEdit={() => setProfileModal({ open: true, section: 'emergency' })}>
              <ProfileField label="الاسم" value={user.emergencyName || '—'} />
              <ProfileField label="صلة القرابة" value={user.emergencyRelation || '—'} />
              <ProfileField label="رقم الهاتف" value={user.emergencyPhone || '—'} />
            </ProfileSection>

            <ProfileSection title="معلومات الحساب">
              <ProfileField label="آخر تسجيل دخول" value={user.lastLoginAt?.replace('T', ' ').slice(0, 19) || '—'} />
              <ProfileField label="تاريخ الإنشاء" value={user.createdAt?.split('T')[0] || '—'} />
            </ProfileSection>
          </div>
        )}

        {tab === 'settings' && (
          <div className="space-y-6">
            {Object.entries(groupedSettings).map(([group, groupSettings]) => {
              const Icon = getCategoryIcon(group);
              const label = getCategoryLabel(group);
              return (
                <SettingsSection key={group} title={label} icon={Icon}>
                  {groupSettings.map((setting) => (
                    <SettingRow 
                      key={setting.id} 
                      setting={setting} 
                      onUpdate={handleSettingUpdate} 
                      onEdit={(s) => setSettingsModal({ open: true, setting: s })} 
                    />
                  ))}
                </SettingsSection>
              );
            })}
            {Object.keys(groupedSettings).length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <LuSettings size={48} className="mx-auto mb-4 opacity-30" />
                <p className="font-bold">لا توجد إعدادات</p>
              </div>
            )}
          </div>
        )}

        {tab === 'platforms' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-slate-800">المنصات اللوجستية</h3>
              <button 
                onClick={() => setPlatformModal({ open: true, mode: 'create', data: null })}
                className="flex items-center gap-2 px-5 py-3 bg-brand-primary text-white rounded-2xl font-bold hover:bg-brand-primary-hover transition-all shadow-orange"
              >
                <LuPlus size={20} />
                إضافة منصة
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {platforms.map((p) => (
                <div key={p.id} className={`bg-white rounded-[2rem] p-8 shadow-premium border transition-all group ${p.isActive ? 'border-slate-100 hover:border-brand-primary/30' : 'border-red-100 opacity-75'}`}>
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-brand-light flex items-center justify-center text-brand-primary shadow-sm ring-1 ring-brand-primary/10 group-hover:scale-110 transition-transform">
                      <LuSmartphone size={28} />
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setPlatformModal({ open: true, mode: 'edit', data: p })} className="p-2 text-slate-400 hover:text-brand-primary hover:bg-brand-light rounded-xl transition-all">
                        <LuPencil size={18} />
                      </button>
                      <button onClick={() => setConfirmModal({ open: true, title: p.isActive ? 'تعطيل المنصة' : 'تفعيل المنصة', message: p.isActive ? `هل أنت متأكد من تعطيل "${p.nameAr}"؟` : `هل أنت متأكد من تفعيل "${p.nameAr}"؟`, onConfirm: () => handlePlatformToggle(p) })} className={`p-2 rounded-xl transition-all ${p.isActive ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50' : 'text-green-500 hover:bg-green-50'}`}>
                        {p.isActive ? <LuToggleRight size={18} /> : <LuToggleLeft size={18} className="text-green-500" />}
                      </button>
                    </div>
                  </div>
                  <h4 className="text-xl font-black text-slate-800 mb-1">{p.nameAr}</h4>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-4">{p.nameEn}</p>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <StatusBadge status={p.isActive ? 'ACTIVE' : 'INACTIVE'} />
                    <span className="text-xs font-black text-slate-400">{p._count?.accounts || 0} حسابات</span>
                  </div>
                </div>
              ))}
              {platforms.length === 0 && (
                <div className="col-span-full text-center py-12 text-slate-400">
                  <LuSmartphone size={48} className="mx-auto mb-4 opacity-30" />
                  <p className="font-bold">لا توجد منصات</p>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'masterData' && (
          <div className="bg-white rounded-3xl shadow-premium border border-slate-100 overflow-hidden">
            <div className="table-responsive">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-[0.75rem] font-black text-slate-400 uppercase tracking-widest">التصنيف</th>
                    <th className="px-6 py-4 text-[0.75rem] font-black text-slate-400 uppercase tracking-widest">الاسم (عربي)</th>
                    <th className="px-6 py-4 text-[0.75rem] font-black text-slate-400 uppercase tracking-widest">الاسم (EN)</th>
                    <th className="px-6 py-4 text-[0.75rem] font-black text-slate-400 uppercase tracking-widest">الترتيب</th>
                    <th className="px-6 py-4 text-[0.75rem] font-black text-slate-400 uppercase tracking-widest">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {masterData.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-[0.7rem] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md uppercase tracking-wider">
                          {m.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[0.9rem] font-bold text-slate-700">{m.nameAr}</td>
                      <td className="px-6 py-4 text-[0.85rem] font-medium text-slate-400">{m.nameEn}</td>
                      <td className="px-6 py-4 text-[0.85rem] font-bold text-slate-500">{m.sortOrder || '—'}</td>
                      <td className="px-6 py-4"><StatusBadge status={m.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={platformModal.open} onClose={() => setPlatformModal({ open: false, mode: 'create', data: null })} title={platformModal.mode === 'create' ? 'إضافة منصة جديدة' : 'تعديل المنصة'}>
        <form onSubmit={(e) => { e.preventDefault(); handlePlatformSave({ nameAr: e.target.nameAr.value, nameEn: e.target.nameEn.value }); }} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">الاسم بالعربية</label>
            <input name="nameAr" defaultValue={platformModal.data?.nameAr} required className="form-input" placeholder="منصة清洁" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">الاسم بالإنجليزية</label>
            <input name="nameEn" defaultValue={platformModal.data?.nameEn} className="form-input" placeholder="Clean Platform" />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setPlatformModal({ open: false, mode: 'create', data: null })} className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50">إلغاء</button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-primary-hover disabled:opacity-50 flex items-center gap-2">
              {saving && <LuRefreshCw size={16} className="animate-spin" />}
              حفظ
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={settingsModal.open} onClose={() => setSettingsModal({ open: false, setting: null })} title="تعديل الإعداد">
        {settingsModal.setting && (() => {
          const s = settingsModal.setting;
          const isSelect = s.type === 'select';
          const isNumber = s.type === 'number';
          const isBoolean = s.type === 'boolean';
          const selectOptions = isSelect && s.options ? JSON.parse(s.options) : [];
          
          return (
            <form onSubmit={(e) => { 
              e.preventDefault(); 
              let newValue;
              if (isSelect) {
                newValue = e.target.settingValue.value;
              } else if (isNumber) {
                newValue = e.target.settingValue.value;
              } else {
                newValue = e.target.settingValue.value;
              }
              handleSettingUpdate(s.key, newValue); 
              setSettingsModal({ open: false, setting: null }); 
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">الإعداد</label>
                <input value={s.labelAr || s.key} disabled className="form-input bg-slate-50 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">القيمة</label>
                {isSelect ? (
                  <select name="settingValue" defaultValue={s.value} required className="form-input form-select">
                    {selectOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : isNumber ? (
                  <input 
                    name="settingValue" 
                    type="number" 
                    defaultValue={s.value} 
                    required 
                    className="form-input" 
                    step="any"
                  />
                ) : isBoolean ? (
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        name="settingValue" 
                        type="checkbox" 
                        defaultChecked={s.value === 'true'}
                        className="sr-only peer"
                        onChange={(e) => handleSettingUpdate(s.key, e.target.checked.toString())}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-light rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary"></div>
                      <span className="mr-3 text-sm font-medium text-slate-700">{s.value === 'true' ? 'مفعّل' : 'معطّل'}</span>
                    </label>
                  </div>
                ) : (
                  <input name="settingValue" defaultValue={s.value} required className="form-input" />
                )}
              </div>
              {s.descriptionAr && (
                <p className="text-xs text-slate-400">{s.descriptionAr}</p>
              )}
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setSettingsModal({ open: false, setting: null })} className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50">إلغاء</button>
                {!isBoolean && (
                  <button type="submit" disabled={saving} className="px-5 py-2.5 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-primary-hover disabled:opacity-50 flex items-center gap-2">
                    {saving && <LuRefreshCw size={16} className="animate-spin" />}
                    حفظ التغييرات
                  </button>
                )}
              </div>
            </form>
          );
        })()}
      </Modal>

      <Modal isOpen={profileModal.open} onClose={() => setProfileModal({ open: false, section: null })} title={
        profileModal.section === 'personal' ? 'تعديل المعلومات الشخصية' :
        profileModal.section === 'contact' ? 'تعديل معلومات الاتصال' :
        profileModal.section === 'work' ? 'تعديل معلومات العمل' :
        profileModal.section === 'emergency' ? 'تعديل الاتصال الطارئ' : 'تعديل الملف الشخصي'
      }>
        <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.target); handleProfileUpdate(Object.fromEntries(fd)); }} className="space-y-4">
          {profileModal.section === 'personal' && (
            <>
              <div><label className="block text-sm font-bold text-slate-700 mb-2">الاسم بالعربية</label><input name="fullNameAr" defaultValue={user.fullNameAr} className="form-input" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-2">الاسم بالإنجليزية</label><input name="fullNameEn" defaultValue={user.fullNameEn} className="form-input" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-2">الجنس</label><select name="gender" defaultValue={user.gender || ''} className="form-input form-select"><option value="">اختر</option><option value="MALE">ذكر</option><option value="FEMALE">أنثى</option></select></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-2">تاريخ الميلاد</label><input type="date" name="dateOfBirth" defaultValue={user.dateOfBirth?.split('T')[0]} className="form-input" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-2">الجنسية</label><input name="nationality" defaultValue={user.nationality} className="form-input" /></div>
            </>
          )}
          {profileModal.section === 'contact' && (
            <>
              <div><label className="block text-sm font-bold text-slate-700 mb-2">رقم الجوال</label><input name="mobileNumber" defaultValue={user.mobileNumber} className="form-input" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-2">البريد الإلكتروني</label><input type="email" name="email" defaultValue={user.email} className="form-input" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-2">رقم الغرفة</label><input name="roomNumber" defaultValue={user.roomNumber} className="form-input" /></div>
            </>
          )}
          {profileModal.section === 'work' && (
            <>
              <div><label className="block text-sm font-bold text-slate-700 mb-2">المسمى الوظيفي</label><input name="jobTitle" defaultValue={user.jobTitle} className="form-input" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-2">رقم الموظف</label><input name="employeeNumber" defaultValue={user.employeeNumber} className="form-input" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-2">تاريخ التعيين</label><input type="date" name="joinDate" defaultValue={user.joinDate?.split('T')[0]} className="form-input" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-2">نوع النقل</label><input name="transportType" defaultValue={user.transportType} className="form-input" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-2">رقم 700</label><input name="sevenHundredNumber" defaultValue={user.sevenHundredNumber} className="form-input" /></div>
            </>
          )}
          {profileModal.section === 'emergency' && (
            <>
              <div><label className="block text-sm font-bold text-slate-700 mb-2">اسم الطوارئ</label><input name="emergencyName" defaultValue={user.emergencyName} className="form-input" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-2">صلة القرابة</label><input name="emergencyRelation" defaultValue={user.emergencyRelation} className="form-input" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-2">هاتف الطوارئ</label><input name="emergencyPhone" defaultValue={user.emergencyPhone} className="form-input" /></div>
            </>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setProfileModal({ open: false, section: null })} className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50">إلغاء</button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-primary-hover disabled:opacity-50 flex items-center gap-2">
              {saving && <LuRefreshCw size={16} className="animate-spin" />}
              حفظ التغييرات
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={confirmModal.open} onClose={() => setConfirmModal({ open: false, title: '', message: '', onConfirm: null })} title={confirmModal.title}>
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <LuCircleAlert size={32} className="text-amber-500" />
          </div>
          <p className="text-slate-600 font-medium mb-6">{confirmModal.message}</p>
          <div className="flex justify-center gap-3">
            <button onClick={() => setConfirmModal({ open: false, title: '', message: '', onConfirm: null })} className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50">إلغاء</button>
            <button onClick={() => { confirmModal.onConfirm(); setConfirmModal({ open: false, title: '', message: '', onConfirm: null }); }} className="px-5 py-2.5 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 flex items-center gap-2">
              <LuCheck size={18} />
              تأكيد
            </button>
          </div>
        </div>
      </Modal>

      {toast.show && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in slide-in-from-bottom-4 ${
          toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.type === 'success' ? <LuCheck size={20} /> : <LuX size={20} />}
          <span className="font-bold">{toast.message}</span>
        </div>
      )}
    </div>
  );
}