const { logger } = require('../utils/logger');
const helpers = require('../utils/helpers');

// Custom error class for API errors
class APIError extends Error {
    constructor(message, statusCode = 500, details = null) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
        this.name = 'APIError';
    }
}

// Error handler middleware
const errorHandler = (err, req, res, next) => {
    // Log the error
    logger.error('Error:', {
        name: err.name,
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        body: helpers.maskSensitiveData(req.body),
        query: req.query,
        params: req.params,
        ip: req.ip
    });

    // Default error response
    const errorResponse = {
        error: true,
        message: err.message || 'Internal Server Error',
        timestamp: new Date().toISOString()
    };

    // Add details for API errors
    if (err instanceof APIError && err.details) {
        errorResponse.details = err.details;
    }

    // Add request ID if available
    if (req.id) {
        errorResponse.requestId = req.id;
    }

    // Don't expose stack trace in production
    if (process.env.NODE_ENV === 'development') {
        errorResponse.stack = err.stack;
    }

    // Set appropriate status code
    const statusCode = err instanceof APIError ? err.statusCode : 500;

    res.status(statusCode).json(errorResponse);
};

// Not found handler
const notFoundHandler = (req, res, next) => {
    const err = new APIError('Resource not found', 404);
    next(err);
};

// Validation error handler
const validationErrorHandler = (err, req, res, next) => {
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: true,
            message: 'Validation Error',
            details: Object.values(err.errors).map(e => ({
                field: e.path,
                message: e.message
            }))
        });
    }
    next(err);
};

// MongoDB error handler
const mongoErrorHandler = (err, req, res, next) => {
    if (err.name === 'MongoError' || err.name === 'MongoServerError') {
        // Handle duplicate key errors
        if (err.code === 11000) {
            return res.status(409).json({
                error: true,
                message: 'Duplicate Entry',
                details: {
                    field: Object.keys(err.keyPattern)[0],
                    value: Object.values(err.keyValue)[0]
                }
            });
        }
    }
    next(err);
};

// Rate limit error handler
const rateLimitErrorHandler = (err, req, res, next) => {
    if (err.type === 'RateLimit') {
        return res.status(429).json({
            error: true,
            message: 'Too Many Requests',
            details: {
                retryAfter: err.retryAfter,
                limit: err.limit,
                remaining: err.remaining
            }
        });
    }
    next(err);
};

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
    APIError,
    errorHandler,
    notFoundHandler,
    validationErrorHandler,
    mongoErrorHandler,
    rateLimitErrorHandler,
    asyncHandler
};
