const winston = require('winston');

// Create logger
const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

// Request logger middleware
const requestLogger = (req, res, next) => {
    const start = Date.now();

    // Log request
    logger.info('Incoming request', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('user-agent')
    });

    // Log response
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info('Request completed', {
            method: req.method,
            url: req.url,
            status: res.statusCode,
            duration: `${duration}ms`
        });
    });

    next();
};

// Error logger middleware
const errorLogger = (err, req, res, next) => {
    logger.error('Error occurred', {
        error: {
            message: err.message,
            stack: err.stack,
            name: err.name
        },
        request: {
            method: req.method,
            url: req.url,
            ip: req.ip
        }
    });

    next(err);
};

module.exports = {
    logger,
    requestLogger,
    errorLogger
}; 