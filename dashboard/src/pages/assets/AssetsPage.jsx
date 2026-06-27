import { useCallback, useEffect, useState } from 'react';
import { apiService } from '../../services/api';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import UserSelect from '../../components/ui/UserSelect';
import PermissionGate from '../../components/auth/PermissionGate';
import { PERMISSIONS as P } from '../../utils/rolePermissions';
import toast from 'react-hot-toast';
import { LuPlus, LuPackage } from 'react-icons/lu';

const TYPE_LABELS = {
  MOTORCYCLE: 'دراجة نارية',
  SAFETY_EQUIPMENT: 'معدات سلامة',
  PHONE: 'جوال',
  SIM_CARD: 'شريحة',
  LICENSE_CARD: 'بطاقة رخصة',
  THERMAL_BOX: 'صندوق حراري',
  HELMET: 'خوذة',
  UNIFORM: 'زي',
  CHARGER: 'شاحن',
  TABLET: 'تابلت',
  OTHER: 'أخرى',
};

export default function AssetsPage() {
  const [tab, setTab] = useState('catalog');
  const [catalog, setCatalog] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [form, setForm] = useState({ nameAr: '', type: 'PHONE', otherDetails: '', description: '' });
  const [assignForm, setAssignForm] = useState({ assetId: '', userId: '', notes: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, assignRes] = await Promise.all([
        apiService.get('/assets/catalog', { limit: 100 }),
        apiService.get('/assets/assignments', { limit: 100 }),
      ]);
      setCatalog(catRes.data?.data || []);
      setAssignments(assignRes.data?.data || []);
    } catch {
      toast.error('تعذر تحميل العهد');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await apiService.post('/assets/catalog', form);
      toast.success('تم إضافة العهدة');
      setModalOpen(false);
      setForm({ nameAr: '', type: 'PHONE', otherDetails: '', description: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل الإضافة');
    }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    try {
      await apiService.post('/assets/assignments', assignForm);
      toast.success('تم تسليم العهدة');
      setAssignModalOpen(false);
      setAssignForm({ assetId: '', userId: '', notes: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل التسليم');
    }
  };

  const catalogColumns = [
    { key: 'nameAr', label: 'الاسم' },
    { key: 'type', label: 'النوع', render: (v) => TYPE_LABELS[v] || v },
    { key: 'otherDetails', label: 'تفاصيل أخرى', render: (v) => v || '—' },
    { key: 'isActive', label: 'الحالة', render: (v) => <StatusBadge status={v ? 'ACTIVE' : 'INACTIVE'} /> },
  ];

  const assignmentColumns = [
    { key: 'asset', label: 'العهدة', render: (v) => v?.nameAr || '—' },
    { key: 'user', label: 'الموظف', render: (v) => v?.fullNameAr || '—' },
    { key: 'status', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
    { key: 'assignedAt', label: 'تاريخ التسليم', render: (v) => v ? new Date(v).toLocaleDateString('ar-SA') : '—' },
  ];

  return (
    <div className="page-container animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex justify-between items-center flex-wrap gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <LuPackage className="text-brand-primary" /> إدارة العهد
          </h2>
          <p className="text-xs font-bold text-slate-400 mt-1">شرائح، جوالات، خوذ، وغيرها</p>
        </div>
        <PermissionGate anyOf={[P.INVENTORY_WRITE]}>
          <div className="flex gap-2">
            <button className="btn btn-secondary" onClick={() => setAssignModalOpen(true)}>تسليم عهدة</button>
            <button className="btn btn-primary flex items-center gap-2" onClick={() => setModalOpen(true)}>
              <LuPlus size={18} /> إضافة عهدة
            </button>
          </div>
        </PermissionGate>
      </div>

      <div className="flex gap-2 mb-6">
        {[{ id: 'catalog', label: 'كتالوج العهد' }, { id: 'assignments', label: 'التسليمات' }].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2.5 rounded-2xl text-sm font-black transition-all ${tab === t.id ? 'bg-brand-primary text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[2rem] shadow-premium border border-slate-100 overflow-hidden">
        <DataTable
          columns={tab === 'catalog' ? catalogColumns : assignmentColumns}
          data={tab === 'catalog' ? catalog : assignments}
          isLoading={loading}
        />
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="إضافة عهدة جديدة">
        <form onSubmit={handleCreate} className="space-y-4">
          <input className="form-input" placeholder="الاسم بالعربية" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} required />
          <select className="form-input form-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {form.type === 'OTHER' && (
            <input className="form-input" placeholder="حدد نوع العهدة" value={form.otherDetails} onChange={(e) => setForm({ ...form, otherDetails: e.target.value })} />
          )}
          <textarea className="form-input" placeholder="وصف (اختياري)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <button type="submit" className="btn btn-primary w-full justify-center">حفظ</button>
        </form>
      </Modal>

      <Modal isOpen={assignModalOpen} onClose={() => setAssignModalOpen(false)} title="تسليم عهدة لموظف">
        <form onSubmit={handleAssign} className="space-y-4">
          <select className="form-input form-select" value={assignForm.assetId} onChange={(e) => setAssignForm({ ...assignForm, assetId: e.target.value })} required>
            <option value="">اختر العهدة</option>
            {catalog.filter((a) => a.isActive).map((a) => (
              <option key={a.id} value={a.id}>{a.nameAr} ({TYPE_LABELS[a.type] || a.type})</option>
            ))}
          </select>
          <UserSelect value={assignForm.userId} onChange={(userId) => setAssignForm({ ...assignForm, userId })} />
          <textarea className="form-input" placeholder="ملاحظات" value={assignForm.notes} onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })} />
          <button type="submit" className="btn btn-primary w-full justify-center">تسليم</button>
        </form>
      </Modal>
    </div>
  );
}
