const express = require('express');
const { readSheet, writeToSheet } = require('../services/sheetsService');
const { google } = require('googleapis');
const path = require('path');
const axios = require('axios');
const router = express.Router();
const auth = new google.auth.GoogleAuth({
    keyFile: path.resolve(__dirname, '../config/google.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const spreadsheetId = process.env.SPREADSHEET_ID;

// GET route to fetch data for a specific sheet
router.get('/:sheetName', async (req, res, next) => {
    const { sheetName } = req.params;
    const { sport, eventId, ticketId, packageId, hotelId, roomId, airportTransferId, circuitTransferId, loungePassId, packageType, } = req.query; // Accept multiple query parameters

    try {
        const data = await readSheet(sheetName);
        if (!data) {
            return res.status(404).json({ error: `No data found in sheet: ${sheetName}` });
        }

        let filteredData = data;

        // Define a map between query parameters and sheet column names
        const filters = {
            eventId: 'event_id',

            ticketId: 'ticket_id',
            ticketQuantity: 'ticket_quantity',
            ticketPrice: 'ticket_price',

            packageId: 'package_id',
            hotelId: 'hotel_id',
            roomId: 'room_id',
            roomCheckIn: 'room_check_in',
            roomCheckOut: 'room_check_out',
            roomQuantity: 'room_quantity',
            roomPrice: 'room_price',

            airportTransferId: 'airport_transfer_id',
            airportTransferQuantity: 'airport_transfer_quantity',
            airportTransferPrice: 'airport_transfer_price',

            circuitTransferId: 'circuit_transfer_id',
            circuitTransferQuantity: 'circuit_transfer_quantity',
            circuitTransferPrice: 'circuit_transfer_price',

            flightId: 'flight_id',
            flightBookingReference: 'flight_booking_reference',
            ticketingDeadline: 'ticketing_deadline',
            flightStatus: 'flight_status',
            flightPrice: 'flight_price',

            loungePassId: 'lounge_pass_id',
            loungePassQuantity: 'lounge_pass_quantity',
            loungePassPrice: 'lounge_pass_price',

            bookerName: 'booker_name',
            bookerEmail: 'booker_email',
            bookerPhone: 'booker_phone',
            bookerAddress: 'booker_address',
            leadTravellerName: 'lead_traveller_name',
            leadTravellerEmail: 'lead_traveller_email',
            leadTravellerPhone: 'lead_traveller_phone',

            bookingDate: 'booking_date',
            aquisition: 'acquisition',
            atolAbtot: 'atol_abtot',
            ticketingDeadline: 'ticketing_deadline',
            paymentCurrency: 'payment_currency',
            payment1: 'payment_1',
            payment1Date: 'payment_1_date',
            payment2: 'payment_2',
            payment2Date: 'payment_2_date',
            payment3: 'payment_3',
            payment3Date: 'payment_3_date',
        };

        // Apply filters dynamically
       for (const [queryKey, sheetColumn] of Object.entries(filters)) {
            if (req.query[queryKey]) {
                // Special handling for fields that may contain multiple values
                if (queryKey === 'packageId') {
                    filteredData = filteredData.filter(item => {
                        const cell = item[sheetColumn];
                        if (!cell) return false;
                        const ids = cell.split(',').map(id => id.trim());
                        return ids.includes(req.query[queryKey]);
                    });
                } else {
                    // Normal strict match for other fields
                    filteredData = filteredData.filter(item => 
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
        range: `${sheetName}!A:Z`
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
router.get('/:sheetName', async (req, res, next) => {
    const { sheetName } = req.params;
    const { id, idColumn } = req.query;

    try {
        const sheets = google.sheets({ version: 'v4', auth });
        
        if (id && idColumn) {
            // Get specific row by ID
            const rowNumber = await findRowById(sheets, sheetName, idColumn, id);
            if (!rowNumber) {
                return res.status(404).json({ error: 'Item not found' });
            }

            const response = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: `${sheetName}!A${rowNumber}:Z${rowNumber}`
            });

            const headers = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: `${sheetName}!1:1`
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
                range: `${sheetName}!A:Z`
            });

            const rows = response.data.values;
            if (!rows || rows.length === 0) {
                return res.json([]);
            }

            const headers = rows[0];
            const data = rows.slice(1).map(row => {
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
        const normalizedSheetName = sheetName.toLowerCase().replace(/\s+/g, '');
        const action = normalizedSheetName === 'stock-tickets' ? 'updateTickets' : 'runAllUpdates';
        
        const response = await axios.post('https://script.google.com/macros/s/AKfycbxB9PB3NGOhM2HtZdN9D_O5DPdqHnDEiPBRSZ2bYTSYjaOqKVf_oxOafk00ljlv84nE/exec', {
            action: action
        });
        console.log(`${action} triggered:`, response.data);
    } catch (error) {
        console.error(`Error triggering ${action}:`, error.message);
    }
}

// POST route to write data to a specific sheet
router.post('/:sheetName', async (req, res, next) => {
    const { sheetName } = req.params;
    console.log('Writing to sheet:', sheetName);
    console.log('Request body:', req.body);

    const {
        // Ticket/Stock fields
        event,
        package_id,
        package_type,
        ticket_id,
        ticket_name,
        supplier,
        ref,
        actual_stock,
        used,
        remaining,
        currency_bought_in,
        unit_cost_local,
        unit_cost_gbp,
        total_cost_local,
        total_cost_gbp,
        is_provsional,
        ordered,
        paid,
        tickets_received,
        markup,
        event_days,
        ticket_type,
        video_wall,
        covered_seat,
        numbered_seat,
        delivery_days,
        ticket_description,
        ticket_image_1,
        ticket_image_2,
        // Booking fields
        booker_name,
        booker_email,
        booker_phone,
        booker_address,
        lead_traveller_name,
        lead_traveller_email,
        lead_traveller_phone,
        guest_traveller_names,
        booking_date,
        event_id,
        ticket_quantity,
        ticket_price,
        hotel_id,
        room_id,
        room_quantity,
        room_price,
        airport_transfer_id,
        airport_transfer_quantity,
        airport_transfer_price,
        circuit_transfer_id,
        circuit_transfer_quantity,
        circuit_transfer_price,
        flight_id,
        flight_booking_reference,
        ticketing_deadline,
        flight_status,
        flight_price,
        lounge_pass_id,
        lounge_pass_quantity,
        lounge_pass_price,
        payment_currency,
        payment_1,
        payment_1_date,
        payment_2,
        payment_2_date,
        payment_3,
        payment_3_date,
        consultant,
        acquisition,
        booking_type,
        atol_abtot,
        check_in_date,
        check_out_date,
        nights,
        extra_nights,
        adults
    } = req.body;

    // Define the field mappings for booking data
    const bookingFieldMappings = {
        // Status and reference fields
        status: 'status',
        booking_ref: 'booking_ref',
        booking_type: 'booking_type',
        consultant: 'consultant',
        acquisition: 'acquisition',
        event_id: 'event_id',
        package_id: 'package_id',
        atol_abtot: 'atol_abtot',
        booking_date: 'booking_date',
        
        // Booker information
        booker_name: 'booker_name',
        booker_email: 'booker_email',
        booker_phone: 'booker_phone',
        booker_address: 'booker_address',
        
        // Traveller information
        lead_traveller_name: 'lead_traveller_name',
        lead_traveller_email: 'lead_traveller_email',
        lead_traveller_phone: 'lead_traveller_phone',
        guest_traveller_names: 'guest_traveller_names',
        adults: 'adults',
        
        // Ticket information
        ticket_id: 'ticket_id',
        ticket_quantity: 'ticket_quantity',
        ticket_price: 'ticket_price',
        
        // Hotel information
        hotel_id: 'hotel_id',
        room_id: 'room_id',
        check_in_date: 'check_in_date',
        check_out_date: 'check_out_date',
        nights: 'nights',
        extra_nights: 'extra_nights',
        room_quantity: 'room_quantity',
        room_price: 'room_price',
        
        // Transfer information
        airport_transfer_id: 'airport_transfer_id',
        airport_transfer_quantity: 'airport_transfer_quantity',
        airport_transfer_price: 'airport_transfer_price',
        circuit_transfer_id: 'circuit_transfer_id',
        circuit_transfer_quantity: 'circuit_transfer_quantity',
        circuit_transfer_price: 'circuit_transfer_price',
        
        // Flight information
        flight_id: 'flight_id',
        flight_booking_reference: 'flight_booking_reference',
        ticketing_deadline: 'ticketing_deadline',
        flight_status: 'flight_status',
        flight_quantity: 'flight_quantity',
        flight_price: 'flight_price',
        
        // Lounge pass information
        lounge_pass_id: 'lounge_pass_id',
        lounge_pass_quantity: 'lounge_pass_quantity',
        lounge_pass_price: 'lounge_pass_price',
        
        // Payment information
        payment_currency: 'payment_currency',
        payment_1: 'payment_1',
        payment_1_date: 'payment_1_date',
        payment_2: 'payment_2',
        payment_2_date: 'payment_2_date',
        payment_3: 'payment_3',
        payment_3_date: 'payment_3_date'
    };

    // Define the field mappings for stock/ticket data
    const stockFieldMappings = {
        event: 'Event',
        package_id: 'Package ID',
        package_type: 'Package Type',
        ticket_id: 'Ticket ID',
        ticket_name: 'Ticket Name',
        supplier: 'Supplier',
        ref: 'Ref',
        actual_stock: 'Actual stock',
        used: 'Used',
        remaining: 'Remaining',
        currency_bought_in: 'Currency (Bought in)',
        unit_cost_local: 'Unit Cost (Local)',
        unit_cost_gbp: 'Unit Cost (GBP)',
        total_cost_local: 'Total Cost  (Local)',
        total_cost_gbp: 'Total Cost (GBP)',
        is_provsional: 'Is Provsional',
        ordered: 'Ordered',
        paid: 'Paid',
        tickets_received: 'Tickets Received',
        markup: 'Markup',
        event_days: 'Event Days',
        ticket_type: 'Ticket Type',
        video_wall: 'Video Wall',
        covered_seat: 'Covered Seat',
        numbered_seat: 'Numbered Seat',
        delivery_days: 'Delivery days',
        ticket_description: 'Ticket Description',
        ticket_image_1: 'Ticket image 1',
        ticket_image_2: 'Ticket Image 2'
    };

    try {
        // First, get the headers from the sheet to ensure correct order
        const sheets = google.sheets({ version: 'v4', auth });
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetName}!1:1` // Get only the header row
        });

        const headers = response.data.values[0];
        console.log('Sheet headers:', headers);
        if (!headers) {
            return res.status(400).json({ error: 'No headers found in the sheet' });
        }

        // Create an array with the same length as headers, filled with empty strings
        const rowData = new Array(headers.length).fill('');

        // Choose the appropriate field mappings based on the sheet name
        const normalizedSheetName = sheetName.toLowerCase().replace(/\s+/g, '');
        const fieldMappings = normalizedSheetName === 'bookingfile' ? bookingFieldMappings : stockFieldMappings;

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

        console.log('Row data to write:', rowData);

        // Write the data to the sheet
        await writeToSheet(sheetName, rowData);

        // Trigger appropriate Google Apps Script updates
        await triggerRunAllUpdates(sheetName);

        res.status(200).json({ message: 'Data successfully written to the sheet' });
    } catch (error) {
        console.error('Error writing to sheet:', error.message);
        next(error);
    }
});

// PUT route to update data in a specific sheet
router.put('/:sheetName/:idColumn/:idValue', async (req, res, next) => {
    const { sheetName, idColumn, idValue } = req.params;

    try {
        const sheets = google.sheets({ version: 'v4', auth });
        const rowNumber = await findRowById(sheets, sheetName, idColumn, idValue);
        
        if (!rowNumber) {
            return res.status(404).json({ error: 'Item not found' });
        }

        // Get headers to map the data correctly
        const headersResponse = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetName}!1:1`
        });

        const headers = headersResponse.data.values[0];
        const rowData = new Array(headers.length).fill('');

        // Choose the appropriate field mappings based on the sheet name
        const normalizedSheetName = sheetName.toLowerCase().replace(/\s+/g, '');
        const fieldMappings = normalizedSheetName === 'bookingfile' ? bookingFieldMappings : stockFieldMappings;

        // Map the update data to the correct columns
        for (const [field, value] of Object.entries(req.body)) {
            const columnName = fieldMappings[field];
            if (columnName) {
                const columnIndex = headers.indexOf(columnName);
                if (columnIndex !== -1) {
                    rowData[columnIndex] = value;
                }
            }
        }

        // Update the row
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${sheetName}!A${rowNumber}`,
            valueInputOption: 'RAW',
            requestBody: {
                values: [rowData]
            }
        });

        // Trigger appropriate Google Apps Script updates
        await triggerRunAllUpdates(sheetName);

        res.json({ message: 'Item updated successfully' });
    } catch (error) {
        next(error);
    }
});

// DELETE route to remove data from a specific sheet
router.delete('/:sheetName/:idColumn/:idValue', async (req, res, next) => {
    const { sheetName, idColumn, idValue } = req.params;

    try {
        const sheets = google.sheets({ version: 'v4', auth });
        const rowNumber = await findRowById(sheets, sheetName, idColumn, idValue);
        
        if (!rowNumber) {
            return res.status(404).json({ error: 'Item not found' });
        }

        // Get the sheet's metadata to find the sheet ID
        const sheetMetadata = await sheets.spreadsheets.get({
            spreadsheetId,
            ranges: [sheetName],
            includeGridData: false
        });

        const sheetId = sheetMetadata.data.sheets[0].properties.sheetId;

        // Delete the row
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: sheetId,
                            dimension: 'ROWS',
                            startIndex: rowNumber - 1,
                            endIndex: rowNumber
                        }
                    }
                }]
            }
        });

        // Trigger appropriate Google Apps Script updates
        await triggerRunAllUpdates(sheetName);

        res.json({ message: 'Item deleted successfully' });
    } catch (error) {
        next(error);
    }
});

// DELETE route for tickets specifically
router.delete('/Stock - tickets/ticket_id/:ticketId', async (req, res, next) => {
    const { ticketId } = req.params;
    const sheetName = 'Stock - tickets';

    try {
        const sheets = google.sheets({ version: 'v4', auth });
        const rowNumber = await findRowById(sheets, sheetName, 'Ticket ID', ticketId);
        
        if (!rowNumber) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        // Get the sheet's metadata to find the sheet ID
        const sheetMetadata = await sheets.spreadsheets.get({
            spreadsheetId,
            ranges: [sheetName],
            includeGridData: false
        });

        const sheetId = sheetMetadata.data.sheets[0].properties.sheetId;

        // Delete the row
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: sheetId,
                            dimension: 'ROWS',
                            startIndex: rowNumber - 1,
                            endIndex: rowNumber
                        }
                    }
                }]
            }
        });

        // Trigger Google Apps Script updates
        await triggerRunAllUpdates(sheetName);

        res.status(200).json({ message: 'Ticket successfully deleted' });
    } catch (error) {
        console.error('Error deleting ticket:', error);
        next(error);
    }
});

module.exports = router;
