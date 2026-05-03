const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

/**
 * Multer storage engine: streams upload to S3-compatible object storage.
 * Stored path in DB is the public URL (https...) so clients need no /uploads prefix.
 */
class S3MulterStorage {
  constructor(options) {
    this.client = options.client;
    this.bucket = options.bucket;
    this.prefix = (options.prefix || 'uploads').replace(/^\/+|\/+$/g, '');
    this.publicBaseUrl = (options.publicBaseUrl || '').replace(/\/+$/, '');
  }

  _handleFile(req, file, cb) {
    const ext = path.extname(file.originalname || '') || '';
    const key = `${this.prefix}/${uuidv4()}${ext}`;
    const chunks = [];
    file.stream.on('data', (c) => chunks.push(c));
    file.stream.on('error', (e) => cb(e));
    file.stream.on('end', async () => {
      try {
        const buffer = Buffer.concat(chunks);
        await this.client.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: buffer,
            ContentType: file.mimetype || 'application/octet-stream',
          }),
        );
        const url = this.publicBaseUrl ? `${this.publicBaseUrl}/${key}` : `s3://${this.bucket}/${key}`;
        cb(null, { path: url, size: buffer.length });
      } catch (err) {
        cb(err);
      }
    });
  }

  _removeFile(req, file, cb) {
    cb(null);
  }
}

function createS3Client(storageConfig) {
  const { region, accessKeyId, secretAccessKey, endpoint, forcePathStyle } = storageConfig.s3;
  return new S3Client({
    region: region || 'us-east-1',
    credentials:
      accessKeyId && secretAccessKey
        ? { accessKeyId, secretAccessKey }
        : undefined,
    ...(endpoint ? { endpoint, forcePathStyle: forcePathStyle !== false } : {}),
  });
}

function createS3MulterStorage(config) {
  const client = createS3Client(config.storage);
  return new S3MulterStorage({
    client,
    bucket: config.storage.s3.bucket,
    prefix: config.storage.s3.keyPrefix,
    publicBaseUrl: config.storage.s3.publicBaseUrl,
  });
}

module.exports = { S3MulterStorage, createS3Client, createS3MulterStorage };
