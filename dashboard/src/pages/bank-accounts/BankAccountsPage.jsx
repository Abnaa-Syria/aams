import GenericListPage from '../../components/ui/GenericListPage';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import FileUploadField from '../../components/ui/FileUploadField';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { LuPlus, LuPencil } from 'react-icons/lu';
import toast from 'react-hot-toast';

const columns = [
  { key: 'user', label: 'الموظف', render: (v) => v?.fullNameAr || '—' },
  { key: 'bankName', label: 'البنك' },
  { key: 'iban', label: 'IBAN' },
  { key: 'accountOwnerName', label: 'صاحب الحساب' },
  { key: 'isDefault', label: 'افتراضي', render: (v) => v ? 'نعم' : 'لا' },
  { key: 'verificationStatus', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
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
  { value: 'PENDING', label: 'معلق' },
  { value: 'VERIFIED', label: 'موثق' },
  { value: 'REJECTED', label: 'مرفوض' },
];

function BankAccountModal({ isOpen, onClose, account, onSave }) {
  const [form, setForm] = useState({
    userId: '',
    bankName: '',
    iban: '',
    accountOwnerName: '',
    isDefault: false,
    verificationStatus: 'PENDING',
    reviewNotes: '',
  });
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [proofFile, setProofFile] = useState(null);
  const [cashReceipt, setCashReceipt] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadOptions();
      if (account) {
        setForm({
          userId: account.userId || '',
          bankName: account.bankName || '',
          iban: account.iban || '',
          accountOwnerName: account.accountOwnerName || '',
          isDefault: account.isDefault || false,
          verificationStatus: account.verificationStatus || 'PENDING',
          reviewNotes: account.reviewNotes || '',
        });
      } else {
        setForm({
          userId: '',
          bankName: '',
          iban: '',
          accountOwnerName: '',
          isDefault: false,
          verificationStatus: 'PENDING',
          reviewNotes: '',
        });
      }
      setProofFile(null);
      setCashReceipt(null);
    }
  }, [isOpen, account]);

  const loadOptions = async () => {
    try {
      const res = await apiService.get('/users', { role: 'DRIVER', limit: 500 });
      setDrivers(res.data?.data || []);
    } catch (error) {
      console.error('Failed to load options', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.userId || !form.bankName || !form.iban || !form.accountOwnerName) {
      toast.error('الرجاء تعبئة جميع الحقول المطلوبة');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('userId', form.userId);
      formData.append('bankName', form.bankName);
      formData.append('iban', form.iban);
      formData.append('accountOwnerName', form.accountOwnerName);
      formData.append('isDefault', form.isDefault);
      formData.append('verificationStatus', form.verificationStatus);
      formData.append('reviewNotes', form.reviewNotes);

      if (proofFile instanceof File) {
        formData.append('proofFile', proofFile);
      }
      if (cashReceipt instanceof File) {
        formData.append('cashReceipt', cashReceipt);
      }

      await onSave(formData);
      onClose();
      toast.success(account ? 'تم تحديث الحساب' : 'تم إنشاء الحساب');
    } catch (error) {
      toast.error('فشل في الحفظ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={account ? 'تحديث الحساب البنكي' : 'إنشاء حساب بنكي جديد'}>
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
          <label className="block text-sm font-bold text-slate-600 mb-2">اسم البنك *</label>
          <input
            type="text"
            className="form-input"
            placeholder="اسم البنك"
            value={form.bankName}
            onChange={(e) => setForm(f => ({ ...f, bankName: e.target.value }))}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-600 mb-2">IBAN *</label>
          <input
            type="text"
            className="form-input"
            placeholder="SA..."
            value={form.iban}
            onChange={(e) => setForm(f => ({ ...f, iban: e.target.value }))}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-600 mb-2">صاحب الحساب *</label>
          <input
            type="text"
            className="form-input"
            placeholder="اسم صاحب الحساب"
            value={form.accountOwnerName}
            onChange={(e) => setForm(f => ({ ...f, accountOwnerName: e.target.value }))}
            required
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isDefault"
            checked={form.isDefault}
            onChange={(e) => setForm(f => ({ ...f, isDefault: e.target.checked }))}
            className="w-4 h-4"
          />
          <label htmlFor="isDefault" className="text-sm font-bold text-slate-600">افتراضي</label>
        </div>

        <FileUploadField
          label="إثبات الحساب البنكي"
          value={proofFile || (account?.proofFileUrl && !Array.isArray(account?.proofFileUrl) ? [account.proofFileUrl] : null)}
          onChange={setProofFile}
          multiple={false}
          accept="image/*,.pdf"
          optional={true}
        />

        <FileUploadField
          label="إيصال النقد"
          value={cashReceipt || (account?.cashReceiptPhotoUrl && !Array.isArray(account?.cashReceiptPhotoUrl) ? [account.cashReceiptPhotoUrl] : null)}
          onChange={setCashReceipt}
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
                value={form.verificationStatus}
                onChange={(e) => setForm(f => ({ ...f, verificationStatus: e.target.value }))}
              >
                {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">ملاحظات المراجعة</label>
              <textarea
                className="form-input"
                placeholder="أضف ملاحظاتك"
                value={form.reviewNotes}
                onChange={(e) => setForm(f => ({ ...f, reviewNotes: e.target.value }))}
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

export default function BankAccountsPage() {
  const navigate = useNavigate();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);

  const handleCreate = async (formData) => {
    await apiService.upload('/bank-accounts', formData);
    setReloadToken(t => t + 1);
  };

  const handleUpdate = async (formData) => {
    await apiService.upload(`/bank-accounts/${selectedAccount.id}`, formData);
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
      إضافة حساب بنكي
    </button>
  );

  return (
    <>
      <GenericListPage 
        title="الحسابات البنكية" 
        apiUrl="/bank-accounts" 
        columns={columns.map(col => col.key === 'actions' ? { ...col, render: (v, row) => (
          <button 
            onClick={(e) => { e.stopPropagation(); openUpdateModal(row); }} 
            className="p-2 text-slate-400 hover:text-primary transition-colors"
          >
            <LuPencil size={16} />
          </button>
        ), stopRowClick: true } : col)} 
        onRowClick={(row) => navigate(`/bank-accounts/${row.id}`)} 
        createButton={createButton}
        reloadToken={reloadToken}
        filters={[
          { key: 'driverName', type: 'text', placeholder: 'اسم السائق' },
          { key: 'verificationStatus', type: 'select', placeholder: 'حالة التحقق', options: statusOptions },
        ]} 
      />
      <BankAccountModal 
        isOpen={createModalOpen} 
        onClose={() => setCreateModalOpen(false)} 
        onSave={handleCreate} 
      />
      <BankAccountModal 
        isOpen={updateModalOpen} 
        onClose={() => setUpdateModalOpen(false)} 
        account={selectedAccount} 
        onSave={handleUpdate} 
      />
    </>
  );
}