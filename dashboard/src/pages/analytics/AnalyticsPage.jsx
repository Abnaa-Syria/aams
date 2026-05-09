import { useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import KpiCard from '../../components/ui/KpiCard';
import { 
  LuFuel, LuBan, LuFileText, LuActivity, LuTrendingUp, 
  LuTriangleAlert, LuTruck, LuUsers, LuWallet, LuShieldAlert,
  LuWrench, LuStethoscope, LuSiren, LuTimer, LuStar, LuClipboardList, LuGift
} from 'react-icons/lu';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';

const COLORS = {
  ACTIVE: '#10b981',
  IN_MAINTENANCE: '#f59e0b',
  OUT_OF_SERVICE: '#ef4444',
  DECOMMISSIONED: '#64748b',
  RESERVED: '#8b5cf6',
  primary: '#3b82f6',
  secondary: '#6366f1',
  danger: '#ef4444',
  warning: '#f59e0b',
  success: '#10b981',
};

const STATUS_MAP = {
  ACTIVE: 'نشط',
  IN_MAINTENANCE: 'في الصيانة',
  OUT_OF_SERVICE: 'خارج الخدمة',
  DECOMMISSIONED: 'منسق',
  RESERVED: 'محجوز',
  ON_DUTY: 'على رأس العمل',
  ON_LEAVE: 'في إجازة',
  OFF_DUTY: 'خارج المناوبة',
  SUSPENDED: 'موقوف',
};

const INCIDENT_TYPE_MAP = {
  ACCIDENT: { label: 'حادث مروري', icon: LuSiren, color: 'text-red-500', bg: 'bg-red-50' },
  BREAKDOWN: { label: 'عطل ميكانيكي', icon: LuWrench, color: 'text-orange-500', bg: 'bg-orange-50' },
  MEDICAL: { label: 'حالة طبية', icon: LuStethoscope, color: 'text-blue-500', bg: 'bg-blue-50' },
  LARGE_ORDER: { label: 'طلب كبير', icon: LuTrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  OTHER: { label: 'أخرى', icon: LuActivity, color: 'text-slate-500', bg: 'bg-slate-50' },
};

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      const response = await apiService.get('/reports/dashboard-overview');
      setData(response.data.data);
    } catch (error) {
      console.error('Failed to load dashboard analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading) return (
    <div className="page-container p-8 space-y-8 animate-pulse">
      <div className="h-12 w-1/3 bg-slate-200 rounded-xl mb-10"></div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-slate-100 rounded-2xl"></div>)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="h-[400px] bg-slate-100 rounded-2xl"></div>
        <div className="h-[400px] bg-slate-100 rounded-2xl"></div>
      </div>
    </div>
  );

  if (!data) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
      <LuTriangleAlert size={48} className="mb-4 text-slate-300" />
      <p className="text-xl font-bold">لا توجد بيانات متاحة حالياً</p>
    </div>
  );

  const fleetChartData = data.fleetStatus.map(item => ({
    name: STATUS_MAP[item.status] || item.status,
    value: item.count,
    color: COLORS[item.status] || '#cbd5e1'
  }));

  const platformChartData = data.platformPerformance.slice(0, 8);

  return (
    <div className="page-container bg-slate-50 min-h-screen animate-in fade-in duration-700 pb-20">
      {/* Header Section */}
      <div className="flex justify-between items-center flex-wrap gap-4 mb-10">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">مركز القيادة والتحكم الشامل</h2>
          <p className="text-slate-500 text-[0.95rem] font-medium flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            تحليلات فورية وشاملة لجميع جوانب العمليات، الموارد البشرية، والأسطول.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={loadDashboardData} className="btn bg-white border border-slate-200 shadow-sm hover:bg-slate-50 text-slate-700 !rounded-xl px-5 py-2.5 font-bold flex items-center gap-2 transition-all active:scale-95">
            <LuActivity size={18} className="text-brand-primary" />
            تحديث البيانات
          </button>
        </div>
      </div>

      {/* Row 1: The Pulse (Top KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="card bg-white shadow-premium rounded-3xl p-6 border-none ring-1 ring-slate-100 group hover:-translate-y-1 transition-all duration-300">
           <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                <LuTimer size={24} />
              </div>
              <span className="text-[0.65rem] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-widest">مباشر</span>
           </div>
           <div className="text-3xl font-black text-slate-900 mb-1">{data.liveOps.activeShifts}</div>
           <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">شفتات نشطة حالياً</div>
        </div>

        <div className="card bg-white shadow-premium rounded-3xl p-6 border-none ring-1 ring-slate-100 group hover:-translate-y-1 transition-all duration-300">
           <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                <LuTrendingUp size={24} />
              </div>
              <span className="text-[0.65rem] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-widest">الطلبات</span>
           </div>
           <div className="text-3xl font-black text-slate-900 mb-1">{data.totalOrders.toLocaleString()}</div>
           <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">إجمالي الطلبات</div>
        </div>

        <div className="card bg-white shadow-premium rounded-3xl p-6 border-none ring-1 ring-slate-100 group hover:-translate-y-1 transition-all duration-300">
           <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                <LuFuel size={24} />
              </div>
              <span className="text-[0.65rem] font-black text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full uppercase tracking-widest">الوقود</span>
           </div>
           <div className="text-3xl font-black text-slate-900 mb-1">{data.financials.fuel.toLocaleString()} <span className="text-sm font-medium">ر.س</span></div>
           <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">تكلفة الوقود</div>
        </div>

        <div className="card bg-white shadow-premium rounded-3xl p-6 border-none ring-1 ring-slate-100 group hover:-translate-y-1 transition-all duration-300">
           <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                <LuStar size={24} />
              </div>
              <span className="text-[0.65rem] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-widest">الأداء</span>
           </div>
           <div className="text-3xl font-black text-slate-900 mb-1">{data.performance.averageRating.toFixed(1)} <span className="text-sm">/ 5</span></div>
           <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">متوسط تقييم السائقين</div>
        </div>
      </div>

      {/* Row 2: Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        <div className="card bg-white shadow-premium rounded-3xl p-8 border-none ring-1 ring-slate-100">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <LuTrendingUp className="text-blue-500" />
              أداء المنصات
            </h3>
            <span className="text-xs font-bold text-slate-400">إجمالي الطلبات لكل تطبيق</span>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={platformChartData} layout="vertical" margin={{ left: 20, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="platform" 
                  type="category" 
                  tick={{ fontSize: 12, fontWeight: 700, fill: '#64748b' }} 
                  width={100}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                />
                <Bar dataKey="orders" fill={COLORS.primary} radius={[0, 8, 8, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card bg-white shadow-premium rounded-3xl p-8 border-none ring-1 ring-slate-100">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <LuTruck className="text-emerald-500" />
              توزيع حالة الأسطول
            </h3>
            <span className="text-xs font-bold text-slate-400">تحليل حالة جميع المركبات</span>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={fleetChartData}
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                >
                  {fleetChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend 
                  verticalAlign="bottom" 
                  align="center"
                  iconType="circle"
                  formatter={(value) => <span className="text-xs font-bold text-slate-600 ml-2">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Compliance & Risk */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        <div className="card bg-white shadow-premium rounded-3xl p-8 border-none ring-1 ring-slate-100">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black text-slate-800">المستندات المنتهية قريباً</h3>
            <span className="text-[0.65rem] font-black text-orange-600 bg-orange-50 px-3 py-1 rounded-full uppercase tracking-widest ring-1 ring-orange-100">تنبيه انتهاء</span>
          </div>
          <div className="grid grid-cols-2 gap-6">
             <div className="bg-orange-50/50 rounded-3xl p-6 text-center border border-orange-100 hover:-translate-y-1 transition-transform group">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-orange-600 mx-auto mb-4 shadow-sm group-hover:scale-110 transition-transform">
                   <LuFileText size={24} />
                </div>
                <div className="text-3xl font-black text-orange-600 mb-1">{data.alerts.expiringDocuments}</div>
                <div className="text-xs font-black text-slate-800 uppercase tracking-widest">مستندات أخرى</div>
             </div>
             <div className="bg-red-50/50 rounded-3xl p-6 text-center border border-red-100 hover:-translate-y-1 transition-transform group">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-red-600 mx-auto mb-4 shadow-sm group-hover:scale-110 transition-transform">
                   <LuFileText size={24} />
                </div>
                <div className="text-3xl font-black text-red-600 mb-1">{data.alerts.expiringLicenses}</div>
                <div className="text-xs font-black text-slate-800 uppercase tracking-widest">رخص قيادة</div>
             </div>
          </div>
          <div className="mt-8 p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex items-center gap-3 text-slate-500">
             <LuTriangleAlert size={20} className="text-amber-500" />
             <p className="text-xs font-bold leading-relaxed">يرجى مراجعة ملفات السائقين وتحديث المستندات لتجنب الغرامات أو إيقاف العمليات.</p>
          </div>
        </div>

        <div className="card bg-white shadow-premium rounded-3xl p-8 border-none ring-1 ring-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-50/50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
          <div className="flex justify-between items-center mb-8 relative z-10">
            <h3 className="text-xl font-black text-slate-800">إحصائيات الجزاءات والالتزام</h3>
            <div className="text-right">
               <div className="text-xs font-black text-red-600 uppercase">إجمالي المخالفات</div>
               <div className="text-xl font-black text-slate-900">{data.performance.totalViolations}</div>
            </div>
          </div>
          <div className="space-y-4 relative z-10">
            {data.penaltiesSummary.map((item) => (
              <div key={item.type} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-premium transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-red-500 shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                    <LuBan size={20} />
                  </div>
                  <div>
                    <div className="text-[0.95rem] font-black text-slate-700">
                      {{ FINANCIAL: 'مالي', WARNING: 'إنذار', SUSPENSION: 'إيقاف', TERMINATION: 'إنهاء', OTHER: 'أخرى' }[item.type] || item.type}
                    </div>
                    <div className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-wide">العدد: {item.count}</div>
                  </div>
                </div>
                <div className="text-lg font-black text-red-600">
                  {item.amount.toLocaleString()} <span className="text-xs">ر.س</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 4: Incidents & Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        <div className="lg:col-span-2 card bg-white shadow-premium rounded-3xl p-8 border-none ring-1 ring-slate-100">
          <div className="flex items-center gap-3 mb-8">
             <div className="w-10 h-10 rounded-xl bg-brand-light text-brand-primary flex items-center justify-center shadow-sm">
                <LuActivity size={20} />
             </div>
             <h3 className="text-xl font-black text-slate-800">تحليل الحوادث والبلاغات</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.incidents.map((item) => {
              const config = INCIDENT_TYPE_MAP[item.type] || INCIDENT_TYPE_MAP.OTHER;
              const Icon = config.icon;
              return (
                <div key={item.type} className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-2xl hover:shadow-premium transition-all group">
                   <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl ${config.bg} ${config.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                         <Icon size={24} />
                      </div>
                      <div>
                         <div className="text-[0.95rem] font-black text-slate-800">{config.label}</div>
                         <div className="text-xs font-bold text-slate-400">بلاغات مسجلة</div>
                      </div>
                   </div>
                   <span className="text-2xl font-black text-slate-900 bg-slate-50 px-4 py-2 rounded-xl ring-1 ring-slate-100">{item.count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card bg-white shadow-premium rounded-3xl p-8 border-none ring-1 ring-slate-100 relative overflow-hidden">
          <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-2">
            <LuClipboardList className="text-indigo-500" />
            الإجراءات بانتظار المراجعة
          </h3>
          <div className="space-y-4">
             <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-premium transition-all">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <LuWallet size={20} />
                   </div>
                   <span className="text-sm font-bold text-slate-700">طلبات السلف</span>
                </div>
                <span className="text-xl font-black text-blue-600">{data.pendingRequests.salaryAdvances}</span>
             </div>
             <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-premium transition-all">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                      <LuWrench size={20} />
                   </div>
                   <span className="text-sm font-bold text-slate-700">طلبات الصيانة</span>
                </div>
                <span className="text-xl font-black text-orange-600">{data.pendingRequests.maintenance}</span>
             </div>
             <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-premium transition-all">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                      <LuFileText size={20} />
                   </div>
                   <span className="text-sm font-bold text-slate-700">الطلبات الإدارية</span>
                </div>
                <span className="text-xl font-black text-purple-600">{data.pendingRequests.adminRequests}</span>
             </div>
             <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-premium transition-all">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <LuUsers size={20} />
                   </div>
                   <span className="text-sm font-bold text-slate-700">طلبات الإجازات</span>
                </div>
                <span className="text-xl font-black text-emerald-600">{data.pendingRequests.leaveRequests}</span>
             </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-100">
             <div className="flex items-center justify-between p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
                <div className="flex items-center gap-3">
                   <LuGift className="text-amber-600" size={20} />
                   <span className="text-sm font-bold text-amber-900">إجمالي المكافآت المعتمدة</span>
                </div>
                <span className="text-lg font-black text-amber-700">{data.financials.rewards.toLocaleString()} <span className="text-xs">ر.س</span></span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
