import { useEffect, useState, useCallback } from 'react';
import { apiService } from '../../services/api';
import DataTable from './DataTable';
import Pagination from './Pagination';
import ReportFilterBar from './ReportFilterBar';
import ImportCsvModal from './ImportCsvModal';
import CsvTemplateButton from './CsvTemplateButton';
import { moduleFromApiUrl, isImportableModule } from '../../config/listModules';
import { LuPlus, LuRefreshCw, LuDownload, LuUpload } from 'react-icons/lu';
import toast from 'react-hot-toast';

export default function GenericListPage({
  title, apiUrl, columns, filters: filterConfig = [],
  onRowClick, createButton, children, defaultParams = {},
  reloadToken, prepareParams,
  exportModule = null,
  importModule = null,
  selectable = null,
  reportFilters = true,
  exportEnabled = true,
  importEnabled = true,
  filterPresets = [],
}) {
  const resolvedModule = exportModule || moduleFromApiUrl(apiUrl);
  const importMod = importModule || resolvedModule;
  const canExport = exportEnabled && !!resolvedModule;
  const canImport = importEnabled && isImportableModule(importMod);
  const isSelectable = selectable ?? canExport;

  const [data, setData] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useState({ page: 1, ...defaultParams });
  const [selectedIds, setSelectedIds] = useState([]);
  const [importOpen, setImportOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const prepared = prepareParams ? prepareParams(params) : params;
      const cleanParams = Object.fromEntries(Object.entries(prepared).filter(([, v]) => v !== '' && v != null));
      const res = await apiService.get(apiUrl, cleanParams);
      setData(res.data.data);
      if (res.data.meta) setMeta(res.data.meta);
      setSelectedIds([]);
    } catch { /* handled */ } finally { setLoading(false); }
  }, [apiUrl, params, prepareParams]);

  useEffect(() => { load(); }, [load, reloadToken]);

  const buildExportPayload = () => {
    const prepared = prepareParams ? prepareParams(params) : params;
    const cleanFilters = Object.fromEntries(
      Object.entries(prepared).filter(([k, v]) => v !== '' && v != null && k !== 'page'),
    );
    const payload = { module: resolvedModule, format: 'csv' };
    if (selectedIds.length) payload.ids = selectedIds;
    else payload.filters = cleanFilters;
    return payload;
  };

  const handleExport = async () => {
    if (!canExport) return;
    try {
      const res = await apiService.exportBlob('/export/selected', buildExportPayload());
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${resolvedModule}-export.csv`;
      a.click();
      toast.success(selectedIds.length ? `تم تصدير ${selectedIds.length} سجل` : 'تم تصدير النتائج المفلترة');
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل التصدير');
    }
  };

  const applyPreset = (preset) => {
    setParams((p) => {
      const next = { ...p, page: 1 };
      Object.keys(next).forEach((k) => {
        if (['onShift', 'availabilityStatus', 'hasVehicle', 'hasBankAccount', 'accountStatus', 'employmentStatus'].includes(k)) {
          delete next[k];
        }
      });
      next[preset.key] = preset.value;
      return next;
    });
  };

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
        <div className="flex items-center gap-3 flex-wrap">
          {canImport && (
            <>
              <CsvTemplateButton
                url={`/import/template/${importMod}`}
                filename={`${importMod}-import-template.csv`}
              />
              <button type="button" onClick={() => setImportOpen(true)} className="btn btn-secondary text-sm flex items-center gap-2">
                <LuUpload size={16} /> استيراد CSV
              </button>
            </>
          )}
          {canExport && (
            <>
              <CsvTemplateButton
                url={`/export/template/${resolvedModule}`}
                filename={`${resolvedModule}-template.csv`}
              />
              <button type="button" onClick={handleExport} className="btn btn-secondary text-sm flex items-center gap-2">
                <LuDownload size={16} />
                تصدير {selectedIds.length ? `(${selectedIds.length})` : '(الفلتر)'}
              </button>
            </>
          )}
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

      {filterPresets.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {filterPresets.map((preset) => (
            <button
              key={`${preset.key}-${preset.value}`}
              type="button"
              onClick={() => applyPreset(preset)}
              className="text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-primary/10 hover:text-primary transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}

      {(reportFilters || filterConfig.length > 0) && (
        <ReportFilterBar
          params={params}
          onChange={setParams}
          extraFilters={filterConfig}
          onExport={canExport ? handleExport : undefined}
          exportTemplateUrl={canExport ? `/export/template/${resolvedModule}` : undefined}
          exportTemplateFilename={canExport ? `${resolvedModule}-template.csv` : undefined}
        />
      )}

      <div className="card !p-0 border-none ring-1 ring-slate-200/50">
        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          onRowClick={onRowClick}
          selectable={isSelectable}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
        <Pagination meta={meta} onPageChange={(p) => setParams(prev => ({ ...prev, page: p }))} />
      </div>

      {children}

      {canImport && (
        <ImportCsvModal
          isOpen={importOpen}
          onClose={() => setImportOpen(false)}
          module={importMod}
          onSuccess={() => load()}
        />
      )}
    </div>
  );
}
