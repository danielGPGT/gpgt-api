const express = require("express");
const { readSheet, writeToSheet } = require("../services/sheetsService");
const { google } = require("googleapis");
const path = require("path");
const axios = require("axios");
const router = express.Router();

// Function to get Google auth credentials
function getGoogleAuth() {
    // First try to get credentials from environment variable (Render)
    const credentialsJson = process.env.GOOGLE_CREDENTIALS;
    if (credentialsJson) {
        try {
            const credentials = JSON.parse(credentialsJson);
            return new google.auth.GoogleAuth({
                credentials,
                scopes: ["https://www.googleapis.com/auth/spreadsheets"]
            });
        } catch (error) {
            console.error('Error parsing GOOGLE_CREDENTIALS:', error);
            throw new Error('Failed to parse Google credentials from environment variable');
        }
    }

    // Fall back to file-based authentication (local development)
    try {
        return new google.auth.GoogleAuth({
            keyFile: path.resolve(__dirname, "../config/google.json"),
            scopes: ["https://www.googleapis.com/auth/spreadsheets"]
        });
    } catch (error) {
        console.error('Error loading Google credentials:', error);
        throw new Error('Failed to initialize Google authentication. Please ensure credentials are properly configured.');
    }
}

const auth = getGoogleAuth();
const spreadsheetId = process.env.SPREADSHEET_ID;

if (!spreadsheetId) {
    throw new Error('SPREADSHEET_ID environment variable is required');
}

// Add caching
const cache = {
    headers: new Map(),
    lastUpdated: new Map(),
    CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
};

// Helper function to get cached data
async function getCachedData(key, fetchFn) {
  const now = Date.now();
  const cached = cache[key];
  
  if (cached && (now - cache.lastUpdated.get(key)) < cache.CACHE_DURATION) {
    return cached;
  }
  
  const data = await fetchFn();
  cache[key] = data;
  cache.lastUpdated.set(key, now);
  return data;
}

// Optimize Google Sheets API calls
const sheets = google.sheets({ version: "v4", auth });

// Batch operations helper
async function batchUpdate(sheetName, updates) {
  const batch = updates.map(update => ({
    range: `'${sheetName}'!${update.range}`,
    values: [[update.value]]
  }));

  return sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: batch
    }
  });
}

// Helper function to find row by ID
async function findRowById(sheets, sheetName, idColumn, idValue) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetName}'!A:ZZ`,
  });

  const rows = response.data.values;
  if (!rows || rows.length === 0) return null;

  const headers = rows[0];
  const idColumnIndex = headers.indexOf(idColumn);
  if (idColumnIndex === -1) return null;

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][idColumnIndex] === idValue) {
      return i + 1; // Return 1-based row number
    }
  }
  return null;
}

// Helper function to trigger Google Apps Script updates
async function triggerRunAllUpdates(sheetName) {
  const normalizedSheetName = sheetName.toLowerCase().replace(/\s+/g, "");
  let action;

  // Determine the action based on the sheet name
  switch (normalizedSheetName) {
    case "users":
      action = "updateUsers";
      break;
    case "newstock-tickets":
      action = "updateTickets";
      break;
    case "testhotels":
      action = "updateHotels";
      break;
    case "teststock-rooms":
      action = "updateRooms";
      break;
    case "event":
      action = "updateEvents";
      break;
    case "packages":
      action = "updatePackages";
      break;
    case "n-categories":
      action = "updateCategories";
      break;
    case "package-tiers":
      action = "updatePackageTiers";
      break;
    case "stock-circuittransfers":
      action = "";
      break;
    case "stock-flights":
      action = "updateFlights";
      break;
    case "stock-airporttransfers":
      action = "";
      break;
    case "stock-loungepasses":
      action = "updateLoungePasses";
      break;
    case "event":
      action = "updateEvents";
      break;
    case "venues":
      action = "updateVenues";
      break;
    case "itineraries":
      action = "updateItineraries";
      break;
    case "fx-spread":
      action = "";
      break;
    default:
      action = "runAllUpdates";
  }

  try {
    const response = await axios.post(
      "https://script.google.com/macros/s/AKfycbxQA2pSDGZIkRZViGagSG12XP4446dT0oS1EhSoYXnzny5cDKt-izoWOLcVmy52L4-V/exec",
      {
        action: action,
      }
    );
    console.log(`${action} triggered:`, response.data);
  } catch (error) {
    console.error(`Error triggering ${action || 'update'}:`, error.message);
  }
}

