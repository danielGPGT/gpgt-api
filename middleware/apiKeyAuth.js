const { readSheet } = require('../services/sheetsService');
const { cacheService } = require('../services/cacheService');

// Cache for API keys to reduce database reads
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Function to validate API key and check permissions
const validateApiKey = async (apiKey) => {
    try {
        // Check if API key exists in cache
        const cachedKey = cacheService.get(`api_key:${apiKey}`);
        if (cachedKey) {
            return cachedKey;
        }

        // Validate API key against Google Sheet
        const apiKeys = await readSheet('api_keys');
        const keyData = apiKeys.find(k => k.api_key === apiKey);

        if (!keyData) {
            throw new Error('Invalid API key');
        }

        // Check if key is active
        if (keyData.status !== 'active') {
            throw new Error('API key is not active');
        }

        // Check if key has expired
        if (keyData.expiry_date && new Date(keyData.expiry_date) < new Date()) {
            throw new Error('API key has expired');
        }

        // Prepare key data
        const key = {
            key: keyData.api_key,
            role: keyData.role,
            name: keyData.name,
            allowed_sheets: keyData.allowed_sheets ? keyData.allowed_sheets.split(',') : []
        };

        // Cache the API key
        cacheService.set(`api_key:${apiKey}`, key, 3600); // Cache for 1 hour

        return key;
    } catch (error) {
        console.error('API key validation error:', error);
        throw error;
    }
};

// Middleware to check API key
const apiKeyAuth = () => {
    return async (req, res, next) => {
        try {
            const apiKey = req.headers['x-api-key'];
            if (!apiKey) {
                return res.status(401).json({ error: 'API key is required' });
            }

            const key = await validateApiKey(apiKey);
            req.apiKey = key;
            next();
        } catch (error) {
            console.error('API key authentication error:', error);
            res.status(401).json({ error: 'Invalid API key' });
        }
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