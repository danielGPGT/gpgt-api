const { google } = require('googleapis');
const path = require('path');

const NodeCache = require('node-cache');
const sheetCache = new NodeCache({ stdTTL: 2 }); // Cache data for 10 minutes

// Function to get Google auth credentials
function getGoogleAuth() {
    // First try to get credentials from environment variable (Render)
    const credentialsJson = process.env.GOOGLE_CREDENTIALS;
    if (credentialsJson) {
        try {
            const credentials = JSON.parse(credentialsJson);
            return new google.auth.GoogleAuth({
                credentials,
                scopes: ['https://www.googleapis.com/auth/spreadsheets']
            });
        } catch (error) {
            console.error('Error parsing GOOGLE_CREDENTIALS:', error);
            throw new Error('Failed to parse Google credentials from environment variable');
        }
    }

    // Fall back to file-based authentication (local development)
    try {
        return new google.auth.GoogleAuth({
            keyFile: path.resolve(__dirname, '../config/google.json'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
    } catch (error) {
        console.error('Error loading Google credentials:', error);
        throw new Error('Failed to initialize Google authentication. Please ensure credentials are properly configured.');
    }
}

// Initialize auth and spreadsheet ID
const auth = getGoogleAuth();
const spreadsheetId = process.env.SPREADSHEET_ID;

if (!spreadsheetId) {
    throw new Error('SPREADSHEET_ID environment variable is required');
}

/**
 * Fetch and format data from a specific sheet by its name.
 * @param {string} sheetName - The name of the sheet (e.g., "Stock", "Categories").
 * @returns {Promise<Array>} - Formatted JSON data.
 * @returns {Promise<void>}
 */
async function readSheet(sheetName) {
    const cachedData = sheetCache.get(sheetName);
    if (cachedData) {
        return cachedData; // Return cached data if available
    }

    const sheets = google.sheets({ version: 'v4', auth });
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: sheetName
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            return null;
        }

        const headers = rows[0];
        const data = rows.slice(1).map(row => {
            const formattedRow = {};
            headers.forEach((header, index) => {
                if (!header) return; // skip empty headers
        
                let value = row[index];
        
                if (value !== undefined && value !== null) {
                    value = value.trim();
        
                    // Convert to boolean
                    if (value.toLowerCase() === 'true') {
                        value = true;
                    } else if (value.toLowerCase() === 'false') {
                        value = false;
                    }
                    // Convert to number
                    else if (!isNaN(value) && value !== '') {
                        if (!isNaN(parseFloat(value)) && isFinite(value)) {
                            value = Number(value);
                        }
                    }
                } else {
                    value = '';
                }
        
                // Turn the header into JSON-friendly format: lowercase, underscores
                const key = header.trim().toLowerCase().replace(/\s+/g, '_');
        
                formattedRow[key] = value;
            });
            return formattedRow;
        });
        
        

        sheetCache.set(sheetName, data); // Cache the data
        return data;
    } catch (error) {
        console.error(`Error fetching data from sheet "${sheetName}":`, error.message);
        throw new Error(`Failed to fetch data from sheet "${sheetName}"`);
    }
}

async function writeToSheet(sheetName, data) {
    const sheets = google.sheets({ version: 'v4', auth });
    try {
        // Convert empty strings to null
        const processedData = data.map(value => value === '' ? null : value);
        
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: sheetName,
            valueInputOption: 'RAW',
            requestBody: {
                values: [processedData], // Add the row as a single array
            },
        });
        console.log(`Data written to sheet "${sheetName}" successfully.`);
    } catch (error) {
        console.error(`Error writing data to sheet "${sheetName}":`, error.message);
        throw new Error(`Failed to write data to sheet "${sheetName}"`);
    }
}

async function updateSheetRow(sheetName, rowIndex, updatedData) {
    const sheets = google.sheets({ version: 'v4', auth });

    const rowValues = Object.values(updatedData); // Take all values (make sure order matches headers)

    try {
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${sheetName}!A${rowIndex}`, // e.g., Users!A5 (row 5)
            valueInputOption: 'RAW',
            requestBody: {
                values: [rowValues]
            }
        });
        console.log(`Row ${rowIndex} in sheet "${sheetName}" successfully updated.`);
    } catch (error) {
        console.error(`Error updating sheet row in "${sheetName}":`, error.message);
        throw new Error(`Failed to update row in sheet "${sheetName}"`);
    }
}

module.exports = { readSheet, writeToSheet, updateSheetRow };
