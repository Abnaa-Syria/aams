const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const config = require('./config');
const errorHandler = require('./middlewares/errorHandler');
const { mountV1Routes } = require('./routes/v1Modules');

const app = express();

const corsAllowed = Array.isArray(config.cors.origin)
  ? config.cors.origin
  : config.cors.origin
    ? [config.cors.origin]
    : [];

// Security & parsing
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
// Dynamic origin: reflect allowed request Origin (required with credentials: true).
app.use(
  cors((req, cb) => {
    const origin = req.headers.origin;
    if (!origin) return cb(null, { origin: true, credentials: true });
    if (corsAllowed.includes(origin)) return cb(null, { origin: true, credentials: true });
    return cb(null, { origin: false, credentials: true });
  })
);
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

// Static files
app.use('/uploads', express.static(path.join(__dirname, '..', config.upload.dir)));

// Swagger docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'AAMS API Documentation',
}));

mountV1Routes(app, '/api/v1');

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Error handler
app.use(errorHandler);

module.exports = app;
