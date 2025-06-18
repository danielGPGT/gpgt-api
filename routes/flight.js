const express = require('express');
const router = express.Router();
const axios = require('axios');

const apiKey = process.env.FLIGHT_API_KEY;
const username = process.env.FLIGHT_API_USERNAME;
const password = process.env.FLIGHT_API_PASSWORD;

router.post('/token', async (req, res) => {
    try {
        const response = await axios({
            method: 'post',
            url: 'https://apiprod.travelinnovationgroup.com/Book/v7/Auth/Token',
            headers: {
                'Ocp-Apim-Subscription-Key': apiKey,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: new URLSearchParams({
                'grant_type': 'password',
                'Username': username,
                'Password': password
            })
        });

        res.json(response.data);
    } catch (error) {
        console.error('Error getting flight API token:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            error: 'Failed to get flight API token',
            details: error.response?.data || error.message
        });
    }
});

router.post('/search-low-fares', async (req, res) => {
    try {
        const { token, searchParams } = req.body;
        
        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }

        console.log('Making request to flight API with token:', token);
        console.log('Search params:', searchParams);

        const response = await axios({
            method: 'post',
            url: 'https://apiprod.travelinnovationgroup.com/Book/v7/api/Flight/FindLowFares',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Ocp-Apim-Subscription-Key': apiKey
            },
            data: searchParams
        });

        console.log('Flight API response:', response.data);
        res.json(response.data);
    } catch (error) {
        console.error('Error searching low fares:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            error: 'Failed to search low fares',
            details: error.response?.data || error.message
        });
    }
});

router.post('/get-flight-information', async (req, res) => {
    try {
        const { token, requestData } = req.body;
        
        if (!token) {
            console.error('Token missing in request');
            return res.status(400).json({ error: 'Token is required' });
        }

        if (!requestData) {
            console.error('Request data missing in request');
            return res.status(400).json({ error: 'Request data is required' });
        }

        // Validate required fields
        const requiredFields = ['FlightNumber', 'DepartureDateTime', 'DepartureLocation', 'ArrivalLocation'];
        const missingFields = requiredFields.filter(field => !requestData[field]);
        
        if (missingFields.length > 0) {
            console.error('Missing required fields:', missingFields);
            return res.status(400).json({ 
                error: 'Missing required fields',
                missingFields 
            });
        }

        console.log('Making request to flight API with token:', token);
        console.log('Flight information request data:', JSON.stringify(requestData, null, 2));

        const response = await axios({
            method: 'post',
            url: 'https://apiprod.travelinnovationgroup.com/Book/v7/api/Flight/GetFlightInformation',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Ocp-Apim-Subscription-Key': apiKey
            },
            data: requestData
        });

        console.log('Flight information response:', response.data);
        res.json(response.data);
    } catch (error) {
        console.error('Error getting flight information:', error.response?.data || error.message);
        console.error('Full error object:', JSON.stringify(error, null, 2));
        res.status(error.response?.status || 500).json({
            error: 'Failed to get flight information',
            details: error.response?.data || error.message
        });
    }
});

module.exports = router; 