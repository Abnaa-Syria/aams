import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../../services/api';
import DataTable from '../../components/ui/DataTable';
import { operationalImportPath } from '../../config/importModules';
import { DRIVER_ROSTER_TABS, HIDDEN_ROSTER_CATEGORIES } from '../../config/operationalReportTabs';
import toast from 'react-hot-toast';
import {
  LuDownload, LuUpload, LuRefreshCw, LuFileSpreadsheet, LuWallet, LuInfo,
} from 'react-icons/lu';

function SummaryCard({ label, value, accent = 'text-slate-800' }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
      <p className="text-xs font-bold text-slate-400 mb-1">{label}</p>
      <p className={`text-2xl font-black ${accent}`}>{value ?? '—'}</p>
    </div>
  );
}

export default function OperationalReportsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [reportDate, setReportDate] = useState(today);
  const [cityId, setCityId] = useState('');
  const [tab, setTab] = useState('summary');
  const [bundle, setBundle] = useState(null);
  const [financial, setFinancial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [summaryForm, setSummaryForm] = useState({ required: '', achieved: '', notes: '' });
  const [showAdvanced, setShowAdvanced] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { reportDate };
      if (cityId) params.cityId = cityId;
      const [opsRes, finRes] = await Promise.all([
        apiService.get('/operational-reports/bundle', params),
        apiService.get('/financial-ledgers/bundle', { reportDate }),
      ]);
      const data = opsRes.data.data;
      setBundle(data);
      setFinancial(finRes.data.data);
      setSummaryForm({
        required: data.summary?.requiredOrdersDisplay ?? data.summary?.requiredOrders ?? '',
        achieved: data.summary?.achievedOrdersDisplay ?? data.summary?.achievedOrders ?? '',
        notes: data.summary?.summaryNotes ?? '',
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'تعذر تحميل التقرير');
    } finally {
      setLoading(false);
    }
  }, [reportDate, cityId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (HIDDEN_ROSTER_CATEGORIES.has(tab)) setTab('summary');
  }, [tab]);

  const handleGenerate = async () => {
    try {
      await apiService.post('/operational-reports/generate', { reportDate, cityId: cityId || null });
      await apiService.post('/financial-ledgers/generate', { reportDate });
      toast.success('تم تثبيت التقرير — البيانات التلقائية محدّثة');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل التثبيت');
    }
  };

  const saveSummary = async () => {
    if (!bundle?.reportId) {
      await handleGenerate();
      return;
    }
    try {
      await apiService.patch(`/operational-reports/${bundle.reportId}/summary`, {
        requiredOrdersManual: summaryForm.required,
        achievedOrdersManual: summaryForm.achieved,
        summaryNotes: summaryForm.notes,
      });
      toast.success('تم حفظ الملخص');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل الحفظ');
    }
  };

  const downloadBlob = async (url, params, filename) => {
    const res = await apiService.get(url, params, { responseType: 'blob' });
    const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    a.click();
  };

  const exportSection = async (category) => {
    try {
      const params = { reportDate, category, format: 'xlsx' };
      if (cityId) params.cityId = cityId;
      await downloadBlob('/operational-reports/export', params, `operational-${category}-${reportDate}.xlsx`);
    } catch {
      toast.error('فشل التصدير');
    }
  };

  const exportAll = async () => {
    try {
      const params = { reportDate, format: 'xlsx' };
      if (cityId) params.cityId = cityId;
      await downloadBlob('/operational-reports/export-all', params, `operational-report-all-${reportDate}.xlsx`);
      toast.success('تم تصدير التقرير الكامل');
    } catch {
      toast.error('فشل التصدير');
    }
  };

  const exportFinancial = async () => {
    try {
      await downloadBlob('/financial-ledgers/export', { reportDate, format: 'xlsx' }, `financial-${reportDate}.xlsx`);
    } catch {
      toast.error('فشل التصدير');
    }
  };

  const importContext = { reportDate, cityId };
  const platforms = bundle?.platforms || [];
  const withRowNum = (rows) => (rows || []).map((r, i) => ({ ...r, _rowNum: i + 1 }));

  const deployedColumns = [
    { key: '_rowNum', label: '#' },
    { key: 'name', label: 'الاسم', render: (_, r) => r.user?.fullNameAr || '—' },
    { key: 'identity', label: 'رقم الهوية', render: (_, r) => r.user?.identityNumber || '—' },
    { key: 'branch', label: 'الفرع', render: (_, r) => r.user?.city?.nameAr || '—' },
    ...platforms.map((p) => ({
      key: p.nameAr,
      label: p.nameAr,
      render: (_, r) => r.platformOrders?.[p.nameAr] ?? 0,
    })),
    {
      key: 'total',
      label: 'الإجمالي',
      render: (_, r) => Object.values(r.platformOrders || {}).reduce((a, v) => a + (Number(v) || 0), 0),
    },
    { key: 'notes', label: 'ملاحظات', render: (_, r) => r.notes || '—' },
  ];

  const sideColumns = [
    { key: '_rowNum', label: '#' },
    { key: 'name', label: 'الاسم', render: (_, r) => r.user?.fullNameAr || '—' },
    { key: 'identity', label: 'رقم الهوية', render: (_, r) => r.user?.identityNumber || '—' },
    { key: 'notes', label: 'ملاحظات', render: (_, r) => r.notes || '—' },
  ];

  const financialColumns = [
    { key: '_rowNum', label: '#' },
    { key: 'name', label: 'الاسم', render: (_, r) => r.user?.fullNameAr || '—' },
    { key: 'identity', label: 'رقم الإقامة', render: (_, r) => r.user?.identityNumber || '—' },
    { key: 'deductions', label: 'خصومات', render: (_, r) => r.deductionsAmount ?? '—' },
    { key: 'dedNote', label: 'ملاحظات خصم', render: (_, r) => r.deductionsNote || '—' },
    { key: 'violations', label: 'مخالفات', render: (_, r) => r.violationsAmount ?? '—' },
    { key: 'traffic', label: 'مرور', render: (_, r) => r.trafficAmount ?? '—' },
    { key: 'rewards', label: 'مكافآت', render: (_, r) => r.rewardsAmount ?? '—' },
    { key: 'advances', label: 'سلفة', render: (_, r) => r.advancesAmount ?? '—' },
  ];

  const activeRosterTab = DRIVER_ROSTER_TABS.find((t) => t.id === tab);
  const sectionRows = bundle?.sections?.[tab] || [];

  const TabActions = ({ category, allowImport = false }) => (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <button type="button" className="btn btn-secondary text-sm flex items-center gap-2" onClick={() => exportSection(category)}>
        <LuDownload size={16} /> تصدير Excel
      </button>
      {allowImport && showAdvanced && (
        <Link
          to={operationalImportPath(category, importContext)}
          className="btn btn-secondary text-sm flex items-center gap-2 border-dashed"
        >
          <LuUpload size={16} /> تعديل من Excel
        </Link>
      )}
    </div>
  );

  const statusLabel = bundle?.status === 'FINALIZED' ? 'مغلق' : bundle?.reportId ? 'مسودة محفوظة' : 'معاينة فقط';

  return (
    <div className="page-container animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row justify-between items-start gap-6 mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <LuFileSpreadsheet className="text-primary" size={28} />
            تقارير التشغيل اليومية
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            عرض تلقائي من الشفتات والإجازات والتقارير اليومية — ثبّت التقرير عند نهاية اليوم
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1">تاريخ التقرير</label>
            <input type="date" className="form-input" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1">الفرع</label>
            <select className="form-input form-select min-w-[160px]" value={cityId} onChange={(e) => setCityId(e.target.value)}>
              <option value="">كل الفروع</option>
              {(bundle?.cities || []).map((c) => <option key={c.id} value={c.id}>{c.nameAr}</option>)}
            </select>
          </div>
          <button type="button" onClick={load} className="btn btn-secondary" disabled={loading} title="تحديث المعاينة">
            <LuRefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button type="button" onClick={exportAll} className="btn btn-secondary flex items-center gap-2" title="تصدير كل الأقسام في ملف Excel واحد">
            <LuDownload size={16} /> Excel شامل
          </button>
          <button type="button" onClick={handleGenerate} className="btn btn-primary" title="حفظ التقرير الرسمي لهذا التاريخ والفرع">
            تثبيت التقرير لليوم
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-3 mb-6 p-4 rounded-2xl bg-blue-50/80 border border-blue-100 text-sm text-slate-700">
        <LuInfo className="text-primary shrink-0 mt-0.5" size={18} />
        <div className="space-y-1">
          <p>
            <span className="font-bold">المعاينة:</span> الجداول تتحدث تلقائياً عند تغيير التاريخ أو الضغط على تحديث.
            {' '}
            <span className="font-bold">التثبيت:</span> يحفظ لقطة رسمية في النظام (مسودة) ويحدّث الأقسام التلقائية.
          </p>
          <p className="text-xs text-slate-500">
            الحالة الحالية: <span className="font-bold text-slate-700">{statusLabel}</span>
            {' · '}
            الاستيراد من Excel اختياري — افتح «خيارات متقدمة» عند الحاجة فقط.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="ms-auto text-xs font-bold text-primary hover:underline shrink-0"
        >
          {showAdvanced ? 'إخفاء الخيارات المتقدمة' : 'خيارات متقدمة (استيراد Excel)'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-100 pb-2">
        {[
          { id: 'summary', label: 'الملخص' },
          { id: 'DEPLOYED', label: 'نزول الميدان' },
          ...DRIVER_ROSTER_TABS,
          { id: 'financial', label: 'الكشف المالي', icon: LuWallet },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              tab === t.id ? 'bg-primary text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {!loading && tab === 'summary' && bundle && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <SummaryCard label="نازل الميدان" value={bundle.summary.deployedCount} accent="text-emerald-600" />
            <SummaryCard label="غير نازل" value={bundle.summary.notDeployedCount} accent="text-amber-600" />
            <SummaryCard label="إجازات" value={bundle.summary.onLeaveCount} />
            <SummaryCard label="استئذانات" value={bundle.summary.permissionCount} accent="text-violet-600" />
            <SummaryCard label="غيابات" value={bundle.summary.absentCount} accent="text-red-500" />
            <SummaryCard label="مرضى" value={bundle.summary.sickCount} />
            <SummaryCard label="متابعة دلة" value={bundle.summary.licenseFollowUpCount} />
          </div>

          <div className="card p-6 bg-gradient-to-br from-white to-slate-50">
            <h3 className="font-black text-slate-800 mb-1">المطلوب والمحقق</h3>
            <p className="text-xs text-slate-500 mb-4">يمكنك تعديل الأرقام يدوياً بعد التثبيت — القيم التلقائية للمراجعة فقط</p>
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-xs font-bold text-slate-500">المطلوب</label>
                <input type="number" className="form-input mt-1" value={summaryForm.required}
                  onChange={(e) => setSummaryForm((f) => ({ ...f, required: e.target.value }))} />
                <p className="text-[10px] text-slate-400 mt-1">هدف الفرع: {bundle.summary.requiredOrders ?? '—'}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">المحقق</label>
                <input type="number" className="form-input mt-1" value={summaryForm.achieved}
                  onChange={(e) => setSummaryForm((f) => ({ ...f, achieved: e.target.value }))} />
                <p className="text-[10px] text-slate-400 mt-1">محسوب من الميدان: {bundle.summary.achievedOrders ?? '—'}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">الفرق</label>
                <div className="form-input mt-1 bg-slate-100 font-black text-lg">
                  {summaryForm.required !== '' && summaryForm.achieved !== ''
                    ? Number(summaryForm.achieved) - Number(summaryForm.required)
                    : bundle.summary.difference ?? '—'}
                </div>
              </div>
            </div>
            <div className="mb-4">
              <label className="text-xs font-bold text-slate-500">ملاحظات الملخص</label>
              <textarea className="form-input mt-1" rows={2} value={summaryForm.notes}
                onChange={(e) => setSummaryForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            <button type="button" className="btn btn-primary" onClick={saveSummary}>حفظ الملخص</button>
          </div>
        </div>
      )}

      {!loading && tab === 'DEPLOYED' && bundle && (
        <>
          <p className="text-sm text-slate-500 mb-3">يُملأ تلقائياً من الشفتات النشطة والتقارير اليومية المعتمدة</p>
          <TabActions category="DEPLOYED" allowImport />
          <DataTable columns={deployedColumns} data={withRowNum(bundle.sections.DEPLOYED)} loading={false} />
        </>
      )}

      {!loading && activeRosterTab && bundle && (
        <>
          <p className="text-sm text-slate-500 mb-3">يُملأ تلقائياً من بيانات النظام — للعرض والتصدير فقط</p>
          <TabActions category={tab} />
          <DataTable columns={sideColumns} data={withRowNum(sectionRows)} loading={false}
            emptyMessage={`لا يوجد سجلات في ${activeRosterTab.label}`} />
        </>
      )}

      {!loading && tab === 'financial' && financial && (
        <>
          <p className="text-sm text-slate-500 mb-3">كشف الخصومات والمكافآت — يُحدَّث عند تثبيت التقرير</p>
          <div className="flex flex-wrap gap-2 mb-4">
            <button type="button" className="btn btn-secondary text-sm flex items-center gap-2" onClick={exportFinancial}>
              <LuDownload size={16} /> تصدير Excel
            </button>
            {showAdvanced && (
              <Link
                to={operationalImportPath('financial', importContext)}
                className="btn btn-secondary text-sm flex items-center gap-2 border-dashed"
              >
                <LuUpload size={16} /> تعديل من Excel
              </Link>
            )}
          </div>
          <DataTable columns={financialColumns} data={withRowNum(financial.rows)} loading={false}
            emptyMessage="لا توجد حركات مالية لهذا التاريخ" />
        </>
      )}
    </div>
  );
}
