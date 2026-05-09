import { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';
import { LuUserPlus, LuSearch, LuLoaderCircle } from 'react-icons/lu';

export default function AssignVehicleModal({ isOpen, onClose, vehicleId, onStatusUpdate }) {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchDrivers();
    }
  }, [isOpen]);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const { data } = await apiService.get('/users', { 
        role: 'DRIVER', 
        accountStatus: 'ACTIVE',
        limit: 100 
      });
      setDrivers(data.data || []);
    } catch (err) {
      toast.error('تعذر تحميل قائمة السائقين');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDriverId) {
      toast.error('يرجى اختيار سائق أولاً');
      return;
    }

    setSubmitting(true);
    try {
      await apiService.post(`/vehicles/${vehicleId}/assign`, {
        userId: parseInt(selectedDriverId),
        notes
      });
      toast.success('تم تسليم المركبة للسائق بنجاح');
      onStatusUpdate();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل عملية التسليم');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredDrivers = drivers.filter(d => 
    d.fullNameAr?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.identityNumber?.includes(searchTerm)
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تسليم المركبة لسائق">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          {/* Search Field */}
          <div className="relative">
            <LuSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="ابحث باسم السائق أو رقم الهوية..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pr-12 pl-4 focus:ring-2 focus:ring-brand-primary outline-none transition-all font-bold text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Drivers List */}
          <div className="max-h-[300px] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <LuLoaderCircle className="animate-spin mb-2" size={24} />
                <span className="text-xs font-bold">جاري تحميل السائقين...</span>
              </div>
            ) : filteredDrivers.length > 0 ? (
              filteredDrivers.map((driver) => (
                <label
                  key={driver.id}
                  className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    selectedDriverId === driver.id 
                    ? 'border-brand-primary bg-brand-light/20 shadow-sm' 
                    : 'border-slate-100 bg-white hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-sm">
                      {driver.fullNameAr?.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-black text-slate-800">{driver.fullNameAr}</div>
                      <div className="text-[0.7rem] text-slate-500 font-bold">{driver.identityNumber}</div>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="driver"
                    className="w-5 h-5 accent-brand-primary"
                    checked={selectedDriverId === driver.id}
                    onChange={() => setSelectedDriverId(driver.id)}
                  />
                </label>
              ))
            ) : (
              <div className="text-center py-10 text-slate-400 font-bold text-sm">
                لا يوجد سائقين متاحين مطابقين للبحث
              </div>
            )}
          </div>

          {/* Notes Area */}
          <div className="p-4 bg-amber-50 rounded-[1.25rem] border border-amber-200 mb-4">
            <p className="text-[0.7rem] font-bold text-amber-800 leading-relaxed">
              * ملاحظة: القائمة تظهر السائقين النشطين فقط. سيتم التحقق من عدم وجود عهدة سابقة لدى السائق عند التأكيد.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-[0.7rem] font-black text-slate-500 uppercase tracking-widest block px-1">ملاحظات التسليم (اختياري)</label>
            <textarea
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-brand-primary outline-none transition-all font-bold text-sm min-h-[100px]"
              placeholder="اكتب أي ملاحظات تتعلق بحالة المركبة عند التسليم..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={submitting || !selectedDriverId}
            className="flex-1 bg-brand-primary hover:bg-brand-hover disabled:bg-slate-300 text-white font-black py-4 rounded-[1.25rem] shadow-premium transition-all flex items-center justify-center gap-2"
          >
            {submitting ? <LuLoaderCircle className="animate-spin" size={20} /> : <LuUserPlus size={20} />}
            تأكيد عملية التسليم
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-slate-100 text-slate-600 font-black py-4 rounded-[1.25rem] transition-all hover:bg-slate-200"
          >
            إلغاء
          </button>
        </div>
      </form>
    </Modal>
  );
}
