const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const CSV_MIME = 'text/csv; charset=utf-8';

const SPREADSHEET_FILENAME_RE = /\.(csv|xlsx)$/i;

function normalizeFormat(format) {
  const f = String(format || 'xlsx').toLowerCase();
  return f === 'csv' ? 'csv' : 'xlsx';
}

function isXlsxBuffer(buffer, filename = '') {
  if (/\.xlsx$/i.test(filename)) return true;
  if (!buffer || buffer.length < 4) return false;
  return buffer[0] === 0x50 && buffer[1] === 0x4b;
}

function isSpreadsheetFile(filename) {
  return SPREADSHEET_FILENAME_RE.test(filename || '');
}

function setSpreadsheetDownloadHeaders(res, filename, format = 'xlsx') {
  const fmt = normalizeFormat(format);
  res.setHeader('Content-Type', fmt === 'csv' ? CSV_MIME : XLSX_MIME);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
}

function swapExtension(filename, format) {
  const fmt = normalizeFormat(format);
  const base = String(filename || 'export').replace(/\.(csv|xlsx)$/i, '');
  return `${base}.${fmt === 'csv' ? 'csv' : 'xlsx'}`;
}

module.exports = {
  XLSX_MIME,
  CSV_MIME,
  normalizeFormat,
  isXlsxBuffer,
  isSpreadsheetFile,
  setSpreadsheetDownloadHeaders,
  swapExtension,
};
