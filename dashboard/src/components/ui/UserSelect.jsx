import { useEffect, useState } from 'react';
import { apiService } from '../../services/api';

export default function UserSelect({ value, onChange, required, label = 'الموظف', placeholder = 'اختر الموظف' }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService.get('/users', { limit: 500, role: 'DRIVER' })
      .then(({ data }) => setUsers(data.data || []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <label className="block text-sm font-bold text-slate-600 mb-2">{label}</label>
      <select
        className="form-input form-select"
        value={value || ''}
        onChange={(e) => onChange(e.target.value ? parseInt(e.target.value, 10) : '')}
        required={required}
        disabled={loading}
      >
        <option value="">{loading ? 'جارٍ التحميل...' : placeholder}</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.fullNameAr} {u.identityNumber ? `(${u.identityNumber})` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
