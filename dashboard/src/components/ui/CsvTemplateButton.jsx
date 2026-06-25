import { apiService } from '../../services/api';
import { triggerBlobDownload } from '../../utils/downloadCsv';
import toast from 'react-hot-toast';
import { LuFileSpreadsheet } from 'react-icons/lu';

export default function CsvTemplateButton({
  url,
  params,
  filename = 'template.csv',
  className = 'btn btn-secondary text-sm flex items-center gap-2',
  label = 'قالب CSV',
}) {
  const handleClick = async () => {
    try {
      const res = await apiService.get(url, params, { responseType: 'blob' });
      triggerBlobDownload(res.data, filename);
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
