import { useState } from 'react';
import { useSelector } from 'react-redux';
import GenericListPage from '../../components/ui/GenericListPage';
import StatusBadge from '../../components/ui/StatusBadge';
import StatusSelect from '../../components/ui/StatusSelect';
import Modal from '../../components/ui/Modal';
import FileUploadField from '../../components/ui/FileUploadField';
import UserSelect from '../../components/ui/UserSelect';
import PermissionGate from '../../components/auth/PermissionGate';
import { apiService } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LuPlus, LuPencil, LuEye } from 'react-icons/lu';
import { isSupervisorUser, PERMISSIONS, hasAnyPermissionForUser } from '../../utils/rolePermissions';

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
];

function LeaveModal({ isOpen, onClose, leave, onSave, selfMode = false, currentUserId = null }) {
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
    const effectiveUserId = selfMode ? currentUserId : form.userId;
    if (!effectiveUserId || !form.leaveType || !form.startDate || !form.endDate || !form.reason) {
      toast.error('يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('userId', effectiveUserId);
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
        {!selfMode && (
          <UserSelect
            value={form.userId}
            onChange={(v) => setForm((f) => ({ ...f, userId: v }))}
            required
            disabled={!!leave}
          />
        )}

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

function SupervisorReviewButtons({ row, onDone }) {
  const handleReview = async (approved) => {
    try {
      await apiService.patch(`/leave-requests/${row.id}/supervisor-review`, {
        approved,
        status: approved ? 'APPROVED' : 'REJECTED',
      });
      toast.success(approved ? 'تمت التوصية بالموافقة' : 'تم الرفض');
      onDone?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشلت المراجعة');
    }
  };

  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => handleReview(true)} className="px-2 py-1 text-[10px] font-bold rounded-lg bg-emerald-50 text-emerald-700">توصية</button>
      <button type="button" onClick={() => handleReview(false)} className="px-2 py-1 text-[10px] font-bold rounded-lg bg-rose-50 text-rose-700">رفض</button>
    </div>
  );
}

export default function LeavesPage() {
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);
  const supervisor = isSupervisorUser(user);
  const canFinalReview = hasAnyPermissionForUser(user, [PERMISSIONS.HR_APPROVE]);
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
    <PermissionGate anyOf={[PERMISSIONS.HR_WRITE]}>
      <button onClick={() => setCreateModalOpen(true)} className="btn btn-primary flex items-center gap-2">
        <LuPlus size={18} />
        <span>{supervisor ? 'طلب إجازة لي' : 'إضافة إجازة'}</span>
      </button>
    </PermissionGate>
  );

  const actionsColumn = {
    key: 'actions',
    label: '',
    stopRowClick: true,
    render: (_, row) => (
      <div className="flex items-center gap-2">
        {supervisor && row.userId !== user?.id && row.status === 'PENDING' && !row.supervisorApproved && (
          <SupervisorReviewButtons row={row} onDone={() => setReloadToken((t) => t + 1)} />
        )}
        {canFinalReview && (
          <StatusSelect
            id={row.id}
            currentStatus={row.status}
            apiUrl={`/leave-requests/${row.id}/review`}
            options={statusOptions}
            size="xs"
            onSuccess={() => setReloadToken((t) => t + 1)}
          />
        )}
        <button
          onClick={() => openUpdateModal(row)}
          className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-primary hover:bg-primary-light/10 transition-all"
        >
          <LuPencil size={16} />
        </button>
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
        columns={[...columns, actionsColumn]}
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
        selfMode={supervisor}
        currentUserId={user?.id}
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