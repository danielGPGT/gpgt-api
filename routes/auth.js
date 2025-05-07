const express = require('express');
const { readSheet, updateSheetRow } = require('../services/sheetsService'); // <-- we'll add updateSheetRow
const jwt = require('jsonwebtoken');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '1h'; // Default to 24 hours if not specified

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {
        const users = await readSheet('Users'); // Read users sheet

        const userIndex = users.findIndex(u => u.email && u.email.toLowerCase() === email.toLowerCase());
        const user = users[userIndex];

        if (!user || user.password !== password) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // Update login_count and last_login
        const loginCount = (parseInt(user.login_count) || 0) + 1;
        const ukTime = new Date().toLocaleString('en-GB', {
            timeZone: 'Europe/London',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false // Use 24-hour format
        });
        
        // ukTime will look like: "17/04/2025, 15:23"
        
        // Reformat to match your clean format "YYYY-MM-DD HH:mm"
        const [date, time] = ukTime.split(', ');
        const [day, month, year] = date.split('/');
        
        const lastLogin = `${year}-${month}-${day} ${time}`;
        

        user.login_count = loginCount;
        user.last_login = lastLogin;

        // Write updated user back into Google Sheets
        await updateSheetRow('Users', userIndex + 2, user); // Row numbers in Sheets are 1-indexed (+ header)

        // Create JWT with expiry and additional security claims
        const token = jwt.sign({
            email: user.email,
            role: user.role,
            first_name: user.first_name,
            last_name: user.last_name,
            company: user.company,
            b2b_commission: user.b2b_commission,
            user_id: user.user_id,
            iat: Math.floor(Date.now() / 1000), // Issued at time
            jti: `${user.user_id}-${Date.now()}` // Unique token ID
        }, JWT_SECRET, { 
            expiresIn: JWT_EXPIRY,
            algorithm: 'HS256' // Explicitly specify the algorithm
        });

        // Calculate token expiry time
        const decodedToken = jwt.decode(token);
        const expiresAt = new Date(decodedToken.exp * 1000);

        return res.status(200).json({ 
            token,
            expiresAt: expiresAt.toISOString(),
            user: {
                email: user.email,
                role: user.role,
                first_name: user.first_name,
                last_name: user.last_name,
                company: user.company
            }
        });
    } catch (error) {
        console.error('Login error:', error.message);
        return res.status(500).json({ error: 'Server error during login.' });
    }
});

module.exports = router;
