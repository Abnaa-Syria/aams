import { useState } from 'react';
import GenericListPage from '../../components/ui/GenericListPage';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import UserSelect from '../../components/ui/UserSelect';
import { apiService } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LuPlus } from 'react-icons/lu';

const columns = [
  { key: 'user', label: 'الموظف', render: (v) => v?.fullNameAr || '—' },
  { key: 'bankName', label: 'البنك' },
  { key: 'iban', label: 'IBAN' },
  { key: 'accountOwnerName', label: 'صاحب الحساب' },
  { key: 'isDefault', label: 'افتراضي', render: (v) => v ? 'نعم' : 'لا' },
  { key: 'verificationStatus', label: 'الحالة', render: (v) => <StatusBadge status={v} /> },
];

const verificationOptions = [
  { value: 'PENDING', label: 'معلق' },
  { value: 'VERIFIED', label: 'موثق' },
  { value: 'REJECTED', label: 'مرفوض' },
];

export default function BankAccountsPage() {
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [form, setForm] = useState({
    userId: '',
    bankName: '',
    iban: '',
    accountOwnerName: '',
    isDefault: false,
    paymentMethod: 'BANK_TRANSFER',
  });

  const handleChange = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: val }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.userId || !form.bankName || !form.iban || !form.accountOwnerName) {
      toast.error('يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }

    const ibanRegex = /^SA\d{22}$/;
    if (!ibanRegex.test(form.iban)) {
      toast.error('رقم IBAN غير صحيح (يجب أن يبدأ بـ SA ويتكون من 24 رقم)');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('userId', form.userId);
      formData.append('bankName', form.bankName);
      formData.append('iban', form.iban);
      formData.append('accountOwnerName', form.accountOwnerName);
      formData.append('isDefault', form.isDefault.toString());
      formData.append('paymentMethod', form.paymentMethod);

      await apiService.post('/bank-accounts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('تم إنشاء الحساب البنكي بنجاح');
      setShowCreate(false);
      setForm({ userId: '', bankName: '', iban: '', accountOwnerName: '', isDefault: false, paymentMethod: 'BANK_TRANSFER' });
      setReloadToken((t) => t + 1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  const createButton = (
    <button onClick={() => setShowCreate(true)} className="btn btn-primary flex items-center gap-2">
      <LuPlus size={18} />
      <span>إضافة حساب بنكي</span>
    </button>
  );

  return (
    <>
      <GenericListPage
        title="الحسابات البنكية"
        apiUrl="/bank-accounts"
        columns={columns}
        onRowClick={(row) => navigate(`/bank-accounts/${row.id}`)}
        createButton={createButton}
        reloadToken={reloadToken}
        filters={[
          { key: 'driverName', type: 'text', placeholder: 'اسم السائق' },
          { key: 'verificationStatus', type: 'select', placeholder: 'حالة التحقق', options: verificationOptions },
        ]}
      />

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="إضافة حساب بنكي جديد">
        <form onSubmit={handleCreate} className="space-y-5">
          <UserSelect
            value={form.userId}
            onChange={(v) => setForm((f) => ({ ...f, userId: v }))}
            required
            label="الموظف"
          />

          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">اسم البنك</label>
            <input
              type="text"
              className="form-input"
              value={form.bankName}
              onChange={handleChange('bankName')}
              required
              placeholder="مثال: البنك الأهلي"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">رقم IBAN</label>
            <input
              type="text"
              className="form-input"
              value={form.iban}
              onChange={handleChange('iban')}
              required
              placeholder="SA0000000000000000000000"
              maxLength={24}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">اسم صاحب الحساب</label>
            <input
              type="text"
              className="form-input"
              value={form.accountOwnerName}
              onChange={handleChange('accountOwnerName')}
              required
              placeholder="الاسم كما يظهر في البنك"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-600 mb-2">طريقة الدفع</label>
            <select
              className="form-input form-select"
              value={form.paymentMethod}
              onChange={handleChange('paymentMethod')}
            >
              <option value="BANK_TRANSFER">تحويل بنكي</option>
              <option value="CASH">نقدي</option>
              <option value="ATM">ATM</option>
            </select>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="form-checkbox"
              checked={form.isDefault}
              onChange={handleChange('isDefault')}
            />
            <span className="text-sm font-bold text-slate-600">حساب افتراضي</span>
          </label>

          <div className="flex gap-4 pt-4 border-t border-slate-100">
            <button type="submit" disabled={loading} className="btn btn-primary flex-1">
              {loading ? 'جارٍ الإنشاء...' : 'إنشاء'}
            </button>
            <button type="button" className="btn bg-slate-100 text-slate-500" onClick={() => setShowCreate(false)}>إلغاء</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
