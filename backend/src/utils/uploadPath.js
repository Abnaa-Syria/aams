const path = require('path');
const config = require('../config');

function normalizeStoredUploadPath(p) {
  if (!p) return p;
  const s = String(p);
  if (/^https?:\/\//i.test(s) || /^s3:\/\//i.test(s)) return s;

  // Multer may provide an absolute filesystem path. Convert it to a public /uploads/<...> path.
  const uploadRoot = path.resolve(__dirname, '..', '..', config.upload.dir);
  const looksAbsolute = /^[a-zA-Z]:[\\/]/.test(s) || s.startsWith('/') || s.startsWith('\\');
  if (looksAbsolute) {
    try {
      const abs = path.resolve(s);
      const rel = path.relative(uploadRoot, abs);
      if (rel && !rel.startsWith('..') && !path.isAbsolute(rel)) {
        return `${config.upload.dir}/${rel}`.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/{2,}/g, '/');
      }
    } catch {
      // Fall through to basic normalization below.
    }
  }

  // Otherwise, treat it as already-relative (e.g. "uploads/xyz.pdf" or "demo/xyz.pdf")
  return s.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/{2,}/g, '/');
}

module.exports = { normalizeStoredUploadPath };

