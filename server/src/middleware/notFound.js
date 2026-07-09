export function notFound(req, res) {
  res.status(404).json({ message: 'Route not found.' });
}

/**
 * Central error handler. Normalizes common error shapes (Mongoose
 * validation/cast errors, duplicate keys, Multer upload errors, malformed
 * JSON bodies) into a consistent { message, errors? } payload so the client
 * can always surface something useful instead of a raw stack trace.
 */
export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const nodeEnv = process.env.NODE_ENV || 'development';
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Internal server error.';
  let errors;

  // Mongoose validation errors -> collect per-field messages.
  if (err.name === 'ValidationError' && err.errors) {
    status = 400;
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    message = 'Please check the highlighted fields and try again.';
  }

  // Mongoose bad ObjectId / cast errors.
  if (err.name === 'CastError') {
    status = 400;
    message = `Invalid value for "${err.path}".`;
  }

  // Mongo duplicate key error.
  if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || {})[0] || 'value';
    message = `That ${field} is already in use.`;
  }

  // Malformed JSON body sent by the client.
  if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'The request body could not be parsed. Please check the data being sent.';
  }

  // Body too large.
  if (err.type === 'entity.too.large') {
    status = 413;
    message = 'The request was too large.';
  }

  // Multer / file-upload errors.
  if (err.name === 'MulterError') {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE'
      ? 'That file is too large to upload.'
      : (err.message || 'File upload failed.');
  }

  // JWT errors.
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    status = 401;
    message = 'Your session is invalid or has expired. Please log in again.';
  }

  if (status >= 500) {
    // Log full detail server-side always; never leak internals to the client.
    console.error('[unhandled error]', err);
    if (nodeEnv !== 'production') {
      message = err.message || message;
    } else {
      message = 'The server ran into a problem. Please try again shortly.';
    }
  } else {
    console.warn(`[handled error] ${status}: ${message}`);
  }

  const payload = { message };
  if (errors && errors.length) payload.errors = errors;
  if (nodeEnv !== 'production' && status >= 500) payload.stack = err.stack;

  res.status(status).json(payload);
}
