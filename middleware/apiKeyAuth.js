const { readSheet } = require('../services/sheetsService');

// Cache for API keys to reduce database reads
const apiKeyCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Function to validate API key and check permissions
async function validateApiKey(apiKey, requiredRole = null) {
    console.log('Starting API key validation...'); // Debug log
    console.log('API Key to validate:', apiKey); // Debug log
    console.log('Required role:', requiredRole); // Debug log

    // Check cache first
    const cachedKey = apiKeyCache.get(apiKey);
    if (cachedKey && (Date.now() - cachedKey.timestamp) < CACHE_DURATION) {
        console.log('Using cached API key data'); // Debug log
        return cachedKey.data;
    }

    try {
        console.log('Fetching API keys from sheet...'); // Debug log
        const apiKeys = await readSheet('api_keys');
        console.log('Total API keys found:', apiKeys.length); // Debug log
        
        const keyData = apiKeys.find(k => k.api_key === apiKey);
        console.log('Key data found:', keyData ? 'yes' : 'no'); // Debug log
        if (keyData) {
            console.log('Key details:', {
                role: keyData.role,
                status: keyData.status,
                expiry_date: keyData.expiry_date,
                allowed_sheets: keyData.allowed_sheets
            }); // Debug log
        }

        if (!keyData) {
            console.log('API key not found in database'); // Debug log
            return null;
        }

        // Check if key is active
        if (keyData.status !== 'active') {
            console.log('API key is not active. Status:', keyData.status); // Debug log
            return null;
        }

        // Check if key has expired
        if (keyData.expiry_date && new Date(keyData.expiry_date) < new Date()) {
            console.log('API key has expired. Expiry date:', keyData.expiry_date); // Debug log
            return null;
        }

        // If role is required, check if key has that role
        if (requiredRole && keyData.role !== requiredRole) {
            console.log('API key does not have required role. Has:', keyData.role, 'Required:', requiredRole); // Debug log
            return null;
        }

        // Cache the result
        const result = {
            key: keyData.api_key,
            role: keyData.role,
            name: keyData.name,
            allowed_sheets: keyData.allowed_sheets ? keyData.allowed_sheets.split(',') : []
        };

        console.log('Caching validated API key data'); // Debug log
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
        console.log('API Key Auth Middleware - Request headers:', req.headers); // Debug log
        const apiKey = req.headers['x-api-key'];
        console.log('Received API key in header:', apiKey); // Debug log

        if (!apiKey) {
            console.log('No API key provided in request'); // Debug log
            return res.status(401).json({ error: 'API key is required' });
        }

        const keyData = await validateApiKey(apiKey, requiredRole);

        if (!keyData) {
            console.log('Invalid API key or insufficient permissions'); // Debug log
            return res.status(401).json({ error: 'Invalid or expired API key' });
        }

        console.log('API key validation successful:', keyData); // Debug log
        // Add key data to request for use in routes
        req.apiKey = keyData;
        next();
    };
};

// Middleware to check sheet access
const checkSheetAccess = () => {
    return async (req, res, next) => {
        const sheetName = req.params.sheetName;
        console.log('Checking sheet access for:', sheetName); // Debug log
        console.log('API key data:', req.apiKey); // Debug log
        
        // If no allowed sheets are specified or if it's "all", allow access to all sheets
        if (!req.apiKey.allowed_sheets || 
            req.apiKey.allowed_sheets.length === 0 || 
            req.apiKey.allowed_sheets.includes('all')) {
            console.log('No sheet restrictions or admin access, allowing access'); // Debug log
            return next();
        }

        // Check if the requested sheet is in the allowed sheets list
        if (!req.apiKey.allowed_sheets.includes(sheetName)) {
            console.log('Access denied - Sheet not in allowed list'); // Debug log
            return res.status(403).json({ 
                error: 'Access denied to this sheet',
                message: 'Your API key does not have permission to access this sheet'
            });
        }

        console.log('Sheet access granted'); // Debug log
        next();
    };
};

module.exports = {
    apiKeyAuth,
    checkSheetAccess
}; 