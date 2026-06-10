import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { apiService } from '../../services/api';
import StatusBadge from '../../components/ui/StatusBadge';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import RowActions from '../../components/ui/RowActions';
import toast from 'react-hot-toast';
import { LuArrowRight, LuUser, LuUserPlus, LuPhone, LuMail, LuIdCard, LuUsers, LuCalendar, LuBriefcase, LuExternalLink, LuUserMinus, LuChevronLeft, LuMessageSquare } from 'react-icons/lu';
import { hasAnyPermissionForUser, PERMISSIONS as P } from '../../utils/rolePermissions';

export default function SupervisorDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: authUser } = useSelector((s) => s.auth);
  const canWrite = hasAnyPermissionForUser(authUser, [P.USERS_WRITE]);

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
      const allDrivers = Array.isArray(data.data) ? data.data : [];
      // Filter out drivers already assigned to this supervisor
      const assignedIds = new Set(supervisor.assignedDrivers?.map(d => d.id) || []);
      setDriversPool(allDrivers.filter(d => !assignedIds.has(d.id)));
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-brand-light border-t-brand-primary rounded-full animate-spin"></div>
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
        label: 'الإجراءات التشغيلية',
        stopRowClick: true,
        render: (_, row) => (
          <div className="flex items-center gap-2">
            <button 
              type="button" 
              className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-brand-light hover:text-brand-primary transition-all shadow-sm" 
              onClick={() => navigate(`/drivers/${row.id}`)}
              title="عرض ملف السائق"
            >
              <LuExternalLink size={16} />
            </button>
            <button 
              type="button" 
              className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-all shadow-sm" 
              onClick={() => unassignDriver(row.id)}
              title="إلغاء الربط"
            >
              <LuUserMinus size={16} />
            </button>
          </div>
        ),
      }]
      : []),
  ];

  return (
    <div className="page-container animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Premium Profile Header */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-premium border border-slate-100 mb-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/40 rounded-full blur-3xl -mr-32 -mt-32 opacity-60 pointer-events-none"></div>
        
        <div className="flex flex-col lg:flex-row items-center lg:items-end gap-8 relative z-10">
          {/* Avatar Section */}
          <div className="relative">
            <div className="w-32 h-32 rounded-[2rem] bg-slate-50 border-4 border-white shadow-lg overflow-hidden flex items-center justify-center ring-1 ring-slate-100 group-hover:scale-105 transition-transform duration-500">
              <LuUser size={48} className="text-slate-300" />
            </div>
            <div className="absolute -bottom-2 -right-2">
               <StatusBadge status={supervisor.accountStatus} />
            </div>
          </div>

          {/* Info Section */}
          <div className="flex-1 text-center lg:text-right">
            <div className="flex flex-col lg:flex-row items-center lg:items-center gap-4 mb-4">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">{supervisor.fullNameAr}</h2>
              <span className="text-[0.65rem] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest ring-1 ring-blue-100">مشرف عمليات</span>
            </div>
            
            <div className="flex flex-wrap justify-center lg:justify-start gap-6 text-[0.85rem] font-bold text-slate-500">
               <div className="flex items-center gap-2 hover:text-brand-primary transition-colors cursor-default">
                  <LuPhone size={16} />
                  <span>{supervisor.mobileNumber || '—'}</span>
               </div>
               <div className="flex items-center gap-2 hover:text-brand-primary transition-colors cursor-default">
                  <LuMail size={16} />
                  <span>{supervisor.email || '—'}</span>
               </div>
               <div className="flex items-center gap-2 hover:text-brand-primary transition-colors cursor-default">
                  <LuBriefcase size={16} />
                  <span>{supervisor.jobTitle || 'مشرف'}</span>
               </div>
            </div>
          </div>

          {/* Action Section */}
          <div className="flex gap-3">
             <button 
               onClick={() => navigate(`/chat?userId=${supervisor.id}`)}
               className="btn bg-brand-light text-brand-primary hover:bg-brand-primary hover:text-white !rounded-2xl flex items-center gap-2"
             >
               <LuMessageSquare size={18} />
               مراسلة
             </button>
             {canWrite && (
                <button 
                  onClick={openAssignModal}
                  className="btn btn-primary !rounded-2xl shadow-orange"
                >
                  <LuUserPlus size={18} />
                  ربط سائقين جدد
                </button>
             )}
             <button 
               onClick={() => navigate('/supervisors')}
               className="btn bg-slate-100 text-slate-600 hover:bg-slate-200 !rounded-2xl"
             >
               <LuChevronLeft size={18} />
               عودة
             </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Supervisor Details Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card !p-8 border-none ring-1 ring-slate-200/50">
            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
              <LuIdCard className="text-brand-primary" size={20} />
              البيانات التعريفية
            </h3>
            <div className="space-y-4">
               <DetailItem label="رقم الهوية" value={supervisor.identityNumber} />
               <DetailItem label="الاسم الدولي" value={supervisor.fullNameEn} />
               <DetailItem label="تاريخ الانضمام" value={supervisor.createdAt ? new Date(supervisor.createdAt).toLocaleDateString('ar-SA') : '—'} />
            </div>
          </div>

          <div className="card !p-8 border-none ring-1 ring-slate-200/50 bg-gradient-to-br from-brand-primary to-brand-active text-white">
            <h3 className="text-lg font-black mb-6 flex items-center gap-2">
              <LuUsers size={20} />
              إحصائيات الإشراف
            </h3>
            <div className="text-center py-4">
               <div className="text-5xl font-black mb-2">{assigned.length}</div>
               <div className="text-xs font-bold uppercase tracking-widest opacity-80">سائق تحت الإشراف المباشر</div>
            </div>
            <div className="mt-6 pt-6 border-t border-white/10 text-[0.7rem] font-medium leading-relaxed opacity-70 italic text-center">
              يتم تحديث هذه البيانات تلقائياً بناءً على تعيينات السائقين في النظام.
            </div>
          </div>
        </div>

        {/* Managed Drivers Table */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[2rem] shadow-premium border border-slate-100 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center">
               <h3 className="text-xl font-black text-slate-800 tracking-tight">قائمة السائقين المدارين</h3>
               <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{assigned.length} سائق</span>
            </div>
            <DataTable 
              columns={driverColumns} 
              data={assigned} 
              loading={false} 
              emptyMessage="لا يوجد سائقون مرتبطون بهذا المشرف حالياً" 
              onRowClick={(row) => navigate(`/drivers/${row.id}`)}
            />
          </div>
        </div>
      </div>

      {/* Assign Modal */}
      <Modal isOpen={showAssign} onClose={() => setShowAssign(false)} title="إدارة تعيين السائقين">
        <form onSubmit={submitAssign} className="space-y-6">
          <div className="p-4 bg-brand-light/30 rounded-2xl border border-brand-primary/10 flex items-start gap-3">
            <LuUserPlus className="text-brand-primary mt-1" size={20} />
            <p className="text-[0.85rem] font-bold text-brand-active leading-relaxed">
              اختر السائقين من القائمة أدناه لربطهم بـ {supervisor.fullNameAr}. سيتم نقل السائقين من مشرفيهم الحاليين إذا وجدوا.
            </p>
          </div>
          
          {poolLoading ? (
            <div className="flex items-center justify-center py-10">
               <div className="w-8 h-8 border-3 border-brand-light border-t-brand-primary rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto custom-scrollbar border border-slate-100 rounded-2xl p-2 space-y-1">
              {driversPool.map((d) => (
                <label
                  key={d.id}
                  className={`
                    flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all
                    ${selectedIds.has(d.id) ? 'bg-brand-light/20 ring-1 ring-brand-primary/10' : 'hover:bg-slate-50'}
                  `}
                >
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded-lg border-slate-300 text-brand-primary focus:ring-brand-primary transition-all cursor-pointer"
                      checked={selectedIds.has(d.id)}
                      onChange={() => toggleDriver(d.id)}
                    />
                    <div>
                       <div className="text-[0.9rem] font-bold text-slate-700">{d.fullNameAr}</div>
                       <div className="text-[0.7rem] font-medium text-slate-400 tracking-tight">{d.identityNumber}</div>
                    </div>
                  </div>
                  {d.supervisorId != null && d.supervisorId !== Number(id) && (
                    <span className="text-[0.65rem] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-md uppercase tracking-wider ring-1 ring-amber-100">إعادة تعيين</span>
                  )}
                </label>
              ))}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button 
              type="submit" 
              className="btn btn-primary flex-1 !rounded-2xl justify-center shadow-orange" 
              disabled={!canWrite || poolLoading || selectedIds.size === 0}
            >
              تأكيد عملية الربط
            </button>
            <button 
              type="button" 
              className="btn bg-slate-100 text-slate-500 flex-1 !rounded-2xl justify-center" 
              onClick={() => setShowAssign(false)}
            >
              إلغاء
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      <span className="text-[0.95rem] font-bold text-slate-700">{value || '—'}</span>
    </div>
  );
}
