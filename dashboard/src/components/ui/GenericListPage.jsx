import { useEffect, useState, useCallback } from 'react';
import { apiService } from '../../services/api';
import DataTable from './DataTable';
import Pagination from './Pagination';
import { LuPlus, LuRefreshCw, LuFilter } from 'react-icons/lu';

export default function GenericListPage({
  title, apiUrl, columns, filters: filterConfig = [],
  onRowClick, createButton, children, defaultParams = {},
  reloadToken,
}) {
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useState({ page: 1, ...defaultParams });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const cleanParams = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null));
      const res = await apiService.get(apiUrl, cleanParams);
      setData(res.data.data);
      if (res.data.meta) setMeta(res.data.meta);
    } catch { /* handled */ } finally { setLoading(false); }
  }, [apiUrl, params]);

  useEffect(() => { load(); }, [load, reloadToken]);

  const updateParam = (key, value) => setParams(p => ({ ...p, [key]: value, page: 1 }));

  return (
    <div className="page-container animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex justify-between items-center flex-wrap gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">{title}</h2>
          <div className="flex items-center gap-2 mt-1">
             <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
             <span className="text-xs font-bold text-slate-400">نظام إدارة العمليات</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={load} 
            disabled={loading}
            className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-primary hover:border-primary-light transition-all shadow-sm"
          >
            <LuRefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          {createButton}
        </div>
      </div>

      {filterConfig.length > 0 && (
        <div className="bg-white/50 backdrop-blur-md rounded-3xl p-5 border border-white/60 shadow-premium mb-8 flex flex-wrap items-end gap-4">
          <div className="w-full flex items-center gap-2 mb-2 text-slate-400">
            <LuFilter size={16} />
            <span className="text-xs font-black uppercase tracking-widest">تصفية النتائج</span>
          </div>
          {filterConfig.map((f) => (
            <div className="flex-1 min-w-[200px]" key={f.key}>
              {f.type === 'select' ? (
                <div className="relative">
                  <select 
                    className="form-input form-select !bg-white/80" 
                    value={params[f.key] || ''} 
                    onChange={(e) => updateParam(f.key, e.target.value)}
                  >
                    <option value="">{f.placeholder}</option>
                    {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              ) : (
                <input 
                  className="form-input !bg-white/80" 
                  placeholder={f.placeholder} 
                  type={f.type || 'text'} 
                  value={params[f.key] || ''} 
                  onChange={(e) => updateParam(f.key, e.target.value)} 
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="card !p-0 overflow-hidden border-none ring-1 ring-slate-200/50">
        <DataTable columns={columns} data={data} loading={loading} onRowClick={onRowClick} />
        <Pagination meta={meta} onPageChange={(p) => setParams(prev => ({ ...prev, page: p }))} />
      </div>

      {children}
    </div>
  );
}
