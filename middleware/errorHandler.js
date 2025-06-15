// Custom error classes
class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
        this.status = 400;
    }
}

class AuthenticationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AuthenticationError';
        this.status = 401;
    }
}

class AuthorizationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AuthorizationError';
        this.status = 403;
    }
}

class NotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = 'NotFoundError';
        this.status = 404;
    }
}

// Error handler middleware
const errorHandler = (err, req, res, next) => {
    console.error('Error:', {
        name: err.name,
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });

    // Handle known errors
    if (err instanceof ValidationError ||
        err instanceof AuthenticationError ||
        err instanceof AuthorizationError ||
        err instanceof NotFoundError) {
        return res.status(err.status).json({
            error: err.name,
            message: err.message
        });
    }

    // Handle Google Sheets API errors
    if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
        return res.status(503).json({
            error: 'ServiceUnavailable',
            message: 'Google Sheets service is currently unavailable'
        });
    }

    // Handle validation errors from express-validator
    if (err.array) {
        return res.status(400).json({
            error: 'ValidationError',
            message: 'Invalid request data',
            details: err.array()
        });
    }

    // Default error
    res.status(500).json({
        error: 'InternalServerError',
        message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
    });
};

module.exports = {
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    errorHandler
}; 