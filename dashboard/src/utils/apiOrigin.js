const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export function getApiOrigin() {
  return API.replace(/\/api\/v1\/?$/, '') || 'http://localhost:5000';
}

/** Turn stored upload path into absolute URL for <img src> / links */
export function resolveUploadUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  const origin = getApiOrigin();
  const p = String(path).replace(/\\/g, '/').replace(/^\/?/, '');
  return `${origin}/${p}`;
}
