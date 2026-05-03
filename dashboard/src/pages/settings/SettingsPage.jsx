import { useEffect, useState } from 'react';
import { apiService } from '../../services/api';

export default function SettingsPage() {
  const [settings, setSettings] = useState([]);
  const [cities, setCities] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [masterData, setMasterData] = useState([]);
  const [tab, setTab] = useState('settings');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, c, p, m] = await Promise.all([
          apiService.get('/settings'),
          apiService.get('/settings/cities/list'),
          apiService.get('/platforms'),
          apiService.get('/settings/master-data'),
        ]);
        if (cancelled) return;
        setSettings(s.data.data || []);
        setCities(c.data.data || []);
        setPlatforms(p.data.data || []);
        setMasterData(m.data.data || []);
      } catch { /* handled */ }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const tabs = [
    { key: 'settings', label: 'إعدادات النظام' },
    { key: 'cities', label: 'المدن' },
    { key: 'platforms', label: 'المنصات' },
    { key: 'masterData', label: 'البيانات الأساسية' },
  ];

  return (
    <div className="page-container">
      <div className="page-header"><h2 className="page-title">الإعدادات والبيانات الأساسية</h2></div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {tabs.map((t) => (
          <button key={t.key} className={`btn ${tab === t.key ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {tab === 'settings' && (
        <div className="card">
          <table className="data-table">
            <thead><tr><th>المفتاح</th><th>القيمة</th><th>الوصف</th><th>المجموعة</th></tr></thead>
            <tbody>
              {settings.map((s) => (
                <tr key={s.id}><td>{s.key}</td><td>{s.value}</td><td>{s.description}</td><td>{s.group}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'cities' && (
        <div className="card">
          <table className="data-table">
            <thead><tr><th>الاسم بالعربي</th><th>الاسم بالإنجليزي</th><th>المنطقة</th><th>نشط</th></tr></thead>
            <tbody>
              {cities.map((c) => (
                <tr key={c.id}><td>{c.nameAr}</td><td>{c.nameEn}</td><td>{c.region}</td><td>{c.isActive ? 'نعم' : 'لا'}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'platforms' && (
        <div className="card">
          <table className="data-table">
            <thead><tr><th>الاسم بالعربي</th><th>الاسم بالإنجليزي</th><th>نشط</th><th>عدد الحسابات</th></tr></thead>
            <tbody>
              {platforms.map((p) => (
                <tr key={p.id}><td>{p.nameAr}</td><td>{p.nameEn}</td><td>{p.isActive ? 'نعم' : 'لا'}</td><td>{p._count?.accounts || 0}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'masterData' && (
        <div className="card">
          <table className="data-table">
            <thead><tr><th>التصنيف</th><th>الاسم بالعربي</th><th>الاسم بالإنجليزي</th><th>نشط</th></tr></thead>
            <tbody>
              {masterData.map((m) => (
                <tr key={m.id}><td>{m.category}</td><td>{m.nameAr}</td><td>{m.nameEn}</td><td>{m.isActive ? 'نعم' : 'لا'}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
