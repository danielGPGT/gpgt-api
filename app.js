const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./middleware/errorHandler');
const { requestLogger, errorLogger } = require('./middleware/requestLogger');
const securityHeaders = require('./middleware/securityHeaders');
const limiters = require('./middleware/rateLimiter');

const app = express();

// Apply security headers
app.use(securityHeaders);

// Apply rate limiting
app.use(limiters.api); // Global rate limiter
app.use('/api/v1/sheets', limiters.sheets); // Stricter rate limit for sheet operations
app.use('/api/v1/auth', limiters.auth); // Strict rate limit for auth endpoints

// Apply request logging
app.use(requestLogger);

// Enable CORS
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://grandprixgrandtours.com', 'https://www.grandprixgrandtours.com']
        : 'http://localhost:5173',
    credentials: true
}));

// Parse JSON bodies
app.use(express.json());

// Routes
app.use('/api/v1/sheets', require('./routes/sheets'));
app.use('/api/v1/auth', require('./routes/auth'));

// Error handling
app.use(errorLogger);
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'NotFound',
        message: 'The requested resource was not found'
    });
});

module.exports = app; 