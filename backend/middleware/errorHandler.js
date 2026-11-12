const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  const candidateStatus = err.statusCode || err.status;
  const status =
    err.code === 11000
      ? 409
      : Number.isInteger(candidateStatus) && candidateStatus >= 400 && candidateStatus < 600
        ? candidateStatus
        : err.type === "entity.too.large"
          ? 413
          : err.name === "ValidationError" || err.name === "CastError"
            ? 400
            : err.message === "Origin is not allowed by CORS"
              ? 403
              : 500;
  const message =
    status >= 500
      ? "An unexpected error occurred"
      : err.code === 11000
        ? "A record with these details already exists"
        : err.message;

  if (status >= 500) {
    console.error("Request failed", {
      requestId: req.id,
      method: req.method,
      path: req.path,
      error: err.name,
      code: err.code,
    });
  }

  res.status(status).json({
    success: false,
    message,
  });
};

module.exports = errorHandler;