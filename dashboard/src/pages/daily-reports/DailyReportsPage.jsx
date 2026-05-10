import { useNavigate } from 'react-router-dom';
import GenericListPage from '../../components/ui/GenericListPage';
import StatusBadge from '../../components/ui/StatusBadge';
import { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { LuPlus, LuPencil } from 'react-icons/lu';
import toast from 'react-hot-toast';

const columns = [
  { key: 'user', label: 'السائق', render: (v) => v?.fullNameAr || '—' },
  { key: 'reportDate', label: 'تاريخ التقرير', render: (v) => v ? new Date(v).toLocaleDateString('ar-SA') : '—' },
  { key: 'totalHours', label: 'إجمالي الساعات' },
  { key: 'totalOrders', label: 'إجمالي الطلبات' },
  { key: 'status', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
  { key: 'appBreakdowns', label: 'المنصات', render: (v) => v?.length || 0 },
  { key: 'screenshots', label: 'المرفقات', render: (v) => v?.length || 0 },
  { key: 'actions', label: 'الإجراءات', render: (v, row) => (
    <button 
      onClick={(e) => { e.stopPropagation(); /* open update modal */ }} 
      className="p-2 text-slate-400 hover:text-primary transition-colors"
    >
      <LuPencil size={16} />
    </button>
  ), stopRowClick: true },
];

function DailyReportModal({ isOpen, onClose, report, onSave }) {
  const [form, setForm] = useState({ userId: '', reportDate: '', totalHours: '', totalOrders: '' });
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadOptions();
      if (report) {
        setForm({
          userId: report.userId || '',
          reportDate: report.reportDate ? new Date(report.reportDate).toISOString().split('T')[0] : '',
          totalHours: report.totalHours || '',
          totalOrders: report.totalOrders || '',
        });
      } else {
        setForm({ userId: '', reportDate: '', totalHours: '', totalOrders: '' });
      }
    }
  }, [isOpen, report]);

  const loadOptions = async () => {
    try {
      const driversRes = await apiService.get('/users', { role: 'DRIVER', limit: 500 });
      setDrivers(driversRes.data.data);
    } catch (error) {
      console.error('Failed to load options', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(form);
      onClose();
      toast.success(report ? 'تم تحديث التقرير' : 'تم إنشاء التقرير');
    } catch (error) {
      toast.error('فشل في الحفظ');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <h3 className="text-lg font-bold mb-4">{report ? 'تحديث التقرير' : 'إنشاء تقرير يومي جديد'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <select 
            className="form-input form-select" 
            value={form.userId} 
            onChange={(e) => setForm(f => ({ ...f, userId: e.target.value }))}
            required
            disabled={!!report}
          >
            <option value="">اختر السائق</option>
            {drivers.map(d => <option key={d.id} value={d.id}>{d.fullNameAr}</option>)}
          </select>
          <input 
            type="date" 
            className="form-input" 
            value={form.reportDate} 
            onChange={(e) => setForm(f => ({ ...f, reportDate: e.target.value }))}
            required
          />
          <input 
            type="number" 
            step="0.01" 
            className="form-input" 
            placeholder="إجمالي الساعات" 
            value={form.totalHours} 
            onChange={(e) => setForm(f => ({ ...f, totalHours: e.target.value }))}
            required
          />
          <input 
            type="number" 
            className="form-input" 
            placeholder="إجمالي الطلبات" 
            value={form.totalOrders} 
            onChange={(e) => setForm(f => ({ ...f, totalOrders: e.target.value }))}
            required
          />
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary flex-1" disabled={loading}>
              {loading ? 'حفظ...' : 'حفظ'}
            </button>
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DailyReportsPage() {
  const navigate = useNavigate();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);

  const handleCreate = async (form) => {
    await apiService.post('/daily-reports', form);
    setReloadToken(t => t + 1);
  };

  const handleUpdate = async (form) => {
    await apiService.patch(`/daily-reports/${selectedReport.id}/review`, { status: 'APPROVED' }); // assuming update is for review
    setReloadToken(t => t + 1);
  };

  const openUpdateModal = (report) => {
    setSelectedReport(report);
    setUpdateModalOpen(true);
  };

  const createButton = (
    <button 
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
        columns={columns.map(col => col.key === 'actions' ? { ...col, render: (v, row) => (
          <button 
            onClick={(e) => { e.stopPropagation(); openUpdateModal(row); }} 
            className="p-2 text-slate-400 hover:text-primary transition-colors"
          >
            <LuPencil size={16} />
          </button>
        ), stopRowClick: true } : col)} 
        onRowClick={(row) => navigate(`/daily-reports/${row.id}`)} 
        createButton={createButton}
        reloadToken={reloadToken}
        filters={[
          { key: 'driverName', type: 'text', placeholder: 'اسم السائق' },
          { key: 'status', type: 'select', placeholder: 'الحالة', options: [{ value: 'SUBMITTED', label: 'مقدم' }, { value: 'UNDER_REVIEW', label: 'قيد المراجعة' }, { value: 'APPROVED', label: 'مقبول' }, { value: 'REJECTED', label: 'مرفوض' }, { value: 'NEEDS_REVISION', label: 'يحتاج تعديل' }] },
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
