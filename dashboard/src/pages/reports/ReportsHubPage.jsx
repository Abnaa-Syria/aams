import { useCallback, useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import DataTable from '../../components/ui/DataTable';
import toast from 'react-hot-toast';
import {
  LuSearch, LuUser, LuCalendarRange, LuUserX, LuDownload, LuFileSpreadsheet,
} from 'react-icons/lu';

const TABS = [
  { id: 'search', label: 'بحث موحد', icon: LuSearch },
  { id: 'dossier', label: 'ملف السائق', icon: LuUser },
  { id: 'attendance', label: 'حضور فترة', icon: LuCalendarRange },
  { id: 'absence', label: 'غياب وتأخير', icon: LuUserX },
];

const STATUS_LABELS = {
  DEPLOYED: 'نازل الميدان',
  ON_LEAVE: 'إجازة',
  SICK: 'مرضي',
  LICENSE_FOLLOWUP: 'متابعة دلة',
  PERMISSION: 'استئذان',
  NOT_DEPLOYED: 'غير نازل',
  ABSENT: 'غائب',
};

function statusLabel(key) {
  return STATUS_LABELS[key] || key;
}

function defaultRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    dateFrom: start.toISOString().slice(0, 10),
    dateTo: end.toISOString().slice(0, 10),
  };
}

function downloadBlob(res, filename) {
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}

