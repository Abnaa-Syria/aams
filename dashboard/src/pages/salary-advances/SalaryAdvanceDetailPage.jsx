import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { LuChevronLeft } from 'react-icons/lu';
import { apiService } from '../../services/api';
import StatusBadge from '../../components/ui/StatusBadge';
import StatusSelect from '../../components/ui/StatusSelect';
import { hasAnyPermissionForUser, isSupervisorUser, PERMISSIONS } from '../../utils/rolePermissions';

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

const statusOptions = [
  { value: 'PENDING', label: 'معلق' },
  { value: 'APPROVED', label: 'مقبول' },
  { value: 'REJECTED', label: 'مرفوض' },
  { value: 'CANCELLED', label: 'ملغي' },
];

export default function SalaryAdvanceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);
  const supervisor = isSupervisorUser(user);
  const canFinalReview = hasAnyPermissionForUser(user, [PERMISSIONS.FINANCE_APPROVE]);
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleSupervisorReview = async (approved) => {
    try {
      await apiService.patch(`/salary-advances/${id}/supervisor-review`, {
        approved,
        status: approved ? 'APPROVED' : 'REJECTED',
      });
      toast.success(approved ? 'تمت التوصية بالموافقة' : 'تم الرفض');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشلت المراجعة');
    }
  };

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data } = await apiService.get(`/salary-advances/${id}`);
      setRow(data.data);
    } catch {
      toast.error('تعذر تحميل تفاصيل السلفة');
      navigate('/salary-advances');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    void load();
  }, [load]);

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
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">تفاصيل السلفة</h2>
          <p className="text-xs font-bold text-slate-400 mt-1">عرض البيانات المرتبطة بطلب السلفة</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/salary-advances')}
          className="btn bg-slate-100 text-slate-600 hover:bg-slate-200 !rounded-2xl flex items-center gap-2"
        >
          <LuChevronLeft size={18} />
          عودة للقائمة
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Section title="المعلومات الأساسية">
          <Field label="الموظف" value={row.user?.fullNameAr} />
          <Field label="المبلغ" value={row.amount ? `${row.amount} ر.س` : '—'} />
          <Field label="السبب" value={row.reason} />
          <Field label="ملاحظات" value={row.notes} />
          <div className="flex items-start justify-between gap-6 py-3 border-b border-slate-100">
            <div className="text-xs font-black text-slate-400 uppercase tracking-widest shrink-0">الحالة</div>
            <StatusBadge status={row.status} />
          </div>
          {supervisor && row.userId !== user?.id && row.status === 'PENDING' && !row.supervisorApproved && (
            <div className="flex gap-2 pt-3">
              <button type="button" onClick={() => handleSupervisorReview(true)} className="btn btn-primary flex-1">توصية بالموافقة</button>
              <button type="button" onClick={() => handleSupervisorReview(false)} className="btn bg-rose-50 text-rose-700 flex-1">رفض</button>
            </div>
          )}
          {canFinalReview && (
            <div className="pt-3">
              <StatusSelect
                id={row.id}
                currentStatus={row.status}
                apiUrl={`/salary-advances/${row.id}/review`}
                options={statusOptions}
                size="md"
                onSuccess={load}
              />
            </div>
          )}
        </Section>

        <Section title="معلومات السداد">
          <Field label="أشهر التقسيط" value={row.numberOfMonths || '—'} />
          <Field label="قيمة القسط" value={row.installmentAmount ? `${row.installmentAmount} ر.س` : '—'} />
          <Field label="خصم من الراتب الحالي" value={row.deductFromCurrent ? 'نعم' : 'لا'} />
          <Field label="مراجعة المشرف" value={row.supervisorApproved ? 'موصى بالموافقة' : row.supervisorReviewedAt ? 'تمت المراجعة' : '—'} />
          <Field label="ملاحظات المشرف" value={row.supervisorReviewNotes} />
          <Field label="تاريخ المراجعة النهائية" value={formatDate(row.reviewedAt)} />
          <Field label="ملاحظات المراجعة" value={row.reviewNotes} />
          <Field label="ملاحظات المالية" value={row.financeNotes} />
        </Section>

        <Section title="التوقيت">
          <Field label="تاريخ الطلب" value={formatDate(row.createdAt)} />
        </Section>
      </div>
    </div>
  );
}
