import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { apiService } from '../../services/api';
import { LuMapPin, LuClock } from 'react-icons/lu';

import { vehicleIcon } from '../../utils/mapIcons';

function RecenterMap({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      map.flyTo([lat, lng], 15, { duration: 1.5 });
    }
  }, [lat, lng, map]);
  return null;
}

export default function VehicleLiveMap({ activeShiftId, vehicle, activeDriver }) {
  const [position, setPosition] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef(null);

  // Initial position from vehicle object (if available in summary or latest shift)
  useEffect(() => {
    if (vehicle?.lastLat && vehicle?.lastLng) {
      setPosition({
        lat: vehicle.lastLat,
        lng: vehicle.lastLng,
        timestamp: vehicle.lastLocationAt || new Date()
      });
    }
  }, [vehicle]);

  useEffect(() => {
    if (!activeShiftId) return;

    const backendUrl = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:5000';
    
    socketRef.current = io(backendUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      setSocketConnected(true);
      socket.emit('join_admin_dashboard');
    });

    socket.on('disconnect', () => setSocketConnected(false));

    socket.on('live_tracking_update', (payload) => {
      if (payload && payload.shiftId === activeShiftId) {
        setPosition({
          lat: payload.lat,
          lng: payload.lng,
          timestamp: payload.timestamp
        });
      }
    });

    const pollLocation = async () => {
      try {
        const { data } = await apiService.get('/dashboard/live-tracking');
        const row = data.data?.find((r) => r.shiftId === activeShiftId);
        if (row?.lat != null && row?.lng != null) {
          setPosition({
            lat: row.lat,
            lng: row.lng,
            timestamp: row.timestamp || new Date().toISOString(),
          });
        }
      } catch { /* REST fallback — socket may still be primary */ }
    };

    pollLocation();
    const pollTimer = setInterval(pollLocation, 30000);

    return () => {
      clearInterval(pollTimer);
      socket.emit('leave_admin_dashboard');
      socket.disconnect();
    };
  }, [activeShiftId]);

  if (!activeShiftId && !position) {
    return (
      <div className="bg-white rounded-3xl shadow-premium border border-slate-100 p-12 flex flex-col items-center justify-center min-h-[400px] text-center">
         <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mb-4">
            <LuMapPin size={32} />
         </div>
         <h3 className="text-lg font-black text-slate-800 mb-2">لا يوجد تتبع نشط</h3>
         <p className="text-sm text-slate-500 font-medium">المركبة متوقفة حالياً ولم يتم تسجيل أي إحداثيات حديثة.</p>
      </div>
    );
  }

  const defaultCenter = [24.7136, 46.6753];

  return (
    <div className="bg-white rounded-3xl shadow-premium border border-slate-100 overflow-hidden flex flex-col">
      <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <LuMapPin className="text-brand-primary" />
            تتبع المركبة: {vehicle?.plateNumber}
          </h3>
          <p className="text-xs font-bold text-slate-400 mt-1">
            {activeDriver ? `السائق: ${activeDriver.fullNameAr}` : 'لا يوجد سائق نشط'} | 
            تحديث: {position?.timestamp ? new Date(position.timestamp).toLocaleTimeString('ar-SA') : '—'}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {activeShiftId ? (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black ring-1 transition-colors ${
              socketConnected ? 'bg-emerald-50 text-emerald-600 ring-emerald-200' : 'bg-red-50 text-red-600 ring-red-200'
            }`}>
              {socketConnected ? <><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> مباشر (Live)</> : 'جاري الاتصال...'}
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-slate-50 text-slate-500 px-3 py-1.5 rounded-full text-xs font-black ring-1 ring-slate-200">
               <LuClock size={14} /> غير مستخدمة حالياً
            </div>
          )}
        </div>
      </div>

      <div className="relative w-full h-[500px] z-0">
        <MapContainer 
          center={position ? [position.lat, position.lng] : defaultCenter} 
          zoom={position ? 15 : 12} 
          style={{ width: '100%', height: '100%', zIndex: 0 }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {position && (
            <>
              <Marker position={[position.lat, position.lng]} icon={vehicleIcon}>
                <Popup>
                  <div className="text-center font-alexandria">
                    <strong className="text-brand-primary block mb-1">موقع المركبة</strong>
                    <span className="text-xs text-slate-500">{activeDriver?.fullNameAr}</span>
                  </div>
                </Popup>
              </Marker>
              <RecenterMap lat={position.lat} lng={position.lng} />
            </>
          )}
        </MapContainer>
      </div>
    </div>
  );
}
