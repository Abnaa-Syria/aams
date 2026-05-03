import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { apiService } from '../../services/api';
import StatusBadge from '../../components/ui/StatusBadge';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import RowActions from '../../components/ui/RowActions';
import toast from 'react-hot-toast';
import { LuArrowRight, LuUser, LuUserPlus } from 'react-icons/lu';
import { hasAnyPermission, PERMISSIONS as P } from '../../utils/rolePermissions';

export default function SupervisorDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: authUser } = useSelector((s) => s.auth);
  const canWrite = hasAnyPermission(authUser?.role, [P.USERS_WRITE]);

  const [supervisor, setSupervisor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAssign, setShowAssign] = useState(false);
  const [driversPool, setDriversPool] = useState([]);
  const [poolLoading, setPoolLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const loadSupervisor = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiService.get(`/supervisors/${id}`);
      setSupervisor(data.data);
    } catch {
      toast.error('تعذر تحميل بيانات المشرف');
      navigate('/supervisors');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { loadSupervisor(); }, [loadSupervisor]);

  const openAssignModal = async () => {
    setShowAssign(true);
    setPoolLoading(true);
    setSelectedIds(new Set());
    try {
      const { data } = await apiService.get('/users', { role: 'DRIVER', limit: 500, page: 1 });
      setDriversPool(Array.isArray(data.data) ? data.data : []);
    } catch {
      toast.error('تعذر تحميل قائمة السائقين');
      setDriversPool([]);
    } finally {
      setPoolLoading(false);
    }
  };

  const toggleDriver = (driverId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(driverId)) next.delete(driverId);
      else next.add(driverId);
      return next;
    });
  };

  const submitAssign = async (e) => {
    e.preventDefault();
    const driverIds = [...selectedIds];
    if (driverIds.length === 0) {
      toast.error('اختر سائقاً واحداً على الأقل');
      return;
    }
    try {
      await apiService.post(`/supervisors/${id}/assign-drivers`, { driverIds });
      toast.success('تم ربط السائقين بالمشرف');
      setShowAssign(false);
      loadSupervisor();
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل الربط');
    }
  };

  const unassignDriver = async (driverId) => {
    try {
      await apiService.patch(`/users/${driverId}/assign-supervisor`, { supervisorId: null });
      toast.success('تم إلغاء ربط السائق');
      loadSupervisor();
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل إلغاء الربط');
    }
  };

  if (loading || !supervisor) {
    return (
      <div className="page-container">
        <div className="loading-spinner"><div className="spinner" /></div>
      </div>
    );
  }

  const assigned = supervisor.assignedDrivers || [];

  const driverColumns = [
    { key: 'identityNumber', label: 'رقم الهوية' },
    { key: 'fullNameAr', label: 'الاسم' },
    { key: 'mobileNumber', label: 'الجوال' },
    { key: 'accountStatus', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
    ...(canWrite
      ? [{
        key: '__unlink',
        label: 'إجراء',
        stopRowClick: true,
        render: (_, row) => (
          <RowActions>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate(`/drivers/${row.id}`)}>
              عرض
            </button>
            <button type="button" className="btn btn-danger btn-sm" onClick={() => unassignDriver(row.id)}>
              إلغاء الربط
            </button>
          </RowActions>
        ),
      }]
      : []),
  ];

  return (
    <div className="page-container">
      <div className="page-header" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/supervisors')}>
            <LuArrowRight size={16} /> العودة للقائمة
          </button>
          <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LuUser /> {supervisor.fullNameAr}
          </h2>
          <StatusBadge status={supervisor.accountStatus} />
        </div>
        {canWrite && (
          <button type="button" className="btn btn-primary btn-sm" onClick={openAssignModal}>
            <LuUserPlus size={16} /> ربط سائقين
          </button>
        )}
      </div>

      <div className="grid-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-header"><h4 className="card-title">بيانات المشرف</h4></div>
          <div style={{ padding: 16, fontSize: '0.9rem', lineHeight: 1.8 }}>
            <p><strong>رقم الهوية:</strong> {supervisor.identityNumber}</p>
            <p><strong>الاسم بالإنجليزي:</strong> {supervisor.fullNameEn || '—'}</p>
            <p><strong>الجوال:</strong> {supervisor.mobileNumber || '—'}</p>
            <p><strong>البريد:</strong> {supervisor.email || '—'}</p>
            <p><strong>المسمى الوظيفي:</strong> {supervisor.jobTitle || '—'}</p>
            <p><strong>تاريخ الإنشاء:</strong> {supervisor.createdAt ? new Date(supervisor.createdAt).toLocaleDateString('ar-SA') : '—'}</p>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h4 className="card-title">ملخص</h4></div>
          <div style={{ padding: 16, fontSize: '0.9rem', lineHeight: 1.8 }}>
            <p><strong>عدد السائقين المرتبطين:</strong> {assigned.length}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h4 className="card-title">السائقون تحت إشرافه</h4></div>
        <DataTable columns={driverColumns} data={assigned} loading={false} emptyMessage="لا يوجد سائقون مرتبطون" />
      </div>

      <Modal isOpen={showAssign} onClose={() => setShowAssign(false)} title="ربط سائقين بالمشرف">
        <form onSubmit={submitAssign}>
          <p style={{ marginBottom: 12, fontSize: '0.9rem', color: 'var(--text-muted, #666)' }}>
            اختر السائقين لربطهم بهذا المشرف (يمكن اختيار عدة سائقين).
          </p>
          {poolLoading ? (
            <div className="loading-spinner"><div className="spinner" /></div>
          ) : (
            <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid var(--border, #e5e5e5)', borderRadius: 8, padding: 8 }}>
              {driversPool.map((d) => (
                <label
                  key={d.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', cursor: 'pointer' }}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(d.id)}
                    onChange={() => toggleDriver(d.id)}
                  />
                  <span>{d.fullNameAr} — {d.identityNumber}</span>
                  {d.supervisorId != null && d.supervisorId !== Number(id) && (
                    <span style={{ fontSize: '0.75rem', color: '#b45309' }}>(لديه مشرف آخر — سيتم نقله)</span>
                  )}
                </label>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button type="submit" className="btn btn-primary" disabled={!canWrite || poolLoading}>تأكيد الربط</button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowAssign(false)}>إلغاء</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
