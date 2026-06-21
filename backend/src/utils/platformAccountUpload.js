const upload = require('./upload');

const PLATFORM_ACCOUNT_FILE_FIELDS = [
  { name: 'file', maxCount: 1 },
  { name: 'account_screenshot', maxCount: 1 },
  { name: 'accountScreenshotUrl', maxCount: 1 },
  { name: 'accountScreenshot', maxCount: 1 },
  { name: 'screenshot', maxCount: 1 },
];

const SCREENSHOT_FIELD_NAMES = new Set([
  'account_screenshot',
  'accountScreenshotUrl',
  'accountScreenshot',
  'screenshot',
]);

function platformAccountUploadMiddleware(req, res, next) {
  upload.fields(PLATFORM_ACCOUNT_FILE_FIELDS)(req, res, next);
}

function pickPlatformAccountUploadFile(req) {
  if (req.file) return req.file;
  if (!req.files) return null;

  for (const { name } of PLATFORM_ACCOUNT_FILE_FIELDS) {
    const file = req.files[name]?.[0];
    if (file) return file;
  }
  return null;
}

function isPlatformAccountScreenshotField(fieldname) {
  return SCREENSHOT_FIELD_NAMES.has(fieldname);
}

module.exports = {
  platformAccountUploadMiddleware,
  pickPlatformAccountUploadFile,
  isPlatformAccountScreenshotField,
};
