const express = require('express');
const { readSheet } = require('../services/sheetsService');
const router = express.Router();

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
            sport: 'sport',
            eventId: 'event_id',
            ticketId: 'ticket_id',
            packageId: 'package_id',
            hotelId: 'hotel_id',
            roomId: 'room_id',
            airportTransferId: 'airport_transfer_id',
            circuitTransferId: 'circuit_transfer_id',
            loungePassId: 'lounge_pass_id',
            packageType: 'package_type',
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
        "Booker Name" : booker_name,
        "Booker Email" : booker_email,
        "Booker Phone" : booker_phone,
        "Booker Address" : booker_address,
        "Lead Traveller Name" : lead_traveller_name,
        "Lead Traveller Email" : lead_traveller_email,
        "Lead Traveller Phone" : lead_traveller_phone,
        "All Travellers" : all_travellers,
        "Adults" : adults,
        "Booking Date" : booking_date,
        "Event ID" : event_id,
        "Package ID": package_id,

        "Ticket ID" : ticket_id,
        "Ticket Quantity": ticket_quantity,
        "Ticket Price" : ticket_price,

        "Hotel ID": hotel_id,
        "Room ID": room_id,
        "Room Quantity" : room_quantity,
        "Nights" : nights,
        "Hotel Room Price" : hotel_room_price,
        "Extra Night Price" : extra_night_price,

        "Circuit Transfer ID": circuit_transfer_id,
        "Circuit Transfer Quantity": circuit_transfer_quantity,

        "Airport Transfer ID": airport_transfer_id,
        "Airport Transfer Quantity": airport_transfer_quantity,

        "Outbound Flight": outbound_flight,
        "Inbound Flight": inbound_flight,
        "Flight Class" : flight_class,
        "Flight Carrier" : flight_carrier,
        "Flight PNR" : flight_pnr,
        "Ticketing Deadline" : ticketing_deadline,
        "Lounge Pass" : lounge_pass,
        "Lounge Pass Booking Reference" : lounge_pass_booking_reference,

        "Payment Currency": payment_currency,
        "Total Amount due" : total_amount_due,
    } = req.body;

    // Validate that all required fields are present
    if (
        !booking_name ||
        !booking_phone ||
        !booking_email ||
        !booking_address ||
        !ticket_name ||
        !ticket_id ||
        !sale_price ||
        !currency_code ||
        !quantity ||
        !invoice_reference
    ) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // Construct the row to write into the sheet
        const rowData = [
            booking_name,
            booking_phone,
            booking_email,
            booking_address,
            ticket_name,
            ticket_id,
            sale_price,
            currency_code,
            quantity,
            invoice_reference,
        ];

        // Write the data to the sheet
        await writeToSheet(sheetName, rowData);

        res.status(200).json({ message: 'Data successfully written to the sheet' });
    } catch (error) {
        console.error('Error writing to sheet:', error.message);
        next(error);
    }
});


module.exports = router;
