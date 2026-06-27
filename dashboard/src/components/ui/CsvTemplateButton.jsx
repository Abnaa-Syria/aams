import { apiService } from '../../services/api';
import { triggerBlobDownload } from '../../utils/downloadCsv';
import toast from 'react-hot-toast';
import { LuFileSpreadsheet } from 'react-icons/lu';

export default function CsvTemplateButton({
  url,
  params,
  filename = 'template.xlsx',
  className = 'btn btn-secondary text-sm flex items-center gap-2',
  label = 'قالب Excel',
  format = 'xlsx',
}) {
  const handleClick = async () => {
    try {
      const res = await apiService.get(url, { ...params, format }, { responseType: 'blob' });
      const outName = filename.replace(/\.(csv|xlsx)$/i, '') + (format === 'csv' ? '.csv' : '.xlsx');
      triggerBlobDownload(res.data, outName);
    } catch {
      toast.error('تعذر تحميل القالب');
    }
  };

  return (
    <button type="button" onClick={handleClick} className={className}>
      <LuFileSpreadsheet size={16} /> {label}
    </button>
  );
}
