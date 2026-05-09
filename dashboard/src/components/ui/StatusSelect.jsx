import { useState } from 'react';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';
import ConfirmDialog from './ConfirmDialog';

export default function StatusSelect({ id, currentStatus, apiUrl, options, onSuccess, size = 'sm', label }) {
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
      await apiService.patch(apiUrl, { status: pendingStatus });
      toast.success('تم تحديث الحالة بنجاح');
      onSuccess?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'حدث خطأ');
    } finally {
      setSaving(false);
      setPendingStatus(null);
    }
  };

  const handleChange = (e) => {
    handleOpen(e.target.value);
  };

  const btnClass = size === 'xs'
    ? 'text-[10px] py-1 px-2 rounded-full border-0 bg-slate-100 text-slate-600 cursor-pointer hover:bg-slate-200 focus:outline-none focus:ring-1 focus:ring-primary/30'
    : 'form-input form-select text-sm py-1.5 cursor-pointer';

  return (
    <>
      <select
        value={currentStatus}
        onChange={handleChange}
        disabled={saving}
        className={btnClass}
        style={{ backgroundImage: 'none' }}
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
