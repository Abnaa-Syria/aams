import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { apiService } from '../../services/api';
import { LuMapPin, LuClock, LuWifiOff } from 'react-icons/lu';

import { driverIcon } from '../../utils/mapIcons';

// Helper component to smoothly center map when coordinates change
function RecenterMap({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      map.flyTo([lat, lng], 15, { duration: 1.5 });
    }
  }, [lat, lng, map]);
  return null;
}

export default function DriverLiveMap({ driverId }) {
  const [activeShift, setActiveShift] = useState(null);
  const [position, setPosition] = useState(null); // { lat, lng, timestamp }
  const [loading, setLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef(null);

  // 1. Fetch the driver's most relevant shift (ACTIVE first, then fallback to others if needed)
  useEffect(() => {
    const fetchActiveShift = async () => {
      try {
        setLoading(true);
        // Look for an ACTIVE shift first
        const { data } = await apiService.get('/shifts', { userId: driverId, status: 'ACTIVE', limit: 1 });
        let shift = data.data?.[0];

        // If no active shift, fallback to the latest one (any status) to show "last known"
        if (!shift) {
          const res = await apiService.get('/shifts', { userId: driverId, limit: 1 });
          shift = res.data.data?.[0];
        }

        if (shift) {
          setActiveShift(shift);
          if (shift.lastLat && shift.lastLng) {
            setPosition({
              lat: shift.lastLat,
              lng: shift.lastLng,
              timestamp: shift.lastLocationAt || shift.updatedAt
            });
          }
        }
      } catch (err) {
        console.error('Failed to fetch shift for map:', err);
      } finally {
        setLoading(false);
      }
    };

    if (driverId) {
      fetchActiveShift();
    }
  }, [driverId]);

  // 2. Connect to Socket.io for live updates
  useEffect(() => {
    // Only connect if we have a shift (even if not active, for monitoring, but usually active)
    if (!activeShift) return;

    console.log(`[Map] Attempting socket connection for Shift #${activeShift.id} (Status: ${activeShift.status})`);

    const backendUrl = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:5000';
    
    socketRef.current = io(backendUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      setSocketConnected(true);
      console.log('[Map] Socket connected, joining admin_dashboard...');
      socket.emit('join_admin_dashboard');
    });

    socket.on('disconnect', (reason) => {
      setSocketConnected(false);
      console.log('[Map] Socket disconnected:', reason);
    });

    socket.on('live_tracking_update', (payload) => {
      console.log('[Map] Update received:', payload);
      
      // Ensure we match the shift AND payload has valid coords
      const payloadShiftId = Number(payload.shiftId);
      const activeShiftId = Number(activeShift.id);
      
      if (payload && payloadShiftId === activeShiftId) {
        const lat = parseFloat(payload.lat);
        const lng = parseFloat(payload.lng);
        
        if (!isNaN(lat) && !isNaN(lng)) {
          console.log('[Map] Updating marker to:', lat, lng);
          setPosition({
            lat,
            lng,
            timestamp: payload.timestamp || new Date().toISOString()
          });
        } else {
          console.warn('[Map] Invalid coordinates in payload:', payload);
        }
      }
    });

    return () => {
      console.log('[Map] Cleaning up socket...');
      socket.emit('leave_admin_dashboard');
      socket.disconnect();
    };
  }, [activeShift?.id, activeShift?.status]); // Re-connect if shift ID or status changes

  if (loading) {
    return (
      <div className="bg-white rounded-3xl shadow-premium border border-slate-100 p-12 flex flex-col items-center justify-center min-h-[400px]">
         <div className="w-10 h-10 border-4 border-brand-light border-t-brand-primary rounded-full animate-spin mb-4"></div>
         <p className="text-slate-500 font-bold">جاري تحميل بيانات الموقع...</p>
      </div>
    );
  }

  if (!activeShift && !position) {
    return (
      <div className="bg-white rounded-3xl shadow-premium border border-slate-100 p-12 flex flex-col items-center justify-center min-h-[400px] text-center">
         <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mb-4">
            <LuMapPin size={32} />
         </div>
         <h3 className="text-lg font-black text-slate-800 mb-2">لا توجد بيانات موقع</h3>
         <p className="text-sm text-slate-500 font-medium">لم يقم السائق ببدء أي شفت أو تسجيل إحداثيات حتى الآن.</p>
      </div>
    );
  }

  const isLive = activeShift?.status === 'ACTIVE' && socketConnected;
  const defaultCenter = [24.7136, 46.6753]; // Riyadh default

  return (
    <div className="bg-white rounded-3xl shadow-premium border border-slate-100 overflow-hidden flex flex-col">
      {/* Header Panel */}
      <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <LuMapPin className="text-brand-primary" />
            التتبع اللحظي (Live Map)
          </h3>
          <p className="text-xs font-bold text-slate-400 mt-1">
            شفت رقم: #{activeShift?.id || '—'} | 
            تحديث: {position?.timestamp ? new Date(position.timestamp).toLocaleTimeString('ar-SA') : 'غير متوفر'}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {activeShift?.status !== 'ACTIVE' && (
             <div className="flex items-center gap-2 bg-slate-50 text-slate-500 px-3 py-1.5 rounded-full text-xs font-black ring-1 ring-slate-200">
               <LuClock size={14} />
               الشفت غير نشط
             </div>
          )}
          {activeShift?.status === 'ACTIVE' && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black ring-1 transition-colors ${
              socketConnected 
                ? 'bg-emerald-50 text-emerald-600 ring-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                : 'bg-red-50 text-red-600 ring-red-200'
            }`}>
              {socketConnected ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  متصل (Live)
                </>
              ) : (
                <>
                  <LuWifiOff size={14} />
                  جاري الاتصال...
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div className="relative w-full h-[500px] bg-slate-50 z-[10]">
        <MapContainer 
          key={driverId}
          center={position ? [position.lat, position.lng] : defaultCenter} 
          zoom={position ? 15 : 12} 
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {position && (
            <>
              <CircleMarker 
                center={[position.lat, position.lng]} 
                radius={8}
                pathOptions={{ color: 'white', fillColor: '#FA5103', fillOpacity: 1, weight: 2 }}
              />
              <Marker 
                key={driverId} // Use stable ID to prevent re-mounting flickering
                position={[position.lat, position.lng]} 
                icon={driverIcon}
              >
                <Popup>
                  <div className="text-center font-alexandria">
                    <strong className="text-brand-primary block mb-1">موقع المندوب</strong>
                    <span className="text-xs text-slate-500">
                      {new Date(position.timestamp).toLocaleTimeString('ar-SA')}
                    </span>
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
