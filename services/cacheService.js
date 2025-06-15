// Simple in-memory cache implementation
class Cache {
    constructor() {
        this.cache = new Map();
        this.ttls = new Map();
    }

    // Get data from cache
    get(key) {
        if (!this.cache.has(key)) {
            return null;
        }

        // Check if the key has expired
        if (this.ttls.has(key) && Date.now() > this.ttls.get(key)) {
            this.del(key);
            return null;
        }

        return this.cache.get(key);
    }

    // Set data in cache
    set(key, value, ttl = 300) {
        this.cache.set(key, value);
        if (ttl) {
            this.ttls.set(key, Date.now() + (ttl * 1000));
        }
        return true;
    }

    // Delete data from cache
    del(key) {
        this.cache.delete(key);
        this.ttls.delete(key);
        return true;
    }

    // Clear all cache
    flush() {
        this.cache.clear();
        this.ttls.clear();
        return true;
    }

    // Get all keys
    keys() {
        return Array.from(this.cache.keys());
    }
}

// Create cache instance
const cache = new Cache();

// Cache keys
const CACHE_KEYS = {
    SHEET_DATA: (sheetName) => `sheet_data:${sheetName}`,
    SHEET_HEADERS: (sheetName) => `sheet_headers:${sheetName}`,
    SHEET_ROW: (sheetName, idColumn, idValue) => `sheet_row:${sheetName}:${idColumn}:${idValue}`
};

// Cache service methods
const cacheService = {
    // Get data from cache
    get: (key) => {
        return cache.get(key);
    },

    // Set data in cache
    set: (key, value, ttl = 300) => {
        return cache.set(key, value, ttl);
    },

    // Delete data from cache
    del: (key) => {
        return cache.del(key);
    },

    // Clear all cache
    flush: () => {
        return cache.flush();
    },

    // Clear cache for a specific sheet
    clearSheetCache: (sheetName) => {
        const keys = cache.keys();
        const sheetKeys = keys.filter(key => 
            key.startsWith(CACHE_KEYS.SHEET_DATA(sheetName)) ||
            key.startsWith(CACHE_KEYS.SHEET_HEADERS(sheetName)) ||
            key.startsWith(`sheet_row:${sheetName}:`)
        );
        sheetKeys.forEach(key => cache.del(key));
        return true;
    },

    // Get sheet data with caching
    getSheetData: async (sheetName, fetchFn) => {
        const cacheKey = CACHE_KEYS.SHEET_DATA(sheetName);
        let data = cache.get(cacheKey);

        if (!data) {
            data = await fetchFn();
            cache.set(cacheKey, data);
        }

        return data;
    },

    // Get sheet headers with caching
    getSheetHeaders: async (sheetName, fetchFn) => {
        const cacheKey = CACHE_KEYS.SHEET_HEADERS(sheetName);
        let headers = cache.get(cacheKey);

        if (!headers) {
            headers = await fetchFn();
            cache.set(cacheKey, headers);
        }

        return headers;
    },

    // Get specific row with caching
    getSheetRow: async (sheetName, idColumn, idValue, fetchFn) => {
        const cacheKey = CACHE_KEYS.SHEET_ROW(sheetName, idColumn, idValue);
        let row = cache.get(cacheKey);

        if (!row) {
            row = await fetchFn();
            if (row) {
                cache.set(cacheKey, row);
            }
        }

        return row;
    }
};

module.exports = {
    cache,
    CACHE_KEYS,
    cacheService
}; 