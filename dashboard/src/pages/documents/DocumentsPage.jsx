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

const typeLabels = { NATIONAL_ID: 'هوية وطنية', IQAMA: 'إقامة', PASSPORT: 'جواز سفر', WORK_CONTRACT: 'عقد عمل', RESIDENCE_PERMIT: 'تصريح إقامة', OTHER: 'أخرى' };
const statusOptions = [
  { value: 'PENDING', label: 'معلق' },
  { value: 'VALID', label: 'صالح' },
  { value: 'NEAR_EXPIRY', label: 'قارب الانتهاء' },
  { value: 'EXPIRED', label: 'منتهي' },
  { value: 'UNDER_REVIEW', label: 'قيد المراجعة' },
  { value: 'REJECTED', label: 'مرفوض' },
];

const columns = [
  { key: 'user', label: 'الموظف', render: (v) => v?.fullNameAr || '—' },
  { key: 'type', label: 'النوع', render: (v) => typeLabels[v] || v },
  { key: 'title', label: 'العنوان' },
  { key: 'documentNumber', label: 'رقم المستند' },
  { key: 'expiryDate', label: 'تاريخ الانتهاء', render: (v) => v ? new Date(v).toLocaleDateString('ar-SA') : '—' },
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

function DocumentModal({ isOpen, onClose, document: doc, onSave }) {
  const [form, setForm] = useState({
    userId: '',
    type: 'NATIONAL_ID',
    title: '',
    documentNumber: '',
    issueDate: '',
    expiryDate: '',
    status: 'PENDING',
    reviewNotes: '',
  });
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadOptions();
      if (doc) {
        setForm({
          userId: doc.userId || '',
          type: doc.type || 'NATIONAL_ID',
          title: doc.title || '',
          documentNumber: doc.documentNumber || '',
          issueDate: doc.issueDate ? new Date(doc.issueDate).toISOString().split('T')[0] : '',
          expiryDate: doc.expiryDate ? new Date(doc.expiryDate).toISOString().split('T')[0] : '',
          status: doc.status || 'PENDING',
          reviewNotes: doc.reviewNotes || '',
        });
      } else {
        const today = new Date().toISOString().split('T')[0];
        setForm({
          userId: '',
          type: 'NATIONAL_ID',
          title: '',
          documentNumber: '',
          issueDate: today,
          expiryDate: '',
          status: 'PENDING',
          reviewNotes: '',
        });
      }
      setFile(null);
    }
  }, [isOpen, doc]);

  const loadOptions = async () => {
    try {
      const res = await apiService.get('/users', { role: 'DRIVER', limit: 500 });
      setDrivers(res.data?.data || []);
    } catch (error) {
      console.error('Failed to load options', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.userId || !form.type || !form.title) {
      toast.error('الرجاء تعبئة جميع الحقول المطلوبة');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('userId', form.userId);
      formData.append('type', form.type);
      formData.append('title', form.title);
      formData.append('documentNumber', form.documentNumber);
      formData.append('issueDate', form.issueDate);
      formData.append('expiryDate', form.expiryDate);
      formData.append('status', form.status);
      formData.append('reviewNotes', form.reviewNotes);

      if (file instanceof File) {
        formData.append('file', file);
      }

      await onSave(formData);
      onClose();
      toast.success(doc ? 'تم تحديث المستند' : 'تم إنشاء المستند');
    } catch (error) {
      toast.error('فشل في الحفظ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={doc ? 'تحديث المستند' : 'إنشاء مستند جديد'}>
      <form onSubmit={handleSubmit} className="space-y-5 max-h-[calc(100vh-200px)] overflow-y-auto">
        <div>
          <label className="block text-sm font-bold text-slate-600 mb-2">الموظف *</label>
          <select
            className="form-input form-select"
            value={form.userId}
            onChange={(e) => setForm(f => ({ ...f, userId: e.target.value }))}
            disabled={!!doc}
            required
          >
            <option value="">اختر الموظف</option>
            {drivers.map(d => <option key={d.id} value={d.id}>{d.fullNameAr}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">نوع المستند *</label>
            <select
              className="form-input form-select"
              value={form.type}
              onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))}
              required
            >
              {Object.entries(typeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">رقم المستند</label>
            <input
              type="text"
              className="form-input"
              placeholder="رقم المستند"
              value={form.documentNumber}
              onChange={(e) => setForm(f => ({ ...f, documentNumber: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-600 mb-2">العنوان *</label>
          <input
            type="text"
            className="form-input"
            placeholder="عنوان المستند"
            value={form.title}
            onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">تاريخ الإصدار</label>
            <input
              type="date"
              className="form-input"
              value={form.issueDate}
              onChange={(e) => setForm(f => ({ ...f, issueDate: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">تاريخ الانتهاء</label>
            <input
              type="date"
              className="form-input"
              value={form.expiryDate}
              onChange={(e) => setForm(f => ({ ...f, expiryDate: e.target.value }))}
            />
          </div>
        </div>

        <FileUploadField
          label="ملف المستند"
          value={file || (doc?.fileUrl && !Array.isArray(doc?.fileUrl) ? [doc.fileUrl] : null)}
          onChange={setFile}
          multiple={false}
          accept=".pdf,.jpg,.jpeg,.png"
          optional={true}
        />

        {doc && (
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
                placeholder="أضف ملاحظاتك على المستند"
                value={form.reviewNotes}
                onChange={(e) => setForm(f => ({ ...f, reviewNotes: e.target.value }))}
                rows={3}
              />
            </div>
          </>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'جارٍ الحفظ...' : 'حفظ'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function DocumentsPage() {
  const navigate = useNavigate();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);

  const handleCreate = async (form) => {
    await apiService.upload('/documents', form);
    setReloadToken(t => t + 1);
  };

  const handleUpdate = async (form) => {
    await apiService.upload(`/documents/${selectedDocument.id}`, form);
    setReloadToken(t => t + 1);
  };

  const openUpdateModal = (document) => {
    setSelectedDocument(document);
    setUpdateModalOpen(true);
  };

  const createButton = (
    <button 
      onClick={() => setCreateModalOpen(true)} 
      className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-2xl hover:bg-primary-dark transition-colors font-bold"
    >
      <LuPlus size={18} />
      إضافة مستند
    </button>
  );

  return (
    <>
      <GenericListPage 
        title="إدارة المستندات" 
        apiUrl="/documents" 
        columns={[...columns.slice(0, -1), {
          key: 'actions',
          label: '',
          stopRowClick: true,
          render: (_, row) => (
            <div className="flex items-center gap-2">
              <StatusSelect
                id={row.id}
                currentStatus={row.status}
                apiUrl={`/documents/${row.id}`}
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
        onRowClick={(row) => navigate(`/documents/${row.id}`)} 
        createButton={createButton}
        reloadToken={reloadToken}
        filters={[
          { key: 'driverName', type: 'text', placeholder: 'اسم السائق' },
          { key: 'type', type: 'select', placeholder: 'نوع المستند', options: Object.entries(typeLabels).map(([v, l]) => ({ value: v, label: l })) },
          { key: 'status', type: 'select', placeholder: 'الحالة', options: statusOptions },
        ]} 
      />
      <DocumentModal 
        isOpen={createModalOpen} 
        onClose={() => setCreateModalOpen(false)} 
        onSave={handleCreate} 
      />
      <DocumentModal 
        isOpen={updateModalOpen} 
        onClose={() => setUpdateModalOpen(false)} 
        document={selectedDocument} 
        onSave={handleUpdate} 
      />
    </>
  );
}