import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiService } from '../../services/api';
import StatusBadge from '../../components/ui/StatusBadge';
import AttachmentGallery from '../../components/attachments/AttachmentGallery';
import Modal from '../../components/ui/Modal';
import FileUploadField from '../../components/ui/FileUploadField';
import {
  LuChevronLeft,
  LuUser,
  LuTruck,
  LuWrench,
  LuClock,
  LuText,
  LuHash,
  LuPencil,
} from 'react-icons/lu';

function formatDateTime(v) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleString('ar-SA');
  } catch {
    return '—';
  }
}

function LabelValue({ label, value, icon: Icon }) {
  return (
    <div className="flex items-start gap-3">
      {Icon ? (
        <div className="w-9 h-9 rounded-2xl bg-brand-light text-brand-primary flex items-center justify-center shadow-sm ring-1 ring-brand-primary/10">
          <Icon size={18} />
        </div>
      ) : null}
      <div className="min-w-0">
        <div className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</div>
        <div className="text-[0.95rem] font-bold text-slate-700 break-words">{value ?? '—'}</div>
      </div>
    </div>
  );
}

const statusOptions = [
  { value: 'REQUESTED', label: 'مطلوب' },
  { value: 'APPROVED', label: 'مقبول' },
  { value: 'IN_PROGRESS', label: 'قيد التنفيذ' },
  { value: 'COMPLETED', label: 'مكتمل' },
  { value: 'CANCELLED', label: 'ملغي' },
];

const priorityOptions = [
  { value: 'LOW', label: 'منخفض' },
  { value: 'MEDIUM', label: 'متوسط' },
  { value: 'HIGH', label: 'عالي' },
  { value: 'URGENT', label: 'عاجل' },
];

