import { useState } from 'react';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';
import ConfirmDialog from './ConfirmDialog';

const statusMap = {
  ACTIVE: { label: 'نشط', variant: 'success' },
  TEMPORARILY_SUSPENDED: { label: 'موقف مؤقتاً', variant: 'danger' },
  RESTRICTED: { label: 'مقيّد', variant: 'warning' },
  UNDER_INVESTIGATION: { label: 'تحت التحقيق', variant: 'warning' },
  PENDING_APPROVAL: { label: 'بانتظار الموافقة', variant: 'info' },
  INCOMPLETE_PROFILE: { label: 'ملف غير مكتمل', variant: 'neutral' },
  ARCHIVED: { label: 'مؤرشف', variant: 'neutral' },
  REQUESTED: { label: 'مطلوب', variant: 'info' },
  APPROVED: { label: 'مقبول', variant: 'success' },
  REJECTED: { label: 'مرفوض', variant: 'danger' },
  ENDED: { label: 'منتهي', variant: 'neutral' },
  CANCELLED: { label: 'ملغي', variant: 'neutral' },
  PENDING: { label: 'معلق', variant: 'info' },
  SUBMITTED: { label: 'مقدم', variant: 'info' },
  UNDER_REVIEW: { label: 'قيد المراجعة', variant: 'warning' },
  NEEDS_REVISION: { label: 'يحتاج تعديل', variant: 'warning' },
  VALID: { label: 'صالح', variant: 'success' },
  NEAR_EXPIRY: { label: 'قارب الانتهاء', variant: 'warning' },
  EXPIRED: { label: 'منتهي', variant: 'danger' },
  VERIFIED: { label: 'موثق', variant: 'success' },
  OPEN: { label: 'مفتوح', variant: 'info' },
  IN_PROGRESS: { label: 'قيد التنفيذ', variant: 'warning' },
  ESCALATED: { label: 'مصعّد', variant: 'danger' },
  RESOLVED: { label: 'تم الحل', variant: 'success' },
  CLOSED: { label: 'مغلق', variant: 'neutral' },
  REPORTED: { label: 'مبلغ عنه', variant: 'info' },
  CONFIRMED: { label: 'مؤكد', variant: 'danger' },
  DISMISSED: { label: 'مرفوض', variant: 'neutral' },
  PENALIZED: { label: 'معاقب', variant: 'danger' },
  FLAGGED: { label: 'مشبوه', variant: 'warning' },
  APPLIED: { label: 'مطبق', variant: 'success' },
  APPEALED: { label: 'معترض', variant: 'warning' },
  COMPLETED: { label: 'مكتمل', variant: 'success' },
  PENDING_RESPONSE: { label: 'بانتظار الرد', variant: 'info' },
  PENDING_VERIFICATION: { label: 'بانتظار التحقق', variant: 'info' },
  INACTIVE: { label: 'غير نشط', variant: 'neutral' },
  SUSPENDED: { label: 'موقف', variant: 'danger' },
  IN_MAINTENANCE: { label: 'في الصيانة', variant: 'warning' },
  OUT_OF_SERVICE: { label: 'خارج الخدمة', variant: 'danger' },
  DECOMMISSIONED: { label: 'خارج العمل', variant: 'neutral' },
  LOW: { label: 'منخفض', variant: 'success' },
  MEDIUM: { label: 'متوسط', variant: 'warning' },
  HIGH: { label: 'عالي', variant: 'danger' },
  CRITICAL: { label: 'حرج', variant: 'danger' },
  URGENT: { label: 'عاجل', variant: 'danger' },
  WAIVED: { label: 'معفى عنه', variant: 'success' },
  NEEDS_REVISION: { label: 'يحتاج مراجعة', variant: 'warning' },
};

export default function StatusSelect({
  id, currentStatus, apiUrl, options, onSuccess, size = 'sm', label, payloadKey = 'status',
}) {
  const [saving, setSaving] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const statusLabels = {};
  options.forEach((o) => { statusLabels[o.value] = o.label; });

  const handleOpen = (newStatus) => {
    setPendingStatus(newStatus);
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setSaving(true);
    setShowConfirm(false);
    try {
      await apiService.patch(apiUrl, { [payloadKey]: pendingStatus });
      toast.success('تم تحديث الحالة بن��اح');
      onSuccess?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'حدث خطأ');
    } finally {
      setSaving(false);
      setPendingStatus(null);
    }
  };

  const handleChange = (e) => {
    if (e.target.value && e.target.value !== currentStatus) {
      handleOpen(e.target.value);
    }
  };

  const btnClass = size === 'xs'
    ? 'text-[10px] py-1 px-2 rounded-full border-0 cursor-pointer hover:opacity-80 focus:outline-none focus:ring-1 focus:ring-primary/30'
    : 'form-input form-select text-sm py-1.5 cursor-pointer';

  return (
    <>
      <select
        value={currentStatus}
        onChange={handleChange}
        disabled={saving}
        className={btnClass}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.value === currentStatus}>{o.label}</option>
        ))}
      </select>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => { setShowConfirm(false); setPendingStatus(null); }}
        onConfirm={handleConfirm}
        title="تغيير الحالة"
        message={`هل أنت متأكد من تغيير الحالة إلى "${statusLabels[pendingStatus]}"؟`}
        confirmText="نعم، تغيير"
      />
    </>
  );
}