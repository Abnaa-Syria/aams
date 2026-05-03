import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { apiService } from '../../services/api';
import StatusBadge from '../../components/ui/StatusBadge';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';
import { LuArrowRight, LuUser } from 'react-icons/lu';
import { resolveUploadUrl } from '../../utils/apiOrigin';
import { hasAnyPermission, PERMISSIONS as P } from '../../utils/rolePermissions';

const TABS = [
  { id: 'overview', label: 'نظرة عامة' },
  { id: 'documents', label: 'المستندات' },
  { id: 'licenses', label: 'الرخص' },
  { id: 'shifts', label: 'الشفتات' },
  { id: 'platformAccounts', label: 'حسابات المنصات' },
  { id: 'fuel', label: 'الوقود' },
  { id: 'violations', label: 'المخالفات' },
  { id: 'penalties', label: 'الجزاءات' },
  { id: 'rewards', label: 'المكافآت' },
  { id: 'investigations', label: 'التحقيقات' },
  { id: 'dailyReports', label: 'التقارير اليومية' },
  { id: 'leaves', label: 'الإجازات' },
  { id: 'salary', label: 'السلف' },
  { id: 'maintenance', label: 'الصيانة' },
];

export default function DriverDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: authUser } = useSelector((s) => s.auth);
  const canWriteUser = hasAnyPermission(authUser?.role, [P.USERS_WRITE]);

  const [tab, setTab] = useState('overview');
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tabData, setTabData] = useState([]);
  const [tabLoading, setTabLoading] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [statusForm, setStatusForm] = useState({ accountStatus: 'ACTIVE', reason: '' });

  const loadDriver = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiService.get(`/users/${id}`);
      setDriver(data.data);
      setStatusForm((f) => ({ ...f, accountStatus: data.data?.accountStatus || 'ACTIVE' }));
    } catch {
      toast.error('تعذر تحميل بيانات السائق');
      navigate('/drivers');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { loadDriver(); }, [loadDriver]);

  const loadTab = useCallback(async () => {
    if (tab === 'overview' || !id) return;
    setTabLoading(true);
    const uid = parseInt(id, 10);
    const q = { userId: uid, limit: 50, page: 1 };
    try {
      let url = '';
      switch (tab) {
        case 'documents': url = '/documents'; break;
        case 'licenses': url = '/licenses'; break;
        case 'shifts': url = '/shifts'; break;
        case 'platformAccounts': url = '/platform-accounts'; break;
        case 'fuel': url = '/fuel-logs'; break;
        case 'violations': url = '/violations'; break;
        case 'penalties': url = '/penalties'; break;
        case 'rewards': url = '/rewards'; break;
        case 'investigations': url = '/investigations'; break;
        case 'dailyReports': url = '/daily-reports'; break;
        case 'leaves': url = '/leave-requests'; break;
        case 'salary': url = '/salary-advances'; break;
        case 'maintenance': url = '/maintenance-requests'; break;
        default: setTabLoading(false); return;
      }
      const { data } = await apiService.get(url, q);
      setTabData(Array.isArray(data.data) ? data.data : []);
    } catch {
      setTabData([]);
      toast.error('تعذر تحميل القائمة');
    } finally {
      setTabLoading(false);
    }
  }, [tab, id]);

  useEffect(() => { loadTab(); }, [loadTab]);

  const saveStatus = async (e) => {
    e.preventDefault();
    try {
      await apiService.patch(`/users/${id}/status`, statusForm);
      toast.success('تم تحديث الحالة');
      setShowStatus(false);
      loadDriver();
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل التحديث');
    }
  };

  if (loading || !driver) {
    return (
      <div className="page-container">
        <div className="loading-spinner"><div className="spinner" /></div>
      </div>
    );
  }

  const counts = driver._count || {};

  const tabColumns = {
    documents: [
      { key: 'title', label: 'العنوان' },
      { key: 'type', label: 'النوع' },
      { key: 'status', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
      { key: 'expiryDate', label: 'انتهاء', render: (v) => (v ? new Date(v).toLocaleDateString('ar-SA') : '—') },
    ],
    licenses: [
      { key: 'title', label: 'العنوان' },
      { key: 'type', label: 'النوع' },
      { key: 'status', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
      { key: 'expiryDate', label: 'انتهاء', render: (v) => (v ? new Date(v).toLocaleDateString('ar-SA') : '—') },
    ],
    shifts: [
      { key: 'id', label: '#' },
      { key: 'status', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
      { key: 'vehicle', label: 'المركبة', render: (v) => v?.plateNumber || '—' },
      { key: 'requestedAt', label: 'الطلب', render: (v) => (v ? new Date(v).toLocaleString('ar-SA') : '—') },
    ],
    platformAccounts: [
      { key: 'platform', label: 'المنصة', render: (p) => p?.nameAr || '—' },
      { key: 'username', label: 'المعرّف' },
      { key: 'status', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
    ],
    fuel: [
      { key: 'amount', label: 'المبلغ' },
      { key: 'fuelDate', label: 'التاريخ', render: (v) => (v ? new Date(v).toLocaleString('ar-SA') : '—') },
      { key: 'status', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
      { key: 'vehicle', label: 'المركبة', render: (v) => v?.plateNumber || '—' },
    ],
    violations: [
      { key: 'reason', label: 'السبب' },
      { key: 'status', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
      { key: 'violationDate', label: 'التاريخ', render: (v) => (v ? new Date(v).toLocaleDateString('ar-SA') : '—') },
    ],
    penalties: [
      { key: 'type', label: 'النوع' },
      { key: 'amount', label: 'المبلغ' },
      { key: 'status', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
      { key: 'penaltyDate', label: 'التاريخ', render: (v) => (v ? new Date(v).toLocaleDateString('ar-SA') : '—') },
    ],
    rewards: [
      { key: 'category', label: 'التصنيف' },
      { key: 'amount', label: 'المبلغ' },
      { key: 'status', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
    ],
    investigations: [
      { key: 'title', label: 'العنوان' },
      { key: 'category', label: 'التصنيف' },
      { key: 'status', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
    ],
    dailyReports: [
      { key: 'reportDate', label: 'اليوم', render: (v) => (v ? new Date(v).toLocaleDateString('ar-SA') : '—') },
      { key: 'totalOrders', label: 'الطلبات' },
      { key: 'totalHours', label: 'الساعات' },
      { key: 'status', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
    ],
    leaves: [
      { key: 'leaveType', label: 'النوع' },
      { key: 'startDate', label: 'من', render: (v) => (v ? new Date(v).toLocaleDateString('ar-SA') : '—') },
      { key: 'endDate', label: 'إلى', render: (v) => (v ? new Date(v).toLocaleDateString('ar-SA') : '—') },
      { key: 'status', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
    ],
    salary: [
      { key: 'amount', label: 'المبلغ' },
      { key: 'status', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
      { key: 'createdAt', label: 'التاريخ', render: (v) => (v ? new Date(v).toLocaleDateString('ar-SA') : '—') },
    ],
    maintenance: [
      { key: 'issueType', label: 'النوع' },
      { key: 'priority', label: 'الأولوية' },
      { key: 'status', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
      { key: 'vehicle', label: 'المركبة', render: (v) => v?.plateNumber || '—' },
    ],
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/drivers')}>
            <LuArrowRight size={16} /> العودة للقائمة
          </button>
          <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LuUser /> {driver.fullNameAr}
          </h2>
          <StatusBadge status={driver.accountStatus} />
        </div>
        {canWriteUser && (
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowStatus(true)}>
            تغيير حالة الحساب
          </button>
        )}
      </div>

      <div className="tabs-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`btn btn-sm ${tab === t.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid-2">
          <div className="card">
            <div className="card-header"><h4 className="card-title">البيانات الشخصية</h4></div>
            <div style={{ padding: 16, fontSize: '0.9rem', lineHeight: 1.8 }}>
              <p><strong>رقم الهوية:</strong> {driver.identityNumber}</p>
              <p><strong>الجوال:</strong> {driver.mobileNumber || '—'}</p>
              <p><strong>البريد:</strong> {driver.email || '—'}</p>
              <p><strong>رقم الموظف:</strong> {driver.employeeNumber || '—'}</p>
              <p><strong>المدينة:</strong> {driver.city?.nameAr || '—'}</p>
              <p><strong>المشرف:</strong> {driver.supervisor?.fullNameAr || '—'}</p>
              <p><strong>التوفر:</strong> <StatusBadge status={driver.availabilityStatus} /></p>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><h4 className="card-title">إحصائيات سريعة</h4></div>
            <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                ['المستندات', counts.documents],
                ['الرخص', counts.licenses],
                ['الشفتات', counts.shifts],
                ['المخالفات', counts.violations],
                ['الجزاءات', counts.penalties],
                ['المكافآت', counts.rewards],
                ['طلبات الإجازة', counts.leaveRequests],
              ].map(([label, n]) => (
                <div key={label} style={{ background: 'var(--bg-subtle)', padding: 12, borderRadius: 8 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{label}</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{n ?? 0}</div>
                </div>
              ))}
            </div>
          </div>
          {driver.profileImageUrl && (
            <div className="card" style={{ gridColumn: '1 / -1' }}>
              <div className="card-header"><h4 className="card-title">صورة الملف</h4></div>
              <div style={{ padding: 16 }}>
                <img src={resolveUploadUrl(driver.profileImageUrl)} alt="" style={{ maxWidth: 200, borderRadius: 8 }} />
              </div>
            </div>
          )}
        </div>
      )}

      {tab !== 'overview' && (
        <div className="card">
          <DataTable
            columns={tabColumns[tab] || []}
            data={tabData}
            loading={tabLoading}
            emptyMessage="لا توجد سجلات"
          />
        </div>
      )}

      <Modal isOpen={showStatus} onClose={() => setShowStatus(false)} title="تغيير حالة الحساب">
        <form onSubmit={saveStatus}>
          <div className="form-group">
            <label className="form-label">الحالة</label>
            <select
              className="form-input form-select"
              value={statusForm.accountStatus}
              onChange={(e) => setStatusForm((f) => ({ ...f, accountStatus: e.target.value }))}
            >
              <option value="ACTIVE">نشط</option>
              <option value="PENDING_APPROVAL">بانتظار الموافقة</option>
              <option value="TEMPORARILY_SUSPENDED">موقوف مؤقتاً</option>
              <option value="RESTRICTED">مقيّد</option>
              <option value="UNDER_INVESTIGATION">تحت التحقيق</option>
              <option value="INCOMPLETE_PROFILE">ملف غير مكتمل</option>
              <option value="ARCHIVED">مؤرشف</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">سبب (اختياري)</label>
            <input className="form-input" value={statusForm.reason} onChange={(e) => setStatusForm((f) => ({ ...f, reason: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button type="submit" className="btn btn-primary">حفظ</button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowStatus(false)}>إلغاء</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
