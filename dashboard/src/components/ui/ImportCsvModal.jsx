import { useState, useRef } from 'react';
import { apiService } from '../../services/api';
import { triggerBlobDownload } from '../../utils/downloadCsv';
import Modal from './Modal';
import toast from 'react-hot-toast';
import { LuUpload, LuDownload } from 'react-icons/lu';

export default function ImportCsvModal({ isOpen, onClose, module, title, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  const downloadTemplate = async () => {
    try {
      const res = await apiService.get(`/import/template/${module}`, { format: 'xlsx' }, { responseType: 'blob' });
      triggerBlobDownload(res.data, `${module}-import-template.xlsx`);
    } catch {
      toast.error('تعذر تحميل القالب');
    }
  };

  const handleImport = async (e) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error('اختر ملف Excel أو CSV');
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('module', module);
      const { data } = await apiService.upload('/import/csv', fd);
      const r = data.data;
      toast.success(`تم: ${r.created} جديد، ${r.updated} محدّث${r.failed ? `، ${r.failed} فشل` : ''}`);
      if (r.errors?.length) console.warn('Import errors', r.errors);
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل الاستيراد');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title || `استيراد بيانات — ${module}`}>
      <form onSubmit={handleImport} className="space-y-5">
        <p className="text-sm text-slate-600 leading-relaxed">
          ارفع ملف Excel (.xlsx) أو CSV بنفس أعمدة القالب. الصفوف الموجودة تُحدَّث والجديدة تُضاف.
        </p>
        <button type="button" onClick={downloadTemplate} className="btn btn-secondary w-full flex items-center justify-center gap-2">
          <LuDownload size={18} /> تحميل قالب Excel
        </button>
        <input ref={fileRef} type="file" accept=".xlsx,.csv" className="form-input" />
        <button type="submit" disabled={loading} className="btn btn-primary w-full flex items-center justify-center gap-2">
          <LuUpload size={18} /> {loading ? 'جاري الرفع...' : 'رفع واستيراد'}
        </button>
      </form>
    </Modal>
  );
}
