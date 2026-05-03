import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { apiService } from '../../services/api';
import { hasAnyPermission, PERMISSIONS as P } from '../../utils/rolePermissions';
import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';
import { LuPlus } from 'react-icons/lu';

export default function DriversPage() {
  const { user: authUser } = useSelector((s) => s.auth);
  const canCreate = hasAnyPermission(authUser?.role, [P.USERS_WRITE]);
  const [drivers, setDrivers] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ page: 1, search: '', accountStatus: '', role: 'DRIVER' });
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ identityNumber: '', fullNameAr: '', fullNameEn: '', mobileNumber: '', email: '', password: '' });
  const navigate = useNavigate();

  const loadDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiService.get('/users', filters);
      setDrivers(data.data);
      setMeta(data.meta);
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

  const columns = [
    { key: 'employeeNumber', label: 'رقم الموظف' },
    { key: 'identityNumber', label: 'رقم الهوية' },
    { key: 'fullNameAr', label: 'الاسم' },
    { key: 'mobileNumber', label: 'الجوال' },
    { key: 'accountStatus', label: 'الحالة', render: (val) => <StatusBadge status={val} /> },
    { key: 'city', label: 'المدينة', render: (val) => val?.nameAr || '—' },
    { key: 'supervisor', label: 'المشرف', render: (val) => val?.fullNameAr || '—' },
    { key: 'createdAt', label: 'تاريخ الإنشاء', render: (val) => val ? new Date(val).toLocaleDateString('ar-SA') : '—' },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">إدارة السائقين</h2>
        {canCreate && (
          <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <LuPlus size={16} /> إضافة سائق
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="form-group">
          <input
            className="form-input"
            placeholder="بحث بالاسم أو رقم الهوية..."
            value={filters.search}
            onChange={(e) => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
          />
        </div>
        <div className="form-group">
          <select
            className="form-input form-select"
            value={filters.accountStatus}
            onChange={(e) => setFilters(f => ({ ...f, accountStatus: e.target.value, page: 1 }))}
          >
            <option value="">جميع الحالات</option>
            <option value="ACTIVE">نشط</option>
            <option value="PENDING_APPROVAL">بانتظار الموافقة</option>
            <option value="TEMPORARILY_SUSPENDED">موقف مؤقتاً</option>
            <option value="RESTRICTED">مقيّد</option>
            <option value="UNDER_INVESTIGATION">تحت التحقيق</option>
            <option value="INCOMPLETE_PROFILE">ملف غير مكتمل</option>
            <option value="ARCHIVED">مؤرشف</option>
          </select>
        </div>
      </div>

      <div className="card">
        <DataTable
          columns={columns}
          data={drivers}
          loading={loading}
          onRowClick={(row) => navigate(`/drivers/${row.id}`)}
          emptyMessage="لا يوجد سائقين"
        />
        <Pagination meta={meta} onPageChange={(p) => setFilters(f => ({ ...f, page: p }))} />
      </div>

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="إضافة سائق جديد">
        <form onSubmit={handleCreate}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">رقم الهوية *</label>
              <input className="form-input" required value={form.identityNumber} onChange={(e) => setForm(f => ({ ...f, identityNumber: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">كلمة المرور *</label>
              <input className="form-input" type="password" required value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">الاسم بالعربي *</label>
              <input className="form-input" required value={form.fullNameAr} onChange={(e) => setForm(f => ({ ...f, fullNameAr: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">الاسم بالإنجليزي</label>
              <input className="form-input" value={form.fullNameEn} onChange={(e) => setForm(f => ({ ...f, fullNameEn: e.target.value }))} />
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">رقم الجوال</label>
              <input className="form-input" value={form.mobileNumber} onChange={(e) => setForm(f => ({ ...f, mobileNumber: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">البريد الإلكتروني</label>
              <input className="form-input" type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button type="submit" className="btn btn-primary">إنشاء</button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>إلغاء</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
