import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { apiService } from '../../services/api';
import StatusBadge from '../../components/ui/StatusBadge';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';
import { 
  LuArrowRight, LuUser, LuFileText, LuShield, LuClock, LuSmartphone, 
  LuFuel, LuTriangleAlert, LuCircleAlert, LuClipboardList, LuGift, 
  LuSearch, LuCalendarOff, LuDollarSign, LuWrench, LuMapPin, LuMail, LuPhone, LuIdCard, LuChevronLeft,
  LuMap, LuEye, LuPen, LuActivity, LuUserPlus, LuMessageSquare, LuCheck
} from 'react-icons/lu';
import { resolveUploadUrl } from '../../utils/apiOrigin';
import { hasAnyPermissionForUser, PERMISSIONS as P } from '../../utils/rolePermissions';
import PermissionGate from '../../components/auth/PermissionGate';
import DriverLiveMap from './DriverLiveMap';

const FIELD_TRANSLATIONS = {
  status: 'الحالة',
  amount: 'المبلغ',
  reason: 'السبب',
  createdAt: 'تاريخ الإنشاء',
  updatedAt: 'تاريخ التحديث',
  title: 'العنوان',
  details: 'التفاصيل',
  category: 'التصنيف',
  leaveType: 'نوع الإجازة',
  type: 'النوع',
  expiryDate: 'تاريخ الانتهاء',
  violationDate: 'تاريخ المخالفة',
  penaltyDate: 'تاريخ الجزاء',
  fuelDate: 'تاريخ التعبئة',
  issueType: 'نوع العطل',
  priority: 'الأولوية',
  reportDate: 'تاريخ التقرير',
  totalOrders: 'إجمالي الطلبات',
  totalHours: 'إجمالي الساعات',
  startDate: 'تاريخ البدء',
  endDate: 'تاريخ الانتهاء',
  username: 'اسم المستخدم',
  platform: 'المنصة',
  vehicle: 'المركبة',
  requestedAt: 'تاريخ الطلب',
  notes: 'ملاحظات',
  description: 'الوصف',
  cost: 'التكلفة',
  employeeNumber: 'الرقم الوظيفي',
  identityNumber: 'رقم الهوية',
  profileImageUrl: 'الصورة الشخصية',
  fileUrl: 'رابط الملف',
  receiptUrl: 'رابط الإيصال',
  attachmentUrl: 'المرفق',
  photoUrl: 'الصورة المرفقة',
  appUserId: 'معرف المستخدم',
  userId: 'المستخدم',
  vehicleId: 'المركبة',
  shiftId: 'الشفت',
  adminNotes: 'ملاحظات الإدارة',
  technicianNotes: 'ملاحظات الفني',
  completedAt: 'تاريخ الإكمال',
  issueDate: 'تاريخ الإصدار',
  licenseNumber: 'رقم الرخصة',
  discountAmount: 'مبلغ الخصم',
  orderRef: 'رقم الطلب',
  platformName: 'اسم المنصة',
};

const STATUS_TRANSLATIONS = {
  PENDING: 'قيد الانتظار',
  APPROVED: 'موافق عليه',
  REJECTED: 'مرفوض',
  ACTIVE: 'نشط',
  INACTIVE: 'غير نشط',
  ENDED: 'منتهي',
  CANCELLED: 'ملغي',
  IN_PROGRESS: 'جاري التنفيذ',
  COMPLETED: 'مكتمل',
  APPLIED: 'تم التطبيق',
  WAIVED: 'معفى عنه',
  REQUESTED: 'مطلوب',
  REPORTED: 'تم الإبلاغ',
  OPEN: 'مفتوح',
  UNDER_REVIEW: 'تحت المراجعة',
  CLOSED: 'مغلق',
  EXPIRED: 'منتهي الصلاحية',
  SUSPENDED: 'موقوف',
  SUBMITTED: 'تم الإرسال',
  NEEDS_REVISION: 'يحتاج مراجعة',
  APPEALED: 'قيد الاستئناف',
  CONFIRMED: 'مؤكدة',
  DISMISSED: 'مستبعدة',
  PENALIZED: 'تمت المعاقبة',
};

const TAB_STATUS_MAPPINGS = {
  documents: ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'],
  licenses: ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'],
  shifts: ['REQUESTED', 'APPROVED', 'ACTIVE', 'ENDED', 'CANCELLED'],
  platformAccounts: ['PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED'],
  fuel: ['PENDING', 'APPROVED', 'REJECTED'],
  violations: ['REPORTED', 'UNDER_REVIEW', 'CONFIRMED', 'DISMISSED', 'PENALIZED'],
  penalties: ['PENDING', 'APPLIED', 'APPEALED', 'CANCELLED'],
  rewards: ['PENDING', 'APPROVED', 'REJECTED'],
  investigations: ['OPEN', 'UNDER_REVIEW', 'CLOSED'],
  dailyReports: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'NEEDS_REVISION'],
  leaves: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'],
  salary: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'],
  maintenance: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  assignments: ['ACTIVE', 'ENDED'],
};

const TABS = [
  { id: 'overview', label: 'نظرة عامة', icon: LuUser },
  { id: 'tracking', label: 'تتبع المندوب', icon: LuMap },
  { id: 'documents', label: 'المستندات', icon: LuFileText },
  { id: 'licenses', label: 'الرخص', icon: LuShield },
  { id: 'shifts', label: 'الشفتات', icon: LuClock },
  { id: 'platformAccounts', label: 'حسابات المنصات', icon: LuSmartphone },
  { id: 'fuel', label: 'الوقود', icon: LuFuel },
  { id: 'violations', label: 'المخالفات', icon: LuTriangleAlert },
  { id: 'penalties', label: 'الجزاءات', icon: LuCircleAlert },
  { id: 'rewards', label: 'المكافآت', icon: LuGift },
  { id: 'investigations', label: 'التحقيقات', icon: LuSearch },
  { id: 'dailyReports', label: 'التقارير اليومية', icon: LuClipboardList },
  { id: 'leaves', label: 'الإجازات', icon: LuCalendarOff },
  { id: 'salary', label: 'السلف', icon: LuDollarSign },
  { id: 'maintenance', label: 'الصيانة', icon: LuWrench },
  { id: 'assignments', label: 'تاريخ العهد', icon: LuActivity },
];

