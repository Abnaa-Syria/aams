import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LuChevronLeft } from 'react-icons/lu';
import { apiService } from '../../services/api';
import StatusBadge from '../../components/ui/StatusBadge';
import StatusSelect from '../../components/ui/StatusSelect';
import AttachmentGallery from '../../components/attachments/AttachmentGallery';

function formatDateTime(v) {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('ar-SA');
}

function formatDate(v) {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('ar-SA');
}

function Field({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-6 py-3 border-b border-slate-100 last:border-b-0">
      <div className="text-xs font-black text-slate-400 uppercase tracking-widest shrink-0">{label}</div>
      <div className="text-sm font-bold text-slate-700 text-left break-words">{value ?? '—'}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-3xl shadow-premium border border-slate-100 overflow-hidden">
      <div className="px-6 pt-6 pb-4 bg-gradient-to-l from-slate-50 via-white to-white">
        <h3 className="text-sm font-black text-slate-800">{title}</h3>
      </div>
      <div className="px-6 pb-6">{children}</div>
    </div>
  );
}

const statusLabels = {
  OPEN: 'مفتوح',
  PENDING_RESPONSE: 'بانتظار الرد',
  UNDER_REVIEW: 'قيد المراجعة',
  CLOSED: 'مغلق',
};

const statusOptions = [
  { value: 'OPEN', label: 'مفتوح' },
  { value: 'PENDING_RESPONSE', label: 'بانتظار الرد' },
  { value: 'UNDER_REVIEW', label: 'قيد المراجعة' },
  { value: 'CLOSED', label: 'مغلق' },
];

export default function InvestigationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data } = await apiService.get(`/investigations/${id}`);
      setRow(data.data);
    } catch {
      toast.error('تعذر تحميل تفاصيل التحقيق');
      navigate('/investigations');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  const attachmentItems = useMemo(() => {
    if (!row?.attachments || !row.attachments.length) return [];
    return row.attachments.map((att) => ({
      key: String(att.id),
      label: att.fileName || 'مرفق',
      fileUrl: att.fileUrl,
      fileName: att.fileName,
      downloadUrl: `/investigations/${id}/attachments/${att.id}/download`,
    }));
  }, [row, id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-brand-light border-t-brand-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!row) return null;

  return (
    <div className="page-container animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">تفاصيل التحقيق</h2>
          <p className="text-xs font-bold text-slate-400 mt-1">عرض البيانات المرتبطة بالتحقيق</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/investigations')}
          className="btn bg-slate-100 text-slate-600 hover:bg-slate-200 !rounded-2xl flex items-center gap-2"
        >
          <LuChevronLeft size={18} />
          عودة للقائمة
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Section title="المعلومات الأساسية">
            <Field label="الموظف" value={row.user?.fullNameAr} />
            <Field label="التصنيف" value={row.category} />
            <Field label="العنوان" value={row.title} />
            <Field label="التفاصيل" value={row.details} />
            <div className="flex items-start justify-between gap-6 py-3 border-b border-slate-100">
              <div className="text-xs font-black text-slate-400 uppercase tracking-widest shrink-0">الحالة</div>
              <StatusSelect
                id={row.id}
                currentStatus={row.status}
                apiUrl={`/investigations/${row.id}/status`}
                options={statusOptions}
                size="md"
                onSuccess={load}
              />
            </div>
            <Field label="أنشئ بواسطة" value={row.createdBy?.fullNameAr} />
            <Field label="تاريخ الإنشاء" value={formatDate(row.createdAt)} />
          </Section>

          <Section title="الردود والملاحظات">
            <Field label="رد الموظف" value={row.employeeResponse} />
            <Field label="تاريخ الرد" value={formatDate(row.respondedAt)} />
            <Field label="النتائج" value={row.outcome} />
            <Field label="ملاحظات داخلية" value={row.internalNotes} />
            <Field label="تاريخ الإغلاق" value={formatDate(row.closedAt)} />
          </Section>

          {attachmentItems.length > 0 && (
            <AttachmentGallery items={attachmentItems} title="المرفقات" />
          )}
        </div>

        <div className="space-y-6">
          <Section title="سجل الأحداث">
            {row.eventLogs && row.eventLogs.length > 0 ? (
              <div className="space-y-3">
                {row.eventLogs.map((log) => (
                  <div key={log.id} className="text-sm">
                    <div className="font-bold text-slate-700">{log.action}</div>
                    <div className="text-xs text-slate-400">{formatDateTime(log.createdAt)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm font-bold text-slate-500">لا يوجد سجل</div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
