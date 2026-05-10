import { useNavigate } from 'react-router-dom';
import GenericListPage from '../../components/ui/GenericListPage';
import StatusBadge from '../../components/ui/StatusBadge';
import { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { LuPlus, LuPencil } from 'react-icons/lu';
import toast from 'react-hot-toast';

const typeLabels = { MEDICAL: 'حالة طبية', ACCIDENT: 'حادث', BREAKDOWN: 'عطل', LARGE_ORDER: 'طلب كبير', OTHER: 'أخرى' };

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
  const [form, setForm] = useState({ userId: '', type: '', title: '', description: '', severity: '', location: '' });
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);

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
        });
      } else {
        setForm({ userId: '', type: '', title: '', description: '', severity: '', location: '' });
      }
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
      await onSave(form);
      onClose();
      toast.success(incident ? 'تم تحديث الحادث' : 'تم إنشاء الحادث');
    } catch (error) {
      toast.error('فشل في الحفظ');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <h3 className="text-lg font-bold mb-4">{incident ? 'تحديث الحادث' : 'إنشاء حادث جديد'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <select 
            className="form-input form-select" 
            value={form.userId} 
            onChange={(e) => setForm(f => ({ ...f, userId: e.target.value }))}
            required
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
            required
          />
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary flex-1" disabled={loading}>
              {loading ? 'حفظ...' : 'حفظ'}
            </button>
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function IncidentsPage() {
  const navigate = useNavigate();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);

  const handleCreate = async (form) => {
    await apiService.post('/incidents', form);
    setReloadToken(t => t + 1);
  };

  const handleUpdate = async (form) => {
    await apiService.patch(`/incidents/${selectedIncident.id}/status`, { status: form.status }); // assuming update is for status
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
        columns={columns.map(col => col.key === 'actions' ? { ...col, render: (v, row) => (
          <button 
            onClick={(e) => { e.stopPropagation(); openUpdateModal(row); }} 
            className="p-2 text-slate-400 hover:text-primary transition-colors"
          >
            <LuPencil size={16} />
          </button>
        ), stopRowClick: true } : col)} 
        onRowClick={(row) => navigate(`/incidents/${row.id}`)} 
        createButton={createButton}
        reloadToken={reloadToken}
        filters={[
          { key: 'driverName', type: 'text', placeholder: 'اسم السائق' },
          { key: 'type', type: 'select', placeholder: 'النوع', options: Object.entries(typeLabels).map(([v, l]) => ({ value: v, label: l })) },
          { key: 'severity', type: 'select', placeholder: 'الخطورة', options: [{ value: 'LOW', label: 'منخفض' }, { value: 'MEDIUM', label: 'متوسط' }, { value: 'HIGH', label: 'عالي' }, { value: 'CRITICAL', label: 'حرج' }] },
          { key: 'status', type: 'select', placeholder: 'الحالة', options: [{ value: 'OPEN', label: 'مفتوح' }, { value: 'IN_PROGRESS', label: 'قيد التنفيذ' }, { value: 'RESOLVED', label: 'تم الحل' }, { value: 'CLOSED', label: 'مغلق' }] },
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