export default function DriverDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: authUser } = useSelector((s) => s.auth);
  const canWriteUser = hasAnyPermissionForUser(authUser, [P.USERS_WRITE]);

  const [tab, setTab] = useState('overview');
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tabData, setTabData] = useState([]);
  const [tabLoading, setTabLoading] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [statusForm, setStatusForm] = useState({ accountStatus: 'ACTIVE', reason: '' });
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const [selectedRecord, setSelectedRecord] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({});
  const [fileAttachment, setFileAttachment] = useState(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);


  const handleStatusUpdate = async (recId, newStatus, currentTab) => {
    try {
      let endpoint = '';
      let payload = { status: newStatus };

      switch (currentTab) {
        case 'documents': endpoint = `/documents/${recId}/review`; break;
        case 'licenses': endpoint = `/licenses/${recId}/review`; break;
        case 'shifts': endpoint = `/shifts/${recId}/status`; break;
        case 'platformAccounts': endpoint = `/platform-accounts/${recId}/status`; break;
        case 'fuel': endpoint = `/fuel-logs/${recId}/review`; break;
        case 'violations': endpoint = `/violations/${recId}/review`; break;
        case 'penalties': endpoint = `/penalties/${recId}/status`; break;
        case 'rewards': endpoint = `/rewards/${recId}/status`; break;
        case 'investigations': endpoint = `/investigations/${recId}/status`; break;
        case 'dailyReports': endpoint = `/daily-reports/${recId}/review`; break;
        case 'leaves': endpoint = `/leave-requests/${recId}/review`; break;
        case 'salary': endpoint = `/salary-advances/${recId}/review`; break;
        case 'maintenance': endpoint = `/maintenance-requests/${recId}/status`; break;
        default: return;
      }

      await apiService.patch(endpoint, payload);
      toast.success('تم تحديث الحالة بنجاح');
      loadTab();
      loadSummary();
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل تحديث الحالة');
    }
  };



  const handleView = (record) => {
    // Smart Navigation Logic: If a dedicated detail page exists for this tab, navigate to it.
    const TAB_TO_ROUTE = {
      shifts: '/shifts',
      maintenance: '/maintenance-requests',
      violations: '/violations',
      fuel: '/fuel',
      incidents: '/incidents',
      dailyReports: '/daily-reports',
      leaves: '/leaves',
      penalties: '/penalties',
      rewards: '/rewards',
      investigations: '/investigations',
      ratings: '/ratings',
      salary: '/salary-advances',
      documents: '/documents',
      licenses: '/licenses',
      platformAccounts: '/platform-accounts',
      bankAccounts: '/bank-accounts',
    };

    if (TAB_TO_ROUTE[tab]) {
      navigate(`${TAB_TO_ROUTE[tab]}/${record.id}`);
      return;
    }

    setSelectedRecord(record);
    setViewModalOpen(true);
  };

  const handleEdit = (record, e) => {
    e.stopPropagation();
    setSelectedRecord(record);
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRecord) return;
    
    setTabLoading(true);
    try {
      let endpoint = '';
      switch (tab) {
        case 'documents': endpoint = `/documents/${selectedRecord.id}`; break;
        case 'licenses': endpoint = `/licenses/${selectedRecord.id}`; break;
        case 'shifts': endpoint = `/shifts/${selectedRecord.id}`; break;
        case 'platformAccounts': endpoint = `/platform-accounts/${selectedRecord.id}`; break;
        case 'fuel': endpoint = `/fuel-logs/${selectedRecord.id}`; break;
        case 'violations': endpoint = `/violations/${selectedRecord.id}`; break;
        case 'penalties': endpoint = `/penalties/${selectedRecord.id}`; break;
        case 'rewards': endpoint = `/rewards/${selectedRecord.id}`; break;
        case 'investigations': endpoint = `/investigations/${selectedRecord.id}`; break;
        case 'leaves': endpoint = `/leave-requests/${selectedRecord.id}`; break;
        case 'salary': endpoint = `/salary-advances/${selectedRecord.id}`; break;
        case 'maintenance': endpoint = `/maintenance-requests/${selectedRecord.id}`; break;
        default: return;
      }

      // Robustly filter payload: exclude technical fields and relations (objects/arrays)
      const payload = {};
      const IGNORED_KEYS = ['id', 'userId', 'vehicleId', 'shiftId', 'createdAt', 'updatedAt', 'deletedAt', 'verifiedBy', 'reviewedBy', 'approvedBy', 'createdById', 'closedBy', 'identityNumber', 'employeeNumber'];
      
      Object.entries(selectedRecord).forEach(([key, value]) => {
        if (!IGNORED_KEYS.includes(key) && value !== null && typeof value !== 'object') {
          payload[key] = value;
        }
      });
      
      await apiService.patch(endpoint, payload);
      toast.success('تم حفظ التعديلات بنجاح');
      setEditModalOpen(false);
      loadTab();
      loadSummary();
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل حفظ التعديلات');
    } finally {
      setTabLoading(false);
    }
  };

  const handleQuickStatusChange = async (newStatus) => {
    if (!selectedRecord) return;
    
    try {
      let endpoint = '';
      switch (tab) {
        case 'documents': endpoint = `/documents/${selectedRecord.id}/review`; break;
        case 'licenses': endpoint = `/licenses/${selectedRecord.id}/review`; break;
        case 'fuel': endpoint = `/fuel-logs/${selectedRecord.id}/review`; break;
        case 'violations': endpoint = `/violations/${selectedRecord.id}/review`; break;
        case 'penalties': endpoint = `/penalties/${selectedRecord.id}/status`; break;
        case 'rewards': endpoint = `/rewards/${selectedRecord.id}/status`; break;
        case 'investigations': endpoint = `/investigations/${selectedRecord.id}/status`; break;
        case 'leaves': endpoint = `/leave-requests/${selectedRecord.id}/review`; break;
        case 'salary': endpoint = `/salary-advances/${selectedRecord.id}/review`; break;
        case 'maintenance': endpoint = `/maintenance-requests/${selectedRecord.id}/status`; break;
        default: endpoint = `/${tab}/${selectedRecord.id}`;
      }

      await apiService.patch(endpoint, { status: newStatus });
      toast.success(`تم تغيير الحالة إلى ${newStatus} بنجاح`);
      setViewModalOpen(false);
      loadTab();
      loadSummary();
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل تغيير الحالة');
    }
  };

  const handleCreateOpen = () => {
    // Set initial state based on tab
    let initialForm = { userId: parseInt(id) };
    const today = new Date().toISOString().split('T')[0];
    
    if (tab === 'documents') initialForm = { ...initialForm, type: 'NATIONAL_ID', title: '', issueDate: today, expiryDate: today };
    if (tab === 'licenses') initialForm = { ...initialForm, type: 'DRIVING_LICENSE', title: '', licenseNumber: '', issueDate: today, expiryDate: today };
    if (tab === 'fuel') initialForm = { ...initialForm, fuelDate: today, amount: 0, liters: 0, vehicleId: driver.vehicleAssignment?.[0]?.vehicleId };
    if (tab === 'violations') initialForm = { ...initialForm, reason: '', violationDate: today, amount: 0 };
    if (tab === 'leaves') initialForm = { ...initialForm, leaveType: 'ANNUAL', startDate: today, endDate: today };
    if (tab === 'penalties') initialForm = { ...initialForm, type: 'FINANCIAL', amount: 0, penaltyDate: today, reason: '' };
    if (tab === 'rewards') initialForm = { ...initialForm, category: 'PERFORMANCE', amount: 0, reason: '' };
    if (tab === 'maintenance') initialForm = { ...initialForm, priority: 'MEDIUM', issueType: 'MECHANICAL', vehicleId: driver.vehicleAssignment?.[0]?.vehicleId };
    if (tab === 'salary') initialForm = { ...initialForm, amount: 0, reason: '' };
    
    setCreateForm(initialForm);
    setFileAttachment(null);
    setCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setTabLoading(true);
    try {
      let endpoint = '';
      switch (tab) {
        case 'documents': endpoint = '/documents'; break;
        case 'licenses': endpoint = '/licenses'; break;
        case 'fuel': endpoint = '/fuel-logs'; break;
        case 'violations': endpoint = '/violations'; break;
        case 'penalties': endpoint = '/penalties'; break;
        case 'rewards': endpoint = '/rewards'; break;
        case 'investigations': endpoint = '/investigations'; break;
        case 'leaves': endpoint = '/leave-requests'; break;
        case 'salary': endpoint = '/salary-advances'; break;
        case 'maintenance': endpoint = '/maintenance-requests'; break;
        default: return;
      }
      
      if (fileAttachment) {
        const formData = new FormData();
        Object.entries(createForm).forEach(([key, val]) => {
          formData.append(key, val);
        });
        
        // Determine correct field name for the backend
        let fieldName = 'file';
        if (tab === 'fuel') fieldName = 'receipt';
        else if (tab === 'leaves' || tab === 'maintenance') fieldName = 'attachment';
        
        formData.append(fieldName, fileAttachment);
        await apiService.upload(endpoint, formData);
      } else {
        await apiService.post(endpoint, createForm);
      }

      toast.success('تمت الإضافة بنجاح');
      setCreateModalOpen(false);
      setFileAttachment(null);
      loadTab();
      loadSummary();
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل عملية الإضافة');
    } finally {
      setTabLoading(false);
    }
  };

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

  const loadSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const { data } = await apiService.get(`/reports/driver-summary/${id}`);
      setSummary(data.data);
    } catch {
      toast.error('تعذر تحميل إحصائيات الملخص');
    } finally {
      setLoadingSummary(false);
    }
  }, [id]);

  useEffect(() => { loadDriver(); loadSummary(); }, [loadDriver, loadSummary]);

  const loadTab = useCallback(async () => {
    if (tab === 'overview' || tab === 'tracking' || !id) return;
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
        case 'assignments': url = '/vehicles/assignments'; break;
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

  const tabColumns = useMemo(() => ({
    documents: [
      { key: 'title', label: 'العنوان' },
      { key: 'type', label: 'النوع' },
      { key: 'status', label: 'الحالة', render: (_, r) => <StatusDropdown record={r} currentTab="documents" onUpdate={handleStatusUpdate} /> },
      { key: 'expiryDate', label: 'انتهاء', render: (v) => (v ? new Date(v).toLocaleDateString('ar-SA') : '—') },
    ],
    licenses: [
      { key: 'title', label: 'العنوان' },
      { key: 'type', label: 'النوع' },
      { key: 'status', label: 'الحالة', render: (_, r) => <StatusDropdown record={r} currentTab="licenses" onUpdate={handleStatusUpdate} /> },
      { key: 'expiryDate', label: 'انتهاء', render: (v) => (v ? new Date(v).toLocaleDateString('ar-SA') : '—') },
    ],
    shifts: [
      { key: 'id', label: '#' },
      { key: 'status', label: 'الحالة', render: (_, r) => <StatusDropdown record={r} currentTab="shifts" onUpdate={handleStatusUpdate} /> },
      { key: 'vehicle', label: 'المركبة', render: (v, r) => (
        <div>
          <div>{v?.plateNumber || '—'}</div>
          {r.conflictingActiveShift && (
            <div className="text-[0.7rem] font-bold text-rose-500 mt-1 flex items-center gap-1">
              <LuTriangleAlert size={12} />
              <span>مع {r.conflictingActiveShift.driverName} (لا يمكن البدء)</span>
            </div>
          )}
        </div>
      ) },
      { key: 'requestedAt', label: 'الطلب', render: (v) => (v ? new Date(v).toLocaleString('ar-SA') : '—') },
    ],
    platformAccounts: [
      { key: 'platform', label: 'المنصة', render: (p) => p?.nameAr || '—' },
      { key: 'username', label: 'المعرّف' },
      { key: 'status', label: 'الحالة', render: (_, r) => <StatusDropdown record={r} currentTab="platformAccounts" onUpdate={handleStatusUpdate} /> },
    ],
    fuel: [
      { key: 'amount', label: 'المبلغ' },
      { key: 'fuelDate', label: 'التاريخ', render: (v) => (v ? new Date(v).toLocaleString('ar-SA') : '—') },
      { key: 'status', label: 'الحالة', render: (_, r) => <StatusDropdown record={r} currentTab="fuel" onUpdate={handleStatusUpdate} /> },
      { key: 'vehicle', label: 'المركبة', render: (v) => v?.plateNumber || '—' },
    ],
    violations: [
      { key: 'reason', label: 'السبب' },
      { key: 'status', label: 'الحالة', render: (_, r) => <StatusDropdown record={r} currentTab="violations" onUpdate={handleStatusUpdate} /> },
      { key: 'violationDate', label: 'التاريخ', render: (v) => (v ? new Date(v).toLocaleDateString('ar-SA') : '—') },
    ],
    penalties: [
      { key: 'type', label: 'النوع' },
      { key: 'amount', label: 'المبلغ' },
      { key: 'status', label: 'الحالة', render: (_, r) => <StatusDropdown record={r} currentTab="penalties" onUpdate={handleStatusUpdate} /> },
      { key: 'penaltyDate', label: 'التاريخ', render: (v) => (v ? new Date(v).toLocaleDateString('ar-SA') : '—') },
    ],
    rewards: [
      { key: 'category', label: 'التصنيف' },
      { key: 'amount', label: 'المبلغ' },
      { key: 'status', label: 'الحالة', render: (_, r) => <StatusDropdown record={r} currentTab="rewards" onUpdate={handleStatusUpdate} /> },
    ],
    investigations: [
      { key: 'title', label: 'العنوان' },
      { key: 'category', label: 'التصنيف' },
      { key: 'status', label: 'الحالة', render: (_, r) => <StatusDropdown record={r} currentTab="investigations" onUpdate={handleStatusUpdate} /> },
    ],
    dailyReports: [
      { key: 'reportDate', label: 'اليوم', render: (v) => (v ? new Date(v).toLocaleDateString('ar-SA') : '—') },
      { key: 'totalOrders', label: 'الطلبات' },
      { key: 'totalHours', label: 'الساعات' },
      { key: 'status', label: 'الحالة', render: (_, r) => <StatusDropdown record={r} currentTab="dailyReports" onUpdate={handleStatusUpdate} /> },
    ],
    leaves: [
      { key: 'leaveType', label: 'النوع' },
      { key: 'startDate', label: 'من', render: (v) => (v ? new Date(v).toLocaleDateString('ar-SA') : '—') },
      { key: 'endDate', label: 'إلى', render: (v) => (v ? new Date(v).toLocaleDateString('ar-SA') : '—') },
      { key: 'status', label: 'الحالة', render: (_, r) => <StatusDropdown record={r} currentTab="leaves" onUpdate={handleStatusUpdate} /> },
    ],
    salary: [
      { key: 'amount', label: 'المبلغ' },
      { key: 'status', label: 'الحالة', render: (_, r) => <StatusDropdown record={r} currentTab="salary" onUpdate={handleStatusUpdate} /> },
      { key: 'createdAt', label: 'التاريخ', render: (v) => (v ? new Date(v).toLocaleDateString('ar-SA') : '—') },
    ],
    maintenance: [
      { key: 'issueType', label: 'النوع' },
      { key: 'priority', label: 'الأولوية' },
      { key: 'status', label: 'الحالة', render: (_, r) => <StatusDropdown record={r} currentTab="maintenance" onUpdate={handleStatusUpdate} /> },
      { key: 'vehicle', label: 'المركبة', render: (v) => v?.plateNumber || '—' },
    ],
    assignments: [
      { key: 'vehicle', label: 'المركبة', render: (v) => v?.plateNumber || '—' },
      { key: 'assignedAt', label: 'تاريخ البدء', render: (v) => new Date(v).toLocaleDateString('ar-SA') },
      { key: 'releasedAt', label: 'تاريخ الانتهاء', render: (v) => v ? new Date(v).toLocaleDateString('ar-SA') : 'نشط' },
      { key: 'isActive', label: 'الحالة', render: (v) => <StatusBadge status={v ? 'ACTIVE' : 'ENDED'} /> },
    ],
  }), [id, handleStatusUpdate]);

  if (loading || !driver) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-brand-light border-t-brand-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  const counts = driver._count || {};


  return (
    <div className="page-container animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Premium Profile Header */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-premium border border-slate-100 mb-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-light/40 rounded-full blur-3xl -mr-32 -mt-32 opacity-60 pointer-events-none"></div>
        
        <div className="flex flex-col lg:flex-row items-center lg:items-end gap-8 relative z-10">
          {/* Avatar Section */}
          <div className="relative">
            <div className="w-40 h-40 rounded-[2rem] bg-slate-50 border-4 border-white shadow-lg overflow-hidden flex items-center justify-center ring-1 ring-slate-100 group-hover:scale-105 transition-transform duration-500">
              {driver.profileImageUrl ? (
                <img src={resolveUploadUrl(driver.profileImageUrl)} alt="" className="w-full h-full object-cover" />
              ) : (
                <LuUser size={64} className="text-slate-300" />
              )}
            </div>
            <div className="absolute -bottom-2 -right-2">
               <StatusBadge status={driver.accountStatus} />
            </div>
          </div>

          {/* Info Section */}
          <div className="flex-1 text-center lg:text-right">
            <div className="flex flex-col lg:flex-row items-center lg:items-center gap-4 mb-4">
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">{driver.fullNameAr}</h2>
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full ring-1 ring-slate-200">ID: {driver.employeeNumber || '—'}</span>
            </div>
            
            <div className="flex flex-wrap justify-center lg:justify-start gap-6 text-[0.9rem] font-bold text-slate-500">
               <div className="flex items-center gap-2 hover:text-brand-primary transition-colors cursor-default">
                  <LuPhone size={18} />
                  <span>{driver.mobileNumber || '—'}</span>
               </div>
               <div className="flex items-center gap-2 hover:text-brand-primary transition-colors cursor-default">
                  <LuMail size={18} />
                  <span>{driver.email || '—'}</span>
               </div>
               <div className="flex items-center gap-2 hover:text-brand-primary transition-colors cursor-default">
                  <LuMapPin size={18} />
                  <span>{driver.city?.nameAr || '—'}</span>
               </div>
            </div>
          </div>

          {/* Action Section */}
          <div className="flex gap-3">
             <button 
               onClick={() => navigate(`/chat?userId=${driver.id}`)}
               className="btn bg-brand-light text-brand-primary hover:bg-brand-primary hover:text-white !rounded-2xl flex items-center gap-2"
             >
               <LuMessageSquare size={18} />
               مراسلة
             </button>
             {canWriteUser && (
                <button 
                  onClick={() => setShowStatus(true)}
                  className="btn btn-primary !rounded-2xl"
                >
                  تغيير الحالة
                </button>
             )}
             <button 
               onClick={() => navigate('/drivers')}
               className="btn bg-slate-100 text-slate-600 hover:bg-slate-200 !rounded-2xl"
             >
               <LuChevronLeft size={18} />
               عودة
             </button>
          </div>
        </div>
      </div>

      {/* Modern Tabs Section */}
      <div className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="overflow-x-auto custom-scrollbar pb-2 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-slate-100/50 p-1.5 rounded-2xl w-fit">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-xl text-[0.85rem] font-bold whitespace-nowrap transition-all duration-300
                    ${active 
                      ? 'bg-white text-brand-primary shadow-sm ring-1 ring-slate-200/50' 
                      : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                    }
                  `}
                >
                  <Icon size={16} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Add Button */}
        {['documents', 'licenses', 'fuel', 'violations', 'penalties', 'rewards', 'investigations', 'leaves', 'salary', 'maintenance'].includes(tab) && (
          <PermissionGate anyOf={[P.USERS_WRITE]}>
            <button 
              onClick={handleCreateOpen}
              className="btn btn-primary !rounded-2xl shadow-premium hover:shadow-premium-hover transition-all animate-in zoom-in duration-300 flex items-center gap-2"
            >
              <LuUserPlus size={18} />
              إضافة {TABS.find(t => t.id === tab)?.label} جديد
            </button>
          </PermissionGate>
        )}
      </div>

      {/* Content Area */}
      <div className="animate-in fade-in zoom-in-95 duration-500">
        {tab === 'tracking' ? (
          <DriverLiveMap driverId={parseInt(id, 10)} />
        ) : tab === 'overview' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Detailed Stats Cards */}
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <InfoCard icon={LuIdCard} label="بيانات الهوية" value={driver.identityNumber} sub="رقم الهوية الوطنية / الإقامة" />
                 <InfoCard icon={LuUser} label="المشرف المباشر" value={driver.supervisor?.fullNameAr || '—'} sub="المسؤول عن المتابعة" />
              </div>
               
              <div className="card !p-8 border-none ring-1 ring-slate-200/50">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-black text-slate-800">إحصائيات الأداء والمالية (آخر 30 يوم)</h3>
                  {loadingSummary && <div className="w-5 h-5 border-2 border-brand-light border-t-brand-primary rounded-full animate-spin"></div>}
                </div>

                {!loadingSummary && summary ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                    {[
                      { label: 'إجمالي الشفتات', n: summary.metrics.totalShifts, color: 'text-blue-600', bg: 'bg-blue-50', icon: LuClock },
                      { label: 'المخالفات', n: summary.metrics.recordedViolationsCount, color: 'text-rose-600', bg: 'bg-rose-50', icon: LuTriangleAlert },
                      { label: 'إجمالي السلف', n: `${summary.metrics.approvedSalaryAdvancesSum} ر.س`, color: 'text-orange-600', bg: 'bg-orange-50', icon: LuDollarSign },
                      { label: 'المكافآت', n: `${summary.metrics.approvedBonusesSum} ر.س`, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: LuGift },
                      { label: 'الخصومات', n: `${summary.metrics.appliedDeductionsSum} ر.س`, color: 'text-red-600', bg: 'bg-red-50', icon: LuCircleAlert },
                      { label: 'الطلبات الإدارية', n: summary.metrics.adminRequestsCount, color: 'text-slate-600', bg: 'bg-slate-100', icon: LuClipboardList },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.label} className={`${item.bg} rounded-3xl p-5 transition-transform hover:-translate-y-1 relative overflow-hidden group`}>
                          <div className="absolute -right-2 -bottom-2 text-slate-900/5 group-hover:scale-110 transition-transform">
                            <Icon size={48} />
                          </div>
                          <div className={`text-xl font-black ${item.color} mb-1 relative z-10`}>{item.n ?? 0}</div>
                          <div className="text-[0.65rem] font-black text-slate-800 uppercase tracking-widest relative z-10">{item.label}</div>
                        </div>
                      );
                    })}
                  </div>
                ) : loadingSummary ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                    {[1,2,3,4,5,6].map(i => (
                      <div key={i} className="bg-slate-50 animate-pulse rounded-3xl h-24"></div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400 font-bold">لا توجد بيانات متاحة حالياً</div>
                )}
              </div>

              {/* Active Assets Section */}
              {!loadingSummary && summary && (
                <div className="card !p-8 border-none ring-1 ring-slate-200/50">
                  <h3 className="text-lg font-black text-slate-800 mb-6">العهد النشطة حالياً</h3>
                  {summary.activeAssets?.length > 0 ? (
                    <div className="flex flex-wrap gap-4">
                      {summary.activeAssets.map((assetAssign) => (
                        <div key={assetAssign.id} className="bg-white ring-1 ring-slate-200/50 p-4 rounded-2xl flex items-center gap-4 min-w-[200px] hover:shadow-sm transition-all">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 text-brand-primary flex items-center justify-center">
                            <LuShield size={20} />
                          </div>
                          <div>
                            <div className="text-[0.6rem] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{assetAssign.asset?.type}</div>
                            <div className="text-sm font-black text-slate-800">{assetAssign.asset?.nameAr}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-slate-400 font-bold italic bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                      لا توجد عهد مسجلة لهذا السائق حالياً
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Availability & Actions */}
            <div className="space-y-6">
               <div className="card !p-8 border-none ring-1 ring-slate-200/50 bg-gradient-to-br from-white to-slate-50/50">
                  <h3 className="text-lg font-black text-slate-800 mb-6">حالة التوفر الحالية</h3>
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm mb-6">
                     <div className={`w-3 h-3 rounded-full ${driver.availabilityStatus === 'AVAILABLE' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                     <span className="font-bold text-slate-700">
                        {driver.availabilityStatus === 'AVAILABLE' ? 'متاح للعمل حالياً' : 'غير متاح'}
                     </span>
                  </div>
                  <div className="space-y-3">
                     <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-slate-400">
                        <span>إجمالي الإجازات</span>
                        <span>{counts.leaveRequests || 0} طلب</span>
                     </div>
                     <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-brand-primary h-full w-[30%]" />
                     </div>
                  </div>
               </div>

               <div className="card !p-8 border-none ring-1 ring-slate-200/50">
                  <h3 className="text-lg font-black text-slate-800 mb-4">ملاحظات سريعة</h3>
                  <p className="text-xs font-medium text-slate-500 leading-relaxed italic">
                    "هذا السائق ملتزم بالجداول الزمنية ولديه سجل نظيف من المخالفات الجسيمة في الأشهر الأخيرة."
                  </p>
               </div>
            </div>
          </div>
        ) : (
          <DataTable
            columns={[
              ...(tabColumns[tab] || []),
              {
                key: 'actions',
                label: 'إجراءات',
                stopRowClick: true,
                render: (_, record) => (
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleView(record); }}
                      className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-brand-light hover:text-brand-primary transition-colors"
                      title="عرض التفاصيل"
                    >
                      <LuEye size={16} />
                    </button>
                    <PermissionGate anyOf={[P.USERS_WRITE]}>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(record, e); }}
                        className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                        title="تعديل السجل"
                      >
                        <LuPen size={16} />
                      </button>
                    </PermissionGate>
                  </div>
                ),
              }
            ]}
            data={tabData}
            loading={tabLoading}
            emptyMessage="لا توجد سجلات متاحة في هذا التصنيف حالياً"
            onRowClick={(row) => handleView(row)}
          />
        )}
      </div>

      {/* Status Modal */}
      <Modal isOpen={showStatus} onClose={() => setShowStatus(false)} title="تحديث حالة حساب السائق">
        <form onSubmit={saveStatus} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-black text-slate-700 uppercase tracking-wide">اختر الحالة الجديدة</label>
            <select
              className="form-input !rounded-2xl"
              value={statusForm.accountStatus}
              onChange={(e) => setStatusForm((f) => ({ ...f, accountStatus: e.target.value }))}
            >
              <option value="ACTIVE">نشط (Active)</option>
              <option value="PENDING_APPROVAL">بانتظار الموافقة</option>
              <option value="TEMPORARILY_SUSPENDED">موقوف مؤقتاً</option>
              <option value="RESTRICTED">مقيّد</option>
              <option value="UNDER_INVESTIGATION">تحت التحقيق</option>
              <option value="INCOMPLETE_PROFILE">ملف غير مكتمل</option>
              <option value="ARCHIVED">مؤرشف</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-black text-slate-700 uppercase tracking-wide">سبب التغيير (اختياري)</label>
            <textarea 
              className="form-input !rounded-2xl min-h-[100px] py-4" 
              placeholder="اكتب سبب تغيير الحالة هنا..."
              value={statusForm.reason} 
              onChange={(e) => setStatusForm((f) => ({ ...f, reason: e.target.value }))} 
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="submit" className="btn btn-primary flex-1 !rounded-2xl justify-center">حفظ التغييرات</button>
            <button type="button" className="btn bg-slate-100 text-slate-500 flex-1 !rounded-2xl justify-center" onClick={() => setShowStatus(false)}>إلغاء</button>
          </div>
        </form>
      </Modal>

      {/* Universal Smart Details Modal */}
      <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} title="تفاصيل السجل">
        {selectedRecord && (
          <div className="space-y-6">
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(selectedRecord).map(([key, value]) => {
                  // 1. Hide Technical Keys
                  const IGNORED_KEYS = ['id', 'userId', 'vehicleId', 'shiftId', 'createdAt', 'updatedAt', 'deletedAt', 'platformAccountId', 'supervisorId', 'cityId', 'appUserId'];
                  
                  // Handle Objects (like user, vehicle, platform)
                  let displayValue = value;
                  let isPreview = false;

                  if (typeof value === 'object' && value !== null) {
                    // Try to find a displayable field in the object
                    displayValue = value.fullNameAr || value.plateNumber || value.nameAr || value.username || value.title || null;
                    if (!displayValue) return null; // Still hide complex objects if no display field found
                  } else if (IGNORED_KEYS.includes(key)) {
                    return null;
                  } else if (value === null || value === undefined) {
                    displayValue = '—';
                  } else {
                    displayValue = String(value);
                  }
                  
                  // 2. Smart Formatting: Dates
                  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
                    displayValue = new Date(value).toLocaleString('ar-SA');
                  }
                  
                  // 3. Smart Formatting: Images & Status
                  if (key === 'status') {
                    displayValue = <StatusBadge status={value} />;
                  } else if (typeof value === 'string' && (value.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|pdf)$/i) || value.includes('uploads/') || value.startsWith('http'))) {
                    isPreview = true;
                    const isPdf = value.toLowerCase().endsWith('.pdf') || value.toLowerCase().includes('.pdf?');
                    displayValue = (
                      <a href={resolveUploadUrl(value)} target="_blank" rel="noopener noreferrer" className="block mt-2">
                        {isPdf ? (
                          <div className="inline-flex items-center gap-2 bg-slate-100 text-brand-primary px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors max-w-full">
                            <LuFileText size={18} />
                            <span className="truncate">عرض الملف المرفق (PDF)</span>
                          </div>
                        ) : (
                          <img src={resolveUploadUrl(value)} alt="Attachment" className="max-w-[200px] rounded-xl border-4 border-white shadow-sm hover:scale-105 transition-transform" />
                        )}
                      </a>
                    );
                  }

                  return (
                    <div key={key} className={`flex flex-col border-b border-slate-100 pb-3 last:border-0 md:last:border-b-0 ${isPreview ? 'md:col-span-2' : ''}`}>
                      <span className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest mb-1">{FIELD_TRANSLATIONS[key] || key}</span>
                      <div className="text-sm font-bold text-slate-800 break-all">{displayValue}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Status Actions (If record has a status) */}
            {selectedRecord.status && (
              <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">تحديث الحالة السريع:</span>
                <div className="flex gap-2 w-full sm:w-auto">
                  <PermissionGate anyOf={[P.USERS_WRITE]}>
                    <button 
                      onClick={() => handleQuickStatusChange('APPROVED')}
                      className="flex-1 sm:flex-none btn bg-emerald-50 text-emerald-600 hover:bg-emerald-100 !rounded-xl !py-2 !text-xs"
                    >
                      موافقة / اعتماد
                    </button>
                    <button 
                      onClick={() => handleQuickStatusChange('REJECTED')}
                      className="flex-1 sm:flex-none btn bg-red-50 text-red-600 hover:bg-red-100 !rounded-xl !py-2 !text-xs"
                    >
                      رفض / إلغاء
                    </button>
                  </PermissionGate>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
               <button type="button" className="btn bg-slate-100 text-slate-600 hover:bg-slate-200 !rounded-2xl px-8" onClick={() => setViewModalOpen(false)}>إغلاق</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Universal Edit Modal */}
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="تعديل السجل">
        {selectedRecord && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {Object.entries(selectedRecord).map(([key, value]) => {
              // Hide Technical Keys
              const IGNORED_KEYS = ['id', 'userId', 'vehicleId', 'shiftId', 'createdById', 'createdAt', 'updatedAt', 'deletedAt', 'platformAccountId', 'supervisorId', 'cityId'];
              if (IGNORED_KEYS.includes(key) || (typeof value === 'object' && value !== null)) return null;

              return (
                <div key={key} className="space-y-2">
                  <label className="text-[0.65rem] font-black text-slate-700 uppercase tracking-widest">{FIELD_TRANSLATIONS[key] || key}</label>
                  
                  {key === 'status' ? (
                    <select
                      className="bg-slate-50 border border-slate-200 text-slate-800 text-start w-full rounded-xl p-3 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                      value={value}
                      onChange={(e) => setSelectedRecord({ ...selectedRecord, [key]: e.target.value })}
                    >
                      {(TAB_STATUS_MAPPINGS[tab] || ['PENDING', 'APPROVED', 'REJECTED']).map((statusOption) => (
                        <option key={statusOption} value={statusOption}>
                          {STATUS_TRANSLATIONS[statusOption] || statusOption}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input 
                      className="bg-slate-50 border border-slate-200 text-slate-800 text-start w-full rounded-xl p-3 focus:ring-2 focus:ring-brand-primary outline-none transition-all" 
                      value={value || ''}
                      onChange={(e) => setSelectedRecord({ ...selectedRecord, [key]: e.target.value })}
                    />
                  )}
                </div>
              );
            })}
            <div className="flex gap-3 pt-6">
              <button type="submit" className="flex-1 bg-brand-primary hover:bg-brand-hover text-white font-bold py-3 px-4 rounded-xl shadow-premium hover:shadow-premium-hover transition-all">حفظ التعديلات</button>
              <button type="button" className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 px-4 rounded-xl transition-all" onClick={() => setEditModalOpen(false)}>إلغاء</button>
            </div>
          </form>
        )}
      </Modal>

      {/* Universal Create Modal */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title={`إضافة ${TABS.find(t => t.id === tab)?.label} جديد`}>
        <form onSubmit={handleCreateSubmit} className="space-y-4">
           {tab === 'documents' && (
             <>
               <div className="space-y-1">
                 <label className="text-xs font-black text-slate-500 uppercase">نوع المستند</label>
                 <select className="form-input !rounded-xl" value={createForm.type} onChange={e => setCreateForm({...createForm, type: e.target.value})}>
                    <option value="NATIONAL_ID">هوية وطنية</option>
                    <option value="IQAMA">إقامة</option>
                    <option value="PASSPORT">جواز سفر</option>
                    <option value="WORK_CONTRACT">عقد عمل</option>
                    <option value="OTHER">آخر</option>
                 </select>
               </div>
               <div className="space-y-1">
                 <label className="text-xs font-black text-slate-500 uppercase">العنوان / المسمى</label>
                 <input className="form-input !rounded-xl" value={createForm.title} onChange={e => setCreateForm({...createForm, title: e.target.value})} required placeholder="مثال: صورة الهوية"/>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                   <label className="text-xs font-black text-slate-500 uppercase">تاريخ الإصدار</label>
                   <input type="date" className="form-input !rounded-xl" value={createForm.issueDate} onChange={e => setCreateForm({...createForm, issueDate: e.target.value})}/>
                 </div>
                 <div className="space-y-1">
                   <label className="text-xs font-black text-slate-500 uppercase">تاريخ الانتهاء</label>
                   <input type="date" className="form-input !rounded-xl" value={createForm.expiryDate} onChange={e => setCreateForm({...createForm, expiryDate: e.target.value})}/>
                 </div>
               </div>
             </>
           )}

           {tab === 'licenses' && (
             <>
               <div className="space-y-1">
                 <label className="text-xs font-black text-slate-500 uppercase">نوع الرخصة</label>
                 <select className="form-input !rounded-xl" value={createForm.type} onChange={e => setCreateForm({...createForm, type: e.target.value})}>
                    <option value="DRIVING_LICENSE">رخصة قيادة</option>
                    <option value="TRANSPORT_LICENSE">بطاقة تشغيل</option>
                    <option value="MEDICAL_CERTIFICATE">شهادة صحية</option>
                    <option value="OTHER_CERTIFICATE">أخرى</option>
                 </select>
               </div>
               <div className="space-y-1">
                 <label className="text-xs font-black text-slate-500 uppercase">المسمى</label>
                 <input className="form-input !rounded-xl" value={createForm.title} onChange={e => setCreateForm({...createForm, title: e.target.value})} required placeholder="مثال: رخصة عمومي"/>
               </div>
               <div className="space-y-1">
                 <label className="text-xs font-black text-slate-500 uppercase">رقم الرخصة</label>
                 <input className="form-input !rounded-xl" value={createForm.licenseNumber} onChange={e => setCreateForm({...createForm, licenseNumber: e.target.value})}/>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                   <label className="text-xs font-black text-slate-500 uppercase">تاريخ الإصدار</label>
                   <input type="date" className="form-input !rounded-xl" value={createForm.issueDate} onChange={e => setCreateForm({...createForm, issueDate: e.target.value})}/>
                 </div>
                 <div className="space-y-1">
                   <label className="text-xs font-black text-slate-500 uppercase">تاريخ الانتهاء</label>
                   <input type="date" className="form-input !rounded-xl" value={createForm.expiryDate} onChange={e => setCreateForm({...createForm, expiryDate: e.target.value})}/>
                 </div>
               </div>
             </>
           )}

           {tab === 'fuel' && (
             <>
               <div className="space-y-1">
                 <label className="text-xs font-black text-slate-500 uppercase">المبلغ</label>
                 <input type="number" className="form-input !rounded-xl" value={createForm.amount} onChange={e => setCreateForm({...createForm, amount: parseFloat(e.target.value)})}/>
               </div>
               <div className="space-y-1">
                 <label className="text-xs font-black text-slate-500 uppercase">اللترات</label>
                 <input type="number" className="form-input !rounded-xl" value={createForm.liters} onChange={e => setCreateForm({...createForm, liters: parseFloat(e.target.value)})}/>
               </div>
               <div className="space-y-1">
                 <label className="text-xs font-black text-slate-500 uppercase">التاريخ</label>
                 <input type="date" className="form-input !rounded-xl" value={createForm.fuelDate} onChange={e => setCreateForm({...createForm, fuelDate: e.target.value})}/>
               </div>
             </>
           )}

           {tab === 'violations' && (
             <>
               <div className="space-y-1">
                 <label className="text-xs font-black text-slate-500 uppercase">السبب / نوع المخالفة</label>
                 <input className="form-input !rounded-xl" value={createForm.reason} onChange={e => setCreateForm({...createForm, reason: e.target.value})} required />
               </div>
               <div className="space-y-1">
                 <label className="text-xs font-black text-slate-500 uppercase">المبلغ</label>
                 <input type="number" className="form-input !rounded-xl" value={createForm.amount} onChange={e => setCreateForm({...createForm, amount: parseFloat(e.target.value)})}/>
               </div>
               <div className="space-y-1">
                 <label className="text-xs font-black text-slate-500 uppercase">تاريخ المخالفة</label>
                 <input type="date" className="form-input !rounded-xl" value={createForm.violationDate} onChange={e => setCreateForm({...createForm, violationDate: e.target.value})}/>
               </div>
             </>
           )}

           {tab === 'maintenance' && (
             <>
               <div className="space-y-1">
                 <label className="text-xs font-black text-slate-500 uppercase">نوع العطل</label>
                 <select className="form-input !rounded-xl" value={createForm.issueType} onChange={e => setCreateForm({...createForm, issueType: e.target.value})}>
                    <option value="MECHANICAL">ميكانيكي</option>
                    <option value="ELECTRICAL">كهربائي</option>
                    <option value="ACCIDENT">حادث</option>
                    <option value="TIRES">إطارات</option>
                    <option value="OIL">تغيير زيت</option>
                    <option value="OTHER">أخرى</option>
                 </select>
               </div>
               <div className="space-y-1">
                 <label className="text-xs font-black text-slate-500 uppercase">الأولوية</label>
                 <select className="form-input !rounded-xl" value={createForm.priority} onChange={e => setCreateForm({...createForm, priority: e.target.value})}>
                    <option value="LOW">منخفضة</option>
                    <option value="MEDIUM">متوسطة</option>
                    <option value="HIGH">عالية</option>
                    <option value="URGENT">طارئة</option>
                 </select>
               </div>
               <div className="space-y-1">
                 <label className="text-xs font-black text-slate-500 uppercase">الوصف</label>
                 <textarea className="form-input !rounded-xl min-h-[80px]" value={createForm.description} onChange={e => setCreateForm({...createForm, description: e.target.value})} required />
               </div>
             </>
           )}

           {tab === 'penalties' && (
             <>
               <div className="space-y-1">
                 <label className="text-xs font-black text-slate-500 uppercase">نوع الجزاء</label>
                 <select className="form-input !rounded-xl" value={createForm.type} onChange={e => setCreateForm({...createForm, type: e.target.value})}>
                    <option value="FINANCIAL">مالي (خصم)</option>
                    <option value="WARNING">إنذار خطي</option>
                    <option value="SUSPENSION">إيقاف مؤقت</option>
                    <option value="TERMINATION">فصل من الخدمة</option>
                    <option value="ASSET_DAMAGE">تلف أصول</option>
                    <option value="MISCONDUCT">سوء سلوك</option>
                    <option value="OTHER">آخر</option>
                 </select>
               </div>
               <div className="space-y-1">
                 <label className="text-xs font-black text-slate-500 uppercase">المبلغ (إن وجد)</label>
                 <input type="number" className="form-input !rounded-xl" value={createForm.amount} onChange={e => setCreateForm({...createForm, amount: parseFloat(e.target.value)})}/>
               </div>
               <div className="space-y-1">
                 <label className="text-xs font-black text-slate-500 uppercase">تاريخ الجزاء</label>
                 <input type="date" className="form-input !rounded-xl" value={createForm.penaltyDate} onChange={e => setCreateForm({...createForm, penaltyDate: e.target.value})}/>
               </div>
               <div className="space-y-1">
                 <label className="text-xs font-black text-slate-500 uppercase">السبب (مطلوب)</label>
                 <textarea className="form-input !rounded-xl min-h-[80px]" value={createForm.reason} onChange={e => setCreateForm({...createForm, reason: e.target.value})} required />
               </div>
             </>
           )}

           {tab === 'rewards' && (
             <>
               <div className="space-y-1">
                 <label className="text-xs font-black text-slate-500 uppercase">التصنيف</label>
                 <select className="form-input !rounded-xl" value={createForm.category} onChange={e => setCreateForm({...createForm, category: e.target.value})}>
                    <option value="PERFORMANCE">الأداء المتميز</option>
                    <option value="SAFETY">الالتزام بالسلامة</option>
                    <option value="LOYALTY">الولاء للشركة</option>
                    <option value="OTHER">آخر</option>
                 </select>
               </div>
               <div className="space-y-1">
                 <label className="text-xs font-black text-slate-500 uppercase">المبلغ</label>
                 <input type="number" className="form-input !rounded-xl" value={createForm.amount} onChange={e => setCreateForm({...createForm, amount: parseFloat(e.target.value)})}/>
               </div>
               <div className="space-y-1">
                 <label className="text-xs font-black text-slate-500 uppercase">السبب (مطلوب)</label>
                 <textarea className="form-input !rounded-xl min-h-[80px]" value={createForm.reason} onChange={e => setCreateForm({...createForm, reason: e.target.value})} required />
               </div>
             </>
           )}

           {tab === 'investigations' && (
             <>
               <div className="space-y-1">
                 <label className="text-xs font-black text-slate-500 uppercase">عنوان التحقيق</label>
                 <input className="form-input !rounded-xl" value={createForm.title} onChange={e => setCreateForm({...createForm, title: e.target.value})} placeholder="مثال: حادث مروري، فقدان عهدة..."/>
               </div>
               <div className="space-y-1">
                 <label className="text-xs font-black text-slate-500 uppercase">التصنيف</label>
                 <input className="form-input !rounded-xl" value={createForm.category} onChange={e => setCreateForm({...createForm, category: e.target.value})} placeholder="مثال: أمني، إداري..."/>
               </div>
               <div className="space-y-1">
                 <label className="text-xs font-black text-slate-500 uppercase">التفاصيل</label>
                 <textarea className="form-input !rounded-xl min-h-[120px]" value={createForm.details} onChange={e => setCreateForm({...createForm, details: e.target.value})} />
               </div>
             </>
           )}

           {tab === 'leaves' && (
             <>
               <div className="space-y-1">
                 <label className="text-xs font-black text-slate-500 uppercase">نوع الإجازة</label>
                 <select className="form-input !rounded-xl" value={createForm.leaveType} onChange={e => setCreateForm({...createForm, leaveType: e.target.value})}>
                    <option value="ANNUAL">سنوية</option>
                    <option value="SICK">مرضية</option>
                    <option value="EMERGENCY">اضطرارية</option>
                    <option value="UNPAID">بدون راتب</option>
                 </select>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                   <label className="text-xs font-black text-slate-500 uppercase">تاريخ البدء</label>
                   <input type="date" className="form-input !rounded-xl" value={createForm.startDate} onChange={e => setCreateForm({...createForm, startDate: e.target.value})}/>
                 </div>
                 <div className="space-y-1">
                   <label className="text-xs font-black text-slate-500 uppercase">تاريخ الانتهاء</label>
                   <input type="date" className="form-input !rounded-xl" value={createForm.endDate} onChange={e => setCreateForm({...createForm, endDate: e.target.value})}/>
                 </div>
               </div>
                 <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase">السبب (مطلوب)</label>
                    <textarea className="form-input !rounded-xl min-h-[80px]" value={createForm.reason} onChange={e => setCreateForm({...createForm, reason: e.target.value})} required />
                  </div>
             </>
           )}

           {tab === 'salary' && (
             <>
               <div className="space-y-1">
                 <label className="text-xs font-black text-slate-500 uppercase">المبلغ المطلوب</label>
                 <input type="number" className="form-input !rounded-xl" value={createForm.amount} onChange={e => setCreateForm({...createForm, amount: parseFloat(e.target.value)})}/>
               </div>
               <div className="space-y-1">
                 <label className="text-xs font-black text-slate-500 uppercase">السبب (مطلوب)</label>
                 <textarea className="form-input !rounded-xl min-h-[80px]" value={createForm.reason} onChange={e => setCreateForm({...createForm, reason: e.target.value})} required />
               </div>
             </>
           )}

           {['documents', 'licenses', 'fuel', 'leaves', 'maintenance'].includes(tab) && (
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 uppercase">إرفاق صورة / ملف</label>
                <div className="flex flex-col gap-2">
                  <input 
                    type="file" 
                    className="hidden" 
                    id="attachment-upload"
                    onChange={e => setFileAttachment(e.target.files[0])}
                  />
                  <label 
                    htmlFor="attachment-upload"
                    className="flex items-center justify-center gap-3 p-4 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 hover:border-brand-primary transition-all group"
                  >
                    <LuFileText className="text-slate-400 group-hover:text-brand-primary" size={24} />
                    <span className="text-sm font-bold text-slate-500 group-hover:text-brand-primary">
                      {fileAttachment ? fileAttachment.name : 'اضغط لاختيار ملف (صورة أو PDF)'}
                    </span>
                  </label>
                  {fileAttachment && (
                    <button 
                      type="button" 
                      onClick={() => setFileAttachment(null)}
                      className="text-[0.65rem] font-black text-red-500 hover:underline w-fit"
                    >
                      حذف الملف المختار
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Add buttons */}
            <div className="flex gap-3 pt-6">
               <button type="submit" className="flex-1 btn btn-primary !rounded-xl !py-3 justify-center">إتمام الإضافة</button>
               <button type="button" onClick={() => setCreateModalOpen(false)} className="flex-1 btn bg-slate-100 text-slate-500 !rounded-xl !py-3 justify-center">إلغاء</button>
            </div>
        </form>
      </Modal>
    </div>
  );
}

function StatusDropdown({ record, currentTab, onUpdate }) {
  const statuses = TAB_STATUS_MAPPINGS[currentTab] || [];
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (statuses.length === 0 || currentTab === 'assignments') {
    return <StatusBadge status={record.status || (record.isActive ? 'ACTIVE' : 'ENDED')} />;
  }

  return (
    <>
      <div 
        onClick={(e) => { e.stopPropagation(); setIsModalOpen(true); }}
        className="cursor-pointer hover:opacity-80 transition-opacity active:scale-95 inline-block"
      >
        <StatusBadge status={record.status} />
      </div>

      <div onClick={(e) => e.stopPropagation()}>
        <Modal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          title={`تحديث حالة السجل #${record.id}`}
        >
          <div className="space-y-6">
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-center justify-between">
              <div>
                <div className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest mb-1">الحالة الحالية</div>
                <StatusBadge status={record.status} />
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-brand-primary shadow-sm ring-1 ring-slate-100">
                <LuActivity size={24} />
              </div>
            </div>

            {record.conflictingActiveShift && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-xs font-bold flex items-start gap-2">
                <LuTriangleAlert size={16} className="mt-0.5 shrink-0" />
                <div>
                  تنبيه: هذه المركبة مستخدمة حالياً في شفت نشط مع السائق ({record.conflictingActiveShift.driverName}). لا يمكن تفعيل هذا الشفت كـ "نشط" حالياً.
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3">
              <div className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest px-2">اختر الحالة الجديدة</div>
              {statuses.map((s) => (
                <button
                  key={s}
                  disabled={s === record.status}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdate(record.id, s, currentTab);
                    setIsModalOpen(false);
                  }}
                  className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all font-black text-sm ${
                    s === record.status 
                    ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed' 
                    : 'bg-white border-slate-100 text-slate-700 hover:border-brand-primary hover:bg-brand-light/20 hover:text-brand-primary active:scale-95'
                  }`}
                >
                  <div className="flex items-center gap-3">
                     <div className={`w-3 h-3 rounded-full ${s === record.status ? 'bg-slate-300' : 'bg-brand-primary'}`} />
                     <span>{STATUS_TRANSLATIONS[s] || s}</span>
                  </div>
                  {s === record.status && <LuCheck size={18} className="text-emerald-500" />}
                </button>
              ))}
            </div>
            
            <button 
              onClick={(e) => { e.stopPropagation(); setIsModalOpen(false); }}
              className="w-full py-4 rounded-2xl bg-slate-100 text-slate-500 font-black text-sm hover:bg-slate-200 transition-all active:scale-95"
            >
              إلغاء
            </button>
          </div>
        </Modal>
      </div>
    </>
  );
}



function InfoCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="card !p-6 border-none ring-1 ring-slate-200/50 flex items-start gap-4 hover:shadow-premium-hover transition-all group">
      <div className="w-12 h-12 rounded-2xl bg-brand-light text-brand-primary flex items-center justify-center shadow-sm ring-1 ring-brand-primary/10 group-hover:scale-110 transition-transform">
         <Icon size={24} />
      </div>
      <div>
         <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{label}</div>
         <div className="text-lg font-black text-slate-800 leading-tight mb-1">{value || '—'}</div>
         <div className="text-[0.7rem] font-bold text-slate-400 tracking-tight">{sub}</div>
      </div>
    </div>
  );
}
