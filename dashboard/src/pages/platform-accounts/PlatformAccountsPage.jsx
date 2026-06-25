import GenericListPage from '../../components/ui/GenericListPage';
import StatusBadge from '../../components/ui/StatusBadge';
import StatusSelect from '../../components/ui/StatusSelect';
import Modal from '../../components/ui/Modal';
import FileUploadField from '../../components/ui/FileUploadField';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { LuPlus, LuPencil } from 'react-icons/lu';
import toast from 'react-hot-toast';

const columns = [
  { key: 'user', label: 'الموظف', render: (v) => v?.fullNameAr || '—' },
  { key: 'platform', label: 'المنصة', render: (v) => v?.nameAr || '—' },
  { key: 'username', label: 'اسم المستخدم' },
  { key: 'accountId', label: 'رقم الحساب' },
  { key: 'status', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
  { key: 'actions', label: 'الإجراءات', render: (v, row) => (
    <button 
      onClick={(e) => { e.stopPropagation(); }} 
      className="p-2 text-slate-400 hover:text-primary transition-colors"
    >
      <LuPencil size={16} />
    </button>
  ), stopRowClick: true },
];

const statusOptions = [
  { value: 'PENDING_VERIFICATION', label: 'بانتظار التحقق' },
  { value: 'ACTIVE', label: 'نشط' },
  { value: 'INACTIVE', label: 'غير نشط' },
  { value: 'SUSPENDED', label: 'موقوف' },
];

function PlatformAccountModal({ isOpen, onClose, account, onSave }) {
  const [form, setForm] = useState({
    userId: '',
    platformId: '',
    username: '',
    accountId: '',
    status: 'PENDING_VERIFICATION',
    notes: '',
  });
  const [drivers, setDrivers] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadOptions();
      if (account) {
        setForm({
          userId: account.userId || '',
          platformId: account.platformId || '',
          username: account.username || '',
          accountId: account.accountId || '',
          status: account.status || 'PENDING_VERIFICATION',
          notes: account.notes || '',
        });
      } else {
        setForm({
          userId: '',
          platformId: '',
          username: '',
          accountId: '',
          status: 'PENDING_VERIFICATION',
          notes: '',
        });
      }
      setFile(null);
    }
  }, [isOpen, account]);

  const loadOptions = async () => {
    try {
      const [driversRes, platformsRes] = await Promise.all([
        apiService.get('/users', { role: 'DRIVER', limit: 500 }),
        apiService.get('/platforms', { limit: 100 }),
      ]);
      setDrivers(driversRes.data?.data || []);
      setPlatforms(platformsRes.data?.data || []);
    } catch (error) {
      console.error('Failed to load options', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.userId || !form.platformId || !form.username || !form.accountId) {
      toast.error('الرجاء تعبئة جميع الحقول المطلوبة');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('userId', form.userId);
      formData.append('platformId', form.platformId);
      formData.append('username', form.username);
      formData.append('accountId', form.accountId);
      formData.append('status', form.status);
      formData.append('notes', form.notes);

      if (file instanceof File) {
        formData.append('file', file);
      }

      await onSave(formData);
      onClose();
      toast.success(account ? 'تم تحديث الحساب' : 'تم إنشاء ال��ساب');
    } catch (error) {
      toast.error('فشل في الحفظ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={account ? 'تحديث حساب المنصة' : 'إنشاء حساب منصة جديد'}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-bold text-slate-600 mb-2">الموظف *</label>
          <select
            className="form-input form-select"
            value={form.userId}
            onChange={(e) => setForm(f => ({ ...f, userId: e.target.value }))}
            disabled={!!account}
            required
          >
            <option value="">اختر الموظف</option>
            {drivers.map(d => <option key={d.id} value={d.id}>{d.fullNameAr}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-600 mb-2">المنصة *</label>
          <select
            className="form-input form-select"
            value={form.platformId}
            onChange={(e) => setForm(f => ({ ...f, platformId: e.target.value }))}
            disabled={!!account}
            required
          >
            <option value="">اختر المنصة</option>
            {platforms.map(p => <option key={p.id} value={p.id}>{p.nameAr}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-600 mb-2">اسم المستخدم *</label>
          <input
            type="text"
            className="form-input"
            placeholder="اسم المستخدم في التطبيق"
            value={form.username}
            onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-600 mb-2">رقم حساب المنصة *</label>
          <input
            type="text"
            className="form-input"
            placeholder="رقم الحساب"
            value={form.accountId}
            onChange={(e) => setForm(f => ({ ...f, accountId: e.target.value }))}
            required
          />
        </div>

        <FileUploadField
          label="صورة الحساب"
          value={file || (account?.fileUrl && !Array.isArray(account?.fileUrl) ? [account.fileUrl] : null)}
          onChange={setFile}
          multiple={false}
          accept="image/*,.pdf"
          optional={true}
        />

        {account && (
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
              <label className="block text-sm font-bold text-slate-600 mb-2">ملاحظات</label>
              <textarea
                className="form-input"
                placeholder="أضف ملاحظاتك"
                value={form.notes}
                onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
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

export default function PlatformAccountsPage() {
  const navigate = useNavigate();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);

  const handleCreate = async (formData) => {
    await apiService.upload('/platform-accounts', formData);
    setReloadToken(t => t + 1);
  };

  const handleUpdate = async (formData) => {
    await apiService.uploadPatch(`/platform-accounts/${selectedAccount.id}`, formData);
    setReloadToken(t => t + 1);
  };

  const openUpdateModal = (account) => {
    setSelectedAccount(account);
    setUpdateModalOpen(true);
  };

  const createButton = (
    <button 
      onClick={() => setCreateModalOpen(true)} 
      className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-2xl hover:bg-primary-dark transition-colors font-bold"
    >
      <LuPlus size={18} />
      إضافة حساب منصة
    </button>
  );

  return (
    <>
      <GenericListPage 
        title="حسابات المنصات" 
        apiUrl="/platform-accounts" 
        columns={[...columns.slice(0, -1), {
          key: 'actions',
          label: '',
          stopRowClick: true,
          render: (_, row) => (
            <div className="flex items-center gap-2">
              <StatusSelect
                id={row.id}
                currentStatus={row.status}
                apiUrl={`/platform-accounts/${row.id}`}
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
        onRowClick={(row) => navigate(`/platform-accounts/${row.id}`)} 
        createButton={createButton}
        reloadToken={reloadToken}
        filters={[
          { key: 'driverName', type: 'text', placeholder: 'اسم السائق' },
          { key: 'status', type: 'select', placeholder: 'الحالة', options: statusOptions },
        ]} 
      />
      <PlatformAccountModal 
        isOpen={createModalOpen} 
        onClose={() => setCreateModalOpen(false)} 
        onSave={handleCreate} 
      />
      <PlatformAccountModal 
        isOpen={updateModalOpen} 
        onClose={() => setUpdateModalOpen(false)} 
        account={selectedAccount} 
        onSave={handleUpdate} 
      />
    </>
  );
}