// Typed HTTP errors. Routes throw these instead of scattering res.status()
// calls, so the global error handler is the single place that maps failures
// to responses and unexpected errors never leak internals.
export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
  }
}

export class ValidationError extends AppError {
  constructor(message) {
    super(message, 400)
    this.name = 'ValidationError'
  }
}
