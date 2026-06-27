import { useNavigate } from 'react-router-dom';
import GenericListPage from '../../components/ui/GenericListPage';
import StatusBadge from '../../components/ui/StatusBadge';
import StatusSelect from '../../components/ui/StatusSelect';
import Modal from '../../components/ui/Modal';
import FileUploadField from '../../components/ui/FileUploadField';
import { useState, useEffect, useMemo } from 'react';
import { apiService } from '../../services/api';
import { formDataToObject } from '../../utils/formData';
import { LuPlus, LuPencil } from 'react-icons/lu';
import toast from 'react-hot-toast';

const statusOptions = [
  { value: 'SUBMITTED', label: 'مقدم' },
  { value: 'UNDER_REVIEW', label: 'قيد المراجعة' },
  { value: 'APPROVED', label: 'موافق عليه' },
  { value: 'REJECTED', label: 'مرفوض' },
  { value: 'NEEDS_REVISION', label: 'يحتاج مراجعة' },
];

const columns = [
  { key: 'user', label: 'السائق', render: (v) => v?.fullNameAr || '—' },
  { key: 'reportDate', label: 'تاريخ التقرير', render: (v) => v ? new Date(v).toLocaleDateString('ar-SA') : '—' },
  { key: 'totalHours', label: 'إجمالي الساعات' },
  { key: 'totalOrders', label: 'إجمالي الطلبات' },
  {
    key: 'appBreakdowns',
    label: 'المنصات',
    render: (v) => {
      if (!v?.length) return '—';
      return v.map((b) => `${b.platformName}: ${b.orders ?? 0}`).join(' · ');
    },
  },
  { key: 'status', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
  { key: 'screenshots', label: 'المرفقات', render: (v) => v?.length || 0 },
];

function buildPlatformOrdersFromReport(report, platforms) {
  const map = {};
  platforms.forEach((p) => { map[p.id] = ''; });
  (report?.appBreakdowns || []).forEach((b) => {
    const match = platforms.find(
      (p) => p.nameAr === b.platformName || p.nameEn === b.platformName,
    );
    if (match) map[match.id] = String(b.orders ?? '');
  });
  return map;
}

function DailyReportModal({ isOpen, onClose, report, onSave }) {
  const [form, setForm] = useState({
    userId: '', reportDate: '', totalHours: '', totalOrders: '', status: 'SUBMITTED', reviewNotes: '', notes: '',
  });
  const [drivers, setDrivers] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [platformOrders, setPlatformOrders] = useState({});
  const [loading, setLoading] = useState(false);
  const [screenshots, setScreenshots] = useState([]);

  const ordersSum = useMemo(
    () => Object.values(platformOrders).reduce((sum, v) => sum + (parseInt(v, 10) || 0), 0),
    [platformOrders],
  );

  useEffect(() => {
    if (isOpen) {
      loadOptions();
      if (report) {
        setForm({
          userId: report.userId || '',
          reportDate: report.reportDate ? new Date(report.reportDate).toISOString().split('T')[0] : '',
          totalHours: report.totalHours || '',
          totalOrders: report.totalOrders || '',
          status: report.status || 'SUBMITTED',
          reviewNotes: report.reviewNotes || '',
          notes: report.notes || '',
        });
      } else {
        setForm({
          userId: '', reportDate: new Date().toISOString().slice(0, 10), totalHours: '', totalOrders: '',
          status: 'SUBMITTED', reviewNotes: '', notes: '',
        });
      }
      setScreenshots([]);
    }
  }, [isOpen, report]);

  useEffect(() => {
    if (isOpen && platforms.length) {
      setPlatformOrders(buildPlatformOrdersFromReport(report, platforms));
    }
  }, [isOpen, report, platforms]);

  const loadOptions = async () => {
    try {
      const [driversRes, platformsRes] = await Promise.all([
        apiService.get('/users', { role: 'DRIVER', limit: 500 }),
        apiService.get('/platforms'),
      ]);
      setDrivers(driversRes.data.data);
      const activePlatforms = (platformsRes.data.data || []).filter((p) => p.isActive !== false);
      setPlatforms(activePlatforms);
    } catch (error) {
      console.error('Failed to load options', error);
    }
  };

  const handlePlatformOrderChange = (platformId, value) => {
    setPlatformOrders((prev) => ({ ...prev, [platformId]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!report && !form.userId) {
      toast.error('اختر السائق');
      return;
    }

    const breakdowns = platforms
      .map((p) => ({
        platformName: p.nameAr,
        orders: parseInt(platformOrders[p.id], 10) || 0,
      }))
      .filter((b) => b.orders > 0);

    let totalOrders;
    if (breakdowns.length) {
      totalOrders = breakdowns.reduce((s, b) => s + b.orders, 0);
    } else {
      totalOrders = parseInt(form.totalOrders, 10);
    }

    if (!totalOrders || Number.isNaN(totalOrders)) {
      toast.error('أدخل عدد الطلبات على الأقل لمنصة واحدة');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      if (!report) {
        formData.append('userId', form.userId);
        formData.append('reportDate', form.reportDate);
        formData.append('totalHours', form.totalHours);
        formData.append('totalOrders', String(totalOrders));
        if (form.notes) formData.append('notes', form.notes);
        if (breakdowns.length) {
          formData.append('appBreakdowns', JSON.stringify(breakdowns));
        }
      } else {
        formData.append('status', form.status);
        formData.append('reviewNotes', form.reviewNotes);
      }

      screenshots.forEach((file) => {
        formData.append('screenshots', file);
      });

      await onSave(formData);
      onClose();
      toast.success(report ? 'تم تحديث التقرير' : 'تم إنشاء التقرير');
    } catch (error) {
      toast.error(error.response?.data?.message || 'فشل في الحفظ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={report ? 'مراجعة التقرير' : 'إنشاء تقرير يومي جديد'}>
      <form onSubmit={handleSubmit} className="space-y-5 max-h-[calc(100vh-200px)] overflow-y-auto">
        {!report && (
          <>
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">السائق</label>
              <select
                className="form-input form-select"
                value={form.userId}
                onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}
                required
              >
                <option value="">اختر السائق</option>
                {drivers.map((d) => <option key={d.id} value={d.id}>{d.fullNameAr}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">تاريخ التقرير</label>
              <input
                type="date"
                className="form-input"
                value={form.reportDate}
                onChange={(e) => setForm((f) => ({ ...f, reportDate: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">إجمالي ساعات العمل</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-input"
                placeholder="مثال: 8"
                value={form.totalHours}
                onChange={(e) => setForm((f) => ({ ...f, totalHours: e.target.value }))}
                required
              />
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-black text-slate-800">الطلبات حسب المنصة</label>
                <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
                  الإجمالي: {ordersSum}
                </span>
              </div>
              <p className="text-xs text-slate-500">أدخل عدد الطلبات لكل منصة — يُحسب الإجمالي تلقائياً</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {platforms.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-slate-100">
                    <span className="text-sm font-bold text-slate-700 flex-1 min-w-0 truncate">{p.nameAr}</span>
                    <input
                      type="number"
                      min="0"
                      className="form-input !w-24 !py-2 text-center"
                      placeholder="0"
                      value={platformOrders[p.id] ?? ''}
                      onChange={(e) => handlePlatformOrderChange(p.id, e.target.value)}
                    />
                  </div>
                ))}
              </div>
              {!platforms.length && (
                <>
                  <p className="text-xs text-amber-600">لا توجد منصات نشطة — أدخل الإجمالي يدوياً</p>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    placeholder="إجمالي الطلبات"
                    value={form.totalOrders}
                    onChange={(e) => setForm((f) => ({ ...f, totalOrders: e.target.value }))}
                    required
                  />
                </>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">ملاحظات (اختياري)</label>
              <textarea
                className="form-input"
                rows={2}
                placeholder="أي ملاحظات على التقرير..."
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>

            <FileUploadField
              label="صور الشاشة (اختياري)"
              value={screenshots}
              onChange={setScreenshots}
              multiple
              accept="image/*"
              optional
            />
          </>
        )}

        {report && (
          <>
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 space-y-2 text-sm">
              <p><span className="font-bold text-slate-500">السائق:</span> {report.user?.fullNameAr || '—'}</p>
              <p><span className="font-bold text-slate-500">التاريخ:</span> {report.reportDate ? new Date(report.reportDate).toLocaleDateString('ar-SA') : '—'}</p>
              <p><span className="font-bold text-slate-500">الطلبات:</span> {report.totalOrders ?? '—'}</p>
            </div>

            {report.appBreakdowns?.length > 0 && (
              <div className="rounded-2xl border border-slate-100 overflow-hidden">
                <div className="px-4 py-2 bg-slate-50 text-xs font-bold text-slate-500">تفصيل المنصات</div>
                <table className="w-full text-sm">
                  <tbody>
                    {report.appBreakdowns.map((b) => (
                      <tr key={b.id ?? b.platformName} className="border-t border-slate-50">
                        <td className="px-4 py-2 font-bold text-slate-700">{b.platformName}</td>
                        <td className="px-4 py-2 text-left">{b.orders ?? 0} طلب</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">الحالة</label>
              <select
                className="form-input form-select"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">ملاحظات المراجعة</label>
              <textarea
                className="form-input"
                placeholder="أضف ملاحظاتك على التقرير"
                value={form.reviewNotes}
                onChange={(e) => setForm((f) => ({ ...f, reviewNotes: e.target.value }))}
                rows={3}
              />
            </div>
          </>
        )}

        <div className="flex gap-2 pt-2">
          <button type="submit" className="btn btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-60" disabled={loading}>
            {loading ? 'حفظ...' : 'حفظ'}
          </button>
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1">إلغاء</button>
        </div>
      </form>
    </Modal>
  );
}

export default function DailyReportsPage() {
  const navigate = useNavigate();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);

  const handleCreate = async (formData) => {
    await apiService.upload('/daily-reports', formData);
    setReloadToken((t) => t + 1);
  };

  const handleUpdate = async (formData) => {
    const { status, reviewNotes } = formDataToObject(formData);
    await apiService.patch(`/daily-reports/${selectedReport.id}/review`, { status, reviewNotes });
    setReloadToken((t) => t + 1);
  };

  const openUpdateModal = (report) => {
    setSelectedReport(report);
    setUpdateModalOpen(true);
  };

  const createButton = (
    <button
      type="button"
      onClick={() => setCreateModalOpen(true)}
      className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-2xl hover:bg-primary-dark transition-colors font-bold"
    >
      <LuPlus size={18} />
      إضافة تقرير يومي
    </button>
  );

  return (
    <>
      <GenericListPage
        title="التقارير اليومية"
        apiUrl="/daily-reports"
        columns={[...columns, {
          key: 'actions',
          label: '',
          stopRowClick: true,
          render: (_, row) => (
            <div className="flex items-center gap-2">
              <StatusSelect
                id={row.id}
                currentStatus={row.status}
                apiUrl={`/daily-reports/${row.id}/review`}
                options={statusOptions}
                size="xs"
                onSuccess={() => setReloadToken((t) => t + 1)}
              />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); openUpdateModal(row); }}
                className="p-2 text-slate-400 hover:text-primary transition-colors"
              >
                <LuPencil size={16} />
              </button>
            </div>
          ),
        }]}
        onRowClick={(row) => navigate(`/daily-reports/${row.id}`)}
        createButton={createButton}
        reloadToken={reloadToken}
        filters={[
          { key: 'driverName', type: 'text', placeholder: 'اسم السائق' },
          { key: 'status', type: 'select', placeholder: 'الحالة', options: statusOptions },
          { key: 'dateFrom', type: 'date', placeholder: 'من تاريخ' },
          { key: 'dateTo', type: 'date', placeholder: 'إلى تاريخ' },
        ]}
      />
      <DailyReportModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSave={handleCreate}
      />
      <DailyReportModal
        isOpen={updateModalOpen}
        onClose={() => setUpdateModalOpen(false)}
        report={selectedReport}
        onSave={handleUpdate}
      />
    </>
  );
}
