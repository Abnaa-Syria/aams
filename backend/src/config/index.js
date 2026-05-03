require('dotenv').config();

/**
 * CORS: CORS_ORIGIN can be comma-separated. In development, localhost:5173 and :5174
 * are always allowed so Vite’s port changes don’t break login.
 */
function resolveCorsOrigin() {
  const fromEnv = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const isProd = (process.env.NODE_ENV || 'development') === 'production';
  if (isProd) {
    const list = fromEnv.length ? fromEnv : ['http://localhost:5173'];
    return list.length === 1 ? list[0] : list;
  }
  const devDefaults = ['http://localhost:5173', 'http://localhost:5174'];
  const merged = [...new Set([...devDefaults, ...fromEnv])];
  return merged.length === 1 ? merged[0] : merged;
}

module.exports = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  db: {
    url: process.env.DATABASE_URL,
  },
  upload: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024,
  },
  storage: {
    driver: (process.env.STORAGE_DRIVER || 'local').toLowerCase(),
    s3: {
      region: process.env.S3_REGION || '',
      bucket: process.env.S3_BUCKET || '',
      accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
      endpoint: process.env.S3_ENDPOINT || '',
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
      publicBaseUrl: process.env.S3_PUBLIC_BASE_URL || '',
      keyPrefix: process.env.S3_KEY_PREFIX || 'uploads',
    },
  },
  cors: {
    origin: resolveCorsOrigin(),
  },
  push: {
    expoAccessToken: process.env.EXPO_ACCESS_TOKEN || '',
    fcmLegacyKey: process.env.FCM_LEGACY_SERVER_KEY || '',
  },
  otp: {
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 5,
  },
};
