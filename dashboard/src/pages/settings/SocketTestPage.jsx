import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { LuZap, LuZapOff, LuActivity, LuTerminal } from 'react-icons/lu';

export default function SocketTestPage() {
  const [status, setStatus] = useState('Disconnected');
  const [logs, setLogs] = useState([]);
  const [roomJoined, setRoomJoined] = useState(false);
  const socketRef = useRef(null);

  const addLog = (message, data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    const newLog = { timestamp, message, data };
    setLogs(prev => [newLog, ...prev].slice(0, 50));
    console.log(`[SocketTest] ${message}`, data || '');
  };

  const connect = () => {
    const backendUrl = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:5000';
    addLog(`Connecting to ${backendUrl}...`);

    socketRef.current = io(backendUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socketRef.current.on('connect', () => {
      setStatus('Connected');
      addLog('Socket connected successfully!', { id: socketRef.current.id });
    });

    socketRef.current.on('disconnect', (reason) => {
      setStatus('Disconnected');
      setRoomJoined(false);
      addLog('Socket disconnected', { reason });
    });

    socketRef.current.on('connect_error', (error) => {
      setStatus('Error');
      addLog('Connection Error', error.message);
    });

    // Listen to the specific tracking event
    socketRef.current.on('live_tracking_update', (payload) => {
      addLog('EVENT RECEIVED: live_tracking_update', payload);
    });

    // Listen to generic joined event
    socketRef.current.on('joined', (data) => {
      setRoomJoined(true);
      addLog('Room Joined Confirmation', data);
    });

    socketRef.current.on('tracking_error', (err) => {
      addLog('TRACKING ERROR from Server', err);
    });
  };

  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      addLog('Manual disconnect triggered');
    }
  };

  const joinRoom = () => {
    if (socketRef.current?.connected) {
      addLog('Emitting join_admin_dashboard...');
      socketRef.current.emit('join_admin_dashboard');
    } else {
      addLog('Cannot join room: Socket not connected');
    }
  };

  const leaveRoom = () => {
    if (socketRef.current?.connected) {
      addLog('Emitting leave_admin_dashboard...');
      socketRef.current.emit('leave_admin_dashboard');
      setRoomJoined(false);
    }
  };

  useEffect(() => {
    connect();
    return () => disconnect();
  }, []);

  return (
    <div className="page-container">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">اختبار الـ Socket.io</h2>
          <p className="text-slate-500 text-sm font-medium mt-1">تتبع الأحداث والاتصال اللحظي مع السيرفر</p>
        </div>
        
        <div className={`flex items-center gap-3 px-4 py-2 rounded-2xl font-black text-sm border-2 ${
          status === 'Connected' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
          status === 'Error' ? 'bg-red-50 text-red-600 border-red-100' : 
          'bg-slate-50 text-slate-400 border-slate-100'
        }`}>
          {status === 'Connected' ? <LuZap size={18} className="animate-pulse" /> : <LuZapOff size={18} />}
          {status === 'Connected' ? 'متصل بالسيرفر' : status === 'Error' ? 'خطأ في الاتصال' : 'غير متصل'}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Controls */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card">
            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
              <LuActivity className="text-brand-primary" /> التحكم بالاتصال
            </h3>
            <div className="flex flex-col gap-3">
              <button 
                onClick={connect} 
                disabled={status === 'Connected'}
                className="btn btn-primary w-full disabled:opacity-50"
              >
                إعادة الاتصال
              </button>
              <button 
                onClick={disconnect}
                disabled={status !== 'Connected'}
                className="btn bg-white border border-red-100 text-red-500 hover:bg-red-50 w-full disabled:opacity-50"
              >
                قطع الاتصال
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
              <LuTerminal className="text-blue-500" /> غرف التتبع
            </h3>
            <div className="flex flex-col gap-3">
              <div className={`p-4 rounded-xl border mb-2 text-center text-xs font-black ${
                roomJoined ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-400 border-slate-100'
              }`}>
                الحالة: {roomJoined ? 'متواجد في غرفة التتبع' : 'خارج غرفة التتبع'}
              </div>
              <button 
                onClick={joinRoom}
                className="btn bg-blue-600 text-white hover:bg-blue-700 w-full"
              >
                انضمام لغرفة (Admin Dashboard)
              </button>
              <button 
                onClick={leaveRoom}
                className="btn bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 w-full"
              >
                مغادرة الغرفة
              </button>
            </div>
          </div>
        </div>

        {/* Logs Area */}
        <div className="lg:col-span-2">
          <div className="card h-[600px] flex flex-col !p-0 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-black text-slate-800">سجل الأحداث (Socket Logs)</h3>
              <button 
                onClick={() => setLogs([])}
                className="text-[0.7rem] font-black text-slate-400 hover:text-brand-primary uppercase tracking-widest"
              >
                مسح السجل
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4 font-mono text-[0.8rem] custom-scrollbar bg-slate-900">
              {logs.length === 0 ? (
                <div className="text-slate-500 italic text-center py-20">بانتظار أحداث جديدة... افحص الـ Console أيضاً</div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="border-b border-slate-800 pb-3 last:border-0 animate-in fade-in duration-300">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-brand-primary font-bold">[{log.timestamp}]</span>
                      <span className="text-emerald-400 font-bold">{log.message}</span>
                    </div>
                    {log.data && (
                      <pre className="text-blue-300 bg-slate-800/50 p-3 rounded-lg overflow-x-auto">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
