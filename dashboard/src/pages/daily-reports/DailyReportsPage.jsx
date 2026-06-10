import { useNavigate } from 'react-router-dom';
import GenericListPage from '../../components/ui/GenericListPage';
import StatusBadge from '../../components/ui/StatusBadge';
import StatusSelect from '../../components/ui/StatusSelect';
import Modal from '../../components/ui/Modal';
import FileUploadField from '../../components/ui/FileUploadField';
import { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
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
  const [form, setForm] = useState({ userId: '', reportDate: '', totalHours: '', totalOrders: '', status: 'SUBMITTED', reviewNotes: '', notes: '' });
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [screenshots, setScreenshots] = useState([]);

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
        setForm({ userId: '', reportDate: '', totalHours: '', totalOrders: '', status: 'SUBMITTED', reviewNotes: '', notes: '' });
      }
      setScreenshots([]);
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
      const formData = new FormData();
      formData.append('userId', form.userId);
      formData.append('reportDate', form.reportDate);
      formData.append('totalHours', form.totalHours);
      formData.append('totalOrders', form.totalOrders);
      
      if (report) {
        formData.append('status', form.status);
        formData.append('reviewNotes', form.reviewNotes);
      }
      
      if (screenshots.length > 0) {
        screenshots.forEach(file => {
          formData.append('screenshots', file);
        });
      }
      
      await onSave(formData);
      onClose();
      toast.success(report ? 'تم تحديث التقرير' : 'تم إنشاء التقرير');
    } catch (error) {
      toast.error('فشل في الحفظ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={report ? 'تحديث التقرير' : 'إنشاء تقرير يومي جديد'}>
      <form onSubmit={handleSubmit} className="space-y-5 max-h-[calc(100vh-200px)] overflow-y-auto">
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
          disabled={!!report}
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

        <FileUploadField
          label="صور الشاشة (يمكن رفع أكثر من صورة)"
          value={screenshots}
          onChange={setScreenshots}
          multiple={true}
          accept="image/*"
          optional={true}
        />

        {report && (
          <>
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">الحالة</label>
              <select
                className="form-input form-select"
                value={form.status}
                onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}
              >
                {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">ملاحظات المراجعة</label>
              <textarea
                className="form-input"
                placeholder="أضف ملاحظاتك على التقرير"
                value={form.reviewNotes}
                onChange={(e) => setForm(f => ({ ...f, reviewNotes: e.target.value }))}
                rows={3}
              />
            </div>
          </>
        )}

        <div className="flex gap-2">
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
    setReloadToken(t => t + 1);
  };

  const handleUpdate = async (formData) => {
    await apiService.upload(`/daily-reports/${selectedReport.id}`, formData);
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
        columns={[...columns.slice(0, -1), {
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