// Helper function to convert column index to letter (0 = A, 1 = B, 26 = AA, etc.)
function columnIndexToLetter(index) {
  let letter = "";
  while (index >= 0) {
    letter = String.fromCharCode(65 + (index % 26)) + letter;
    index = Math.floor(index / 26) - 1;
  }
  return letter;
}

// Add at the top of the file with other constants
const pendingUpdates = new Map();

// GET route for getting a single booking by ID (more specific route)
router.get("/:sheetName/:idColumn/:idValue", async (req, res, next) => {
  const { sheetName, idColumn, idValue } = req.params;

  try {
    const data = await readSheet(sheetName);
    if (!data) {
      return res
        .status(404)
        .json({ error: `No data found in sheet: ${sheetName}` });
    }

    // Find the booking with matching ID
    const booking = data.find(item => item[idColumn] === idValue);
    
    if (!booking) {
      return res
        .status(404)
        .json({ error: `No booking found with ${idColumn}: ${idValue}` });
    }

    res.status(200).json(booking);
  } catch (error) {
    next(error);
  }
});

// GET route to fetch data for a specific sheet (more general route)
router.get("/:sheetName", async (req, res, next) => {
  const { sheetName } = req.params;
  const {
    sport,
    eventId,
    ticketId,
    packageId,
    hotelId,
    roomId,
    airportTransferId,
    circuitTransferId,
    loungePassId,
    packageType,
  } = req.query;

  try {
    const data = await readSheet(sheetName);
    if (!data) {
      return res
        .status(404)
        .json({ error: `No data found in sheet: ${sheetName}` });
    }

    let filteredData = data;

    // Define a map between query parameters and sheet column names
    const filters = {
      bookingId: "booking_id",
      eventId: "event_id",

      ticketId: "ticket_id",
      ticketQuantity: "ticket_quantity",
      ticketPrice: "ticket_price",

      packageId: "package_id",
      hotelId: "hotel_id",
      roomId: "room_id",
      roomCheckIn: "room_check_in",
      roomCheckOut: "room_check_out",
      roomQuantity: "room_quantity",
      roomPrice: "room_price",

      airportTransferId: "airport_transfer_id",
      airportTransferQuantity: "airport_transfer_quantity",
      airportTransferPrice: "airport_transfer_price",

      circuitTransferId: "circuit_transfer_id",
      circuitTransferQuantity: "circuit_transfer_quantity",
      circuitTransferPrice: "circuit_transfer_price",

      flightId: "flight_id",
      flightBookingReference: "flight_booking_reference",
      ticketingDeadline: "ticketing_deadline",
      flightStatus: "flight_status",
      flightPrice: "flight_price",

      loungePassId: "lounge_pass_id",
      loungePassQuantity: "lounge_pass_quantity",
      loungePassPrice: "lounge_pass_price",

      bookerName: "booker_name",
      bookerEmail: "booker_email",
      bookerPhone: "booker_phone",
      bookerAddress: "booker_address",
      leadTravellerName: "lead_traveller_name",
      leadTravellerEmail: "lead_traveller_email",
      leadTravellerPhone: "lead_traveller_phone",

      bookingDate: "booking_date",
      aquisition: "acquisition",
      atolAbtot: "atol_abtot",
      ticketingDeadline: "ticketing_deadline",
      paymentCurrency: "payment_currency",
      payment1: "payment_1",
      payment1Status: "payment_1_status",
      payment1Date: "payment_1_date",
      payment2: "payment_2",
      payment2Status: "payment_2_status",
      payment2Date: "payment_2_date",
      payment3: "payment_3",
      payment3Status: "payment_3_status",
      payment3Date: "payment_3_date",
    };

    // Apply filters dynamically
    for (const [queryKey, sheetColumn] of Object.entries(filters)) {
      if (req.query[queryKey]) {
        // Special handling for fields that may contain multiple values
        if (queryKey === "packageId") {
          filteredData = filteredData.filter((item) => {
            const cell = item[sheetColumn];
            if (!cell) return false;
            const ids = cell.split(",").map((id) => id.trim());
            return ids.includes(req.query[queryKey]);
          });
        } else {
          // Normal strict match for other fields
          filteredData = filteredData.filter(
            (item) =>
              item[sheetColumn] && item[sheetColumn] === req.query[queryKey]
          );
        }
      }
    }

    res.status(200).json(filteredData);
  } catch (error) {
    next(error);
  }
});