export default function MaintenanceRequestDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState(null);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    status: 'REQUESTED',
    priority: 'MEDIUM',
    technicianNotes: '',
    adminNotes: '',
  });
  const [newAttachments, setNewAttachments] = useState([]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data } = await apiService.get(`/maintenance-requests/${id}`);
      setItem(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'تعذر تحميل تفاصيل طلب الصيانة');
      navigate('/maintenance-requests');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount data fetch
    void load();
  }, [load]);

  const galleryItems = useMemo(() => {
    if (!item || !id) return [];
    if (item.attachments?.length) {
      return item.attachments.map((att, idx) => ({
        key: `att-${att.id ?? idx}`,
        label: att.fileName || `مرفق ${idx + 1}`,
        fileUrl: att.fileUrl,
        fileName: att.fileName,
        mimeType: att.fileType,
        downloadUrl: `/maintenance-requests/${id}/attachments/${att.id}/download`,
      }));
    }
    if (item.attachmentUrl) {
      const name = String(item.attachmentUrl).split('/').pop() || 'attachment';
      return [
        {
          key: 'legacy',
          label: 'مرفق الطلب',
          fileUrl: item.attachmentUrl,
          fileName: name,
          downloadUrl: `/maintenance-requests/${id}/attachment/download`,
        },
      ];
    }
    return [];
  }, [item, id]);

  const openEditModal = () => {
    setEditForm({
      status: item?.status || 'REQUESTED',
      priority: item?.priority || 'MEDIUM',
      technicianNotes: item?.technicianNotes || '',
      adminNotes: item?.adminNotes || '',
    });
    setNewAttachments([]);
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      const formData = new FormData();
      formData.append('status', editForm.status);
      formData.append('priority', editForm.priority);
      formData.append('technicianNotes', editForm.technicianNotes);
      formData.append('adminNotes', editForm.adminNotes);
      
      if (newAttachments.length > 0) {
        newAttachments.forEach(file => {
          formData.append('attachments', file);
        });
      }
      
      await apiService.upload(`/maintenance-requests/${id}`, formData);
      toast.success('تم تحديث الطلب بنجاح');
      setEditModalOpen(false);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'فشل في التحديث');
    } finally {
      setEditLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-brand-light border-t-brand-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!item) return null;

  const user = item.user;
  const vehicle = item.vehicle;

  return (
    <div className="page-container animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-[2.5rem] p-8 shadow-premium border border-slate-100 mb-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-light/40 rounded-full blur-3xl -mr-32 -mt-32 opacity-60 pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row items-center lg:items-end gap-8 relative z-10">
          <div className="relative">
            <div className="w-24 h-24 rounded-[2rem] bg-slate-50 border-4 border-white shadow-lg overflow-hidden flex items-center justify-center ring-1 ring-slate-100 group-hover:scale-105 transition-transform duration-500">
              <LuWrench size={40} className="text-slate-300" />
            </div>
          </div>

          <div className="flex-1 text-center lg:text-right min-w-0">
            <div className="flex flex-col lg:flex-row items-center lg:items-center gap-4 mb-4">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight truncate">طلب صيانة</h2>
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full ring-1 ring-slate-200">
                #{item.id}
              </span>
            </div>

            <div className="flex flex-wrap justify-center lg:justify-start gap-3">
              <StatusBadge status={item.status} />
              <StatusBadge status={item.priority} />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={openEditModal}
              className="btn btn-primary !rounded-2xl flex items-center gap-2"
            >
              <LuPencil size={18} />
              تعديل
            </button>
            <button
              type="button"
              onClick={() => navigate('/maintenance-requests')}
              className="btn bg-slate-100 text-slate-600 hover:bg-slate-200 !rounded-2xl"
            >
              <LuChevronLeft size={18} />
              عودة
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="card !p-8 border-none ring-1 ring-slate-200/50">
            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
              <LuText className="text-brand-primary" size={20} />
              بيانات الطلب
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <LabelValue label="نوع المشكلة" value={item.issueType || '—'} icon={LuWrench} />
              <LabelValue label="الحالة" value={<StatusBadge status={item.status} />} icon={LuHash} />
              <LabelValue label="الأولوية" value={<StatusBadge status={item.priority} />} icon={LuHash} />
              <LabelValue label="تاريخ الإنشاء" value={formatDateTime(item.createdAt)} icon={LuClock} />
              <LabelValue label="آخر تحديث" value={formatDateTime(item.updatedAt)} icon={LuClock} />
              <LabelValue label="تاريخ الإكمال" value={formatDateTime(item.completedAt)} icon={LuClock} />
            </div>

            <div className="mt-6 p-6 rounded-3xl bg-slate-50 ring-1 ring-slate-200/50">
              <div className="text-[0.75rem] font-black text-slate-400 uppercase tracking-widest mb-2">الوصف</div>
              <div className="text-[0.95rem] font-bold text-slate-700 leading-relaxed whitespace-pre-wrap">
                {item.description || '—'}
              </div>
            </div>

            {(item.technicianNotes || item.adminNotes) && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-3xl bg-white ring-1 ring-slate-200/50">
                  <div className="text-[0.75rem] font-black text-slate-400 uppercase tracking-widest mb-2">ملاحظات الفني</div>
                  <div className="text-[0.9rem] font-bold text-slate-700 whitespace-pre-wrap">{item.technicianNotes || '—'}</div>
                </div>
                <div className="p-6 rounded-3xl bg-white ring-1 ring-slate-200/50">
                  <div className="text-[0.75rem] font-black text-slate-400 uppercase tracking-widest mb-2">ملاحظات الإدارة</div>
                  <div className="text-[0.9rem] font-bold text-slate-700 whitespace-pre-wrap">{item.adminNotes || '—'}</div>
                </div>
              </div>
            )}
          </div>

          <AttachmentGallery items={galleryItems} title="مرفقات الطلب" />
        </div>

        <div className="space-y-6">
          <div className="card !p-8 border-none ring-1 ring-slate-200/50">
            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
              <LuUser className="text-brand-primary" size={20} />
              بيانات الطالب
            </h3>
            <div className="space-y-5">
              <LabelValue label="الاسم (عربي)" value={user?.fullNameAr || '—'} />
              <LabelValue label="الاسم (إنجليزي)" value={user?.fullNameEn || '—'} />
            </div>
          </div>

          <div className="card !p-8 border-none ring-1 ring-slate-200/50">
            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
              <LuTruck className="text-brand-primary" size={20} />
              بيانات المركبة
            </h3>
            <div className="space-y-5">
              <LabelValue label="رقم اللوحة" value={vehicle?.plateNumber || '—'} />
              <LabelValue label="الموديل" value={vehicle?.model || '—'} />
              <LabelValue label="الحالة" value={<StatusBadge status={vehicle?.status} />} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="تحديث طلب الصيانة">
      <form onSubmit={handleEditSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">الحالة</label>
            <select
              className="form-input form-select"
              value={editForm.status}
              onChange={(e) => setEditForm(f => ({ ...f, status: e.target.value }))}
            >
              {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">الأولوية</label>
            <select
              className="form-input form-select"
              value={editForm.priority}
              onChange={(e) => setEditForm(f => ({ ...f, priority: e.target.value }))}
            >
              {priorityOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-600 mb-2">ملاحظات الفني</label>
          <textarea
            className="form-input"
            placeholder="ملاحظات الفني"
            value={editForm.technicianNotes}
            onChange={(e) => setEditForm(f => ({ ...f, technicianNotes: e.target.value }))}
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-600 mb-2">ملاحظات الإدارة</label>
          <textarea
            className="form-input"
            placeholder="ملاحظات الإدارة"
            value={editForm.adminNotes}
            onChange={(e) => setEditForm(f => ({ ...f, adminNotes: e.target.value }))}
            rows={3}
          />
        </div>

        <FileUploadField
          label="إضافة مرفقات جديدة (يمكن رفع أكثر من ملف)"
          value={newAttachments}
          onChange={setNewAttachments}
          multiple={true}
          accept="image/*,.pdf"
          optional={true}
        />

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="submit"
            disabled={editLoading}
            className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {editLoading ? 'جارٍ الحفظ...' : 'حفظ'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
