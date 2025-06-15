const rateLimit = require('express-rate-limit');
const { cacheService } = require('../services/cacheService');

// Create a store for rate limiting
const store = {
    _cache: new Map(),
    _ttls: new Map(),

    get: (key) => {
        if (!store._cache.has(key)) return null;
        if (store._ttls.has(key) && Date.now() > store._ttls.get(key)) {
            store._cache.delete(key);
            store._ttls.delete(key);
            return null;
        }
        return store._cache.get(key);
    },

    set: (key, value, ttl) => {
        store._cache.set(key, value);
        if (ttl) {
            store._ttls.set(key, Date.now() + ttl);
        }
    },

    delete: (key) => {
        store._cache.delete(key);
        store._ttls.delete(key);
    }
};

// Create rate limiters
const limiters = {
    // General API limiter
    api: rateLimit({
        store,
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // Limit each IP to 100 requests per windowMs
        message: {
            error: 'TooManyRequests',
            message: 'Too many requests from this IP, please try again later'
        }
    }),

    // Stricter limiter for sheet operations
    sheets: rateLimit({
        store,
        windowMs: 60 * 1000, // 1 minute
        max: 30, // Limit each IP to 30 requests per windowMs
        message: {
            error: 'TooManyRequests',
            message: 'Too many sheet operations from this IP, please try again later'
        }
    }),

    // Very strict limiter for authentication
    auth: rateLimit({
        store,
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 5, // Limit each IP to 5 failed attempts per hour
        message: {
            error: 'TooManyRequests',
            message: 'Too many failed authentication attempts, please try again later'
        }
    })
};

module.exports = limiters; 