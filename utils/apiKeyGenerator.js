const { v4: uuidv4 } = require('uuid');

/**
 * Generate a complete API key using UUID
 * @returns {string} - Complete API key
 */
function generateCompleteApiKey() {
    return uuidv4();
}

module.exports = {
    generateCompleteApiKey
}; 