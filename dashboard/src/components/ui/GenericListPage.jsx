import { useEffect, useState, useCallback } from 'react';
import { apiService } from '../../services/api';
import DataTable from './DataTable';
import Pagination from './Pagination';
import { LuPlus } from 'react-icons/lu';

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
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">{title}</h2>
        {createButton}
      </div>

      {filterConfig.length > 0 && (
        <div className="filters-bar">
          {filterConfig.map((f) => (
            <div className="form-group" key={f.key}>
              {f.type === 'select' ? (
                <select className="form-input form-select" value={params[f.key] || ''} onChange={(e) => updateParam(f.key, e.target.value)}>
                  <option value="">{f.placeholder}</option>
                  {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <input className="form-input" placeholder={f.placeholder} type={f.type || 'text'} value={params[f.key] || ''} onChange={(e) => updateParam(f.key, e.target.value)} />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <DataTable columns={columns} data={data} loading={loading} onRowClick={onRowClick} />
        <Pagination meta={meta} onPageChange={(p) => setParams(prev => ({ ...prev, page: p }))} />
      </div>

      {children}
    </div>
  );
}
