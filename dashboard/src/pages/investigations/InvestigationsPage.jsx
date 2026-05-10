import { useState } from 'react';
import GenericListPage from '../../components/ui/GenericListPage';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import FileUploadField from '../../components/ui/FileUploadField';
import UserSelect from '../../components/ui/UserSelect';
import { apiService } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LuPlus, LuPencil } from 'react-icons/lu';

const columns = [
  { key: 'user', label: 'الموظف', render: (v) => v?.fullNameAr || '—' },
  { key: 'category', label: 'التصنيف' },
  { key: 'title', label: 'العنوان' },
  { key: 'status', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
  { key: 'createdBy', label: 'أنشئ بواسطة', render: (v) => v?.fullNameAr || '—' },
  { key: '_count', label: 'المرفقات', render: (v) => v?.attachments || 0 },
  { key: 'createdAt', label: 'التاريخ', render: (v) => v ? new Date(v).toLocaleDateString('ar-SA') : '—' },
  { key: 'actions', label: 'الإجراءات', render: (v, row) => (
    <button 
      onClick={(e) => { e.stopPropagation(); }} 
      className="p-2 text-slate-400 hover:text-primary transition-colors"
    >
      <LuPencil size={16} />
    </button>
  ), stopRowClick: true },
];

const statusOptions = [
  { value: 'OPEN', label: 'مفتوح' },
  { value: 'PENDING_RESPONSE', label: 'بانتظار الاستجابة' },
  { value: 'UNDER_REVIEW', label: 'قيد المراجعة' },
  { value: 'CLOSED', label: 'مغلق' },
];

export default function InvestigationsPage() {
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedInvestigation, setSelectedInvestigation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    userId: '',
    category: '',
    title: '',
    details: '',
    internalNotes: '',
    status: 'OPEN',
  });
  const [attachments, setAttachments] = useState([]);

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
      
      if (attachments.length > 0) {
        attachments.forEach(file => {
          formData.append('attachments', file);
        });
      }
      
      await apiService.upload('/investigations', formData);
      toast.success('تم فتح التحقيق بنجاح');
      setShowCreate(false);
      setForm({ userId: '', category: '', title: '', details: '', internalNotes: '', status: 'OPEN' });
      setAttachments([]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('status', form.status);
      formData.append('internalNotes', form.internalNotes);
      formData.append('details', form.details);
      
      if (attachments.length > 0) {
        attachments.forEach(file => {
          formData.append('attachments', file);
        });
      }
      
      await apiService.upload(`/investigations/${selectedInvestigation.id}`, formData);
      toast.success('تم تحديث التحقيق بنجاح');
      setEditModalOpen(false);
      setAttachments([]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (inv) => {
    setSelectedInvestigation(inv);
    setForm({
      userId: inv.userId || '',
      category: inv.category || '',
      title: inv.title || '',
      details: inv.details || '',
      internalNotes: inv.internalNotes || '',
      status: inv.status || 'OPEN',
    });
    setAttachments([]);
    setEditModalOpen(true);
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
          { key: 'driverName', type: 'text', placeholder: 'اسم السائق' },
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

          <FileUploadField
            label="المرفقات (يمكن رفع أكثر من ملف)"
            value={attachments}
            onChange={setAttachments}
            multiple={true}
            accept="image/*,.pdf"
            optional={true}
          />

          <div className="flex gap-4 pt-4">
            <button type="submit" disabled={loading} className="btn btn-primary flex-1">
              {loading ? 'جارٍ الإنشاء...' : 'إنشاء'}
            </button>
            <button type="button" className="btn bg-slate-100 text-slate-500" onClick={() => setShowCreate(false)}>إلغاء</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="تحديث التحقيق">
        <form onSubmit={handleEdit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">الحالة</label>
            <select className="form-input form-select" value={form.status} onChange={handleChange('status')}>
              {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">التفاصيل</label>
            <textarea className="form-input" rows="4" value={form.details} onChange={handleChange('details')} placeholder="اكتب تفاصيل التحقيق..." />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">ملاحظات داخلية</label>
            <textarea className="form-input" rows="3" value={form.internalNotes} onChange={handleChange('internalNotes')} placeholder="ملاحظات داخلية" />
          </div>

          <FileUploadField
            label="إضافة مرفقات جديدة (يمكن رفع أكثر من ملف)"
            value={attachments}
            onChange={setAttachments}
            multiple={true}
            accept="image/*,.pdf"
            optional={true}
          />

          <div className="flex gap-4 pt-4">
            <button type="submit" disabled={loading} className="btn btn-primary flex-1">
              {loading ? 'جارٍ التحديث...' : 'تحديث'}
            </button>
            <button type="button" className="btn bg-slate-100 text-slate-500" onClick={() => setEditModalOpen(false)}>إلغاء</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
