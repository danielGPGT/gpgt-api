const express = require("express");
const { readSheet, writeToSheet } = require("../services/sheetsService");
const { google } = require("googleapis");
const path = require("path");
const axios = require("axios");
const router = express.Router();
const auth = new google.auth.GoogleAuth({
  keyFile: path.resolve(__dirname, "../config/google.json"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const spreadsheetId = process.env.SPREADSHEET_ID;

// Define the field mappings for booking data
const bookingFieldMappings = {
  // Primary key
  booking_id: "booking_id",
  
  // Status and reference fields
  status: "status",
  booking_ref: "booking_ref",
  booking_type: "booking_type",
  consultant: "consultant",
  acquisition: "acquisition",
  event_id: "event_id",
  sport: "Sport",
  event_name: "Event Name",
  package_id: "package_id",
  package_type: "Package Type",
  atol_abtot: "atol_abtot",
  booking_date: "booking_date",

  // Booker information
  booker_name: "booker_name",
  booker_email: "booker_email",
  booker_phone: "booker_phone",
  booker_address: "booker_address",

  // Traveller information
  lead_traveller_name: "lead_traveller_name",
  lead_traveller_email: "lead_traveller_email",
  lead_traveller_phone: "lead_traveller_phone",
  guest_traveller_names: "guest_traveller_names",
  adults: "adults",

  // Ticket information
  ticket_id: "ticket_id",
  ticket_name: "Ticket Name",
  ticket_quantity: "ticket_quantity",
  ticket_cost: "Ticket Cost",
  ticket_price: "ticket_price",

  // Hotel information
  hotel_id: "hotel_id",
  hotel_name: "Hotel Name",
  room_id: "room_id",
  room_category: "Room Category",
  room_type: "Room Type",
  check_in_date: "check_in_date",
  check_out_date: "check_out_date",
  nights: "nights",
  extra_nights: "extra_nights",
  room_quantity: "room_quantity",
  room_cost: "Room Cost",
  room_price: "room_price",

  // Transfer information
  airport_transfer_id: "airport_transfer_id",
  airport_transfer_type: "Airport Transfer Type",
  airport_transfer_quantity: "airport_transfer_quantity",
  airport_transfer_cost: "Airport Transfer Cost",
  airport_transfer_price: "airport_transfer_price",
  circuit_transfer_id: "circuit_transfer_id",
  circuit_transfer_type: "Circuit Transfer Type",
  circuit_transfer_quantity: "circuit_transfer_quantity",
  circuit_transfer_cost: "Circuit Transfer Cost",
  circuit_transfer_price: "circuit_transfer_price",

  // Flight information
  flight_id: "flight_id",
  flight_outbound: "Flight Outbound",
  flight_inbound: "Flight Inbound",
  flight_class: "Flight Class",
  flight_carrier: "Flight Carrier",
  flight_source: "Flight Source",
  flight_booking_reference: "flight_booking_reference",
  ticketing_deadline: "ticketing_deadline",
  flight_status: "flight_status",
  flight_quantity: "flight_quantity",
  flight_cost: "Flight Cost",
  flight_price: "flight_price",

  // Lounge pass information
  lounge_pass_id: "lounge_pass_id",
  lounge_pass_variant: "Lounge Pass Variant",
  lounge_pass_quantity: "lounge_pass_quantity",
  lounge_pass_cost: "Lounge Pass Cost",
  lounge_pass_price: "lounge_pass_price",

  // Payment information
  payment_currency: "payment_currency",
  payment_1: "payment_1",
  payment_1_date: "payment_1_date",
  payment_1_status: "payment_1_status",
  payment_2: "payment_2",
  payment_2_date: "payment_2_date",
  payment_2_status: "payment_2_status",
  payment_3: "payment_3",
  payment_3_date: "payment_3_date",
  payment_3_status: "payment_3_status",
  amount_due: "Amount Due",
  payment_status: "Payment Status",
  total_cost: "Total Cost",
  total_sold_local: "Total Sold For Local",
  total_sold_gbp: "Total Sold GBP",
  pnl: "P&L"
};

// Define the field mappings for stock/ticket data
const stockFieldMappings = {
  event: "Event",
  package_type: "Package Type",
  ticket_id: "Ticket ID",
  ticket_name: "Ticket Name",
  supplier: "Supplier",
  ref: "Ref",
  actual_stock: "Actual stock",
  used: "Used",
  remaining: "Remaining",
  currency_bought_in: "Currency (Bought in)",
  unit_cost_local: "Unit Cost (Local)",
  unit_cost_gbp: "Unit Cost (GBP)",
  total_cost_local: "Total Cost  (Local)",
  total_cost_gbp: "Total Cost (GBP)",
  is_provsional: "Is Provsional",
  ordered: "Ordered",
  paid: "Paid",
  tickets_received: "Tickets Received",
  markup: "Markup",
  event_days: "Event Days",
  ticket_type: "Ticket Type",
  video_wall: "Video Wall",
  covered_seat: "Covered Seat",
  numbered_seat: "Numbered Seat",
  delivery_days: "Delivery days",
  ticket_description: "Ticket Description",
  ticket_image_1: "Ticket image 1",
  ticket_image_2: "Ticket Image 2",
};

// Define the field mappings for hotel data
const hotelFieldMappings = {
  event_name: "Event Name",
  package_id: "Package ID",
  hotel_id: "Hotel ID",
  hotel_name: "Hotel Name",
  stars: "Stars",
  package_type: "Package Type",
  hotel_info: "Hotel Info",
  longitude: "Longitude",
  latitude: "Latitude",
  images: "Images",
};

const flightFieldMappings = {
  event_id: "Event ID",
  event_name: "Event Name",
  flight_id: "Flight ID",
  outbound_flight: "Outbound Flight",
  inbound_flight: "Inbound Flight",
  airline: "Airline",
  class: "Class",
  from_location: "From Location",
  cost: "Cost",
  margin: "Margin",
  booking_reference: "Booking Reference",
  currency: "Currency",
  source: "Source",
  used: "Used",
};

const packageFieldMappings = {
  event: "Event",
  event_id: "Event ID",
  package_id: "Package ID",
  package_name: "Package Name",
  package_type: "Package Type",
  package_start_date: "Package Start Date",
  package_end_date: "Package End Date",
  url: "url"
};

const userFieldMappings = {
  email: "Email",
  phone: "Phone",
  password: "Password",
  role: "Role",
  first_name: "First Name",
  last_name: "Last Name",
  company: "Company",
  login_count: "login_count",
  last_login: "last_login",
  b2b_commission: "b2b_commission",
  user_id: "User ID"
};

const tierFieldMappings = {
  package_name: "package_name",
  package_id: "package_id",
  tier_id: "tier_id",
  tier_type: "tier_type",
  ticket_id: "ticket_id",
  ticket_name: "ticket_name",
  hotel_id: "hotel_id",
  room_id: "room_id",
  circuit_transfer_id: "circuit_transfer_id",
  airport_transfer_id: "airport_transfer_id"
};

// Add at the top of the file with other constants
const pendingUpdates = new Map();

// GET route to fetch data for a specific sheet
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
  } = req.query; // Accept multiple query parameters

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

// Helper function to find row by ID
async function findRowById(sheets, sheetName, idColumn, idValue) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetName}'!A:ZZ`,  // Changed to A:ZZ
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

// GET route to read data from a specific sheet
router.get("/:sheetName", async (req, res, next) => {
  const { sheetName } = req.params;
  const { id, idColumn } = req.query;

  try {
    const sheets = google.sheets({ version: "v4", auth });

    if (id && idColumn) {
      // Get specific row by ID
      const rowNumber = await findRowById(sheets, sheetName, idColumn, id);
      if (!rowNumber) {
        return res.status(404).json({ error: "Item not found" });
      }

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${sheetName}'!A${rowNumber}:ZZ${rowNumber}`,  // Changed to A:ZZ
      });

      const headers = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${sheetName}'!A1:ZZ1`,  // Changed to A:ZZ
      });

      const row = response.data.values[0];
      const result = {};
      headers.data.values[0].forEach((header, index) => {
        result[header] = row[index];
      });

      res.json(result);
    } else {
      // Get all data
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${sheetName}'!A:ZZ`,  // Changed to A:ZZ
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return res.json([]);
      }

      const headers = rows[0];
      const data = rows.slice(1).map((row) => {
        const item = {};
        headers.forEach((header, index) => {
          item[header] = row[index];
        });
        return item;
      });

      res.json(data);
    }
  } catch (error) {
    next(error);
  }
});