// POST route to write data to a specific sheet
router.post("/:sheetName", async (req, res, next) => {
  const { sheetName } = req.params;
  console.log("Writing to sheet:", sheetName);
  console.log("Request body:", req.body);

  try {
    // Get headers from cache
    const headers = await getCachedData(`headers-${sheetName}`, async () => {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!1:1`,
      });
      return response.data.values[0];
    });

    if (!headers) {
      return res.status(400).json({ error: "No headers found in the sheet" });
    }

    const rowData = new Array(headers.length).fill("");

    if (Array.isArray(req.body)) {
      req.body.forEach((value, index) => {
        if (index < headers.length) {
          rowData[index] = value;
        }
      });
    } else {
      // Map the incoming data to the correct positions based on headers
      for (const [field, value] of Object.entries(req.body)) {
        const columnIndex = headers.indexOf(field);
          if (columnIndex !== -1) {
            rowData[columnIndex] = value;
        } else {
          console.log(`Column ${field} not found in headers`);
        }
      }
    }

    console.log("Row data to write:", rowData);

    // Write data and trigger updates in parallel
    await Promise.all([
      writeToSheet(sheetName, rowData),
      triggerRunAllUpdates(sheetName),
      // Clear cache for this sheet
      cache.headers.delete(`headers-${sheetName}`)
    ]);

    res.status(200).json({ message: "Data successfully written to the sheet" });
  } catch (error) {
    console.error("Error writing to sheet:", error.message);
    next(error);
  }
});

// PUT route to update a single cell in a specific sheet
router.put("/:sheetName/:idColumn/:idValue", async (req, res, next) => {
  const { sheetName, idColumn, idValue } = req.params;
  
  // Validate URL parameters
  if (!sheetName || typeof sheetName !== 'string') {
    return res.status(400).json({ error: "Valid sheet name is required" });
  }
  
  if (!idColumn || typeof idColumn !== 'string') {
    return res.status(400).json({ error: "Valid ID column name is required" });
  }
  
  if (!idValue || typeof idValue !== 'string') {
    return res.status(400).json({ error: "Valid ID value is required" });
  }
  
  // Validate request body
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: "Request body is required and must be an object" });
  }
  
  const { column, value } = req.body;
  
  // Validate required fields
  if (!column || typeof column !== 'string') {
    return res.status(400).json({ error: "Column name is required and must be a string" });
  }

  // Validate value (can be null, string, number, or boolean)
  if (value !== null && value !== undefined && 
      typeof value !== 'string' && 
      typeof value !== 'number' && 
      typeof value !== 'boolean') {
    return res.status(400).json({ 
      error: "Value must be a string, number, boolean, or null" 
    });
  }

  // Convert empty string to null
  const processedValue = value === "" ? null : value;

  const updateKey = `${sheetName}-${idValue}-${column}`;
  if (pendingUpdates.has(updateKey)) {
    return res.status(409).json({
      error: "Update already in progress",
      message: "This update is already being processed",
    });
  }

  pendingUpdates.set(updateKey, true);

  try {
    // Get headers from cache
    const headers = await getCachedData(`headers-${sheetName}`, async () => {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${sheetName}'!A1:ZZ1`,
      });
      return response.data.values[0];
    });

    // Find row number
    const rowNumber = await findRowById(sheets, sheetName, idColumn, idValue);
    if (!rowNumber) {
      pendingUpdates.delete(updateKey);
      return res.status(404).json({ error: "Item not found" });
    }

    const columnIndex = headers.indexOf(column);
    if (columnIndex === -1) {
      pendingUpdates.delete(updateKey);
      return res.status(400).json({
        error: `Column '${column}' not found in sheet. Available columns: ${headers.join(", ")}`,
      });
    }

    const columnLetter = columnIndexToLetter(columnIndex);
    
    // Use batch update with processed value
    await batchUpdate(sheetName, [{
      range: `${columnLetter}${rowNumber}`,
      value: processedValue
    }]);

    // Trigger updates in parallel
    await Promise.all([
      triggerRunAllUpdates(sheetName),
      // Clear cache for this sheet
      cache.headers.delete(`headers-${sheetName}`)
    ]);

    res.json({ message: "Cell updated successfully" });
  } catch (error) {
    console.error("Error updating cell:", error);
    next(error);
  } finally {
    pendingUpdates.delete(updateKey);
  }
});

