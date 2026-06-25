import { LuDownload, LuCalendar } from 'react-icons/lu';
import CsvTemplateButton from './CsvTemplateButton';

/**
 * Shared date/period filters for list pages (#13).
 */
export default function ReportFilterBar({
  params, onChange, extraFilters = [], onExport,
  exportTemplateUrl, exportTemplateFilename,
}) {
  const set = (key, value) => onChange({ ...params, [key]: value, page: 1 });

  return (
    <div className="bg-white/50 backdrop-blur-md rounded-3xl p-5 border border-white/60 shadow-premium mb-6 flex flex-wrap items-end gap-4">
      <div className="w-full flex items-center gap-2 text-slate-400 mb-1">
        <LuCalendar size={16} />
        <span className="text-xs font-black uppercase tracking-widest">فلتر التقرير</span>
      </div>
      <div className="min-w-[140px]">
        <label className="text-xs font-bold text-slate-500 block mb-1">من</label>
        <input type="date" className="form-input !bg-white/80" value={params.dateFrom || ''} onChange={(e) => set('dateFrom', e.target.value)} />
      </div>
      <div className="min-w-[140px]">
        <label className="text-xs font-bold text-slate-500 block mb-1">إلى</label>
        <input type="date" className="form-input !bg-white/80" value={params.dateTo || ''} onChange={(e) => set('dateTo', e.target.value)} />
      </div>
      <div className="min-w-[140px]">
        <label className="text-xs font-bold text-slate-500 block mb-1">الفترة</label>
        <select className="form-input form-select !bg-white/80" value={params.period || ''} onChange={(e) => set('period', e.target.value)}>
          <option value="">الكل</option>
          <option value="day">اليوم</option>
          <option value="week">أسبوع</option>
          <option value="month">شهر</option>
          <option value="year">سنة</option>
        </select>
      </div>
      {extraFilters.map((f) => (
        <div className="min-w-[160px]" key={f.key}>
          <label className="text-xs font-bold text-slate-500 block mb-1">{f.label || f.placeholder || f.key}</label>
          {f.type === 'select' ? (
            <select className="form-input form-select !bg-white/80" value={params[f.key] || ''} onChange={(e) => set(f.key, e.target.value)}>
              <option value="">{f.placeholder || 'الكل'}</option>
              {(f.options || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : (
            <input type={f.type || 'text'} className="form-input !bg-white/80" placeholder={f.placeholder} value={params[f.key] || ''} onChange={(e) => set(f.key, e.target.value)} />
          )}
        </div>
      ))}
      {onExport && (
        <div className="flex items-center gap-2 ms-auto">
          {exportTemplateUrl && (
            <CsvTemplateButton url={exportTemplateUrl} filename={exportTemplateFilename} />
          )}
          <button type="button" onClick={onExport} className="btn btn-secondary flex items-center gap-2">
            <LuDownload size={16} /> تصدير
          </button>
        </div>
      )}
    </div>
  );
}
