import { useCallback, useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import DataTable from '../../components/ui/DataTable';
import CsvTemplateButton from '../../components/ui/CsvTemplateButton';
import toast from 'react-hot-toast';
import {
  LuCalendar, LuDownload, LuUpload, LuRefreshCw, LuFileSpreadsheet,
  LuUsers, LuClipboardList, LuWallet,
} from 'react-icons/lu';

const SIDE_TABS = [
  { id: 'ON_LEAVE', label: 'الإجازات', icon: LuCalendar },
  { id: 'ABSENT', label: 'الغيابات', icon: LuUsers },
  { id: 'SICK', label: 'المرضى', icon: LuUsers },
  { id: 'LICENSE_FOLLOWUP', label: 'متابعة دلة', icon: LuClipboardList },
  { id: 'NOT_DEPLOYED', label: 'غير نازل', icon: LuUsers },
  { id: 'MANAGEMENT', label: 'الإدارة', icon: LuUsers },
  { id: 'OPERATIONS_DEPT', label: 'قسم التشغيل', icon: LuUsers },
  { id: 'MECHANICS', label: 'الميكانيك', icon: LuUsers },
  { id: 'BOX_MANUFACTURING', label: 'تصنيع صناديق', icon: LuUsers },
  { id: 'EXTERNAL_WORK', label: 'أعمال خارجية', icon: LuUsers },
];

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

  const handleGenerate = async () => {
    try {
      await apiService.post('/operational-reports/generate', { reportDate, cityId: cityId || null });
      await apiService.post('/financial-ledgers/generate', { reportDate });
      toast.success('تم توليد لقطة التقرير');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل التوليد');
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
      const params = { reportDate, category };
      if (cityId) params.cityId = cityId;
      await downloadBlob('/operational-reports/export', params, `operational-${category}-${reportDate}.csv`);
    } catch {
      toast.error('فشل التصدير');
    }
  };

  const exportFinancial = async () => {
    try {
      await downloadBlob('/financial-ledgers/export', { reportDate }, `financial-${reportDate}.csv`);
    } catch {
      toast.error('فشل التصدير');
    }
  };

  const importSection = async (category, file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('reportDate', reportDate);
    fd.append('category', category);
    if (cityId) fd.append('cityId', cityId);
    try {
      await apiService.upload('/operational-reports/import', fd);
      toast.success('تم الاستيراد');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل الاستيراد');
    }
  };

  const importFinancial = async (file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('reportDate', reportDate);
    try {
      await apiService.upload('/financial-ledgers/import', fd);
      toast.success('تم استيراد الكشف المالي');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل الاستيراد');
    }
  };

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

  const sectionRows = bundle?.sections?.[tab] || [];
  const activeSideTab = SIDE_TABS.find((t) => t.id === tab);

  const TabActions = ({ category, onImport }) => (
    <div className="flex flex-wrap gap-2 mb-4">
      <CsvTemplateButton
        url="/operational-reports/template"
        params={{ category }}
        filename={`operational-template-${category}.csv`}
      />
      <button type="button" className="btn btn-secondary text-sm flex items-center gap-2" onClick={() => exportSection(category)}>
        <LuDownload size={16} /> تصدير CSV
      </button>
      <CsvTemplateButton
        url="/operational-reports/template"
        params={{ category }}
        filename={`operational-template-${category}.csv`}
      />
      <label className="btn btn-secondary text-sm flex items-center gap-2 cursor-pointer">
        <LuUpload size={16} /> استيراد CSV
        <input type="file" accept=".csv" className="hidden" onChange={(e) => { onImport(e.target.files?.[0]); e.target.value = ''; }} />
      </label>
    </div>
  );

  return (
    <div className="page-container animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row justify-between items-start gap-6 mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <LuFileSpreadsheet className="text-primary" size={28} />
            تقارير التشغيل اليومية
          </h2>
          <p className="text-sm text-slate-500 mt-1">توليد لأي تاريخ — عرض بجداول — تصدير/استيراد CSV لكل قسم</p>
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
          <button type="button" onClick={load} className="btn btn-secondary" disabled={loading}>
            <LuRefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button type="button" onClick={handleGenerate} className="btn btn-primary">
            توليد / تحديث اللقطة
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-100 pb-2">
        {[
          { id: 'summary', label: 'الملخص' },
          { id: 'DEPLOYED', label: 'نزول الميدان' },
          ...SIDE_TABS,
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
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <SummaryCard label="نازل الميدان" value={bundle.summary.deployedCount} accent="text-emerald-600" />
            <SummaryCard label="غير نازل" value={bundle.summary.notDeployedCount} accent="text-amber-600" />
            <SummaryCard label="إجازات" value={bundle.summary.onLeaveCount} />
            <SummaryCard label="غيابات" value={bundle.summary.absentCount} accent="text-red-500" />
            <SummaryCard label="مرضى" value={bundle.summary.sickCount} />
            <SummaryCard label="متابعة دلة" value={bundle.summary.licenseFollowUpCount} />
          </div>

          <div className="card p-6 bg-gradient-to-br from-white to-slate-50">
            <h3 className="font-black text-slate-800 mb-4">المطلوب والمحقق (قابل للتعديل)</h3>
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-xs font-bold text-slate-500">المطلوب</label>
                <input type="number" className="form-input mt-1" value={summaryForm.required}
                  onChange={(e) => setSummaryForm((f) => ({ ...f, required: e.target.value }))} />
                <p className="text-[10px] text-slate-400 mt-1">تلقائي: {bundle.summary.requiredOrders ?? '—'}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500">المحقق</label>
                <input type="number" className="form-input mt-1" value={summaryForm.achieved}
                  onChange={(e) => setSummaryForm((f) => ({ ...f, achieved: e.target.value }))} />
                <p className="text-[10px] text-slate-400 mt-1">محسوب: {bundle.summary.achievedOrders ?? '—'}</p>
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
            {bundle.status && (
              <span className={`ms-3 text-sm font-bold ${bundle.status === 'FINALIZED' ? 'text-emerald-600' : 'text-amber-600'}`}>
                الحالة: {bundle.status === 'FINALIZED' ? 'مغلق' : 'مسودة'}
              </span>
            )}
          </div>
        </div>
      )}

      {!loading && tab === 'DEPLOYED' && bundle && (
        <>
          <TabActions category="DEPLOYED" onImport={(f) => importSection('DEPLOYED', f)} />
          <DataTable columns={deployedColumns} data={withRowNum(bundle.sections.DEPLOYED)} loading={false} />
        </>
      )}

      {!loading && activeSideTab && bundle && (
        <>
          <TabActions category={tab} onImport={(f) => importSection(tab, f)} />
          <DataTable columns={sideColumns} data={withRowNum(sectionRows)} loading={false}
            emptyMessage={`لا يوجد سجلات في ${activeSideTab.label}`} />
        </>
      )}

      {!loading && tab === 'financial' && financial && (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            <CsvTemplateButton url="/financial-ledgers/template" filename="financial-ledger-template.csv" />
            <button type="button" className="btn btn-secondary text-sm flex items-center gap-2" onClick={exportFinancial}>
              <LuDownload size={16} /> تصدير CSV
            </button>
            <CsvTemplateButton url="/financial-ledgers/template" filename="financial-ledger-template.csv" />
            <label className="btn btn-secondary text-sm flex items-center gap-2 cursor-pointer">
              <LuUpload size={16} /> استيراد CSV
              <input type="file" accept=".csv" className="hidden" onChange={(e) => { importFinancial(e.target.files?.[0]); e.target.value = ''; }} />
            </label>
          </div>
          <DataTable columns={financialColumns} data={withRowNum(financial.rows)} loading={false}
            emptyMessage="لا توجد حركات مالية لهذا التاريخ" />
        </>
      )}
    </div>
  );
}
