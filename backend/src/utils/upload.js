const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/octet-stream',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.pdf', '.doc', '.docx',
]);

const fileFilter = (req, file, cb) => {
  const mime = String(file.mimetype || '').toLowerCase();
  const ext = path.extname(file.originalname || '').toLowerCase();

  if (ALLOWED_MIME_TYPES.has(mime) && (mime !== 'application/octet-stream' || ALLOWED_EXTENSIONS.has(ext))) {
    cb(null, true);
    return;
  }
  if (ALLOWED_EXTENSIONS.has(ext)) {
    cb(null, true);
    return;
  }
  cb(new Error('File type not allowed'), false);
};

function buildStorage() {
  if (config.storage.driver === 's3') {
    const { createS3MulterStorage } = require('./s3MulterStorage');
    return createS3MulterStorage(config);
  }
  const uploadRoot = path.resolve(__dirname, '..', '..', config.upload.dir);
  if (!fs.existsSync(uploadRoot)) {
    fs.mkdirSync(uploadRoot, { recursive: true });
  }
  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadRoot);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${uuidv4()}${ext}`);
    },
  });
}

const upload = multer({
  storage: buildStorage(),
  fileFilter,
  limits: { fileSize: config.upload.maxFileSize },
});

module.exports = upload;
