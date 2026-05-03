const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'), false);
  }
};

function buildStorage() {
  if (config.storage.driver === 's3') {
    const { createS3MulterStorage } = require('./s3MulterStorage');
    return createS3MulterStorage(config);
  }
  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, config.upload.dir);
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
