import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { apiService } from '../../services/api';
import StatusBadge from '../../components/ui/StatusBadge';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';
import { 
  LuArrowRight, LuUser, LuFileText, LuShield, LuClock, 
  LuFuel, LuTriangleAlert, LuCircleAlert, LuWrench, LuMapPin, LuChevronLeft,
  LuMap, LuEye, LuPen, LuActivity, LuInfo, LuUserPlus, LuUserMinus, LuCheck
} from 'react-icons/lu';
import { hasAnyPermission, PERMISSIONS as P } from '../../utils/rolePermissions';
import PermissionGate from '../../components/auth/PermissionGate';
import VehicleLiveMap from './VehicleLiveMap';
import AssignVehicleModal from './AssignVehicleModal';

const FIELD_TRANSLATIONS = {
  status: 'الحالة',
  amount: 'المبلغ',
  reason: 'السبب',
  createdAt: 'تاريخ الإنشاء',
  updatedAt: 'تاريخ التحديث',
  title: 'العنوان',
  details: 'التفاصيل',
  category: 'التصنيف',
  type: 'النوع',
  expiryDate: 'تاريخ الانتهاء',
  violationDate: 'تاريخ المخالفة',
  fuelDate: 'تاريخ التعبئة',
  issueType: 'نوع العطل',
  priority: 'الأولوية',
  startDate: 'تاريخ البدء',
  endDate: 'تاريخ الانتهاء',
  notes: 'ملاحظات',
  description: 'الوصف',
  cost: 'التكلفة',
  odometerReading: 'قراءة العداد',
  liters: 'اللترات',
  plateNumber: 'رقم اللوحة',
  manufacturer: 'المصنع',
  model: 'الموديل',
  year: 'السنة',
  color: 'اللون',
  tankCapacity: 'سعة الخزان',
  fuelType: 'نوع الوقود',
  ownershipStatus: 'حالة الملكية',
  adminNotes: 'ملاحظات الإدارة',
  technicianNotes: 'ملاحظات الفني',
  completedAt: 'تاريخ الإكمال',
  issueDate: 'تاريخ الإصدار',
  licenseNumber: 'رقم الرخصة',
  discountAmount: 'مبلغ الخصم',
  orderRef: 'رقم الطلب',
  platformName: 'اسم المنصة',
  user: 'السائق',
  vehicle: 'المركبة',
  shift: 'الشفت',
  photoUrl: 'الصورة المرفقة',
  appUserId: 'معرف المستخدم',
  userId: 'المستخدم',
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
  CONFIRMED: 'مؤكدة',
  DISMISSED: 'مستبعدة',
  PENALIZED: 'تمت المعاقبة',
  IN_MAINTENANCE: 'في الصيانة',
  OUT_OF_SERVICE: 'خارج الخدمة',
  RESERVED: 'محجوزة',
  DECOMMISSIONED: 'مستبعدة (خارج الخدمة)',
  PENDING_VERIFICATION: 'بانتظار التحقق',
  PENDING_REPLACEMENT: 'بانتظار الاستبدال',
  COMPANY_OWNED: 'ملك للشركة',
  DRIVER_OWNED: 'ملك للسائق',
  LEASED: 'منتهي بالتمليك',
  RENTED: 'إيجار',
};

const TAB_STATUS_MAPPINGS = {
  overview: ['ACTIVE', 'IN_MAINTENANCE', 'OUT_OF_SERVICE', 'RESERVED', 'DECOMMISSIONED', 'PENDING_VERIFICATION', 'PENDING_REPLACEMENT'],
  documents: ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'],
  fuel: ['PENDING', 'APPROVED', 'REJECTED'],
  violations: ['REPORTED', 'UNDER_REVIEW', 'CONFIRMED', 'DISMISSED', 'PENALIZED'],
  maintenance: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  assignments: ['ACTIVE', 'ENDED'],
};

