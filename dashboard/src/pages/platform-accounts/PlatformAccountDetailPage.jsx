import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  LuChevronLeft, LuHistory, LuClock, LuUser, LuPackage, 
  LuInfo, LuCalendar, LuUserCog, LuFileText, LuArrowLeftRight, LuSmartphone
} from 'react-icons/lu';
import { apiService } from '../../services/api';
import StatusBadge from '../../components/ui/StatusBadge';
import AttachmentGallery from '../../components/attachments/AttachmentGallery';

function formatDate(v, includeTime = false) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  
  const options = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    ...(includeTime && { hour: '2-digit', minute: '2-digit' })
  };
  return d.toLocaleDateString('ar-SA', options);
}

function Field({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center justify-between gap-6 py-4 border-b border-slate-50 last:border-b-0 group">
      <div className="flex items-center gap-3">
        {Icon && <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-brand-primary group-hover:bg-brand-light transition-all"><Icon size={16} /></div>}
        <div className="text-[0.7rem] font-black text-slate-400 uppercase tracking-widest">{label}</div>
      </div>
      <div className="text-sm font-bold text-slate-700 text-left">{value ?? '—'}</div>
    </div>
  );
}

function Section({ title, icon: Icon, children, badge }) {
  return (
    <div className="bg-white rounded-[2rem] shadow-premium border border-slate-100 overflow-hidden h-full flex flex-col">
      <div className="px-8 pt-8 pb-6 bg-gradient-to-br from-slate-50/50 via-white to-white border-b border-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {Icon && <div className="w-10 h-10 rounded-2xl bg-brand-light flex items-center justify-center text-brand-primary shadow-sm"><Icon size={20} /></div>}
          <h3 className="text-lg font-black text-slate-800 tracking-tight">{title}</h3>
        </div>
        {badge && <span className="bg-brand-light text-brand-primary px-3 py-1 rounded-xl text-xs font-black">{badge}</span>}
      </div>
      <div className="px-8 py-6 flex-1">{children}</div>
    </div>
  );
}

export default function PlatformAccountDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data } = await apiService.get(`/platform-accounts/${id}`);
      setRow(data.data);
    } catch {
      toast.error('تعذر تحميل تفاصيل حساب المنصة');
      navigate('/platform-accounts');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  const attachmentItems = useMemo(() => {
    if (!row?.fileUrl) return [];
    return [{
      key: 'file',
      label: 'ملف الحساب',
      fileUrl: row.fileUrl,
      downloadUrl: `/platform-accounts/${id}/files/file/download`,
    }];
  }, [row, id]);

  const tabs = [
    { id: 'details', label: 'التفاصيل العامة', icon: LuInfo },
    { id: 'history', label: 'سجل التعيين', icon: LuHistory },
    { id: 'shifts', label: 'الطلبات والشفتات', icon: LuPackage },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-brand-light rounded-full opacity-20" />
          <div className="absolute inset-0 border-4 border-brand-primary rounded-full border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  if (!row) return null;

  return (
    <div className="page-container animate-in fade-in slide-in-from-bottom-4 duration-700" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-[1.5rem] bg-brand-primary shadow-orange flex items-center justify-center text-white shrink-0">
            <LuSmartphone size={32} />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">{row.username}</h2>
              <StatusBadge status={row.status} />
            </div>
            <p className="text-slate-500 font-bold flex items-center gap-2">
              <span className="text-brand-primary">{row.platform?.nameAr || row.platform?.nameEn}</span>
              <span className="w-1 h-1 bg-slate-300 rounded-full" />
              <span>{row.accountId}</span>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/platform-accounts')}
          className="group flex items-center gap-3 px-6 py-3.5 bg-white text-slate-600 border border-slate-100 rounded-2xl font-black text-sm hover:bg-slate-50 hover:border-slate-200 hover:text-brand-primary transition-all shadow-sm active:scale-95"
        >
          <LuChevronLeft size={20} className="transition-transform group-hover:-translate-x-1" />
          العودة للمنصات
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-10 bg-slate-100/50 p-1.5 rounded-[1.5rem] w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-[0.85rem] font-black transition-all duration-500 ${
              activeTab === t.id
                ? 'bg-white text-brand-primary shadow-premium ring-1 ring-slate-200/50'
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
            }`}
          >
            <t.icon size={18} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in zoom-in-95 duration-500">
        {activeTab === 'details' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-8">
              <Section title="المعلومات الأساسية" icon={LuInfo}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
                  <Field label="الموظف الحالي" value={row.user?.fullNameAr} icon={LuUser} />
                  <Field label="اسم المستخدم" value={row.username} icon={LuUserCog} />
                  <Field label="رقم الحساب" value={row.accountId} icon={LuFileText} />
                  <Field label="نوع الحساب" value={row.isAlternate ? 'حساب بديل' : 'حساب أساسي'} icon={LuArrowLeftRight} />
                  <Field label="تاريخ الاستلام" value={formatDate(row.receiptDate)} icon={LuCalendar} />
                  <Field label="تاريخ مباشرة العمل" value={formatDate(row.startWorkDate)} icon={LuCalendar} />
                </div>
              </Section>

              <Section title="ملاحظات إضافية" icon={LuFileText}>
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 italic text-slate-600 font-medium leading-relaxed">
                  {row.notes || 'لا توجد ملاحظات مسجلة لهذا الحساب'}
                </div>
              </Section>
            </div>

            <div className="lg:col-span-4 space-y-8">
              <Section title="بيانات النظام" icon={LuClock}>
                <Field label="تاريخ الإنشاء" value={formatDate(row.createdAt)} />
                <Field label="آخر تحديث" value={formatDate(row.updatedAt)} />
                {row.verifiedAt && <Field label="تاريخ التوثيق" value={formatDate(row.verifiedAt)} />}
              </Section>

              {attachmentItems.length > 0 && (
                <AttachmentGallery items={attachmentItems} title="المرفقات" />
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <Section title="سجل التعيين والتحويل" icon={LuHistory} badge={`${row.auditLogs?.length || 0} عملية`}>
            <div className="relative space-y-8 before:absolute before:inset-y-0 before:right-7 before:w-0.5 before:bg-slate-100 before:content-[''] pr-2">
              {row.auditLogs?.map((log, idx) => (
                <div key={log.id} className="relative pr-14 animate-in slide-in-from-right-4 duration-500" style={{ animationDelay: `${idx * 50}ms` }}>
                  <div className="absolute right-4 top-0 w-6 h-6 rounded-full bg-white border-4 border-brand-primary shadow-sm z-10" />
                  <div className="bg-slate-50/50 border border-slate-100 rounded-3xl p-6 hover:bg-white hover:shadow-premium transition-all group">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-brand-primary transition-colors">
                          <LuUserCog size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800">
                            {log.action === 'CREATE_PLATFORM_ACCOUNT' ? 'تم إنشاء الحساب' : 
                             log.action === 'UPDATE_PLATFORM_ACCOUNT' ? 'تحديث بيانات الحساب' : 
                             log.action === 'VERIFY_PLATFORM_ACCOUNT' ? 'توثيق الحساب' : log.action}
                          </p>
                          <p className="text-xs font-bold text-slate-400 mt-0.5">بواسطة: {log.user?.fullNameAr || 'النظام'}</p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-slate-400 bg-white px-4 py-2 rounded-xl border border-slate-100 shrink-0">
                        {formatDate(log.createdAt, true)}
                      </span>
                    </div>
                    
                    {log.newValue && typeof log.newValue === 'object' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(log.newValue).map(([key, val]) => (
                          <div key={key} className="flex items-center justify-between bg-white/60 p-3 rounded-xl border border-slate-50/50">
                            <span className="text-[0.65rem] font-black text-slate-400 uppercase tracking-tighter">{key}</span>
                            <span className="text-xs font-bold text-slate-600 truncate max-w-[200px]">{String(val)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {(!row.auditLogs || row.auditLogs.length === 0) && (
                <div className="text-center py-12">
                  <LuHistory size={48} className="mx-auto mb-4 text-slate-200" />
                  <p className="text-slate-400 font-bold italic text-sm">لا توجد سجلات تاريخية متوفرة</p>
                </div>
              )}
            </div>
          </Section>
        )}

        {activeTab === 'shifts' && (
          <Section title="سجل الطلبات والشفتات" icon={LuPackage} badge={`${row.shifts?.length || 0} شفت`}>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {row.shifts?.map((shift, idx) => (
                <div 
                  key={shift.id} 
                  className="bg-white border border-slate-100 rounded-[2rem] p-6 hover:shadow-premium hover:border-brand-primary/20 transition-all group animate-in zoom-in-95 duration-500"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 group-hover:bg-brand-light group-hover:text-brand-primary flex items-center justify-center transition-all">
                        <LuClock size={24} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-wider">رقم الشفت</p>
                        <p className="text-sm font-black text-slate-800">#{shift.id}</p>
                      </div>
                    </div>
                    <StatusBadge status={shift.status} />
                  </div>
                  
                  <div className="space-y-4 mb-6">
                    <div className="flex items-center justify-between px-2">
                      <span className="text-[0.7rem] font-bold text-slate-400">السائق</span>
                      <span className="text-sm font-black text-slate-700">{shift.user?.fullNameAr}</span>
                    </div>
                    <div className="flex items-center justify-between px-2">
                      <span className="text-[0.7rem] font-bold text-slate-400">التاريخ</span>
                      <span className="text-sm font-black text-slate-700">{formatDate(shift.startedAt || shift.requestedAt)}</span>
                    </div>
                  </div>

                  <div className="bg-brand-light/30 rounded-2xl p-5 flex items-center justify-between border border-brand-primary/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-brand-primary">
                        <LuPackage size={20} />
                      </div>
                      <span className="text-xs font-black text-slate-600 uppercase tracking-wide">إجمالي الطلبات</span>
                    </div>
                    <span className="text-2xl font-black text-brand-primary">{shift.totalOrders || 0}</span>
                  </div>
                </div>
              ))}
              {(!row.shifts || row.shifts.length === 0) && (
                <div className="col-span-full text-center py-20">
                  <LuPackage size={64} className="mx-auto mb-6 text-slate-100" />
                  <p className="text-slate-400 font-black text-lg">لم يتم تنفيذ أي شفتات بهذا الحساب بعد</p>
                </div>
              )}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}