import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { apiService } from '../../services/api';
import { hasAnyPermissionForUser, PERMISSIONS as P } from '../../utils/rolePermissions';
import PermissionGate from '../../components/auth/PermissionGate';
import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ImportCsvModal from '../../components/ui/ImportCsvModal';
import CsvTemplateButton from '../../components/ui/CsvTemplateButton';
import { DRIVER_FILTER_PRESETS } from '../../config/listModules';
import toast from 'react-hot-toast';
import { LuPlus, LuSearch, LuFilter, LuUsers, LuRefreshCw, LuMessageSquare, LuDownload, LuUpload } from 'react-icons/lu';
import { buildUserListParams } from '../../utils/userListParams';

export default function DriversPage() {
  const { user: authUser } = useSelector((s) => s.auth);
  const canCreate = hasAnyPermissionForUser(authUser, [P.USERS_WRITE]);
  const [drivers, setDrivers] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    page: 1, search: '', accountStatus: '', deletedOnly: '', role: 'DRIVER',
    employmentStatus: '', availabilityStatus: '', onShift: '', hasVehicle: '', hasBankAccount: '',
  });
  const [selectedIds, setSelectedIds] = useState([]);
  const [importOpen, setImportOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [restoreUser, setRestoreUser] = useState(null);
  const [form, setForm] = useState({ identityNumber: '', fullNameAr: '', fullNameEn: '', mobileNumber: '', email: '', password: '' });
  const navigate = useNavigate();

  const viewingArchived = filters.deletedOnly === 'true' || filters.accountStatus === 'ARCHIVED';

  const loadDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiService.get('/users', buildUserListParams(filters));
      setDrivers(data.data);
      setMeta(data.meta);
      setSelectedIds([]);
    } catch { /* handled */ } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { loadDrivers(); }, [loadDrivers]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await apiService.post('/users', { ...form, role: 'DRIVER' });
      toast.success('تم إنشاء السائق بنجاح');
      setShowCreate(false);
      setForm({ identityNumber: '', fullNameAr: '', fullNameEn: '', mobileNumber: '', email: '', password: '' });
      loadDrivers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'حدث خطأ');
    }
  };

  const handleRestore = async () => {
    if (!restoreUser) return;
    try {
      await apiService.patch(`/users/${restoreUser.id}/restore`);
      toast.success('تم استرجاع الحساب');
      setRestoreUser(null);
      loadDrivers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل استرجاع الحساب');
    }
  };

  const handleExport = async () => {
    try {
      const payload = {
        module: 'users',
        format: 'csv',
        filters: buildUserListParams({ ...filters, role: 'DRIVER' }),
      };
      if (selectedIds.length) {
        payload.ids = selectedIds;
        delete payload.filters;
      }
      const res = await apiService.exportBlob('/export/selected', payload);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'drivers-export.csv';
      a.click();
      toast.success('تم التصدير');
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل التصدير');
    }
  };

  const applyPreset = (preset) => {
    setFilters((f) => {
      const next = { ...f, page: 1, role: 'DRIVER' };
      ['onShift', 'availabilityStatus', 'hasVehicle', 'hasBankAccount', 'accountStatus', 'employmentStatus'].forEach((k) => delete next[k]);
      next[preset.key] = preset.value;
      return next;
    });
  };

  const isArchivedRow = (row) => row.deletedAt || row.accountStatus === 'ARCHIVED';

  const columns = [
    { key: 'employeeNumber', label: 'رقم الموظف' },
    { key: 'identityNumber', label: 'رقم الهوية' },
    { key: 'fullNameAr', label: 'الاسم الكامل' },
    { key: 'mobileNumber', label: 'رقم الجوال' },
    { key: 'accountStatus', label: 'حالة الحساب', render: (val) => <StatusBadge status={val} /> },
    { key: 'availabilityStatus', label: 'التوفر', render: (val) => val ? <StatusBadge status={val} /> : '—' },
    { key: 'employmentStatus', label: 'التوظيف', render: (val) => val ? <StatusBadge status={val} /> : '—' },
    { key: 'city', label: 'المدينة', render: (val) => val?.nameAr || '—' },
    { key: 'supervisor', label: 'المشرف', render: (val) => val?.fullNameAr || '—' },
    { 
      key: 'actions', 
      label: 'إجراءات', 
      stopRowClick: true,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          {isArchivedRow(row) ? (
            <PermissionGate anyOf={[P.USERS_WRITE]}>
              <button
                onClick={(e) => { e.stopPropagation(); setRestoreUser(row); }}
                className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                title="استرجاع الحساب"
              >
                <LuRefreshCw size={18} />
              </button>
            </PermissionGate>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/chat?userId=${row.id}`); }}
              className="w-10 h-10 rounded-xl bg-brand-light text-brand-primary flex items-center justify-center hover:bg-brand-primary hover:text-white transition-all shadow-sm"
              title="بدء محادثة"
            >
              <LuMessageSquare size={18} />
            </button>
          )}
        </div>
      )
    },
  ];

  return (
    <div className="page-container animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div className="flex items-center gap-4">
           <div className="w-14 h-14 rounded-2xl bg-brand-light text-brand-primary flex items-center justify-center shadow-sm ring-1 ring-brand-primary/10">
              <LuUsers size={32} />
           </div>
           <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-1">إدارة شؤون السائقين</h2>
              <p className="text-slate-500 text-sm font-medium">متابعة بيانات السائقين، حالات الحسابات، وتوزيع المهام اللوجستية.</p>
           </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <CsvTemplateButton url="/import/template/users" filename="users-import-template.csv" />
          <button type="button" onClick={() => setImportOpen(true)} className="btn btn-secondary flex items-center gap-2">
            <LuUpload size={18} /> استيراد CSV
          </button>
          <CsvTemplateButton url="/export/template/users" filename="users-template.csv" />
          <button type="button" onClick={handleExport} className="btn btn-secondary flex items-center gap-2">
            <LuDownload size={18} /> تصدير {selectedIds.length ? `(${selectedIds.length})` : '(الفلتر)'}
          </button>
          <button 
            onClick={() => loadDrivers()} 
            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-brand-primary hover:border-brand-primary/20 transition-all shadow-sm"
          >
            <LuRefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <PermissionGate anyOf={[P.USERS_WRITE]}>
            <button 
              type="button" 
              className="btn btn-primary shadow-orange" 
              onClick={() => setShowCreate(true)}
            >
              <LuPlus size={20} />
              إضافة سائق جديد
            </button>
          </PermissionGate>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {DRIVER_FILTER_PRESETS.map((preset) => (
          <button
            key={`${preset.key}-${preset.value}`}
            type="button"
            onClick={() => applyPreset(preset)}
            className="text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-brand-light hover:text-brand-primary transition-colors"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Modern Filter Bar */}
      <div className="bg-white/60 backdrop-blur-md rounded-[2rem] p-6 border border-white/60 shadow-premium mb-8 flex flex-col md:flex-row flex-wrap items-end gap-6">
        <div className="w-full md:flex-1">
          <label className="block text-[0.7rem] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">بحث متقدم</label>
          <div className="relative group">
            <LuSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors" size={18} />
            <input
              className="form-input !pr-12 !bg-white/80 !rounded-2xl"
              placeholder="ابحث بالاسم، رقم الهوية، أو رقم الجوال..."
              value={filters.search}
              onChange={(e) => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
            />
          </div>
        </div>
        
        <div className="w-full md:w-64">
          <label className="block text-[0.7rem] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">تصفية حسب الحالة</label>
          <div className="relative group">
            <LuFilter className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors" size={16} />
            <select
              className="form-input !pr-12 !bg-white/80 !rounded-2xl form-select"
              value={filters.accountStatus}
              onChange={(e) => {
                const value = e.target.value;
                setFilters(f => ({
                  ...f,
                  accountStatus: value,
                  deletedOnly: value === 'ARCHIVED' ? 'true' : '',
                  page: 1,
                }));
              }}
            >
              <option value="">جميع الحالات التشغيلية</option>
              <option value="ACTIVE">نشط (Active)</option>
              <option value="PENDING_APPROVAL">بانتظار الموافقة</option>
              <option value="TEMPORARILY_SUSPENDED">موقف مؤقتاً</option>
              <option value="RESTRICTED">مقيّد</option>
              <option value="UNDER_INVESTIGATION">تحت التحقيق</option>
              <option value="INCOMPLETE_PROFILE">ملف غير مكتمل</option>
              <option value="ARCHIVED">مؤرشف</option>
            </select>
          </div>
        </div>

        <div className="w-full md:w-56">
          <label className="block text-[0.7rem] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">حالة التوفر</label>
          <select className="form-input !bg-white/80 !rounded-2xl form-select" value={filters.availabilityStatus} onChange={(e) => setFilters(f => ({ ...f, availabilityStatus: e.target.value, page: 1 }))}>
            <option value="">الكل</option>
            <option value="ON_SHIFT">على شفت</option>
            <option value="AVAILABLE">متاح</option>
            <option value="OFF_DUTY">خارج الخدمة</option>
            <option value="ON_LEAVE">في إجازة</option>
          </select>
        </div>

        <div className="w-full md:w-48">
          <label className="block text-[0.7rem] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">شفت نشط</label>
          <select className="form-input !bg-white/80 !rounded-2xl form-select" value={filters.onShift} onChange={(e) => setFilters(f => ({ ...f, onShift: e.target.value, page: 1 }))}>
            <option value="">الكل</option>
            <option value="true">شغال الآن</option>
            <option value="false">غير شغال</option>
          </select>
        </div>

        <div className="w-full md:w-48">
          <label className="block text-[0.7rem] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">عهدة مركبة</label>
          <select className="form-input !bg-white/80 !rounded-2xl form-select" value={filters.hasVehicle} onChange={(e) => setFilters(f => ({ ...f, hasVehicle: e.target.value, page: 1 }))}>
            <option value="">الكل</option>
            <option value="true">لديه مركبة</option>
            <option value="false">بدون مركبة</option>
          </select>
        </div>

        <div className="w-full md:w-48">
          <label className="block text-[0.7rem] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">حساب بنكي</label>
          <select className="form-input !bg-white/80 !rounded-2xl form-select" value={filters.hasBankAccount} onChange={(e) => setFilters(f => ({ ...f, hasBankAccount: e.target.value, page: 1 }))}>
            <option value="">الكل</option>
            <option value="true">لديه حساب</option>
            <option value="false">بدون حساب</option>
          </select>
        </div>

        <div className="w-full md:w-56">
          <label className="block text-[0.7rem] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">حالة التوظيف</label>
          <select className="form-input !bg-white/80 !rounded-2xl form-select" value={filters.employmentStatus} onChange={(e) => setFilters(f => ({ ...f, employmentStatus: e.target.value, page: 1 }))}>
            <option value="">الكل</option>
            <option value="ON_DUTY">على رأس العمل</option>
            <option value="ON_LEAVE">إجازة</option>
            <option value="SUSPENDED">موقوف</option>
            <option value="RUNAWAY">متغيب</option>
            <option value="FINAL_EXIT">خروج نهائي</option>
          </select>
        </div>

        <div className="w-full md:w-56">
          <label className="block text-[0.7rem] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">حالة الحذف</label>
          <select
            className="form-input !bg-white/80 !rounded-2xl form-select"
            value={filters.deletedOnly}
            onChange={(e) => setFilters(f => ({
              ...f,
              deletedOnly: e.target.value,
              page: 1,
              accountStatus: e.target.value === 'true' ? '' : f.accountStatus,
            }))}
          >
            <option value="">الحسابات غير المحذوفة</option>
            <option value="true">الحسابات المؤرشفة فقط</option>
          </select>
        </div>
      </div>

      {viewingArchived && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          يتم عرض الحسابات المحذوفة/المؤرشفة فقط. الحسابات النشطة لا تظهر في هذا العرض — غيّر فلتر «حالة الحذف» لعرض السائقين النشطين.
        </div>
      )}

      {/* Main Content Table */}
      <div className="card !p-0 overflow-hidden border-none ring-1 ring-slate-200/50">
        <DataTable
          columns={columns}
          data={drivers}
          loading={loading}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onRowClick={(row) => !isArchivedRow(row) && navigate(`/drivers/${row.id}`)}
          emptyMessage="لا يوجد سائقين متطابقين مع معايير البحث"
        />
        <div className="bg-slate-50/30">
           <Pagination meta={meta} onPageChange={(p) => setFilters(f => ({ ...f, page: p }))} />
        </div>
      </div>

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="إضافة سائق جديد للنظام">
        <form onSubmit={handleCreate} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[0.7rem] font-black text-slate-700 uppercase tracking-widest">رقم الهوية الوطنية *</label>
              <input className="form-input !rounded-2xl" required value={form.identityNumber} onChange={(e) => setForm(f => ({ ...f, identityNumber: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-[0.7rem] font-black text-slate-700 uppercase tracking-widest">كلمة المرور المؤقتة *</label>
              <input className="form-input !rounded-2xl" type="password" required value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[0.7rem] font-black text-slate-700 uppercase tracking-widest">الاسم الكامل (عربي) *</label>
              <input className="form-input !rounded-2xl" required value={form.fullNameAr} onChange={(e) => setForm(f => ({ ...f, fullNameAr: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-[0.7rem] font-black text-slate-700 uppercase tracking-widest">الاسم الكامل (English)</label>
              <input className="form-input !rounded-2xl" value={form.fullNameEn} onChange={(e) => setForm(f => ({ ...f, fullNameEn: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[0.7rem] font-black text-slate-700 uppercase tracking-widest">رقم الجوال</label>
              <input className="form-input !rounded-2xl" placeholder="05xxxxxxxx" value={form.mobileNumber} onChange={(e) => setForm(f => ({ ...f, mobileNumber: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-[0.7rem] font-black text-slate-700 uppercase tracking-widest">البريد الإلكتروني</label>
              <input className="form-input !rounded-2xl" type="email" placeholder="example@aams.com" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button type="submit" className="btn btn-primary flex-1 !rounded-2xl justify-center shadow-orange">إنشاء ملف السائق</button>
            <button type="button" className="btn bg-slate-100 text-slate-500 flex-1 !rounded-2xl justify-center" onClick={() => setShowCreate(false)}>إلغاء</button>
          </div>
        </form>
      </Modal>

      <ImportCsvModal isOpen={importOpen} onClose={() => setImportOpen(false)} module="users" title="استيراد سائقين من CSV" onSuccess={loadDrivers} />

      <ConfirmDialog
        isOpen={!!restoreUser}
        onClose={() => setRestoreUser(null)}
        onConfirm={handleRestore}
        title="استرجاع حساب"
        message={`هل تريد استرجاع حساب "${restoreUser?.fullNameAr || restoreUser?.identityNumber || ''}" وتفعيله؟`}
        confirmText="استرجاع"
      />
    </div>
  );
}
