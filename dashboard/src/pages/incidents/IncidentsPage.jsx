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

const typeLabels = { MEDICAL: 'حالة طبية', ACCIDENT: 'حادث', BREAKDOWN: 'عطل', LARGE_ORDER: 'طلب كبير', OTHER: 'أخرى' };
const severityLabels = { LOW: 'منخفض', MEDIUM: 'متوسط', HIGH: 'عالي', CRITICAL: 'حرج' };
const statusOptions = [
  { value: 'OPEN', label: 'مفتوح' },
  { value: 'IN_PROGRESS', label: 'قيد التنفيذ' },
  { value: 'ESCALATED', label: 'متصاعد' },
  { value: 'RESOLVED', label: 'محلول' },
  { value: 'CLOSED', label: 'مغلق' },
];

const columns = [
  { key: 'user', label: 'السائق', render: (v) => v?.fullNameAr || '—' },
  { key: 'type', label: 'النوع', render: (v) => typeLabels[v] || v },
  { key: 'title', label: 'العنوان' },
  { key: 'severity', label: 'الخطورة', render: (v) => <StatusBadge status={v} /> },
  { key: 'status', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
  { key: 'location', label: 'الموقع' },
  { key: 'createdAt', label: 'التاريخ', render: (v) => v ? new Date(v).toLocaleDateString('ar-SA') : '—' },
  { key: 'actions', label: 'الإجراءات', render: (v, row) => (
    <button 
      onClick={(e) => { e.stopPropagation(); /* open update modal */ }} 
      className="p-2 text-slate-400 hover:text-primary transition-colors"
    >
      <LuPencil size={16} />
    </button>
  ), stopRowClick: true },
];

function IncidentModal({ isOpen, onClose, incident, onSave }) {
  const [form, setForm] = useState({ userId: '', type: '', title: '', description: '', severity: '', location: '', status: 'OPEN' });
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState([]);

  useEffect(() => {
    if (isOpen) {
      loadOptions();
      if (incident) {
        setForm({
          userId: incident.userId || '',
          type: incident.type || '',
          title: incident.title || '',
          description: incident.description || '',
          severity: incident.severity || '',
          location: incident.location || '',
          status: incident.status || 'OPEN',
        });
      } else {
        setForm({ userId: '', type: '', title: '', description: '', severity: '', location: '', status: 'OPEN' });
      }
      setAttachments([]);
    }
  }, [isOpen, incident]);

  const loadOptions = async () => {
    try {
      const driversRes = await apiService.get('/users', { role: 'DRIVER', limit: 500 });
      setDrivers(driversRes.data.data);
    } catch (error) {
      console.error('Failed to load options', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('userId', form.userId);
      formData.append('type', form.type);
      formData.append('title', form.title);
      formData.append('description', form.description);
      formData.append('severity', form.severity);
      formData.append('location', form.location);
      
      if (incident) {
        formData.append('status', form.status);
      }
      
      if (attachments.length > 0) {
        attachments.forEach(file => {
          formData.append('attachments', file);
        });
      }
      
      await onSave(formData);
      onClose();
      toast.success(incident ? 'تم تحديث الحادث' : 'تم إنشاء الحادث');
    } catch (error) {
      toast.error('فشل في الحفظ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={incident ? 'تحديث الحادث' : 'إنشاء حادث جديد'}>
      <form onSubmit={handleSubmit} className="space-y-5 max-h-[calc(100vh-200px)] overflow-y-auto">
        <select 
          className="form-input form-select" 
          value={form.userId} 
          onChange={(e) => setForm(f => ({ ...f, userId: e.target.value }))}
          required
          disabled={!!incident}
        >
          <option value="">اختر السائق</option>
          {drivers.map(d => <option key={d.id} value={d.id}>{d.fullNameAr}</option>)}
        </select>
        <select 
          className="form-input form-select" 
          value={form.type} 
          onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))}
          required
        >
          <option value="">اختر النوع</option>
          {Object.entries(typeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input 
          type="text" 
          className="form-input" 
          placeholder="العنوان" 
          value={form.title} 
          onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
          required
        />
        <textarea 
          className="form-input" 
          placeholder="الوصف" 
          value={form.description} 
          onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
          required
          rows={3}
        />
        <select 
          className="form-input form-select" 
          value={form.severity} 
          onChange={(e) => setForm(f => ({ ...f, severity: e.target.value }))}
          required
        >
          <option value="">اختر الخطورة</option>
          <option value="LOW">منخفض</option>
          <option value="MEDIUM">متوسط</option>
          <option value="HIGH">عالي</option>
          <option value="CRITICAL">حرج</option>
        </select>
        <input 
          type="text" 
          className="form-input" 
          placeholder="الموقع" 
          value={form.location} 
          onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))}
        />

        <FileUploadField
          label="المرفقات (يمكن رفع أكثر من ملف)"
          value={attachments}
          onChange={setAttachments}
          multiple={true}
          accept="image/*,.pdf"
          optional={true}
        />

        {incident && (
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
        )}

        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-60" disabled={loading}>
            {loading ? 'حفظ...' : 'حفظ'}
          </button>
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1">إلغاء</button>
        </div>
      </form>
    </Modal>
  );
}

export default function IncidentsPage() {
  const navigate = useNavigate();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);

  const handleCreate = async (formData) => {
    await apiService.upload('/incidents', formData);
    setReloadToken(t => t + 1);
  };

  const handleUpdate = async (formData) => {
    await apiService.upload(`/incidents/${selectedIncident.id}`, formData);
    setReloadToken(t => t + 1);
  };

  const openUpdateModal = (incident) => {
    setSelectedIncident(incident);
    setUpdateModalOpen(true);
  };

  const createButton = (
    <button 
      onClick={() => setCreateModalOpen(true)} 
      className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-2xl hover:bg-primary-dark transition-colors font-bold"
    >
      <LuPlus size={18} />
      إضافة حادث
    </button>
  );

  return (
    <>
      <GenericListPage 
        title="الحوادث والطوارئ" 
        apiUrl="/incidents" 
        columns={[...columns.slice(0, -1), {
          key: 'actions',
          label: '',
          stopRowClick: true,
          render: (_, row) => (
            <div className="flex items-center gap-2">
              <StatusSelect
                id={row.id}
                currentStatus={row.status}
                apiUrl={`/incidents/${row.id}`}
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
        onRowClick={(row) => navigate(`/incidents/${row.id}`)} 
        createButton={createButton}
        reloadToken={reloadToken}
        filters={[
          { key: 'driverName', type: 'text', placeholder: 'اسم السائق' },
          { key: 'type', type: 'select', placeholder: 'النوع', options: Object.entries(typeLabels).map(([v, l]) => ({ value: v, label: l })) },
          { key: 'severity', type: 'select', placeholder: 'الخطورة', options: [{ value: 'LOW', label: 'منخفض' }, { value: 'MEDIUM', label: 'متوسط' }, { value: 'HIGH', label: 'عالي' }, { value: 'CRITICAL', label: 'حرج' }] },
          { key: 'status', type: 'select', placeholder: 'الحالة', options: statusOptions },
        ]} 
      />
      <IncidentModal 
        isOpen={createModalOpen} 
        onClose={() => setCreateModalOpen(false)} 
        onSave={handleCreate} 
      />
      <IncidentModal 
        isOpen={updateModalOpen} 
        onClose={() => setUpdateModalOpen(false)} 
        incident={selectedIncident} 
        onSave={handleUpdate} 
      />
    </>
  );
}
