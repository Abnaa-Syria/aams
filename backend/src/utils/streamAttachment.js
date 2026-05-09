const fs = require('fs');
const { resolveStoredPathToAbsolute } = require('./uploadPath');
const { NotFoundError } = require('./errors');

/**
 * Stream a stored upload path or remote URL as a download attachment.
 */
async function streamAttachmentDownload(res, fileUrl, filename) {
  if (!fileUrl) throw new NotFoundError('File');

  const safeName = String(filename || 'download').replace(/[\\/\r\n"]/g, '_');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);

  if (/^https?:\/\//i.test(fileUrl)) {
    const upstream = await fetch(fileUrl);
    if (!upstream.ok) {
      return res.status(502).json({ success: false, message: 'تعذر تنزيل الملف من المصدر' });
    }
    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    const ab = await upstream.arrayBuffer();
    return res.send(Buffer.from(ab));
  }

  const abs = resolveStoredPathToAbsolute(fileUrl);
  if (!abs) {
    return res.status(400).json({ success: false, message: 'مسار ملف غير صالح' });
  }
  if (!fs.existsSync(abs)) throw new NotFoundError('File');
  return res.download(abs, safeName);
}

module.exports = { streamAttachmentDownload };
