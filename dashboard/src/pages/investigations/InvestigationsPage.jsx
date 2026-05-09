import { useState } from 'react';
import GenericListPage from '../../components/ui/GenericListPage';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import UserSelect from '../../components/ui/UserSelect';
import { apiService } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LuPlus } from 'react-icons/lu';

const columns = [
  { key: 'user', label: 'الموظف', render: (v) => v?.fullNameAr || '—' },
  { key: 'category', label: 'التصنيف' },
  { key: 'title', label: 'العنوان' },
  { key: 'status', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
  { key: 'createdBy', label: 'أنشئ بواسطة', render: (v) => v?.fullNameAr || '—' },
  { key: '_count', label: 'المرفقات', render: (v) => v?.attachments || 0 },
  { key: 'createdAt', label: 'التاريخ', render: (v) => v ? new Date(v).toLocaleDateString('ar-SA') : '—' },
];

export default function InvestigationsPage() {
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    userId: '',
    category: '',
    title: '',
    details: '',
    internalNotes: '',
  });

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.userId || !form.title || !form.details) {
      toast.error('يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('userId', form.userId);
      if (form.category) formData.append('category', form.category);
      formData.append('title', form.title);
      formData.append('details', form.details);
      if (form.internalNotes) formData.append('internalNotes', form.internalNotes);
      await apiService.upload('/investigations', formData);
      toast.success('تم فتح التحقيق بنجاح');
      setShowCreate(false);
      setForm({ userId: '', category: '', title: '', details: '', internalNotes: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  const createButton = (
    <button onClick={() => setShowCreate(true)} className="btn btn-primary flex items-center gap-2">
      <LuPlus size={18} />
      <span>فتح تحقيق</span>
    </button>
  );

  return (
    <>
      <GenericListPage
        title="التحقيقات"
        apiUrl="/investigations"
        columns={columns}
        onRowClick={(row) => navigate(`/investigations/${row.id}`)}
        createButton={createButton}
        filters={[
          { key: 'status', type: 'select', placeholder: 'الحالة', options: [{ value: 'OPEN', label: 'مفتوح' }, { value: 'PENDING_RESPONSE', label: 'بانتظار الرد' }, { value: 'UNDER_REVIEW', label: 'قيد المراجعة' }, { value: 'CLOSED', label: 'مغلق' }] },
        ]}
      />

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="فتح تحقيق جديد">
        <form onSubmit={handleCreate} className="space-y-5">
          <UserSelect value={form.userId} onChange={(v) => setForm((f) => ({ ...f, userId: v }))} required />

          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">التصنيف</label>
            <select className="form-input form-select" value={form.category} onChange={handleChange('category')}>
              <option value="">اختر التصنيف (اختياري)</option>
              <option value="ACCIDENT">حادث</option>
              <option value="COMPLAINT">شكوى</option>
              <option value="MISCONDUCT">سوء سلوك</option>
              <option value="VIOLATION">مخالفة</option>
              <option value="OTHER">أخرى</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">العنوان</label>
            <input type="text" className="form-input" value={form.title} onChange={handleChange('title')} required placeholder="عنوان التحقيق" />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">التفاصيل</label>
            <textarea className="form-input" rows="4" value={form.details} onChange={handleChange('details')} required placeholder="اكتب تفاصيل التحقيق..." />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">ملاحظات داخلية</label>
            <textarea className="form-input" rows="3" value={form.internalNotes} onChange={handleChange('internalNotes')} placeholder="ملاحظات داخلية (غير مرئية للموظف)" />
          </div>

          <div className="flex gap-4 pt-4">
            <button type="submit" disabled={loading} className="btn btn-primary flex-1">
              {loading ? 'جارٍ الإنشاء...' : 'إنشاء'}
            </button>
            <button type="button" className="btn bg-slate-100 text-slate-500" onClick={() => setShowCreate(false)}>إلغاء</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
