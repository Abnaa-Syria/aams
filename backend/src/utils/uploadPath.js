function normalizeStoredUploadPath(p) {
  if (!p) return p;
  const s = String(p);
  if (/^https?:\/\//i.test(s) || /^s3:\/\//i.test(s)) return s;
  return s.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/{2,}/g, '/');
}

module.exports = { normalizeStoredUploadPath };

