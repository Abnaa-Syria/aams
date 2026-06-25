import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { apiService } from '../../services/api';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [points, map]);
  return null;
}

export default function FleetLiveMapPage() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);

  const load = async () => {
    try {
      const { data } = await apiService.get('/dashboard/live-tracking');
      setDrivers(data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  const points = drivers.filter((d) => d.lat != null && d.lng != null);

  return (
    <div className="page-container">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-slate-800">خريطة التتبع الحي — الأسطول</h2>
        <p className="text-sm text-slate-500 mt-1">{loading ? 'جاري التحميل…' : `${points.length} سائق نشط على الخريطة`}</p>
      </div>
      <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-premium h-[70vh]">
        <MapContainer center={[24.7136, 46.6753]} zoom={11} style={{ height: '100%', width: '100%' }}>
          <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <FitBounds points={points} />
          {points.map((d) => (
            <Marker key={d.shiftId} position={[d.lat, d.lng]}>
              <Popup>
                <strong>{d.driver?.fullNameAr}</strong>
                <br />
                {d.vehicle?.plateNumber}
                <br />
                <small>{d.timestamp ? new Date(d.timestamp).toLocaleString('ar-SA') : ''}</small>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
