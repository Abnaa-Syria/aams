const upload = require('./upload');
const { ValidationError } = require('./errors');

const MAX_DAILY_REPORT_FILES = 10;

/** Accept dynamic platform screenshot fields (screenshot_Ninja, screenshots, etc.). */
function dailyReportUploadMiddleware(req, res, next) {
  upload.any()(req, res, (err) => {
    if (err) return next(err);
    if (Array.isArray(req.files) && req.files.length > MAX_DAILY_REPORT_FILES) {
      return next(new ValidationError(`Maximum ${MAX_DAILY_REPORT_FILES} files allowed`));
    }
    next();
  });
}

function collectDailyReportUploadFiles(req) {
  if (!req.files) return [];
  return Array.isArray(req.files) ? req.files.slice(0, MAX_DAILY_REPORT_FILES) : [];
}

module.exports = {
  dailyReportUploadMiddleware,
  collectDailyReportUploadFiles,
  MAX_DAILY_REPORT_FILES,
};
