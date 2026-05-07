import { useCallback, useEffect, useState } from 'react';
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
  LuSearch, LuCalendarOff, LuDollarSign, LuWrench, LuMapPin, LuMail, LuPhone, LuIdCard, LuChevronLeft
} from 'react-icons/lu';
import { resolveUploadUrl } from '../../utils/apiOrigin';
import { hasAnyPermission, PERMISSIONS as P } from '../../utils/rolePermissions';

const TABS = [
  { id: 'overview', label: 'نظرة عامة', icon: LuUser },
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-brand-light border-t-brand-primary rounded-full animate-spin"></div>
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
      <div className="mb-8 overflow-x-auto custom-scrollbar pb-2">
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

      {/* Content Area */}
      <div className="animate-in fade-in zoom-in-95 duration-500">
        {tab === 'overview' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Detailed Stats Cards */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
               <InfoCard icon={LuIdCard} label="بيانات الهوية" value={driver.identityNumber} sub="رقم الهوية الوطنية / الإقامة" />
               <InfoCard icon={LuUser} label="المشرف المباشر" value={driver.supervisor?.fullNameAr || '—'} sub="المسؤول عن المتابعة" />
               
               <div className="card !p-8 border-none ring-1 ring-slate-200/50 md:col-span-2">
                  <h3 className="text-lg font-black text-slate-800 mb-6">إحصائيات الملف الرقمي</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                    {[
                      { label: 'المستندات', n: counts.documents, color: 'text-blue-600', bg: 'bg-blue-50' },
                      { label: 'الرخص', n: counts.licenses, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                      { label: 'الشفتات', n: counts.shifts, color: 'text-orange-600', bg: 'bg-orange-50' },
                      { label: 'المخالفات', n: counts.violations, color: 'text-red-600', bg: 'bg-red-50' },
                    ].map((item) => (
                      <div key={item.label} className={`${item.bg} rounded-3xl p-5 text-center transition-transform hover:-translate-y-1`}>
                        <div className={`text-2xl font-black ${item.color} mb-1`}>{item.n ?? 0}</div>
                        <div className="text-[0.65rem] font-black text-slate-800 uppercase tracking-widest">{item.label}</div>
                      </div>
                    ))}
                  </div>
               </div>
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
          <div className="bg-white rounded-3xl shadow-premium border border-slate-100 overflow-hidden">
            <DataTable
              columns={tabColumns[tab] || []}
              data={tabData}
              loading={tabLoading}
              emptyMessage="لا توجد سجلات متاحة في هذا التصنيف حالياً"
              onRowClick={() => {}} // Keep default behavior or customize
            />
          </div>
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
    </div>
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
