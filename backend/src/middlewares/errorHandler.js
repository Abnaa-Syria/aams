const { AppError } = require('../utils/errors');

function errorHandler(err, req, res, _next) {
  if (process.env.NODE_ENV === 'development') {
    // Log the full error object to see the stack trace and line numbers
    console.error(`[DEBUG ERROR] ${req.method} ${req.originalUrl}:`);
    console.error(err);
  }

  if (err.isOperational) {
    const payload = {
      success: false,
      message: err.message,
      ...(err.errors && { errors: err.errors }),
    };
    if (err.statusCode === 403 && err.required) {
      payload.requiredPermissions = err.required;
    }
    return res.status(err.statusCode).json(payload);
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired' });
  }

  if (err.code === 'P2002') {
    const field = err.meta?.target?.join(', ') || 'field';
    return res.status(409).json({
      success: false,
      message: `Duplicate value for: ${field}`,
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({ success: false, message: 'Record not found' });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'File too large' });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid JSON' });
  }


  return res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error',
  });
}

module.exports = errorHandler;
