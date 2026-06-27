import { useCallback, useState, useRef } from 'react';
import { apiService } from '../../services/api';
import { triggerBlobDownload } from '../../utils/downloadCsv';
import { parseCsv } from '../../utils/csvParse';
import { parseSpreadsheetFile, isExampleDriverRow } from '../../utils/spreadsheetParse';
import toast from 'react-hot-toast';
import {
  LuDownload, LuUpload, LuFileSpreadsheet, LuClipboardPaste,
  LuCircleCheck, LuCircleAlert, LuInfo,
} from 'react-icons/lu';

const STEPS = [
  { n: 1, label: 'حمّل القالب' },
  { n: 2, label: 'املأ البيانات' },
  { n: 3, label: 'ارفع الملف' },
  { n: 4, label: 'راجع واستورد' },
];

function FieldTable({ fields }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-100">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-slate-500 text-xs">
            <th className="text-right p-3 font-bold">العمود</th>
            <th className="text-right p-3 font-bold">الوصف</th>
            <th className="text-right p-3 font-bold">إجباري</th>
            <th className="text-right p-3 font-bold">القيم / الافتراضي</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((f) => (
            <tr key={f.key} className="border-t border-slate-50 hover:bg-slate-50/50">
              <td className="p-3 font-mono text-xs text-primary font-bold">{f.label}</td>
              <td className="p-3">
                <p className="font-bold text-slate-700">{f.labelAr}</p>
                {f.hintAr && <p className="text-xs text-slate-400 mt-0.5">{f.hintAr}</p>}
              </td>
              <td className="p-3">
                {f.required ? (
                  <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">نعم</span>
                ) : (
                  <span className="text-xs font-bold text-slate-400">لا</span>
                )}
              </td>
              <td className="p-3 text-xs text-slate-600">
                {f.enumOptions?.length ? (
                  <div className="flex flex-wrap gap-1">
                    {f.enumOptions.map((o) => (
                      <span key={o.value} className="bg-slate-100 px-1.5 py-0.5 rounded font-mono" title={o.labelAr}>
                        {o.value}
                      </span>
                    ))}
                  </div>
                ) : f.defaultOnCreate != null ? (
                  <span className="font-mono">{String(f.defaultOnCreate)}</span>
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ImportWizard({
  meta,
  templateUrl,
  templateParams,
  templateFilename,
  onImport,
  contextValues = null,
}) {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [pasteText, setPasteText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const [previewData, setPreviewData] = useState(null);

  const loadPreviewFromParsed = useCallback((parsed) => {
    if (!parsed?.rows?.length) {
      setPreviewData(null);
      return;
    }
    const exampleId = meta?.exampleIdentity;
    const dataRows = parsed.rows.filter((r) => !(exampleId && isExampleDriverRow(r, exampleId)));
    const displayHeaders = parsed.headers;
    setPreviewData({
      headers: displayHeaders,
      rows: dataRows.slice(0, 8).map((row) => {
        const out = {};
        (meta?.fields || []).forEach((f) => {
          out[f.labelAr || f.key] = row[f.key] || '—';
        });
        return out;
      }),
      total: dataRows.length,
      skippedExample: parsed.rows.length - dataRows.length,
    });
  }, [meta?.exampleIdentity, meta?.fields]);

  const loadPreview = useCallback(async (text) => {
    if (!text?.trim()) {
      setPreviewData(null);
      return;
    }
    loadPreviewFromParsed(parseCsv(text));
  }, [loadPreviewFromParsed]);

  const handleFile = useCallback(async (f) => {
    if (!f) return;
    if (!/\.(csv|xlsx)$/i.test(f.name)) {
      toast.error('يجب أن يكون الملف Excel (.xlsx) أو CSV');
      return;
    }
    setFile(f);
    setPasteText('');
    setResult(null);
    const parsed = await parseSpreadsheetFile(f, meta?.fields);
    loadPreviewFromParsed(parsed);
  }, [loadPreviewFromParsed]);

  const handlePaste = useCallback(async (text) => {
    setPasteText(text);
    setFile(null);
    setResult(null);
    await loadPreview(text);
  }, [loadPreview]);

  const downloadTemplate = async () => {
    try {
      const res = await apiService.get(templateUrl, { ...templateParams, format: 'xlsx' }, { responseType: 'blob' });
      const name = (templateFilename || meta?.templateFilename || 'template.xlsx').replace(/\.csv$/i, '.xlsx');
      triggerBlobDownload(res.data, name);
    } catch {
      toast.error('تعذر تحميل القالب');
    }
  };

  const buildFileForUpload = async () => {
    if (file) return file;
    if (pasteText.trim()) {
      return new File([pasteText], 'pasted-import.csv', { type: 'text/csv' });
    }
    return null;
  };

  const handleImport = async () => {
    const uploadFile = await buildFileForUpload();
    if (!uploadFile) {
      toast.error('ارفع ملف Excel أو CSV أو الصق البيانات أولاً');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await onImport(uploadFile);
      setResult(res);
      const r = res?.data?.data ?? res;
      if (r) {
        if (r.imported != null) {
          toast.success(`تم استيراد ${r.imported} صف`);
        } else {
          const skipped = r.skipped ? `، ${r.skipped} مثال/متخطى` : '';
          toast.success(`تم: ${r.created ?? 0} جديد، ${r.updated ?? 0} محدّث${r.failed ? `، ${r.failed} فشل` : ''}${skipped}`);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل الاستيراد');
    } finally {
      setLoading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  if (!meta) return null;

  return (
    <div className="space-y-8">
      {/* Steps */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STEPS.map((s) => (
          <div key={s.n} className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <span className="w-8 h-8 rounded-xl bg-primary/10 text-primary font-black text-sm flex items-center justify-center shrink-0">
              {s.n}
            </span>
            <span className="text-sm font-bold text-slate-700">{s.label}</span>
          </div>
        ))}
      </div>

      {contextValues && (
        <div className="flex flex-wrap gap-4 p-4 rounded-2xl bg-amber-50 border border-amber-100 text-sm">
          <LuInfo className="text-amber-600 shrink-0" size={18} />
          {Object.entries(contextValues).map(([k, v]) => (
            v ? (
              <span key={k} className="font-bold text-amber-900">
                {k}: <span className="font-mono">{v}</span>
              </span>
            ) : null
          ))}
        </div>
      )}

      {/* Rules */}
      <div className="card">
        <h3 className="text-lg font-black text-slate-800 mb-3 flex items-center gap-2">
          <LuInfo size={20} className="text-primary" />
          قواعد الاستيراد
        </h3>
        <ul className="space-y-2">
          {(meta.rulesAr || []).map((rule, i) => (
            <li key={i} className="text-sm text-slate-600 flex gap-2">
              <span className="text-primary font-bold">•</span>
              {rule}
            </li>
          ))}
        </ul>
      </div>

      {/* Template + fields */}
      <div className="card">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
          <div>
            <h3 className="text-lg font-black text-slate-800">أعمدة القالب</h3>
            <p className="text-sm text-slate-500 mt-1">
              القالب ورقة واحدة برؤوس الأعمدة — املأ البيانات من الصف الثاني مباشرة
            </p>
          </div>
          <button type="button" onClick={downloadTemplate} className="btn btn-primary flex items-center gap-2 shrink-0">
            <LuDownload size={18} />
            تحميل قالب Excel
          </button>
        </div>
        <FieldTable fields={meta.fields || []} />
      </div>

      {/* Upload zone */}
      <div className="card">
        <h3 className="text-lg font-black text-slate-800 mb-4">رفع البيانات</h3>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors mb-6 ${
            dragOver ? 'border-primary bg-primary/5' : 'border-slate-200 bg-slate-50/50'
          }`}
        >
          <LuFileSpreadsheet size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-bold text-slate-600 mb-3">اسحب ملف Excel (.xlsx) أو CSV هنا أو اختر من جهازك</p>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="btn btn-secondary flex items-center gap-2 mx-auto"
          >
            <LuUpload size={18} />
            اختيار ملف
          </button>
          {file && (
            <p className="text-xs text-emerald-600 font-bold mt-3">✓ {file.name}</p>
          )}
        </div>

        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-100" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-3 text-xs font-bold text-slate-400">أو الصق من Excel</span>
          </div>
        </div>

        <textarea
          className="form-input min-h-[120px] font-mono text-xs mb-4"
          placeholder="الصق صفوف CSV هنا (مع سطر العناوين)..."
          value={pasteText}
          onChange={(e) => handlePaste(e.target.value)}
        />
        {pasteText && (
          <p className="text-xs text-slate-400 mb-4 flex items-center gap-1">
            <LuClipboardPaste size={14} /> بيانات ملصوقة — جاهزة للمعاينة
          </p>
        )}

        {previewData && previewData.total > 0 && (
          <div className="mb-6">
            <p className="text-sm font-bold text-slate-600 mb-2">
              معاينة ({Math.min(previewData.rows.length, 8)} من {previewData.total} صف
              {previewData.skippedExample ? ` — تم تجاهل ${previewData.skippedExample} صف مثال` : ''})
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50">
                    {previewData.headers.map((h) => (
                      <th key={h} className="p-2 text-right font-mono text-slate-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.rows.map((row, i) => (
                    <tr key={i} className="border-t border-slate-50">
                      {previewData.headers.map((h) => (
                        <td key={h} className="p-2 text-slate-700 whitespace-nowrap max-w-[140px] truncate">
                          {row[h] || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <button
          type="button"
          disabled={loading || (!file && !pasteText.trim())}
          onClick={handleImport}
          className="btn btn-primary w-full sm:w-auto flex items-center justify-center gap-2"
        >
          <LuUpload size={18} />
          {loading ? 'جاري الاستيراد...' : 'استيراد البيانات'}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="card border-emerald-100 bg-emerald-50/30">
          <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
            <LuCircleCheck className="text-emerald-600" />
            نتيجة الاستيراد
          </h3>
          {(() => {
            const r = result?.data?.data ?? result;
            if (r.imported != null) {
              return (
                <div className="flex flex-wrap gap-4 mb-4">
                  <span className="text-sm font-bold text-emerald-700">صفوف مستوردة: {r.imported}</span>
                </div>
              );
            }
            return (
              <div className="flex flex-wrap gap-4 mb-4">
                <span className="text-sm font-bold text-emerald-700">جديد: {r.created ?? 0}</span>
                <span className="text-sm font-bold text-blue-700">محدّث: {r.updated ?? 0}</span>
                {(r.skipped ?? 0) > 0 && (
                  <span className="text-sm font-bold text-slate-500">متخطى (مثال): {r.skipped}</span>
                )}
                {(r.failed ?? 0) > 0 && (
                  <span className="text-sm font-bold text-rose-700">فشل: {r.failed}</span>
                )}
              </div>
            );
          })()}
          {result?.data?.data?.errors?.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {result.data.data.errors.map((err, i) => (
                <div key={i} className="flex gap-2 text-sm text-rose-700 bg-white rounded-lg p-2 border border-rose-100">
                  <LuCircleAlert size={16} className="shrink-0 mt-0.5" />
                  <span>صف {err.row}: {err.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
