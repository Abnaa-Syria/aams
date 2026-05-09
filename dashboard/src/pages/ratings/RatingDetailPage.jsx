import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LuChevronLeft } from 'react-icons/lu';
import { apiService } from '../../services/api';

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

export default function RatingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data } = await apiService.get(`/ratings/${id}`);
      setRow(data.data);
    } catch {
      toast.error('تعذر تحميل تفاصيل التقييم');
      navigate('/ratings');
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
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">تفاصيل التقييم</h2>
          <p className="text-xs font-bold text-slate-400 mt-1">عرض البيانات المرتبطة بالتقييم</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/ratings')}
          className="btn bg-slate-100 text-slate-600 hover:bg-slate-200 !rounded-2xl flex items-center gap-2"
        >
          <LuChevronLeft size={18} />
         عودة للقائمة
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Section title="المعلومات الأساسية">
          <Field label="الموظف" value={row.user?.fullNameAr} />
          <Field label="التقييم العام" value={row.overallScore ? `${row.overallScore}/5` : '—'} />
          <Field label="الفترة" value={row.period} />
          <Field label="المقيّم" value={row.ratedBy?.fullNameAr} />
          <Field label="تاريخ الإنشاء" value={formatDate(row.createdAt)} />
        </Section>

        <Section title="التفاصيل">
          <Field label="الالتزام" value={row.punctuality ? `${row.punctuality}/5` : '—'} />
          <Field label="خدمة العملاء" value={row.customerHandling ? `${row.customerHandling}/5` : '—'} />
          <Field label="التواصل" value={row.communication ? `${row.communication}/5` : '—'} />
          <Field label="الامتثال" value={row.compliance ? `${row.compliance}/5` : '—'} />
          <Field label="الإنتاجية" value={row.productivity ? `${row.productivity}/5` : '—'} />
          <Field label="الملاحظات" value={row.notes} />
        </Section>
      </div>
    </div>
  );
}