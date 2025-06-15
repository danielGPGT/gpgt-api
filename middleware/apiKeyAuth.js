const { readSheet } = require('../services/sheetsService');

// Cache for API keys to reduce database reads
const apiKeyCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Function to validate API key and check permissions
async function validateApiKey(apiKey, requiredRole = null) {
    // Check cache first
    const cachedKey = apiKeyCache.get(apiKey);
    if (cachedKey && (Date.now() - cachedKey.timestamp) < CACHE_DURATION) {
        return cachedKey.data;
    }

    try {
        const apiKeys = await readSheet('api_keys');
        const keyData = apiKeys.find(k => k.api_key === apiKey);

        if (!keyData) {
            return null;
        }

        // Check if key is active
        if (keyData.status !== 'active') {
            return null;
        }

        // Check if key has expired
        if (keyData.expiry_date && new Date(keyData.expiry_date) < new Date()) {
            return null;
        }

        // If role is required, check if key has that role
        if (requiredRole && keyData.role !== requiredRole) {
            return null;
        }

        // Cache the result
        const result = {
            key: keyData.api_key,
            role: keyData.role,
            name: keyData.name,
            allowed_sheets: keyData.allowed_sheets ? keyData.allowed_sheets.split(',') : []
        };

        apiKeyCache.set(apiKey, {
            data: result,
            timestamp: Date.now()
        });

        return result;
    } catch (error) {
        console.error('Error validating API key:', error);
        return null;
    }
}

// Middleware to check API key
const apiKeyAuth = (requiredRole = null) => {
    return async (req, res, next) => {
        const apiKey = req.headers['x-api-key'];

        if (!apiKey) {
            return res.status(401).json({ error: 'API key is required' });
        }

        const keyData = await validateApiKey(apiKey, requiredRole);

        if (!keyData) {
            return res.status(401).json({ error: 'Invalid or expired API key' });
        }

        // Add key data to request for use in routes
        req.apiKey = keyData;
        next();
    };
};

// Middleware to check sheet access
const checkSheetAccess = () => {
    return async (req, res, next) => {
        const sheetName = req.params.sheetName;
        
        // If no allowed sheets are specified or if it's "all", allow access to all sheets
        if (!req.apiKey.allowed_sheets || 
            req.apiKey.allowed_sheets.length === 0 || 
            req.apiKey.allowed_sheets.includes('all')) {
            return next();
        }

        // Check if the requested sheet is in the allowed sheets list
        if (!req.apiKey.allowed_sheets.includes(sheetName)) {
            return res.status(403).json({ 
                error: 'Access denied to this sheet',
                message: 'Your API key does not have permission to access this sheet'
            });
        }

        next();
    };
};

module.exports = {
    apiKeyAuth,
    checkSheetAccess
}; 