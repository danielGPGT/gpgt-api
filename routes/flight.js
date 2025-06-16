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

module.exports = router; 