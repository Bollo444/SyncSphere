/**
 * Custom Application Error Class
 * Extends the built-in Error class to provide consistent error handling
 * across the SyncSphere application.
 */
class AppError extends Error {
  /**
   * Create an application error
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {string} code - Error code for client identification
   * @param {boolean} isOperational - Whether this is an operational error
   */
  constructor(message, statusCode = 500, code = null, isOperational = true) {
    super(message);
    
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.code = code;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON format
   * @returns {Object} JSON representation of the error
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      status: this.status,
      code: this.code,
      timestamp: this.timestamp,
      ...(process.env.NODE_ENV === 'development' && { stack: this.stack })
    };
  }

  /**
   * Create a validation error
   * @param {string} message - Validation error message
   * @param {string} field - Field that failed validation
   * @returns {AppError} Validation error instance
   */
  static validation(message, field = null) {
    const error = new AppError(message, 400, 'VALIDATION_ERROR');
    if (field) {
      error.field = field;
    }
    return error;
  }

  /**
   * Create an authentication error
   * @param {string} message - Auth error message
   * @returns {AppError} Authentication error instance
   */
  static auth(message = 'Authentication required') {
    return new AppError(message, 401, 'AUTH_ERROR');
  }

  /**
   * Create an authorization error
   * @param {string} message - Authorization error message
   * @returns {AppError} Authorization error instance
   */
  static forbidden(message = 'Access forbidden') {
    return new AppError(message, 403, 'FORBIDDEN_ERROR');
  }

  /**
   * Create a not found error
   * @param {string} resource - Resource that was not found
   * @returns {AppError} Not found error instance
   */
  static notFound(resource = 'Resource') {
    return new AppError(`${resource} not found`, 404, 'NOT_FOUND_ERROR');
  }

  /**
   * Create a conflict error
   * @param {string} message - Conflict error message
   * @returns {AppError} Conflict error instance
   */
  static conflict(message) {
    return new AppError(message, 409, 'CONFLICT_ERROR');
  }

  /**
   * Create a rate limit error
   * @param {string} message - Rate limit error message
   * @returns {AppError} Rate limit error instance
   */
  static rateLimit(message = 'Too many requests') {
    return new AppError(message, 429, 'RATE_LIMIT_ERROR');
  }

  /**
   * Create an internal server error
   * @param {string} message - Internal error message
   * @returns {AppError} Internal server error instance
   */
  static internal(message = 'Internal server error') {
    return new AppError(message, 500, 'INTERNAL_ERROR');
  }

  /**
   * Create a service unavailable error
   * @param {string} service - Service that is unavailable
   * @returns {AppError} Service unavailable error instance
   */
  static serviceUnavailable(service = 'Service') {
    return new AppError(`${service} is currently unavailable`, 503, 'SERVICE_UNAVAILABLE');
  }

  /**
   * Create a payment required error
   * @param {string} message - Payment error message
   * @returns {AppError} Payment required error instance
   */
  static paymentRequired(message = 'Payment required') {
    return new AppError(message, 402, 'PAYMENT_REQUIRED');
  }

  /**
   * Create a subscription error
   * @param {string} message - Subscription error message
   * @returns {AppError} Subscription error instance
   */
  static subscription(message) {
    return new AppError(message, 402, 'SUBSCRIPTION_ERROR');
  }

  /**
   * Create a file upload error
   * @param {string} message - File upload error message
   * @returns {AppError} File upload error instance
   */
  static fileUpload(message) {
    return new AppError(message, 400, 'FILE_UPLOAD_ERROR');
  }

  /**
   * Create a database error
   * @param {string} message - Database error message
   * @returns {AppError} Database error instance
   */
  static database(message = 'Database operation failed') {
    return new AppError(message, 500, 'DATABASE_ERROR');
  }

  /**
   * Create an external service error
   * @param {string} service - External service name
   * @param {string} message - Error message
   * @returns {AppError} External service error instance
   */
  static externalService(service, message = 'External service error') {
    return new AppError(`${service}: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR');
  }
}

module.exports = AppError;