// Helper function to trigger Google Apps Script updates
async function triggerRunAllUpdates(sheetName) {
  try {
    const normalizedSheetName = sheetName.toLowerCase().replace(/\s+/g, "");
    let action;

    // Determine the action based on the sheet name
    switch (normalizedSheetName) {
      case "stock-tickets":
        action = "updateTickets";
        break;
      case "hotels":
        action = "updateHotels";
        break;
      case "stock-rooms":
        action = "updateRooms";
        break;
      case "event":
        action = "updateEvents";
        break;
      case "packages":
        action = "updatePackages";
        break;
      case "package-tiers":
        action = "updatePackageTiers";
        break;
      case "stock-circuit-transfers":
        action = "updateCircuitTransfers";
        break;
      case "stock-flights":
        action = "updateFlights";
        break;
      case "stock-airport-transfers":
        action = "updateAirportTransfers";
        break;
      case "stock-lounge-passes":
        action = "updateLoungePasses";
        break;
      default:
        action = "runAllUpdates";
    }

    const response = await axios.post(
      "https://script.google.com/macros/s/AKfycbwquLfO2CByeT2n4dhyGvsXRtFDimyWe-lt5TqcxUXemFaDbw7cIoxcty6y1abk0EA/exec",
      {
        action: action,
      }
    );
    console.log(`${action} triggered:`, response.data);
  } catch (error) {
    console.error(`Error triggering ${action}:`, error.message);
  }
}