const TABS = [
  { id: 'overview', label: 'نظرة عامة', icon: LuInfo },
  { id: 'tracking', label: 'التتبع اللحظي', icon: LuMap },
  { id: 'fuel', label: 'سجل الوقود', icon: LuFuel },
  { id: 'maintenance', label: 'الصيانة', icon: LuWrench },
  { id: 'violations', label: 'المخالفات', icon: LuTriangleAlert },
  { id: 'assignments', label: 'تاريخ العهد', icon: LuActivity },
];

export default function VehicleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: authUser } = useSelector((s) => s.auth);
  const canWriteFleet = hasAnyPermission(authUser?.role, [P.FLEET_WRITE]);

  const [tab, setTab] = useState('overview');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tabData, setTabData] = useState([]);
  const [tabLoading, setTabLoading] = useState(false);
  
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  const handleStatusUpdate = async (recId, newStatus, currentTab) => {
    try {
      let endpoint = '';
      let payload = { status: newStatus };

      switch (currentTab) {
        case 'fuel': endpoint = `/fuel-logs/${recId}/review`; break;
        case 'violations': endpoint = `/violations/${recId}/review`; break;
        case 'maintenance': endpoint = `/maintenance-requests/${recId}/status`; break;
        case 'overview': endpoint = `/vehicles/${recId}`; break;
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
    // Smart Navigation Logic
    const TAB_TO_ROUTE = {
      fuel: '/fuel',
      maintenance: '/maintenance-requests',
      violations: '/violations',
      assignments: '/vehicles/assignments', // Note: Check if this exists, but usually we just want to see it here
    };

    if (TAB_TO_ROUTE[tab] && tab !== 'assignments') {
      navigate(`${TAB_TO_ROUTE[tab]}/${record.id}`);
      return;
    }

    setSelectedRecord(record);
    setViewModalOpen(true);
  };

  const handleEdit = (record, e) => {
    e.stopPropagation();
    
    // Sanitize status for the current tab
    const validStatuses = TAB_STATUS_MAPPINGS[tab] || [];
    const sanitizedRecord = { ...record };
    if (sanitizedRecord.status && validStatuses.length > 0 && !validStatuses.includes(sanitizedRecord.status)) {
       sanitizedRecord.status = validStatuses[0]; 
    }
    
    setSelectedRecord(sanitizedRecord);
    setEditModalOpen(true);
  };

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiService.get(`/vehicles/${id}/summary`);
      setSummary(data.data);
    } catch {
      toast.error('تعذر تحميل بيانات المركبة');
      navigate('/vehicles');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  const loadTab = useCallback(async () => {
    if (tab === 'overview' || tab === 'tracking' || !id) return;
    setTabLoading(true);
    try {
      let url = '';
      const q = { vehicleId: parseInt(id), limit: 50, page: 1 };
      switch (tab) {
        case 'fuel': url = '/fuel-logs'; break;
        case 'maintenance': url = '/maintenance-requests'; break;
        case 'violations': url = '/violations'; break;
        case 'assignments': url = '/vehicles/assignments'; break; // Assuming this endpoint exists or filter by vehicleId
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

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRecord) return;
    
    setTabLoading(true);
    try {
      let endpoint = '';
      switch (tab) {
        case 'fuel': endpoint = `/fuel-logs/${selectedRecord.id}`; break;
        case 'violations': endpoint = `/violations/${selectedRecord.id}`; break;
        case 'maintenance': endpoint = `/maintenance-requests/${selectedRecord.id}`; break;
        case 'overview': endpoint = `/vehicles/${selectedRecord.id}`; break;
        default: return;
      }

      const payload = {};
      const IGNORED = ['id', 'userId', 'vehicleId', 'shiftId', 'createdAt', 'updatedAt', 'deletedAt', 'user', 'vehicle', 'platform'];
      Object.entries(selectedRecord).forEach(([key, value]) => {
        if (!IGNORED.includes(key) && value !== null && typeof value !== 'object') {
          payload[key] = value;
        }
      });
      
      await apiService.patch(endpoint, payload);
      toast.success('تم حفظ التعديلات');
      setEditModalOpen(false);
      loadTab();
      loadSummary();
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل التعديل');
    } finally {
      setTabLoading(false);
    }
  };

  const handleQuickStatusChange = async (newStatus) => {
    if (!selectedRecord) return;
    try {
      let endpoint = '';
      switch (tab) {
        case 'fuel': endpoint = `/fuel-logs/${selectedRecord.id}/review`; break;
        case 'violations': endpoint = `/violations/${selectedRecord.id}/review`; break;
        case 'maintenance': endpoint = `/maintenance-requests/${selectedRecord.id}/status`; break;
        default: endpoint = `/${tab}/${selectedRecord.id}`;
      }
      await apiService.patch(endpoint, { status: newStatus });
      toast.success(`تم التحديث إلى ${newStatus}`);
      setViewModalOpen(false);
      loadTab();
      loadSummary();
    } catch (err) {
      toast.error('فشل تحديث الحالة');
    }
  };

  const handleReleaseDriver = async () => {
    if (!window.confirm('هل أنت متأكد من سحب المركبة من السائق الحالي؟')) return;
    try {
      await apiService.post(`/vehicles/${id}/release-driver`);
      toast.success('تم سحب المركبة بنجاح');
      loadSummary();
    } catch (err) {
      toast.error('فشل سحب المركبة');
    }
  };

  const handleApproveDriverSubmission = async () => {
    if (!window.confirm('الموافقة على طلب مركبة السائق وتفعيلها؟')) return;
    try {
      await apiService.post(`/vehicles/${id}/approve-driver-submission`, {});
      toast.success('تمت الموافقة على المركبة');
      loadSummary();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'فشل الموافقة على الطلب');
    }
  };

  const handleRejectDriverSubmission = async () => {
    const reason = window.prompt('سبب الرفض (اختياري):');
    if (reason === null) return;
    try {
      await apiService.post(`/vehicles/${id}/reject-driver-submission`, { reason: reason || undefined });
      toast.success('تم رفض الطلب');
      loadSummary();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'فشل رفض الطلب');
    }
  };

  if (loading || !summary) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-brand-light border-t-brand-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  const { vehicle, activeDriver, stats } = summary;

  const tabColumns = {
    fuel: [
      { key: 'fuelDate', label: 'التاريخ', render: (v) => new Date(v).toLocaleDateString('ar-SA') },
      { key: 'amount', label: 'المبلغ' },
      { key: 'liters', label: 'اللترات' },
      { key: 'status', label: 'الحالة', render: (_, r) => <StatusDropdown record={r} currentTab="fuel" onUpdate={handleStatusUpdate} /> },
    ],
    maintenance: [
      { key: 'issueType', label: 'النوع' },
      { key: 'priority', label: 'الأولوية' },
      { key: 'status', label: 'الحالة', render: (_, r) => <StatusDropdown record={r} currentTab="maintenance" onUpdate={handleStatusUpdate} /> },
      { key: 'cost', label: 'التكلفة' },
    ],
    violations: [
      { key: 'violationDate', label: 'التاريخ', render: (v) => new Date(v).toLocaleDateString('ar-SA') },
      { key: 'reason', label: 'السبب' },
      { key: 'amount', label: 'الغرامة' },
      { key: 'status', label: 'الحالة', render: (_, r) => <StatusDropdown record={r} currentTab="violations" onUpdate={handleStatusUpdate} /> },
    ],
    assignments: [
      { key: 'user', label: 'السائق', render: (v) => v?.fullNameAr || '—' },
      { key: 'assignedAt', label: 'تاريخ البدء', render: (v) => new Date(v).toLocaleDateString('ar-SA') },
      { key: 'releasedAt', label: 'تاريخ الانتهاء', render: (v) => v ? new Date(v).toLocaleDateString('ar-SA') : 'نشط' },
      { key: 'isActive', label: 'الحالة', render: (v) => <StatusBadge status={v ? 'ACTIVE' : 'ENDED'} /> },
    ],
  };

  return (
    <div className="page-container animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-premium border border-slate-100 mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/vehicles')} className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-brand-primary hover:bg-brand-light transition-all">
            <LuArrowRight size={24} />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-black text-slate-800 tracking-tight">{vehicle.plateNumber}</h1>
              <StatusBadge status={vehicle.status} />
            </div>
            <p className="text-slate-500 font-bold flex items-center gap-2">
              {vehicle.manufacturer} {vehicle.model} ({vehicle.year})
            </p>
          </div>
        </div>
        <div className="flex gap-3 flex-wrap justify-end">
          <PermissionGate anyOf={[P.FLEET_WRITE]}>
            {['PENDING_VERIFICATION', 'PENDING_REPLACEMENT'].includes(vehicle.status) && (
              <>
                <button
                  className="px-6 py-3 rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 font-black text-sm transition-all flex items-center gap-2 active:scale-95"
                  onClick={handleApproveDriverSubmission}
                >
                  <LuCheck size={20} /> الموافقة على الطلب
                </button>
                <button
                  className="px-6 py-3 rounded-2xl bg-red-50 text-red-600 hover:bg-red-100 font-black text-sm transition-all flex items-center gap-2"
                  onClick={handleRejectDriverSubmission}
                >
                  رفض الطلب
                </button>
              </>
            )}
            {activeDriver ? (
              <button 
                className="px-6 py-3 rounded-2xl bg-red-50 text-red-600 hover:bg-red-100 font-black text-sm transition-all flex items-center gap-2 group" 
                onClick={handleReleaseDriver}
              >
                <LuUserMinus size={20} className="group-hover:scale-110 transition-transform" /> سحب المركبة
              </button>
            ) : (
              <button 
                className={`px-6 py-3 rounded-2xl font-black text-sm transition-all flex items-center gap-2 ${
                  vehicle.status === 'ACTIVE' 
                  ? 'bg-brand-primary text-white hover:bg-brand-hover shadow-premium active:scale-95' 
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-70'
                }`}
                onClick={() => vehicle.status === 'ACTIVE' && setAssignModalOpen(true)}
                disabled={vehicle.status !== 'ACTIVE'}
                title={vehicle.status !== 'ACTIVE' ? "لا يمكن تسليم المركبة إلا إذا كانت حالتها 'نشط'" : ""}
              >
                <LuUserPlus size={20} /> تسليم المركبة
              </button>
            )}
            <button 
              className="px-6 py-3 rounded-2xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-black text-sm transition-all flex items-center gap-2 active:scale-95" 
              onClick={() => handleEdit(vehicle, { stopPropagation: () => {} })}
            >
              <LuPen size={20} /> تعديل البيانات
            </button>
          </PermissionGate>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 bg-slate-100/50 p-2 rounded-[2rem] mb-8 w-fit mx-auto border border-slate-200/50">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-[1.5rem] text-sm font-black transition-all ${
              tab === t.id ? 'bg-white text-brand-primary shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:bg-white/50 hover:text-slate-700'
            }`}
          >
            <t.icon size={18} /> {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {tab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoCard icon={LuFuel} label="تكلفة الوقود" value={`${stats.totalFuelCost} ر.س`} sub={`${stats.totalFuelLiters} لتر`} />
                <InfoCard icon={LuTriangleAlert} label="المخالفات" value={`${stats.totalViolationFees} ر.س`} sub={`${stats.violationCount} مخالفة`} />
                <InfoCard icon={LuActivity} label="تغيير الزيت" value={`${stats.nextOilChangeAt || '—'} كم`} sub="الموعد القادم" />
                <InfoCard icon={LuClock} label="العهد" value={stats.totalAssignments} sub="إجمالي الحركات" />
              </div>

              {/* Active Driver Widget */}
              <div className="bg-white rounded-3xl p-8 shadow-premium border border-slate-100 relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-brand-light/20 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-brand-primary/10 transition-colors" />
                 <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                    <LuUser className="text-brand-primary" /> السائق الحالي
                 </h3>
                 {activeDriver ? (
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-xl ring-1 ring-slate-200">
                          {activeDriver.fullNameAr?.charAt(0)}
                        </div>
                        <div>
                           <div className="text-xl font-black text-slate-800">{activeDriver.fullNameAr}</div>
                           <div className="text-sm text-slate-500 font-bold">{activeDriver.mobileNumber || '—'}</div>
                        </div>
                      </div>
                      <Link to={`/drivers/${activeDriver.id}`} className="btn-primary !py-3 !px-6 !rounded-xl flex items-center gap-2">
                        ملف السائق <LuChevronLeft size={18} />
                      </Link>
                   </div>
                 ) : (
                   <div className="text-center py-6">
                      <div className="text-slate-400 font-bold">المركبة غير مستخدمة حالياً</div>
                   </div>
                 )}
              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-white rounded-3xl p-8 shadow-premium border border-slate-100">
                <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                   <LuInfo className="text-brand-primary" /> تفاصيل المركبة
                </h3>
                <div className="space-y-4">
                   <DetailRow label="رقم اللوحة" value={vehicle.plateNumber} />
                   <DetailRow label="الشركة المصنعة" value={vehicle.manufacturer} />
                   <DetailRow label="الموديل" value={vehicle.model} />
                   <DetailRow label="سنة الصنع" value={vehicle.year} />
                   <DetailRow label="العداد الحالي" value={`${vehicle.odometerKm || 0} كم`} />
                   <DetailRow label="نوع الوقود" value={vehicle.fuelType} />
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'tracking' && (
          <VehicleLiveMap activeShiftId={summary.activeShiftId} vehicle={vehicle} activeDriver={activeDriver} />
        )}

        {tab !== 'overview' && tab !== 'tracking' && (
          <div className="bg-white rounded-[2.5rem] shadow-premium border border-slate-100 overflow-hidden">
              <DataTable 
                columns={[...tabColumns[tab], { key: 'actions', label: 'إجراءات', render: (_, r) => (
                  <div className="flex gap-2">
                     <button onClick={() => handleView(r)} className="p-2 text-slate-400 hover:text-brand-primary hover:bg-brand-light rounded-lg transition-all"><LuEye size={18}/></button>
                     <PermissionGate anyOf={[P.FLEET_WRITE]}>
                       <button onClick={(e) => handleEdit(r, e)} className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"><LuPen size={18}/></button>
                     </PermissionGate>
                  </div>
                )}]} 
                data={tabData} 
                isLoading={tabLoading}
                onRowClick={handleView}
              />
          </div>
        )}
      </div>

      {/* Modals */}
      <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} title="تفاصيل السجل">
         {selectedRecord && (
           <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(selectedRecord).map(([key, value]) => {
                  const IGNORED = ['id', 'userId', 'vehicleId', 'shiftId', 'createdAt', 'updatedAt', 'deletedAt', 'platformAccountId', 'supervisorId', 'cityId', 'appUserId'];
                  
                  // Handle Objects (like user, vehicle, platform)
                  let displayValue = value;
                  let isPreview = false;

                  if (typeof value === 'object' && value !== null) {
                    // Try to find a displayable field in the object
                    displayValue = value.fullNameAr || value.plateNumber || value.nameAr || value.username || value.title || null;
                    if (!displayValue) return null; // Still hide complex objects if no display field found
                  } else if (IGNORED.includes(key)) {
                    return null;
                  } else if (value === null || value === undefined) {
                    displayValue = '—';
                  } else {
                    displayValue = String(value);
                  }

                  // Smart Formatting: Dates
                  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
                    displayValue = new Date(value).toLocaleString('ar-SA');
                  }

                  // Smart Formatting: Images & Status
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
                    <div key={key} className={`p-4 bg-slate-50 rounded-2xl ring-1 ring-slate-100 ${isPreview ? 'col-span-2' : ''}`}>
                       <label className="text-[0.6rem] font-black text-slate-400 uppercase tracking-widest block mb-1">{FIELD_TRANSLATIONS[key] || key}</label>
                       <div className="text-sm font-black text-slate-800 break-all">
                          {displayValue}
                       </div>
                    </div>
                  );
                })}
              </div>
              {selectedRecord.status === 'PENDING' && (
                <div className="flex gap-3 pt-6 border-t border-slate-100">
                   <PermissionGate anyOf={[P.FLEET_WRITE]}>
                     <button onClick={() => handleQuickStatusChange('APPROVED')} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-all">موافقة</button>
                     <button onClick={() => handleQuickStatusChange('REJECTED')} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-all">رفض</button>
                   </PermissionGate>
                </div>
              )}
           </div>
         )}
      </Modal>

      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="تعديل السجل">
         {selectedRecord && (
           <form onSubmit={handleEditSubmit} className="space-y-4">
              {Object.entries(selectedRecord).map(([key, value]) => {
                const IGNORED = ['id', 'userId', 'vehicleId', 'shiftId', 'createdAt', 'updatedAt', 'deletedAt', 'user', 'vehicle', 'platform'];
                if (IGNORED.includes(key) || typeof value === 'object') return null;
                return (
                  <div key={key}>
                    <label className="text-[0.65rem] font-black text-slate-700 uppercase tracking-widest">{FIELD_TRANSLATIONS[key] || key}</label>
                    {key === 'status' || key === 'ownershipStatus' ? (
                      <select 
                        className="bg-slate-50 border border-slate-200 text-slate-800 text-start w-full rounded-xl p-3 focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                        value={value}
                        onChange={(e) => setSelectedRecord({ ...selectedRecord, [key]: e.target.value })}
                      >
                         {key === 'status' 
                           ? (TAB_STATUS_MAPPINGS[tab] || ['PENDING', 'APPROVED', 'REJECTED']).map(s => <option key={s} value={s}>{STATUS_TRANSLATIONS[s] || s}</option>)
                           : ['COMPANY_OWNED', 'DRIVER_OWNED', 'LEASED', 'RENTED'].map(s => <option key={s} value={s}>{STATUS_TRANSLATIONS[s] || s}</option>)
                         }
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
                <button type="submit" className="flex-1 bg-brand-primary hover:bg-brand-hover text-white font-bold py-3 px-4 rounded-xl shadow-premium transition-all">حفظ التعديلات</button>
                <button type="button" className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 px-4 rounded-xl transition-all" onClick={() => setEditModalOpen(false)}>إلغاء</button>
              </div>
           </form>
         )}
      </Modal>

      <AssignVehicleModal 
        isOpen={assignModalOpen} 
        onClose={() => setAssignModalOpen(false)} 
        vehicleId={id}
        onStatusUpdate={loadSummary}
      />
    </div>
  );
}

function StatusDropdown({ record, currentTab, onUpdate }) {
  const statuses = TAB_STATUS_MAPPINGS[currentTab] || [];
  const [open, setOpen] = useState(false);

  if (statuses.length === 0 || currentTab === 'assignments') {
    return <StatusBadge status={record.status || (record.isActive ? 'ACTIVE' : 'ENDED')} />;
  }

  return (
    <div className="relative inline-block" onMouseLeave={() => setOpen(false)}>
      <div 
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="cursor-pointer hover:opacity-80 transition-opacity active:scale-95"
      >
        <StatusBadge status={record.status} />
      </div>

      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-premium border border-slate-100 z-[100] py-1 animate-in fade-in slide-in-from-top-2 duration-200">
          {statuses.map((s) => (
            <button
              key={s}
              disabled={s === record.status}
              onClick={(e) => {
                e.stopPropagation();
                onUpdate(record.id, s, currentTab);
                setOpen(false);
              }}
              className={`w-full text-right px-4 py-2 text-sm font-bold transition-colors flex items-center justify-between ${
                s === record.status ? 'text-slate-300 cursor-default' : 'text-slate-600 hover:bg-slate-50 hover:text-brand-primary'
              }`}
            >
              {STATUS_TRANSLATIONS[s] || s}
              {s === record.status && <LuCheck size={14} className="text-emerald-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-premium flex items-start gap-4 hover:scale-[1.02] transition-all group">
      <div className="w-12 h-12 rounded-2xl bg-brand-light text-brand-primary flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
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

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
      <span className="text-sm font-bold text-slate-400">{label}</span>
      <span className="text-sm font-black text-slate-800">{value || '—'}</span>
    </div>
  );
}
