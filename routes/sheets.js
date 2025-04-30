const express = require('express');
const { readSheet, writeToSheet } = require('../services/sheetsService');
const { google } = require('googleapis');
const path = require('path');
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
            aquisition: 'aquisition',
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



// POST route to write data to a specific sheet
router.post('/:sheetName', async (req, res, next) => {
    const { sheetName } = req.params;
    const {
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
        package_id,
        ticket_id,
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
        payment_3_date
    } = req.body;

    // Define the field mappings (now they match exactly with the sheet headers)
    const fieldMappings = {
        booker_name: 'booker_name',
        booker_email: 'booker_email',
        booker_phone: 'booker_phone',
        booker_address: 'booker_address',
        lead_traveller_name: 'lead_traveller_name',
        lead_traveller_email: 'lead_traveller_email',
        lead_traveller_phone: 'lead_traveller_phone',
        guest_traveller_names: 'guest_traveller_names',
        booking_date: 'booking_date',
        event_id: 'event_id',
        package_id: 'package_id',
        ticket_id: 'ticket_id',
        ticket_quantity: 'ticket_quantity',
        ticket_price: 'ticket_price',
        hotel_id: 'hotel_id',
        room_id: 'room_id',
        room_quantity: 'room_quantity',
        room_price: 'room_price',
        airport_transfer_id: 'airport_transfer_id',
        airport_transfer_quantity: 'airport_transfer_quantity',
        airport_transfer_price: 'airport_transfer_price',
        circuit_transfer_id: 'circuit_transfer_id',
        circuit_transfer_quantity: 'circuit_transfer_quantity',
        circuit_transfer_price: 'circuit_transfer_price',
        flight_id: 'flight_id',
        flight_booking_reference: 'flight_booking_reference',
        ticketing_deadline: 'ticketing_deadline',
        flight_status: 'flight_status',
        flight_price: 'flight_price',
        lounge_pass_id: 'lounge_pass_id',
        lounge_pass_quantity: 'lounge_pass_quantity',
        lounge_pass_price: 'lounge_pass_price',
        payment_currency: 'payment_currency',
        payment_1: 'payment_1',
        payment_1_date: 'payment_1_date',
        payment_2: 'payment_2',
        payment_2_date: 'payment_2_date',
        payment_3: 'payment_3',
        payment_3_date: 'payment_3_date'
    };

    try {
        // First, get the headers from the sheet to ensure correct order
        const sheets = google.sheets({ version: 'v4', auth });
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetName}!1:1` // Get only the header row
        });

        const headers = response.data.values[0];
        if (!headers) {
            return res.status(400).json({ error: 'No headers found in the sheet' });
        }

        // Create an array with the same length as headers, filled with empty strings
        const rowData = new Array(headers.length).fill('');

        // Map the incoming data to the correct positions based on headers
        for (const [field, value] of Object.entries(req.body)) {
            if (fieldMappings[field]) {
                const columnIndex = headers.indexOf(fieldMappings[field]);
                if (columnIndex !== -1) {
                    rowData[columnIndex] = value;
                }
            }
        }

        // Write the data to the sheet
        await writeToSheet(sheetName, rowData);

        res.status(200).json({ message: 'Data successfully written to the sheet' });
    } catch (error) {
        console.error('Error writing to sheet:', error.message);
        next(error);
    }
});


module.exports = router;
