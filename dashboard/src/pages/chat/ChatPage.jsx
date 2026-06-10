import { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { apiService } from '../../services/api';
import { resolveUploadUrl } from '../../utils/apiOrigin';
import { 
  LuSearch, LuSend, LuPaperclip, LuEllipsisVertical, LuPhone, 
  LuVideo, LuUser, LuClock, LuCheck, LuCheckCheck, LuPlus,
  LuX, LuImage, LuFileText, LuArrowLeft, LuRefreshCw, LuMessageSquare,
  LuTrash2, LuFile
} from 'react-icons/lu';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';

function formatChatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
}

function ChatBubble({ message, isMe }) {
  return (
    <div className={`flex ${isMe ? 'justify-start' : 'justify-end'} mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <div className={`max-w-[75%] rounded-2xl p-4 shadow-sm relative ${
        isMe 
          ? 'bg-brand-primary text-white rounded-tr-none' 
          : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
      }`}>
        {message.attachmentUrl && (
          <div className="mb-3">
            {message.attachmentUrl.match(/\.(jpg|jpeg|png|gif)$/i) ? (
              <img 
                src={resolveUploadUrl(message.attachmentUrl)} 
                className="max-w-full rounded-xl cursor-pointer hover:opacity-90 transition-opacity" 
                onClick={() => window.open(resolveUploadUrl(message.attachmentUrl), '_blank')}
              />
            ) : (
              <a 
                href={resolveUploadUrl(message.attachmentUrl)} 
                target="_blank"
                className={`flex items-center gap-3 p-3 rounded-xl border ${isMe ? 'bg-white/10 border-white/20' : 'bg-slate-50 border-slate-100'}`}
              >
                {message.attachmentUrl.toLowerCase().endsWith('.pdf') ? <LuFile size={20} /> : <LuFileText size={20} />}
                <span className="text-xs font-bold truncate">
                  {message.attachmentUrl.toLowerCase().endsWith('.pdf') ? 'عرض ملف PDF' : 'عرض المرفق'}
                </span>
              </a>
            )}
          </div>
        )}
        <p className="text-[0.95rem] font-medium leading-relaxed whitespace-pre-wrap">{message.message}</p>
        <div className={`flex items-center gap-1 mt-2 ${isMe ? 'text-white/70' : 'text-slate-400'}`}>
          <span className="text-[0.65rem] font-bold">{formatChatTime(message.createdAt)}</span>
          {isMe && (message.isRead ? <LuCheckCheck size={12} /> : <LuCheck size={12} />)}
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { user: currentUser } = useSelector((state) => state.auth);
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const loadConversations = useCallback(async () => {
    try {
      const { data } = await apiService.get('/chat/conversations');
      setConversations(data.data || []);
    } catch (err) {
      toast.error('فشل في تحميل المحادثات');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (partnerId) => {
    setLoadingMessages(true);
    try {
      const { data } = await apiService.get(`/chat/messages/${partnerId}`);
      const fetchedMessages = Array.isArray(data.data) ? [...data.data].reverse() : [];
      setMessages(fetchedMessages);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      toast.error('فشل في تحميل الرسائل');
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 10000); // Poll for new messages
    return () => clearInterval(interval);
  }, [loadConversations]);

  // Handle auto-selection from query params
  useEffect(() => {
    const userId = searchParams.get('userId');
    if (!userId) return;

    const partnerId = parseInt(userId);
    
    // Check if already selected to avoid infinite loop
    if (selectedPartner?.id === partnerId) return;

    const existing = conversations.find(c => c.partner.id === partnerId);
    if (existing) {
      setSelectedPartner(existing.partner);
      setSearchParams({}, { replace: true });
    } else if (!loading) { // Only fetch if we've at least tried to load conversations
      // Fetch user info if not in active conversations list
      void (async () => {
        try {
          const { data } = await apiService.get(`/users/${userId}`);
          setSelectedPartner(data.data);
          setSearchParams({}, { replace: true });
        } catch (err) {
          console.error('Failed to fetch user for chat', err);
        }
      })();
    }
  }, [searchParams, conversations, loading, selectedPartner, setSearchParams]);

  useEffect(() => {
    if (selectedPartner) {
      loadMessages(selectedPartner.id);
    }
  }, [selectedPartner, loadMessages]);

  const handleDeleteHistory = async () => {
    if (!selectedPartner) return;
    if (!window.confirm('هل أنت متأكد من حذف سجل المحادثة بالكامل؟ لا يمكن التراجع عن هذا الإجراء.')) return;

    try {
      await apiService.delete(`/chat/messages/${selectedPartner.id}`);
      setMessages([]);
      loadConversations();
      toast.success('تم مسح سجل المحادثة');
    } catch (err) {
      toast.error('فشل في حذف المحادثة');
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const searchUsers = useCallback(async (q) => {
    if (!q || q.length < 2) return;
    setSearchingUsers(true);
    try {
      const { data } = await apiService.get('/users', { search: q, limit: 5 });
      setSearchResults(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSearchingUsers(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchUsers(userSearchQuery), 500);
    return () => clearTimeout(timer);
  }, [userSearchQuery, searchUsers]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!selectedPartner || (!inputText.trim() && !attachment)) return;

    setSending(true);
    const formData = new FormData();
    formData.append('receiverId', selectedPartner.id);
    formData.append('message', inputText);
    if (attachment) formData.append('attachment', attachment);

    try {
      setSending(true);
      const { data } = await apiService.upload('/chat/send', formData);
      setMessages(prev => [...prev, data.data]);
      setInputText('');
      setAttachment(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadConversations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل في إرسال الرسالة');
    } finally {
      setSending(false);
    }
  };

  if (loading && conversations.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="w-12 h-12 border-4 border-brand-light border-t-brand-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-100px)] bg-white rounded-[2.5rem] shadow-premium border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-500" dir="rtl">
      {/* Sidebar */}
      <div className="w-[380px] border-l border-slate-100 flex flex-col bg-slate-50/30">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">المحادثات</h2>
            <button 
              onClick={() => setIsNewChatModalOpen(true)}
              className="w-10 h-10 rounded-xl bg-brand-primary text-white flex items-center justify-center shadow-orange hover:scale-105 transition-transform"
            >
              <LuPlus size={20} />
            </button>
          </div>
          <div className="relative">
            <LuSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="البحث في المحادثات..." 
              className="form-input pr-12 bg-white border-slate-100 rounded-2xl text-sm font-bold shadow-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {conversations.map((conv) => (
            <button
              key={conv.partner.id}
              onClick={() => setSelectedPartner(conv.partner)}
              className={`w-full p-6 flex items-center gap-4 transition-all border-b border-slate-50/50 hover:bg-white group ${
                selectedPartner?.id === conv.partner.id ? 'bg-white shadow-sm ring-1 ring-slate-100' : ''
              }`}
            >
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-brand-light flex items-center justify-center text-brand-primary font-black text-xl shadow-sm border-2 border-white">
                  {conv.partner.profileImageUrl ? (
                    <img 
                      src={resolveUploadUrl(conv.partner.profileImageUrl)} 
                      className="w-full h-full object-cover rounded-2xl" 
                    />
                  ) : (
                    <LuUser size={20} />
                  )}
                </div>
                <div className={`absolute -bottom-1 -left-1 w-4 h-4 rounded-full border-2 border-white ${conv.partner.role === 'DRIVER' ? 'bg-green-500' : 'bg-brand-primary'}`} />
              </div>
              <div className="flex-1 min-w-0 text-right">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-[0.95rem] font-black text-slate-800 truncate">{conv.partner.fullNameAr}</h4>
                  <span className="text-[0.65rem] font-bold text-slate-400">{formatChatTime(conv.lastMessage?.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-400 truncate flex-1">
                    {conv.lastMessage?.senderId === currentUser.id && <span className="text-brand-primary ml-1 font-black">أنا:</span>}
                    {conv.lastMessage?.message || (conv.lastMessage?.attachmentUrl ? 'ملف مرفق' : '...')}
                  </p>
                  {conv.unreadCount > 0 && (
                    <span className="bg-brand-primary text-white text-[0.65rem] font-black px-2 py-0.5 rounded-lg min-w-[20px] shadow-orange">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
          {conversations.length === 0 && (
            <div className="text-center py-12 px-6">
              <LuMessageSquare size={48} className="mx-auto mb-4 text-slate-200" />
              <p className="text-slate-400 font-bold italic">لا توجد محادثات نشطة</p>
              <button onClick={() => setIsNewChatModalOpen(true)} className="mt-4 text-brand-primary font-black text-sm hover:underline">ابدأ محادثة جديدة</button>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedPartner ? (
          <>
            {/* Chat Header */}
            <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-brand-light flex items-center justify-center text-brand-primary font-black shadow-sm">
                  {selectedPartner.profileImageUrl ? (
                    <img src={resolveUploadUrl(selectedPartner.profileImageUrl)} className="w-full h-full object-cover rounded-xl" />
                  ) : selectedPartner.fullNameAr?.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 leading-tight">{selectedPartner.fullNameAr}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest">{selectedPartner.role}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleDeleteHistory}
                  className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" 
                  title="حذف المحادثة"
                >
                  <LuTrash2 size={20} />
                </button>
                <button className="p-2.5 text-slate-400 hover:text-brand-primary hover:bg-brand-light rounded-xl transition-all"><LuPhone size={20} /></button>
                <button className="p-2.5 text-slate-400 hover:text-brand-primary hover:bg-brand-light rounded-xl transition-all"><LuVideo size={20} /></button>
                <button className="p-2.5 text-slate-400 hover:text-brand-primary hover:bg-brand-light rounded-xl transition-all"><LuEllipsisVertical size={20} /></button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30 custom-scrollbar">
              {messages.map((msg) => (
                <ChatBubble key={msg.id} message={msg} isMe={msg.senderId === currentUser.id} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 bg-white border-t border-slate-100">
              <form onSubmit={handleSendMessage} className="relative">
                {attachment && (
                  <div className="absolute bottom-full mb-4 right-0 bg-white border border-slate-200 rounded-2xl p-3 shadow-xl flex items-center gap-3 animate-in slide-in-from-bottom-2">
                    <div className="w-10 h-10 rounded-lg bg-brand-light flex items-center justify-center text-brand-primary">
                      {attachment.type.startsWith('image/') ? <LuImage size={20} /> : <LuFileText size={20} />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-slate-700 truncate max-w-[150px]">{attachment.name}</span>
                      <span className="text-[0.6rem] font-bold text-slate-400">{(attachment.size / 1024).toFixed(1)} KB</span>
                    </div>
                    <button type="button" onClick={() => setAttachment(null)} className="p-1 text-slate-400 hover:text-red-500"><LuX size={16} /></button>
                  </div>
                )}
                
                <div className="flex items-center gap-4 bg-slate-50 rounded-[2rem] p-2 pr-6 border border-slate-100 shadow-inner focus-within:bg-white focus-within:border-brand-primary/20 transition-all">
                  <textarea
                    rows="1"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }}
                    placeholder="اكتب رسالتك هنا..."
                    className="flex-1 bg-transparent border-none focus:ring-0 text-[0.95rem] font-bold placeholder:text-slate-400 py-3 resize-none"
                  />
                  <div className="flex items-center gap-1">
                    <button 
                      type="button" 
                      onClick={() => fileInputRef.current?.click()}
                      className={`p-3 rounded-full transition-all ${attachment ? 'bg-brand-primary text-white' : 'text-slate-400 hover:bg-slate-200'}`}
                    >
                      <LuPaperclip size={20} />
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf" onChange={(e) => setAttachment(e.target.files[0])} />
                    <button 
                      type="submit" 
                      disabled={sending || (!inputText.trim() && !attachment)}
                      className="w-12 h-12 rounded-full bg-brand-primary text-white flex items-center justify-center shadow-orange hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all"
                    >
                      {sending ? <LuRefreshCw className="animate-spin" size={20} /> : <LuSend size={20} className="ltr:rotate-0 rtl:rotate-180" />}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-slate-50/10">
            <div className="w-24 h-24 rounded-[2.5rem] bg-brand-light flex items-center justify-center text-brand-primary mb-8 animate-bounce">
              <LuMessageSquare size={48} />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">مرحباً بك في المحادثات</h3>
            <p className="text-slate-500 font-medium max-w-sm">اختر محادثة من القائمة الجانبية للبدء، أو ابحث عن مستخدم جديد لمراسلته.</p>
            <button 
              onClick={() => setIsNewChatModalOpen(true)}
              className="mt-8 px-8 py-3.5 bg-brand-primary text-white rounded-2xl font-black shadow-orange hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              <LuPlus size={20} />
              ابدأ محادثة جديدة
            </button>
          </div>
        )}
      </div>

      <Modal isOpen={isNewChatModalOpen} onClose={() => setIsNewChatModalOpen(false)} title="بدء محادثة جديدة">
        <div className="space-y-6 py-2">
          <div className="relative">
            <LuSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="ابحث بالاسم، رقم الجوال أو رقم الهوية..." 
              className="form-input pr-12"
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
            {searchingUsers ? (
              <div className="py-12 text-center text-slate-400 font-bold flex items-center justify-center gap-3">
                <LuRefreshCw className="animate-spin" size={20} />
                جاري البحث...
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map(u => (
                <button
                  key={u.id}
                  onClick={() => { setSelectedPartner(u); setIsNewChatModalOpen(false); setUserSearchQuery(''); setSearchResults([]); }}
                  className="w-full flex items-center gap-4 p-4 rounded-[1.5rem] hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group text-right"
                >
                  <div className="w-12 h-12 rounded-xl bg-brand-light text-brand-primary flex items-center justify-center font-black text-lg overflow-hidden">
                    {u.profileImageUrl ? (
                      <img src={resolveUploadUrl(u.profileImageUrl)} className="w-full h-full object-cover" />
                    ) : u.fullNameAr?.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <h5 className="font-black text-slate-800 group-hover:text-brand-primary transition-colors">{u.fullNameAr}</h5>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[0.65rem] font-black bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full uppercase tracking-widest">{u.role}</span>
                      <span className="text-[0.65rem] font-bold text-slate-400">{u.identityNumber}</span>
                    </div>
                  </div>
                  <LuArrowLeft className="text-slate-300 group-hover:text-brand-primary transition-all opacity-0 group-hover:opacity-100" />
                </button>
              ))
            ) : userSearchQuery.length >= 2 ? (
              <div className="py-12 text-center text-slate-400 font-bold italic">لا توجد نتائج مطابقة</div>
            ) : (
              <div className="py-12 text-center text-slate-300 font-bold italic flex flex-col items-center gap-3">
                <LuUser size={48} className="opacity-20" />
                ابدأ بكتابة اسم المستخدم للبحث
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
