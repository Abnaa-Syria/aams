/** Guess attachment kind for preview (image vs pdf vs other). */
export function guessFileKind({ fileUrl, fileName, mimeType }) {
  const mt = String(mimeType || '').toLowerCase();
  if (mt.startsWith('image/')) return 'image';
  if (mt === 'application/pdf') return 'pdf';

  const url = String(fileUrl || '');
  if (/images\.unsplash\.com\//i.test(url)) return 'image';
  const s = `${fileName || ''} ${url}`.toLowerCase();
  if (/\.(png|jpe?g|webp|gif)(\?|#|$)/.test(s)) return 'image';
  if (/\.(pdf)(\?|#|$)/.test(s)) return 'pdf';
  return 'other';
}

export function pickFilename({ contentDisposition, fallback }) {
  const cd = contentDisposition || '';
  const mStar = cd.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (mStar?.[1]) {
    try {
      return decodeURIComponent(mStar[1].replace(/(^"|"$)/g, ''));
    } catch {
      return mStar[1].replace(/(^"|"$)/g, '');
    }
  }
  const m = cd.match(/filename\s*=\s*("?)([^";]+)\1/i);
  if (m?.[2]) return m[2];
  return fallback || 'download';
}

export function downloadBlob({ blob, filename }) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'download';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
