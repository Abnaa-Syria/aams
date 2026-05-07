import { useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import { LuSettings, LuMapPin, LuSmartphone, LuDatabase, LuActivity } from 'react-icons/lu';
import StatusBadge from '../../components/ui/StatusBadge';

export default function SettingsPage() {
  const [settings, setSettings] = useState([]);
  const [cities, setCities] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [masterData, setMasterData] = useState([]);
  const [tab, setTab] = useState('settings');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [s, c, p, m] = await Promise.all([
          apiService.get('/settings'),
          apiService.get('/settings/cities/list'),
          apiService.get('/platforms'),
          apiService.get('/settings/master-data'),
        ]);
        if (cancelled) return;
        setSettings(s.data.data || []);
        setCities(c.data.data || []);
        setPlatforms(p.data.data || []);
        setMasterData(m.data.data || []);
      } catch { /* handled */ } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const tabs = [
    { key: 'settings', label: 'إعدادات النظام', icon: LuSettings },
    { key: 'cities', label: 'المدن والعمليات', icon: LuMapPin },
    { key: 'platforms', label: 'المنصات اللوجستية', icon: LuSmartphone },
    { key: 'masterData', label: 'البيانات الأساسية', icon: LuDatabase },
  ];

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-12 h-12 border-4 border-brand-light border-t-brand-primary rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="page-container animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">الإعدادات والبيانات الأساسية</h2>
          <p className="text-slate-500 text-[0.95rem] font-medium">إدارة تهيئة النظام، المناطق الجغرافية، والبيانات التعريفية للأسطول.</p>
        </div>
        <div className="flex gap-3">
           <button className="btn bg-white border border-slate-200 shadow-sm hover:bg-slate-50 text-slate-700">
             <LuActivity size={18} className="text-brand-primary" />
             سجل التغييرات
           </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2 mb-8 bg-slate-100/50 p-1.5 rounded-2xl w-fit">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button 
              key={t.key} 
              className={`
                flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all duration-300
                ${tab === t.key 
                  ? 'bg-white text-brand-primary shadow-sm ring-1 ring-slate-200/50' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                }
              `} 
              onClick={() => setTab(t.key)}
            >
              <Icon size={18} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Settings Content Area */}
      <div className="animate-in fade-in zoom-in-95 duration-300">
        {tab === 'settings' && (
          <div className="bg-white rounded-3xl shadow-premium border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-[0.75rem] font-black text-slate-400 uppercase tracking-widest">المفتاح</th>
                    <th className="px-6 py-4 text-[0.75rem] font-black text-slate-400 uppercase tracking-widest">القيمة</th>
                    <th className="px-6 py-4 text-[0.75rem] font-black text-slate-400 uppercase tracking-widest">المجموعة</th>
                    <th className="px-6 py-4 text-[0.75rem] font-black text-slate-400 uppercase tracking-widest">الوصف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {settings.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-[0.9rem] font-black text-slate-800">{s.key}</td>
                      <td className="px-6 py-4">
                        <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg text-xs font-bold ring-1 ring-slate-200">
                          {s.value}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                         <StatusBadge status="INFO" label={s.group} />
                      </td>
                      <td className="px-6 py-4 text-[0.85rem] font-medium text-slate-500">{s.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'cities' && (
          <div className="bg-white rounded-3xl shadow-premium border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-[0.75rem] font-black text-slate-400 uppercase tracking-widest">المدينة</th>
                    <th className="px-6 py-4 text-[0.75rem] font-black text-slate-400 uppercase tracking-widest">الاسم الدولي</th>
                    <th className="px-6 py-4 text-[0.75rem] font-black text-slate-400 uppercase tracking-widest">المنطقة</th>
                    <th className="px-6 py-4 text-[0.75rem] font-black text-slate-400 uppercase tracking-widest">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {cities.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-[0.9rem] font-bold text-slate-700">{c.nameAr}</td>
                      <td className="px-6 py-4 text-[0.85rem] font-medium text-slate-400">{c.nameEn}</td>
                      <td className="px-6 py-4">
                        <span className="text-[0.85rem] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">{c.region}</span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={c.isActive ? 'ACTIVE' : 'INACTIVE'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'platforms' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {platforms.map((p) => (
              <div key={p.id} className="bg-white rounded-[2rem] p-8 shadow-premium border border-slate-100 hover:shadow-premium-hover transition-all group">
                <div className="flex justify-between items-start mb-6">
                   <div className="w-14 h-14 rounded-2xl bg-brand-light flex items-center justify-center text-brand-primary shadow-sm ring-1 ring-brand-primary/10 group-hover:scale-110 transition-transform">
                      <LuSmartphone size={28} />
                   </div>
                   <StatusBadge status={p.isActive ? 'ACTIVE' : 'INACTIVE'} />
                </div>
                <h4 className="text-xl font-black text-slate-800 mb-1">{p.nameAr}</h4>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-6">{p.nameEn}</p>
                <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                   <span className="text-xs font-black text-slate-400 uppercase tracking-widest">الحسابات المتصلة</span>
                   <span className="text-lg font-black text-brand-primary">{p._count?.accounts || 0}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'masterData' && (
          <div className="bg-white rounded-3xl shadow-premium border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-[0.75rem] font-black text-slate-400 uppercase tracking-widest">التصنيف</th>
                    <th className="px-6 py-4 text-[0.75rem] font-black text-slate-400 uppercase tracking-widest">الاسم (عربي)</th>
                    <th className="px-6 py-4 text-[0.75rem] font-black text-slate-400 uppercase tracking-widest">الاسم (EN)</th>
                    <th className="px-6 py-4 text-[0.75rem] font-black text-slate-400 uppercase tracking-widest">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {masterData.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-[0.7rem] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md uppercase tracking-wider">{m.category}</span>
                      </td>
                      <td className="px-6 py-4 text-[0.9rem] font-bold text-slate-700">{m.nameAr}</td>
                      <td className="px-6 py-4 text-[0.85rem] font-medium text-slate-400">{m.nameEn}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={m.isActive ? 'ACTIVE' : 'INACTIVE'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