export default function ReportsHubPage() {
  const [tab, setTab] = useState('search');
  const [range, setRange] = useState(defaultRange);
  const [cityId, setCityId] = useState('');
  const [cities, setCities] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [userId, setUserId] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [searchType, setSearchType] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [dossier, setDossier] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [absence, setAbsence] = useState(null);

  useEffect(() => {
    Promise.all([
      apiService.get('/users', { role: 'DRIVER', limit: 500 }),
      apiService.get('/operational-reports/bundle', { reportDate: new Date().toISOString().slice(0, 10) }),
    ]).then(([driversRes, opsRes]) => {
      setDrivers(driversRes.data.data || []);
      setCities(opsRes.data.data?.cities || []);
    }).catch(() => {});
  }, []);

  const periodParams = () => ({
    ...range,
    ...(cityId && { cityId }),
    ...(userId && { userId }),
  });

  const runSearch = async () => {
    if (!searchQ.trim()) {
      toast.error('أدخل رقم الهوية أو الاسم أو اللوحة');
      return;
    }
    setLoading(true);
    try {
      const res = await apiService.get('/reports/unified-search', {
        q: searchQ.trim(),
        type: searchType || undefined,
        ...range,
      });
      setSearchResult(res.data.data);
      if (!res.data.data?.found) toast.error('لم يتم العثور على نتائج');
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل البحث');
    } finally {
      setLoading(false);
    }
  };

  const loadDossier = useCallback(async () => {
    if (!userId) {
      toast.error('اختر السائق');
      return;
    }
    setLoading(true);
    try {
      const res = await apiService.get(`/reports/driver-dossier/${userId}`, range);
      setDossier(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل تحميل الملف');
    } finally {
      setLoading(false);
    }
  }, [userId, range]);

  const loadAttendance = async () => {
    setLoading(true);
    try {
      const res = await apiService.get('/reports/attendance-period', periodParams());
      setAttendance(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل تحميل التقرير');
    } finally {
      setLoading(false);
    }
  };

  const loadAbsence = async () => {
    setLoading(true);
    try {
      const res = await apiService.get('/reports/absence-report', periodParams());
      setAbsence(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل تحميل التقرير');
    } finally {
      setLoading(false);
    }
  };

  const exportDossier = async () => {
    if (!userId) return;
    try {
      const res = await apiService.get(`/reports/driver-dossier/${userId}/export`, { ...range, format: 'xlsx' }, { responseType: 'blob' });
      downloadBlob(res, `driver-dossier-${userId}.xlsx`);
    } catch {
      toast.error('فشل التصدير');
    }
  };

  const exportAbsence = async () => {
    try {
      const res = await apiService.get('/reports/absence-report/export', { ...periodParams(), format: 'xlsx' }, { responseType: 'blob' });
      downloadBlob(res, `absence-${range.dateFrom}-${range.dateTo}.xlsx`);
    } catch {
      toast.error('فشل التصدير');
    }
  };

  useEffect(() => {
    if (tab === 'dossier' && userId) loadDossier();
  }, [tab, userId, loadDossier]);

  const attendanceColumns = [
    { key: 'date', label: 'التاريخ' },
    { key: 'fullNameAr', label: 'السائق' },
    { key: 'branch', label: 'الفرع', render: (v) => v || '—' },
    { key: 'statusLabel', label: 'الحالة' },
    { key: 'notes', label: 'ملاحظات', render: (v) => v || '—' },
    { key: 'totalOrders', label: 'طلبات', render: (v) => v ?? '—' },
  ];

  const driverSummaryColumns = [
    { key: 'fullNameAr', label: 'السائق' },
    { key: 'identityNumber', label: 'الهوية' },
    { key: 'branch', label: 'الفرع', render: (v) => v || '—' },
    { key: 'deployedDays', label: 'نزول' },
    { key: 'absentDays', label: 'غياب' },
    { key: 'notDeployedDays', label: 'غير نازل' },
    { key: 'leaveDays', label: 'إجازات' },
    { key: 'permissionDays', label: 'استئذان' },
  ];

  return (
    <div className="page-container animate-in fade-in duration-500">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <LuFileSpreadsheet className="text-primary" size={28} />
          مركز التقارير المتقدمة
        </h2>
        <p className="text-sm text-slate-500 mt-1">بحث موحد، ملف السائق، حضور الفترة، والغياب والتأخير</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              tab === t.id ? 'bg-primary text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="card mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div>
          <label className="text-xs font-bold text-slate-500 block mb-1">من تاريخ</label>
          <input type="date" className="form-input" value={range.dateFrom} onChange={(e) => setRange((r) => ({ ...r, dateFrom: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 block mb-1">إلى تاريخ</label>
          <input type="date" className="form-input" value={range.dateTo} onChange={(e) => setRange((r) => ({ ...r, dateTo: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 block mb-1">الفرع</label>
          <select className="form-input form-select" value={cityId} onChange={(e) => setCityId(e.target.value)}>
            <option value="">كل الفروع</option>
            {cities.map((c) => <option key={c.id} value={c.id}>{c.nameAr}</option>)}
          </select>
        </div>
        {tab !== 'search' && (
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1">السائق (اختياري)</label>
            <select className="form-input form-select" value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">كل السائقين</option>
              {drivers.map((d) => <option key={d.id} value={d.id}>{d.fullNameAr}</option>)}
            </select>
          </div>
        )}
      </div>

      {tab === 'search' && (
        <div className="space-y-6">
          <div className="card flex flex-col md:flex-row gap-3">
            <input
              className="form-input flex-1"
              placeholder="رقم الهوية، الاسم، اللوحة، رقم 700..."
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
            />
            <select className="form-input form-select md:w-40" value={searchType} onChange={(e) => setSearchType(e.target.value)}>
              <option value="">تلقائي</option>
              <option value="identity">هوية</option>
              <option value="plate">لوحة</option>
              <option value="700">رقم 700</option>
            </select>
            <button type="button" onClick={runSearch} disabled={loading} className="btn btn-primary">
              بحث
            </button>
          </div>

          {searchResult?.found && (
            <div className="space-y-4">
              <div className="card bg-emerald-50/50 border-emerald-100">
                <p className="font-black text-slate-800">{searchResult.dossier.user.fullNameAr}</p>
                <p className="text-sm text-slate-500">{searchResult.dossier.user.identityNumber} · {searchResult.matchType}</p>
              </div>
              {searchResult.dossier.attendanceSummary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    ['نزول', searchResult.dossier.attendanceSummary.deployedDays],
                    ['غياب', searchResult.dossier.attendanceSummary.absentDays],
                    ['إجازات', searchResult.dossier.attendanceSummary.leaveDays],
                    ['استئذان', searchResult.dossier.attendanceSummary.permissionDays],
                  ].map(([label, val]) => (
                    <div key={label} className="bg-white rounded-xl p-3 border border-slate-100">
                      <p className="text-xs text-slate-400">{label}</p>
                      <p className="text-xl font-black">{val ?? 0}</p>
                    </div>
                  ))}
                </div>
              )}
              <DataTable
                columns={attendanceColumns}
                data={searchResult.dossier.attendanceDays || []}
                loading={false}
                emptyMessage="لا توجد أيام في الفترة"
              />
            </div>
          )}
        </div>
      )}

      {tab === 'dossier' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button type="button" onClick={loadDossier} disabled={loading || !userId} className="btn btn-primary">تحميل الملف</button>
            <button type="button" onClick={exportDossier} disabled={!userId} className="btn btn-secondary flex items-center gap-2">
              <LuDownload size={16} /> Excel متعدد الأوراق
            </button>
          </div>
          {dossier && (
            <>
              <div className="card">
                <h3 className="font-black text-slate-800 mb-2">{dossier.user.fullNameAr}</h3>
                <p className="text-sm text-slate-500">{dossier.user.identityNumber} · {dossier.user.city?.nameAr || '—'}</p>
              </div>
              {dossier.attendanceSummary && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    ['نزول', dossier.attendanceSummary.deployedDays],
                    ['غياب', dossier.attendanceSummary.absentDays],
                    ['غير نازل', dossier.attendanceSummary.notDeployedDays],
                    ['إجازات', dossier.attendanceSummary.leaveDays],
                    ['استئذان', dossier.attendanceSummary.permissionDays],
                  ].map(([label, val]) => (
                    <div key={label} className="bg-white rounded-xl p-3 border border-slate-100">
                      <p className="text-xs text-slate-400">{label}</p>
                      <p className="text-xl font-black">{val ?? 0}</p>
                    </div>
                  ))}
                </div>
              )}
              <DataTable columns={attendanceColumns} data={dossier.attendanceDays || []} loading={false} />
            </>
          )}
        </div>
      )}

      {tab === 'attendance' && (
        <div className="space-y-4">
          <button type="button" onClick={loadAttendance} disabled={loading} className="btn btn-primary">عرض حضور الفترة</button>
          {attendance && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(attendance.summaryByStatus || {}).map(([k, v]) => (
                  <div key={k} className="bg-white rounded-xl p-3 border border-slate-100">
                    <p className="text-xs text-slate-400">{statusLabel(k)}</p>
                    <p className="text-xl font-black">{v}</p>
                  </div>
                ))}
              </div>
              <h3 className="font-bold text-slate-700">ملخص السائقين</h3>
              <DataTable columns={driverSummaryColumns} data={attendance.driverSummaries || []} loading={false} />
              <h3 className="font-bold text-slate-700">تفاصيل الأيام</h3>
              <DataTable columns={attendanceColumns} data={attendance.rows || []} loading={false} />
            </>
          )}
        </div>
      )}

      {tab === 'absence' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button type="button" onClick={loadAbsence} disabled={loading} className="btn btn-primary">عرض الغياب والتأخير</button>
            <button type="button" onClick={exportAbsence} className="btn btn-secondary flex items-center gap-2">
              <LuDownload size={16} /> Excel
            </button>
          </div>
          {absence && (
            <>
              <DataTable columns={driverSummaryColumns} data={absence.driverSummaries || []} loading={false} emptyMessage="لا توجد بيانات" />
              <h3 className="font-bold text-slate-700">سجلات الغياب</h3>
              <DataTable columns={attendanceColumns} data={absence.absences || []} loading={false} />
              {absence.tardiness?.length > 0 && (
                <>
                  <h3 className="font-bold text-slate-700">التأخيرات (أكثر من 15 دقيقة)</h3>
                  <DataTable
                    columns={[
                      { key: 'date', label: 'التاريخ' },
                      { key: 'fullNameAr', label: 'السائق' },
                      { key: 'delayMinutes', label: 'دقائق التأخير' },
                      { key: 'notes', label: 'ملاحظات' },
                    ]}
                    data={absence.tardiness}
                    loading={false}
                  />
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
