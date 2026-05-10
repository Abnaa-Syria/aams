import { useState } from 'react';
import GenericListPage from '../../components/ui/GenericListPage';
import StatusBadge from '../../components/ui/StatusBadge';
import StatusSelect from '../../components/ui/StatusSelect';
import Modal from '../../components/ui/Modal';
import FileUploadField from '../../components/ui/FileUploadField';
import UserSelect from '../../components/ui/UserSelect';
import { apiService } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LuPlus, LuPencil, LuEye } from 'react-icons/lu';

const leaveTypeLabels = { ANNUAL: 'سنوية', SICK: 'مرضية', EMERGENCY: 'طارئة', UNPAID: 'بدون راتب', OTHER: 'أخرى' };
const statusOptions = [
  { value: 'PENDING', label: 'معلق' },
  { value: 'APPROVED', label: 'مقبول' },
  { value: 'REJECTED', label: 'مرفوض' },
  { value: 'CANCELLED', label: 'ملغي' },
];

const columns = [
  { key: 'user', label: 'الموظف', render: (v) => v?.fullNameAr || '—' },
  { key: 'leaveType', label: 'النوع', render: (v) => leaveTypeLabels[v] || v },
  { key: 'startDate', label: 'من', render: (v) => v ? new Date(v).toLocaleDateString('ar-SA') : '—' },
  { key: 'endDate', label: 'إلى', render: (v) => v ? new Date(v).toLocaleDateString('ar-SA') : '—' },
  { key: 'totalDays', label: 'عدد الأيام' },
  { key: 'status', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
  { key: 'actions', label: 'الإجراءات', render: (v, row) => (
    <button 
      onClick={(e) => { e.stopPropagation(); /* open update modal */ }} 
      className="p-2 text-slate-400 hover:text-primary transition-colors"
    >
      <LuPencil size={16} />
    </button>
  ), stopRowClick: true },
];

function LeaveModal({ isOpen, onClose, leave, onSave }) {
  const [form, setForm] = useState({
    userId: '',
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: '',
    status: 'PENDING',
    reviewNotes: '',
  });
  const [attachment, setAttachment] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.userId || !form.leaveType || !form.startDate || !form.endDate || !form.reason) {
      toast.error('يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('userId', form.userId);
      formData.append('leaveType', form.leaveType);
      formData.append('startDate', form.startDate);
      formData.append('endDate', form.endDate);
      formData.append('reason', form.reason);
      formData.append('status', form.status);
      formData.append('reviewNotes', form.reviewNotes);

      if (attachment instanceof File) {
        formData.append('attachment', attachment);
      }

      await onSave(formData);
      toast.success(leave ? 'تم تحديث طلب الإجازة' : 'تم إنشاء طلب الإجازة');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  const openEdit = () => {
    if (leave) {
      setForm({
        userId: leave.userId || '',
        leaveType: leave.leaveType || '',
        startDate: leave.startDate ? new Date(leave.startDate).toISOString().split('T')[0] : '',
        endDate: leave.endDate ? new Date(leave.endDate).toISOString().split('T')[0] : '',
        reason: leave.reason || '',
        status: leave.status || 'PENDING',
        reviewNotes: leave.reviewNotes || '',
      });
    } else {
      setForm({ userId: '', leaveType: '', startDate: '', endDate: '', reason: '', status: 'PENDING', reviewNotes: '' });
    }
    setAttachment(null);
  };

  if (isOpen) {
    if (!leave && form.userId === '' && form.leaveType === '') {
      openEdit();
    } else if (leave && form.userId === '') {
      openEdit();
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={leave ? 'تحديث طلب الإجازة' : 'إضافة طلب إجازة جديد'}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <UserSelect 
          value={form.userId} 
          onChange={(v) => setForm((f) => ({ ...f, userId: v }))} 
          required 
          disabled={!!leave}
        />

        <div>
          <label className="block text-sm font-bold text-slate-600 mb-2">نوع الإجازة</label>
          <select className="form-input form-select" value={form.leaveType} onChange={handleChange('leaveType')} required disabled={!!leave}>
            <option value="">اختر النوع</option>
            {Object.entries(leaveTypeLabels).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">من تاريخ</label>
            <input type="date" className="form-input" value={form.startDate} onChange={handleChange('startDate')} required disabled={!!leave} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">إلى تاريخ</label>
            <input type="date" className="form-input" value={form.endDate} onChange={handleChange('endDate')} required disabled={!!leave} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-600 mb-2">السبب</label>
          <textarea className="form-input" rows="3" value={form.reason} onChange={handleChange('reason')} required placeholder="اكتب سبب الإجازة..." disabled={!!leave} />
        </div>

        <FileUploadField
          label="مرفق (إثبات)"
          value={attachment || (leave?.attachmentUrl && !Array.isArray(leave?.attachmentUrl) ? [leave.attachmentUrl] : null)}
          onChange={setAttachment}
          multiple={false}
          accept="image/*,.pdf"
          optional={true}
        />

        {leave && (
          <>
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">الحالة</label>
              <select className="form-input form-select" value={form.status} onChange={handleChange('status')}>
                {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">ملاحظات المراجعة</label>
              <textarea className="form-input" rows="3" value={form.reviewNotes} onChange={handleChange('reviewNotes')} placeholder="أضف ملاحظاتك..." />
            </div>
          </>
        )}

        <div className="flex gap-4 pt-4">
          <button type="submit" disabled={loading} className="btn btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? 'جارٍ الحفظ...' : 'حفظ'}
          </button>
          <button type="button" className="btn bg-slate-100 text-slate-500" onClick={onClose}>إلغاء</button>
        </div>
      </form>
    </Modal>
  );
}

export default function LeavesPage() {
  const navigate = useNavigate();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);

  const handleCreate = async (formData) => {
    await apiService.upload('/leave-requests', formData);
    setReloadToken(t => t + 1);
  };

  const handleUpdate = async (formData) => {
    await apiService.upload(`/leave-requests/${selectedLeave.id}`, formData);
    setReloadToken(t => t + 1);
  };

  const openUpdateModal = (leave) => {
    setSelectedLeave(leave);
    setUpdateModalOpen(true);
  };

  const createButton = (
    <button onClick={() => setCreateModalOpen(true)} className="btn btn-primary flex items-center gap-2">
      <LuPlus size={18} />
      <span>إضافة إجازة</span>
    </button>
  );

  const actionsColumn = {
    key: 'actions',
    label: '',
    stopRowClick: true,
    render: (_, row) => (
      <div className="flex items-center gap-2">
        <StatusSelect
          id={row.id}
          currentStatus={row.status}
          apiUrl={`/leave-requests/${row.id}/review`}
          options={statusOptions}
          size="xs"
          onSuccess={() => setReloadToken((t) => t + 1)}
        />
        <button
          onClick={() => navigate(`/leaves/${row.id}`)}
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-primary hover:bg-primary-light/10 transition-all"
        >
          <LuEye size={16} />
        </button>
      </div>
    ),
  };

  return (
    <>
      <GenericListPage
        title="طلبات الإجازة"
        apiUrl="/leave-requests"
        columns={columns.map(col => col.key === 'actions' ? { ...col, render: (v, row) => (
          <button 
            onClick={(e) => { e.stopPropagation(); openUpdateModal(row); }} 
            className="p-2 text-slate-400 hover:text-primary transition-colors"
          >
            <LuPencil size={16} />
          </button>
        ), stopRowClick: true } : col.key === 'actions' && col.stopRowClick ? col : col).length > 0 ? columns : [...columns.slice(0, -1), actionsColumn]}
        onRowClick={(row) => navigate(`/leaves/${row.id}`)}
        createButton={createButton}
        reloadToken={reloadToken}
        filters={[
          { key: 'driverName', type: 'text', placeholder: 'اسم السائق' },
          { key: 'leaveType', type: 'select', placeholder: 'النوع', options: Object.entries(leaveTypeLabels).map(([v, l]) => ({ value: v, label: l })) },
          { key: 'status', type: 'select', placeholder: 'الحالة', options: statusOptions },
        ]}
      />

      <LeaveModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSave={handleCreate}
      />
      <LeaveModal
        isOpen={updateModalOpen}
        onClose={() => setUpdateModalOpen(false)}
        leave={selectedLeave}
        onSave={handleUpdate}
      />
    </>
  );
}