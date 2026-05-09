import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';
import StatusBadge from '../../components/ui/StatusBadge';
import { 
  LuArrowRight, LuSend, LuPaperclip, 
  LuClock, LuUser, LuUserCog,
  LuImage, LuFileText, LuTrash2
} from 'react-icons/lu';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = [
  { value: 'OPEN', label: 'مفتوحة' },
  { value: 'IN_PROGRESS', label: 'قيد المعالجة' },
  { value: 'PENDING_CUSTOMER', label: 'بانتظار المستخدم' },
  { value: 'RESOLVED', label: 'تم الحل' },
  { value: 'CLOSED', label: 'مغلقة' },
];

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'منخفضة' },
  { value: 'MEDIUM', label: 'متوسطة' },
  { value: 'HIGH', label: 'عالية' },
  { value: 'URGENT', label: 'عاجلة' },
];

export default function TicketDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const loadTicket = async () => {
    try {
      const response = await apiService.get(`/tickets/${id}`);
      setTicket(response.data.data);
    } catch (error) {
      toast.error('فشل في تحميل بيانات التذكرة');
      navigate('/tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTicket();
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages]);

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!reply.trim() && !attachment) return;

    setSending(true);
    const formData = new FormData();
    formData.append('message', reply);
    formData.append('isInternal', isInternal);
    if (attachment) {
      formData.append('attachment', attachment);
    }

    try {
      await apiService.post(`/tickets/${id}/messages`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setReply('');
      setAttachment(null);
      loadTicket();
    } catch (error) {
      toast.error('فشل في إرسال الرد');
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await apiService.patch(`/tickets/${id}/status`, { status: newStatus });
      toast.success('تم تحديث حالة التذكرة');
      loadTicket();
    } catch (error) {
      toast.error('فشل في تحديث الحالة');
    }
  };

  const handlePriorityChange = async (newPriority) => {
    try {
      await apiService.patch(`/tickets/${id}/status`, { priority: newPriority });
      toast.success('تم تحديث الأولوية');
      loadTicket();
    } catch (error) {
      toast.error('فشل في تحديث الأولوية');
    }
  };

  if (loading) return <div className="p-8 text-center">جاري التحميل...</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-slate-50 overflow-hidden">
      {/* Ticket Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/tickets')} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
            <LuArrowRight size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black text-slate-800">{ticket.title}</h2>
              <span className="text-xs font-bold text-slate-400">#{ticket.id}</span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <StatusBadge status={ticket.status} />
              <div className="flex items-center gap-1 text-[0.7rem] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                <LuClock size={12} />
                مفتوحة منذ {new Date(ticket.createdAt).toLocaleDateString('ar-SA')}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={ticket.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="select select-sm !bg-slate-50 border-slate-200 font-bold text-xs"
          >
            {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          <select 
            value={ticket.priority}
            onChange={(e) => handlePriorityChange(e.target.value)}
            className="select select-sm !bg-slate-50 border-slate-200 font-bold text-xs"
          >
            {PRIORITY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Conversation Area */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          {/* Message History */}
          <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
            {ticket.messages.map((msg, idx) => {
              const isMe = msg.senderId === ticket.assignedToId; // Simple check for admin side
              return (
                <div key={msg.id} className={`flex ${msg.isInternal ? 'bg-amber-50/30 p-4 rounded-3xl border border-amber-100/50' : ''}`}>
                  <div className="flex items-start gap-4 max-w-[80%]">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 overflow-hidden border-2 border-white shadow-sm shrink-0">
                      {msg.sender.profileImageUrl ? (
                        <img src={apiService.defaults.baseURL + '/../' + msg.sender.profileImageUrl} className="w-full h-full object-cover" />
                      ) : msg.sender.fullNameAr?.charAt(0)}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black text-slate-800">{msg.sender.fullNameAr}</span>
                        <span className="text-[0.65rem] font-bold text-slate-400">{new Date(msg.createdAt).toLocaleTimeString('ar-SA')}</span>
                        {msg.isInternal && <span className="text-[0.6rem] font-black bg-amber-200 text-amber-700 px-2 py-0.5 rounded-full uppercase tracking-widest">ملاحظة داخلية</span>}
                      </div>
                      <div className="text-[0.95rem] text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl rounded-tr-none shadow-sm">
                        {msg.message}
                        
                        {msg.attachmentUrl && (
                          <div className="mt-3 pt-3 border-t border-slate-200/50">
                            {msg.attachmentType === 'IMAGE' && (
                              <img 
                                src={apiService.defaults.baseURL + '/../' + msg.attachmentUrl} 
                                className="max-w-md rounded-xl shadow-md hover:scale-[1.02] transition-transform cursor-pointer" 
                                onClick={() => window.open(apiService.defaults.baseURL + '/../' + msg.attachmentUrl, '_blank')}
                              />
                            )}
                            {msg.attachmentType === 'VOICE' && (
                              <div className="flex items-center gap-4 bg-white p-3 rounded-xl border border-slate-100">
                                <audio controls src={apiService.defaults.baseURL + '/../' + msg.attachmentUrl} className="h-10 w-full" />
                              </div>
                            )}
                            {msg.attachmentType === 'DOCUMENT' && (
                              <a 
                                href={apiService.defaults.baseURL + '/../' + msg.attachmentUrl} 
                                target="_blank"
                                className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-100 hover:border-brand-primary transition-colors"
                              >
                                <LuFileText className="text-brand-primary" size={24} />
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold text-slate-700">عرض الملف المرفق</span>
                                  <span className="text-[0.7rem] text-slate-400 font-bold uppercase tracking-widest">PDF / Document</span>
                                </div>
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply Area */}
          <div className="p-6 border-t border-slate-200 bg-white">
            <form onSubmit={handleSendReply} className="space-y-4">
              <div className="relative">
                <textarea 
                  rows="3"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="اكتب ردك هنا..."
                  className="textarea w-full !bg-slate-50 border-slate-200 rounded-2xl p-5 text-sm font-bold placeholder:text-slate-400 focus:ring-2 focus:ring-brand-light focus:bg-white transition-all resize-none shadow-inner"
                ></textarea>
                <div className="absolute left-4 bottom-4 flex items-center gap-2">
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current.click()}
                    className={`p-2 rounded-xl transition-all ${attachment ? 'bg-brand-primary text-white' : 'text-slate-400 hover:bg-slate-200'}`}
                  >
                    <LuPaperclip size={20} />
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={(e) => setAttachment(e.target.files[0])}
                    className="hidden" 
                  />
                  <button type="submit" disabled={sending} className="btn btn-primary px-6 rounded-xl flex items-center gap-2 shadow-orange">
                    {sending ? 'جاري الإرسال...' : (
                      <>
                        إرسال الرد
                        <LuSend size={18} />
                      </>
                    )}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-6 px-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={isInternal} 
                    onChange={(e) => setIsInternal(e.target.checked)}
                    className="checkbox checkbox-sm checkbox-primary" 
                  />
                  <span className="text-xs font-black text-slate-500 group-hover:text-amber-600 transition-colors">ملاحظة داخلية (لا يراها المستخدم)</span>
                </label>
                {attachment && (
                  <div className="flex items-center gap-2 bg-brand-light text-brand-primary px-3 py-1 rounded-full text-[0.7rem] font-bold">
                    <LuPaperclip size={12} />
                    {attachment.name}
                    <button onClick={() => setAttachment(null)} className="hover:text-red-500"><LuTrash2 size={12} /></button>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Info Sidebar */}
        <div className="w-[350px] border-r border-slate-200 bg-slate-50/50 p-8 space-y-8 overflow-y-auto custom-scrollbar hidden xl:block">
          {/* User Info */}
          <div>
            <h4 className="text-[0.7rem] font-black text-slate-400 uppercase tracking-widest mb-6">صاحب التذكرة</h4>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-slate-50 border-4 border-white shadow-md mb-4 flex items-center justify-center text-2xl font-black text-slate-300 overflow-hidden">
                 {ticket.user.profileImageUrl ? (
                    <img src={apiService.defaults.baseURL + '/../' + ticket.user.profileImageUrl} className="w-full h-full object-cover" />
                 ) : ticket.user.fullNameAr?.charAt(0)}
              </div>
              <h5 className="font-black text-slate-800 mb-1">{ticket.user.fullNameAr}</h5>
              <p className="text-xs font-bold text-slate-400 mb-4">{ticket.user.identityNumber}</p>
              <button onClick={() => navigate(`/drivers/${ticket.userId}`)} className="btn btn-sm w-full bg-slate-50 border-slate-200 text-slate-600 font-bold !rounded-xl hover:bg-brand-light hover:text-brand-primary hover:border-brand-primary transition-all">عرض ملف السائق</button>
            </div>
          </div>

          {/* Ticket Stats */}
          <div>
            <h4 className="text-[0.7rem] font-black text-slate-400 uppercase tracking-widest mb-6">تفاصيل إضافية</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <span className="text-xs font-bold text-slate-500">التصنيف</span>
                <span className="text-xs font-black text-slate-800 tracking-tight">{ticket.category}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <span className="text-xs font-bold text-slate-500">الأولوية</span>
                <span className="text-xs font-black text-slate-800">{ticket.priority}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <span className="text-xs font-bold text-slate-500">تم إنشاؤها</span>
                <span className="text-xs font-black text-slate-800">{new Date(ticket.createdAt).toLocaleDateString('ar-SA')}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <span className="text-xs font-bold text-slate-500">آخر تحديث</span>
                <span className="text-xs font-black text-slate-800">{new Date(ticket.updatedAt).toLocaleDateString('ar-SA')}</span>
              </div>
            </div>
          </div>

          {/* Assignments (Simplified for now) */}
          <div className="bg-brand-primary/5 p-6 rounded-3xl border border-brand-primary/10">
            <h4 className="text-[0.7rem] font-black text-brand-primary uppercase tracking-widest mb-4">المسؤول عن الحل</h4>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-brand-primary shadow-sm border border-brand-primary/10">
                <LuUserCog size={20} />
              </div>
              <div>
                <div className="text-sm font-black text-slate-800">{ticket.assignedTo?.fullNameAr || 'غير مسندة'}</div>
                <div className="text-[0.65rem] font-bold text-slate-400">فريق الدعم والامتثال</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
