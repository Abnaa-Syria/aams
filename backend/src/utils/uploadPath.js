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

/**
 * Resolve a stored path (e.g. "uploads/demo/x.pdf") to an absolute file path.
 * Paths are resolved from the backend root so "uploads/..." is not joined twice with the upload directory.
 * Returns null for remote URLs, empty input, or paths that escape the upload directory.
 */
function resolveStoredPathToAbsolute(storedPath) {
  const s = String(storedPath || '').trim();
  if (!s || /^https?:\/\//i.test(s) || /^s3:\/\//i.test(s)) return null;

  const backendRoot = path.resolve(__dirname, '..', '..');
  const uploadRoot = path.resolve(backendRoot, config.upload.dir);
  const rel = s.replace(/\\/g, '/').replace(/^\/+/, '');
  const abs = path.resolve(backendRoot, rel);
  const underUpload = path.relative(uploadRoot, abs);
  if (underUpload.startsWith('..') || path.isAbsolute(underUpload)) return null;
  return abs;
}

module.exports = { normalizeStoredUploadPath, resolveStoredPathToAbsolute };

