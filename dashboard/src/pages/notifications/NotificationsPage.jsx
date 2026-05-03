import { useState } from 'react';
import GenericListPage from '../../components/ui/GenericListPage';
import Modal from '../../components/ui/Modal';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';
import { LuSend } from 'react-icons/lu';
import { useSelector } from 'react-redux';
import PermissionGate from '../../components/auth/PermissionGate';
import { hasAnyPermission, PERMISSIONS as P } from '../../utils/rolePermissions';

const columns = [
  { key: 'user', label: 'المستخدم', render: (v) => v?.fullNameAr || '—' },
  { key: 'title', label: 'العنوان' },
  { key: 'category', label: 'التصنيف' },
  { key: 'isRead', label: 'مقروء', render: (v) => v ? 'نعم' : 'لا' },
  { key: 'createdAt', label: 'التاريخ', render: (v) => v ? new Date(v).toLocaleDateString('ar-SA') : '—' },
];

export default function NotificationsPage() {
  const authUser = useSelector((s) => s.auth.user);
  const canSend = hasAnyPermission(authUser?.role, [P.COMPLIANCE_WRITE]);
  const [showSend, setShowSend] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', category: 'GENERAL', role: '' });

  const handleBroadcast = async (e) => {
    e.preventDefault();
    try {
      await apiService.post('/notifications/broadcast', form);
      toast.success('تم إرسال الإشعار');
      setShowSend(false);
    } catch (err) { toast.error(err.response?.data?.message || 'خطأ'); }
  };

  return (
    <>
      <GenericListPage
        title="مركز الإشعارات"
        apiUrl="/notifications/admin/all"
        columns={columns}
        createButton={(
          <PermissionGate anyOf={[P.COMPLIANCE_WRITE]}>
            <button className="btn btn-primary" onClick={() => setShowSend(true)}>
              <LuSend size={16} /> إرسال إشعار
            </button>
          </PermissionGate>
        )}
      />
      <Modal isOpen={showSend} onClose={() => setShowSend(false)} title="إرسال إشعار جماعي">
        <form onSubmit={handleBroadcast}>
          <div className="form-group">
            <label className="form-label">العنوان</label>
            <input className="form-input" required value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">المحتوى</label>
            <textarea className="form-input" rows={3} required value={form.body} onChange={(e) => setForm(f => ({ ...f, body: e.target.value }))} />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">التصنيف</label>
              <select className="form-input form-select" value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}>
                <option value="GENERAL">عام</option>
                <option value="SYSTEM">نظام</option>
                <option value="SHIFT">شفتات</option>
                <option value="DOCUMENT">مستندات</option>
                <option value="COMPLIANCE">امتثال</option>
                <option value="HR">موارد بشرية</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">إرسال لـ</label>
              <select className="form-input form-select" value={form.role} onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="">الجميع</option>
                <option value="DRIVER">السائقين</option>
                <option value="SUPERVISOR">المشرفين</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button type="submit" className="btn btn-primary" disabled={!canSend}>إرسال</button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowSend(false)}>إلغاء</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
