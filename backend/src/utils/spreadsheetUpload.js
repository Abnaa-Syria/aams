const multer = require('multer');
const { isSpreadsheetFile } = require('./spreadsheetMime');

const SPREADSHEET_MIMES = new Set([
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream',
]);

function spreadsheetFileFilter(_req, file, cb) {
  const ok = isSpreadsheetFile(file.originalname) || SPREADSHEET_MIMES.has(file.mimetype);
  cb(ok ? null : new Error('Only CSV or XLSX files allowed'), ok);
}

function createSpreadsheetUpload(options = {}) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: options.maxSize || 8 * 1024 * 1024 },
    fileFilter: spreadsheetFileFilter,
  });
}

module.exports = { createSpreadsheetUpload, spreadsheetFileFilter };
