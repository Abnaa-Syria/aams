import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiService } from '../../services/api';
import ImportWizard from '../../components/import/ImportWizard';
import { LuArrowRight, LuUpload } from 'react-icons/lu';
import toast from 'react-hot-toast';

export default function ModuleImportPage() {
  const { module } = useParams();
  const navigate = useNavigate();
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiService.get(`/import/meta/${module}`)
      .then((res) => setMeta(res.data.data))
      .catch(() => {
        toast.error('وحدة الاستيراد غير مدعومة');
        navigate(-1);
      })
      .finally(() => setLoading(false));
  }, [module, navigate]);

  const handleImport = async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('module', module);
    return apiService.upload('/import/csv', fd);
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
          to={meta?.backPath || '/'}
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-primary mb-4 transition-colors"
        >
          <LuArrowRight size={18} />
          العودة للقائمة
        </Link>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <LuUpload className="text-primary" size={28} />
          {meta?.titleAr || 'استيراد البيانات'}
        </h2>
        {meta?.descriptionAr && (
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">{meta.descriptionAr}</p>
        )}
      </div>

      <ImportWizard
        meta={meta}
        templateUrl={`/import/template/${module}`}
        templateFilename={meta?.templateFilename}
        onImport={handleImport}
      />
    </div>
  );
}
