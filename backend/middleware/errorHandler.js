export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const status = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  return res.status(status).json({ message });
};
