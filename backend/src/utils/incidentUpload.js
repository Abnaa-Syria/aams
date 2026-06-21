const upload = require('./upload');
const { ValidationError } = require('./errors');

const MAX_INCIDENT_FILES = 5;

/** Accept any multipart file field name (medical report, photos, attachments, etc.). */
function incidentUploadMiddleware(req, res, next) {
  upload.any()(req, res, (err) => {
    if (err) return next(err);
    if (Array.isArray(req.files) && req.files.length > MAX_INCIDENT_FILES) {
      return next(new ValidationError(`Maximum ${MAX_INCIDENT_FILES} attachments allowed`));
    }
    next();
  });
}

const INCIDENT_FILE_FIELD_ALIASES = [
  'attachments',
  'attachment',
  'photos',
  'photo',
  'file',
  'files',
  'medicalReport',
  'medical_report',
  'medicalAttachment',
  'medical_attachment',
  'report',
  'reportFile',
  'image',
  'images',
];

function collectIncidentUploadFiles(req) {
  if (!req.files) return [];
  if (Array.isArray(req.files)) return req.files.slice(0, MAX_INCIDENT_FILES);

  const out = [];
  for (const name of INCIDENT_FILE_FIELD_ALIASES) {
    const group = req.files[name];
    if (!group) continue;
    out.push(...(Array.isArray(group) ? group : [group]));
  }
  return out.slice(0, MAX_INCIDENT_FILES);
}

module.exports = {
  incidentUploadMiddleware,
  collectIncidentUploadFiles,
  MAX_INCIDENT_FILES,
};
