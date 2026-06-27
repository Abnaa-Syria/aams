import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { apiService } from '../../services/api';
import ImportWizard from '../../components/import/ImportWizard';
import { LuArrowRight, LuUpload } from 'react-icons/lu';
import toast from 'react-hot-toast';

export default function OperationalImportPage() {
  const { category } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reportDate = searchParams.get('reportDate') || new Date().toISOString().slice(0, 10);
  const cityId = searchParams.get('cityId') || '';

  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const isFinancial = category === 'financial';

  useEffect(() => {
    setLoading(true);
    const loadMeta = isFinancial
      ? apiService.get('/financial-ledgers/import-meta')
      : apiService.get('/operational-reports/import-meta', { category });

    loadMeta
      .then((res) => setMeta(res.data.data))
      .catch(() => {
        toast.error('تعذر تحميل بيانات الاستيراد');
        navigate('/operational-reports');
      })
      .finally(() => setLoading(false));
  }, [category, isFinancial, navigate]);

  const handleImport = async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('reportDate', reportDate);
    if (isFinancial) {
      return apiService.upload('/financial-ledgers/import', fd);
    }
    fd.append('category', category);
    if (cityId) fd.append('cityId', cityId);
    return apiService.upload('/operational-reports/import', fd);
  };

  const contextValues = {
    'تاريخ التقرير': reportDate,
    ...(cityId ? { 'معرّف الفرع': cityId } : {}),
  };

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center min-h-[40vh]">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="page-container animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div className="mb-8">
        <Link
          to={`/operational-reports${reportDate ? `?date=${reportDate}` : ''}`}
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-primary mb-4 transition-colors"
        >
          <LuArrowRight size={18} />
          العودة لتقارير التشغيل
        </Link>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <LuUpload className="text-primary" size={28} />
          {meta?.titleAr || 'استيراد التقرير'}
        </h2>
        {meta?.descriptionAr && (
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">{meta.descriptionAr}</p>
        )}
      </div>

      <ImportWizard
        meta={meta}
        templateUrl={isFinancial ? '/financial-ledgers/template' : '/operational-reports/template'}
        templateParams={isFinancial ? undefined : { category }}
        templateFilename={meta?.templateFilename}
        onImport={handleImport}
        contextValues={contextValues}
      />
    </div>
  );
}
