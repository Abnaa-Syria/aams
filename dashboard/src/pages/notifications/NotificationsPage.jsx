import { useState } from 'react';
import GenericListPage from '../../components/ui/GenericListPage';
import Modal from '../../components/ui/Modal';
import { apiService } from '../../services/api';
import toast from 'react-hot-toast';
import { LuSend } from 'react-icons/lu';
import PermissionGate from '../../components/auth/PermissionGate';
import { PERMISSIONS as P } from '../../utils/rolePermissions';

const columns = [
  { key: 'user', label: 'المستخدم', render: (v) => v?.fullNameAr || '—' },
  { key: 'title', label: 'العنوان' },
  { key: 'category', label: 'التصنيف' },
  { key: 'isRead', label: 'مقروء', render: (v) => v ? 'نعم' : 'لا' },
  { key: 'createdAt', label: 'التاريخ', render: (v) => v ? new Date(v).toLocaleDateString('ar-SA') : '—' },
];

export default function NotificationsPage() {
  const [showSend, setShowSend] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [form, setForm] = useState({ title: '', body: '', category: 'GENERAL', role: '' });
  const [refresh, setRefresh] = useState(0);

  const handleBroadcast = async (e) => {
    e.preventDefault();
    try {
      await apiService.post('/notifications/broadcast', form);
      toast.success('تم إرسال الإشعار بنجاح');
      setShowSend(false);
      setForm({ title: '', body: '', category: 'GENERAL', role: '' });
      setRefresh(prev => prev + 1);
    } catch (err) { 
      toast.error(err.response?.data?.message || 'فشل في إرسال الإشعار'); 
    }
  };

  return (
    <>
      <GenericListPage
        key={refresh}
        title="مركز الإشعارات"
        apiUrl="/notifications/admin/all"
        columns={columns}
        onRowClick={(row) => setSelectedRow(row)}
        createButton={(
          <PermissionGate anyOf={[P.COMPLIANCE_WRITE]}>
            <button className="flex items-center gap-2 px-6 py-3 bg-brand-primary text-white rounded-2xl font-black text-sm shadow-orange hover:bg-brand-primary-hover transition-all" onClick={() => setShowSend(true)}>
              <LuSend size={16} /> إرسال إشعار
            </button>
          </PermissionGate>
        )}
        filters={[
          { key: 'isRead', type: 'select', placeholder: 'القراءة', options: [{ value: 'true', label: 'مقروء' }, { value: 'false', label: 'غير مقروء' }] },
          { key: 'category', type: 'select', placeholder: 'التصنيف', options: [
            { value: 'GENERAL', label: 'عام' },
            { value: 'SYSTEM', label: 'نظام' },
            { value: 'SHIFT', label: 'شفتات' },
            { value: 'DOCUMENT', label: 'مستندات' },
            { value: 'COMPLIANCE', label: 'امتثال' },
            { value: 'HR', label: 'موارد بشرية' },
          ] },
        ]}
      />

      {/* Broadcast Modal */}
      <Modal isOpen={showSend} onClose={() => setShowSend(false)} title="إرسال إشعار جماعي">
        <form onSubmit={handleBroadcast} className="space-y-5 py-2">
          <div className="space-y-2">
            <label className="text-sm font-black text-slate-700">العنوان</label>
            <input className="form-input" required value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="عنوان الإشعار..." />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-black text-slate-700">المحتوى</label>
            <textarea className="form-input resize-none" rows={4} required value={form.body} onChange={(e) => setForm(f => ({ ...f, body: e.target.value }))} placeholder="اكتب محتوى الإشعار هنا..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-700">التصنيف</label>
              <select className="form-input select" value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}>
                <option value="GENERAL">عام</option>
                <option value="SYSTEM">نظام</option>
                <option value="SHIFT">شفتات</option>
                <option value="DOCUMENT">مستندات</option>
                <option value="COMPLIANCE">امتثال</option>
                <option value="HR">موارد بشرية</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-black text-slate-700">إرسال لـ</label>
              <select className="form-input select" value={form.role} onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="">الجميع</option>
                <option value="DRIVER">السائقين</option>
                <option value="SUPERVISOR">المشرفين</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" className="px-6 py-3 border border-slate-200 text-slate-600 rounded-xl font-black text-sm hover:bg-slate-50 transition-all" onClick={() => setShowSend(false)}>إلغاء</button>
            <button type="submit" className="px-8 py-3 bg-brand-primary text-white rounded-xl font-black text-sm shadow-orange hover:bg-brand-primary-hover transition-all">إرسال الآن</button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={!!selectedRow} onClose={() => setSelectedRow(null)} title="تفاصيل الإشعار">
        {selectedRow && (
          <div className="space-y-6 py-2 text-right">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <h4 className="text-xl font-black text-slate-800 mb-2">{selectedRow.title}</h4>
              <p className="text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">{selectedRow.body || 'لا يوجد محتوى لهذا الإشعار'}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-100">
                <span className="text-[0.7rem] font-black text-slate-400 uppercase block mb-1">المستلم</span>
                <span className="text-sm font-bold text-slate-700">{selectedRow.user?.fullNameAr || '—'}</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-100">
                <span className="text-[0.7rem] font-black text-slate-400 uppercase block mb-1">التصنيف</span>
                <span className="text-sm font-bold text-slate-700">{selectedRow.category}</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-100">
                <span className="text-[0.7rem] font-black text-slate-400 uppercase block mb-1">الحالة</span>
                <span className={`text-sm font-bold ${selectedRow.isRead ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {selectedRow.isRead ? 'مقروء' : 'غير مقروء'}
                </span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-100">
                <span className="text-[0.7rem] font-black text-slate-400 uppercase block mb-1">تاريخ الإرسال</span>
                <span className="text-sm font-bold text-slate-700">
                  {new Date(selectedRow.createdAt).toLocaleString('ar-SA')}
                </span>
              </div>
            </div>
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button onClick={() => setSelectedRow(null)} className="px-8 py-3 bg-slate-800 text-white rounded-xl font-black text-sm transition-all hover:bg-slate-900">إغلاق</button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