// Helper function to convert column index to letter (0 = A, 1 = B, 26 = AA, etc.)
function columnIndexToLetter(index) {
  let letter = '';
  while (index >= 0) {
    letter = String.fromCharCode(65 + (index % 26)) + letter;
    index = Math.floor(index / 26) - 1;
  }
  return letter;
}

// POST route to write data to a specific sheet
router.post("/:sheetName", async (req, res, next) => {
  const { sheetName } = req.params;
  console.log("Writing to sheet:", sheetName);
  console.log("Request body:", req.body);

  try {
    // First, get the headers from the sheet to ensure correct order
    const sheets = google.sheets({ version: "v4", auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!1:1`, // Get only the header row
    });

    const headers = response.data.values[0];
    console.log("Sheet headers:", headers);
    if (!headers) {
      return res.status(400).json({ error: "No headers found in the sheet" });
    }

    // Create an array with the same length as headers, filled with empty strings
    const rowData = new Array(headers.length).fill("");

    // If the request body is an array, map it directly to columns
    if (Array.isArray(req.body)) {
      req.body.forEach((value, index) => {
        if (index < headers.length) {
          rowData[index] = value;
        }
      });
    } else {
      // Handle object data with field mappings
      const normalizedSheetName = sheetName.toLowerCase().replace(/\s+/g, "");
      let fieldMappings;
      if (normalizedSheetName === "bookingfile") {
        fieldMappings = bookingFieldMappings;
      } else if (normalizedSheetName === "stock-tickets") {
        fieldMappings = stockFieldMappings;
      } else if (normalizedSheetName === "hotels") {
        fieldMappings = hotelFieldMappings;
      } else if (normalizedSheetName === "stock-flights") {
        fieldMappings = flightFieldMappings;
      } else if (normalizedSheetName === "packages") {
        fieldMappings = packageFieldMappings;
      } else if (normalizedSheetName === "users") {
        fieldMappings = userFieldMappings;
      } else if (normalizedSheetName === "package-tiers") {
        fieldMappings = tierFieldMappings;
      } else {
        return res.status(400).json({ error: "Unsupported sheet type" });
      }

      // Map the incoming data to the correct positions based on headers
      for (const [field, value] of Object.entries(req.body)) {
        const columnName = fieldMappings[field];
        if (columnName) {
          const columnIndex = headers.indexOf(columnName);
          if (columnIndex !== -1) {
            rowData[columnIndex] = value;
          } else {
            console.log(`Column ${columnName} not found in headers`);
          }
        } else {
          console.log(`No mapping found for field ${field}`);
        }
      }
    }

    console.log("Row data to write:", rowData);

    // Write the data to the sheet
    await writeToSheet(sheetName, rowData);

    // Trigger appropriate Google Apps Script updates
    await triggerRunAllUpdates(sheetName);

    res.status(200).json({ message: "Data successfully written to the sheet" });
  } catch (error) {
    console.error("Error writing to sheet:", error.message);
    next(error);
  }
});

// PUT route to update a single cell in a specific sheet
router.put("/:sheetName/:idColumn/:idValue", async (req, res, next) => {
  const { sheetName, idColumn, idValue } = req.params;
  const { column, value } = req.body;

  console.log('Update request:', {
    sheetName,
    idColumn,
    idValue,
    column,
    value
  });

  // Create a unique key for this update
  const updateKey = `${sheetName}-${idValue}-${column}`;
  
  // Check if this exact update is already in progress
  if (pendingUpdates.has(updateKey)) {
    return res.status(409).json({ 
      error: "Update already in progress",
      message: "This update is already being processed"
    });
  }

  // Mark this update as in progress
  pendingUpdates.set(updateKey, true);

  try {
    const sheets = google.sheets({ version: "v4", auth });

    // Find the row number
    const rowNumber = await findRowById(sheets, sheetName, idColumn, idValue);
    console.log('Found row number:', rowNumber);
    
    if (!rowNumber) {
      pendingUpdates.delete(updateKey);
      return res.status(404).json({ error: "Item not found" });
    }

    // Get headers to find the column index
    const headersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${sheetName}'!A1:ZZ1`,
    });

    const headers = headersResponse.data.values[0];
    console.log('Sheet headers:', headers);
    
    // Handle column mapping for booking sheet
    let columnToUpdate = column;
    const normalizedSheetName = sheetName.toLowerCase().replace(/\s+/g, "");
    if (normalizedSheetName === "bookingfile") {
      const fieldMappings = bookingFieldMappings;
      // Find the sheet column name for the given field
      for (const [field, sheetColumn] of Object.entries(fieldMappings)) {
        if (field === column) {
          columnToUpdate = sheetColumn;
          break;
        }
      }
    }

    console.log('Column to update:', columnToUpdate);
    const columnIndex = headers.indexOf(columnToUpdate);
    console.log('Column index:', columnIndex);

    if (columnIndex === -1) {
      pendingUpdates.delete(updateKey);
      return res
        .status(400)
        .json({ error: `Column '${columnToUpdate}' not found in sheet. Available columns: ${headers.join(', ')}` });
    }

    // Convert column index to letter using the new function
    const columnLetter = columnIndexToLetter(columnIndex);
    console.log('Column letter:', columnLetter);

    // Update only the specific cell
    const updateResponse = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${sheetName}'!${columnLetter}${rowNumber}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[value]],
      },
    });
    console.log('Update response:', updateResponse.data);

    // Trigger appropriate Google Apps Script updates
    await triggerRunAllUpdates(sheetName);

    res.json({ message: "Cell updated successfully" });
  } catch (error) {
    console.error("Error updating cell:", error);
    next(error);
  } finally {
    // Always remove the update from pending updates
    pendingUpdates.delete(updateKey);
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