// Add new bulk update endpoint
router.put("/:sheetName/:idColumn/:idValue/bulk", async (req, res, next) => {
  const { sheetName, idColumn, idValue } = req.params;
  
  // Validate URL parameters
  if (!sheetName || typeof sheetName !== 'string') {
    return res.status(400).json({ error: "Valid sheet name is required" });
  }
  
  if (!idColumn || typeof idColumn !== 'string') {
    return res.status(400).json({ error: "Valid ID column name is required" });
  }
  
  if (!idValue || typeof idValue !== 'string') {
    return res.status(400).json({ error: "Valid ID value is required" });
  }
  
  // Validate request body
  if (!req.body || !Array.isArray(req.body)) {
    return res.status(400).json({ error: "Request body must be an array of updates" });
  }

  try {
    // Get headers from cache
    const headers = await getCachedData(`headers-${sheetName}`, async () => {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${sheetName}'!A1:ZZ1`,
      });
      return response.data.values[0];
    });

    // Find row number
    const rowNumber = await findRowById(sheets, sheetName, idColumn, idValue);
    if (!rowNumber) {
      return res.status(404).json({ error: "Item not found" });
    }

    // Prepare batch updates
    const batchUpdates = req.body.map(update => {
      const { column, value } = update;
      
      // Validate column exists
      const columnIndex = headers.indexOf(column);
      if (columnIndex === -1) {
        throw new Error(`Column '${column}' not found in sheet`);
      }

      const columnLetter = columnIndexToLetter(columnIndex);
      return {
        range: `${columnLetter}${rowNumber}`,
        value: value === "" ? null : value
      };
    });

    // Execute batch update
    await batchUpdate(sheetName, batchUpdates);

    // Trigger updates in parallel
    await Promise.all([
      triggerRunAllUpdates(sheetName),
      // Clear cache for this sheet
      cache.headers.delete(`headers-${sheetName}`)
    ]);

    res.json({ message: "Bulk update completed successfully" });
  } catch (error) {
    console.error("Error in bulk update:", error);
    next(error);
  }
});

// DELETE route to remove data from a specific sheet
router.delete("/:sheetName/:idColumn/:idValue", async (req, res, next) => {
  const { sheetName, idColumn, idValue } = req.params;

  try {
    const sheets = google.sheets({ version: "v4", auth });
    const rowNumber = await findRowById(sheets, sheetName, idColumn, idValue);

    if (!rowNumber) {
      return res.status(404).json({ error: "Item not found" });
    }

    // Get the sheet's metadata to find the sheet ID
    const sheetMetadata = await sheets.spreadsheets.get({
      spreadsheetId,
      ranges: [sheetName],
      includeGridData: false,
    });

    const sheetId = sheetMetadata.data.sheets[0].properties.sheetId;

    // Delete the row
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: "ROWS",
                startIndex: rowNumber - 1,
                endIndex: rowNumber,
              },
            },
          },
        ],
      },
    });

    // Trigger appropriate Google Apps Script updates
    await triggerRunAllUpdates(sheetName);

    res.json({ message: "Item deleted successfully" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;