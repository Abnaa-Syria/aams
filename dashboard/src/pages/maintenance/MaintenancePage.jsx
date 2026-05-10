import { useNavigate } from 'react-router-dom';
import GenericListPage from '../../components/ui/GenericListPage';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import FileUploadField from '../../components/ui/FileUploadField';
import { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { LuPlus, LuPencil } from 'react-icons/lu';
import toast from 'react-hot-toast';

const columns = [
  { key: 'user', label: 'الطالب', render: (v) => v?.fullNameAr || '—' },
  { key: 'vehicle', label: 'المركبة', render: (v) => v?.plateNumber || '—' },
  { key: 'issueType', label: 'نوع المشكلة' },
  { key: 'priority', label: 'الأولوية', render: (v) => <StatusBadge status={v} /> },
  { key: 'description', label: 'الوصف', render: (v) => v?.substring(0, 60) || '—' },
  { key: 'status', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
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

const statusOptions = [
  { value: 'REQUESTED', label: 'مطلوب' },
  { value: 'APPROVED', label: 'مقبول' },
  { value: 'IN_PROGRESS', label: 'قيد التنفيذ' },
  { value: 'COMPLETED', label: 'مكتمل' },
  { value: 'CANCELLED', label: 'ملغي' },
];

const priorityOptions = [
  { value: 'LOW', label: 'منخفض' },
  { value: 'MEDIUM', label: 'متوسط' },
  { value: 'HIGH', label: 'عالي' },
  { value: 'URGENT', label: 'عاجل' },
];

const issueTypeOptions = [
  { value: 'MECHANICAL', label: 'ميكانيكي' },
  { value: 'ELECTRICAL', label: 'كهربائي' },
  { value: 'TIRE', label: 'إطارات' },
  { value: 'BODY', label: 'هيكل' },
  { value: 'OTHER', label: 'أخرى' },
];

function MaintenanceModal({ isOpen, onClose, request: req, onSave }) {
  const [form, setForm] = useState({
    userId: '',
    vehicleId: '',
    issueType: 'MECHANICAL',
    priority: 'MEDIUM',
    description: '',
    status: 'REQUESTED',
    technicianNotes: '',
    adminNotes: '',
  });
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newAttachments, setNewAttachments] = useState([]);

  useEffect(() => {
    if (isOpen) {
      loadOptions();
      if (req) {
        setForm({
          userId: req.userId || '',
          vehicleId: req.vehicleId || '',
          issueType: req.issueType || 'MECHANICAL',
          priority: req.priority || 'MEDIUM',
          description: req.description || '',
          status: req.status || 'REQUESTED',
          technicianNotes: req.technicianNotes || '',
          adminNotes: req.adminNotes || '',
        });
      } else {
        setForm({
          userId: '',
          vehicleId: '',
          issueType: 'MECHANICAL',
          priority: 'MEDIUM',
          description: '',
          status: 'REQUESTED',
          technicianNotes: '',
          adminNotes: '',
        });
      }
      setNewAttachments([]);
    }
  }, [isOpen, req]);

  const loadOptions = async () => {
    try {
      const [driversRes, vehiclesRes] = await Promise.all([
        apiService.get('/users', { role: 'DRIVER', limit: 500 }),
        apiService.get('/vehicles', { limit: 500 }),
      ]);
      setDrivers(driversRes.data?.data || []);
      setVehicles(vehiclesRes.data?.data || []);
    } catch (error) {
      console.error('Failed to load options', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.userId || !form.vehicleId || !form.issueType || !form.description) {
      toast.error('الرجاء تعبئة جميع الحقول المطلوبة');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('userId', form.userId);
      formData.append('vehicleId', form.vehicleId);
      formData.append('issueType', form.issueType);
      formData.append('priority', form.priority);
      formData.append('description', form.description);
      formData.append('status', form.status);
      formData.append('technicianNotes', form.technicianNotes);
      formData.append('adminNotes', form.adminNotes);

      if (newAttachments.length > 0) {
        newAttachments.forEach(file => {
          formData.append('attachments', file);
        });
      }

      await onSave(formData);
      onClose();
      toast.success(req ? 'تم تحديث الطلب' : 'تم إنشاء الطلب');
    } catch (error) {
      toast.error('فشل في الحفظ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={req ? 'تحديث طلب الصيانة' : 'إنشاء طلب صيانة جديد'}>
      <form onSubmit={handleSubmit} className="space-y-5 max-h-[calc(100vh-200px)] overflow-y-auto">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">الطالب *</label>
            <select
              className="form-input form-select"
              value={form.userId}
              onChange={(e) => setForm(f => ({ ...f, userId: e.target.value }))}
              disabled={!!req}
              required
            >
              <option value="">اختر السائق</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.fullNameAr}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">المركبة *</label>
            <select
              className="form-input form-select"
              value={form.vehicleId}
              onChange={(e) => setForm(f => ({ ...f, vehicleId: e.target.value }))}
              disabled={!!req}
              required
            >
              <option value="">اختر المركبة</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.plateNumber}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">نوع المشكلة *</label>
            <select
              className="form-input form-select"
              value={form.issueType}
              onChange={(e) => setForm(f => ({ ...f, issueType: e.target.value }))}
              required
            >
              {issueTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">الأولوية *</label>
            <select
              className="form-input form-select"
              value={form.priority}
              onChange={(e) => setForm(f => ({ ...f, priority: e.target.value }))}
              required
            >
              {priorityOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-600 mb-2">الوصف *</label>
          <textarea
            className="form-input"
            placeholder="وصف تفصيلي للمشكلة"
            value={form.description}
            onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
            required
            rows={3}
          />
        </div>

        <FileUploadField
          label="المرفقات (يمكن رفع أكثر من ملف)"
          value={newAttachments}
          onChange={setNewAttachments}
          multiple={true}
          accept="image/*,.pdf"
          optional={true}
        />

        {req && (
          <>
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

            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">ملاحظات الفني</label>
              <textarea
                className="form-input"
                placeholder="ملاحظات الفني"
                value={form.technicianNotes}
                onChange={(e) => setForm(f => ({ ...f, technicianNotes: e.target.value }))}
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">ملاحظات الإدارة</label>
              <textarea
                className="form-input"
                placeholder="ملاحظات الإدارة"
                value={form.adminNotes}
                onChange={(e) => setForm(f => ({ ...f, adminNotes: e.target.value }))}
                rows={3}
              />
            </div>
          </>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'جارٍ الحفظ...' : 'حفظ'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function MaintenancePage() {
  const navigate = useNavigate();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);

  const handleCreate = async (form) => {
    await apiService.upload('/maintenance-requests', form);
    setReloadToken(t => t + 1);
  };

  const handleUpdate = async (form) => {
    await apiService.upload(`/maintenance-requests/${selectedRequest.id}`, form);
    setReloadToken(t => t + 1);
  };

  const openUpdateModal = (request) => {
    setSelectedRequest(request);
    setUpdateModalOpen(true);
  };

  const createButton = (
    <button 
      onClick={() => setCreateModalOpen(true)} 
      className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-2xl hover:bg-primary-dark transition-colors font-bold"
    >
      <LuPlus size={18} />
      إضافة طلب صيانة
    </button>
  );

  return (
    <>
      <GenericListPage 
        title="طلبات الصيانة" 
        apiUrl="/maintenance-requests" 
        columns={columns.map(col => col.key === 'actions' ? { ...col, render: (v, row) => (
          <button 
            onClick={(e) => { e.stopPropagation(); openUpdateModal(row); }} 
            className="p-2 text-slate-400 hover:text-primary transition-colors"
          >
            <LuPencil size={16} />
          </button>
        ), stopRowClick: true } : col)} 
        onRowClick={(row) => navigate(`/maintenance-requests/${row.id}`)} 
        createButton={createButton}
        reloadToken={reloadToken}
        filters={[
          { key: 'driverName', type: 'text', placeholder: 'اسم السائق' },
          { key: 'status', type: 'select', placeholder: 'الحالة', options: statusOptions },
          { key: 'priority', type: 'select', placeholder: 'الأولوية', options: priorityOptions },
        ]} 
      />
      <MaintenanceModal 
        isOpen={createModalOpen} 
        onClose={() => setCreateModalOpen(false)} 
        onSave={handleCreate} 
      />
      <MaintenanceModal 
        isOpen={updateModalOpen} 
        onClose={() => setUpdateModalOpen(false)} 
        request={selectedRequest} 
        onSave={handleUpdate} 
      />
    </>
  );
}