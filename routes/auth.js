const express = require('express');
const { readSheet, updateSheetRow } = require('../services/sheetsService'); // <-- we'll add updateSheetRow
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h'; // Default to 24 hours if not specified

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        // Accept only image files
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
});

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
            avatar: user.avatar,
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
                company: user.company,
                avatar: user.avatar
            }
        });
    } catch (error) {
        console.error('Login error:', error.message);
        return res.status(500).json({ error: 'Server error during login.' });
    }
});

router.post('/change-password', async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            error: 'Authentication required.',
            requiresReauth: true
        });
    }

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ 
            error: 'Current password and new password are required.' 
        });
    }

    // Enhanced password validation
    const passwordErrors = [];
    if (newPassword.length < 8) {
        passwordErrors.push('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(newPassword)) {
        passwordErrors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(newPassword)) {
        passwordErrors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(newPassword)) {
        passwordErrors.push('Password must contain at least one number');
    }
    if (passwordErrors.length > 0) {
        return res.status(400).json({ 
            error: passwordErrors.join(', ')
        });
    }

    try {
        // Verify the token and get user info
        const decoded = jwt.verify(token, JWT_SECRET);
        const users = await readSheet('Users');
        
        const userIndex = users.findIndex(u => u.user_id === decoded.user_id);
        const user = users[userIndex];

        if (!user) {
            return res.status(404).json({ 
                error: 'User not found.',
                requiresReauth: true
            });
        }

        // Verify current password
        if (user.password !== currentPassword) {
            return res.status(401).json({ 
                error: 'Current password is incorrect.' 
            });
        }

        // Prevent reusing the same password
        if (currentPassword === newPassword) {
            return res.status(400).json({ 
                error: 'New password must be different from current password.' 
            });
        }

        // Update password
        user.password = newPassword;
        
        try {
            // Write updated user back into Google Sheets
            await updateSheetRow('Users', userIndex + 2, user);

            // Create a new token with the updated user info
            const newToken = jwt.sign({
                email: user.email,
                role: user.role,
                first_name: user.first_name,
                last_name: user.last_name,
                company: user.company,
                b2b_commission: user.b2b_commission,
                user_id: user.user_id,
                avatar: user.avatar,
                iat: Math.floor(Date.now() / 1000),
                jti: `${user.user_id}-${Date.now()}`
            }, JWT_SECRET, { 
                expiresIn: JWT_EXPIRY,
                algorithm: 'HS256'
            });

            return res.status(200).json({ 
                message: 'Password changed successfully.',
                token: newToken,
                requiresReauth: false
            });
        } catch (updateError) {
            console.error('Error updating password in sheet:', updateError);
            return res.status(500).json({ 
                error: 'Failed to update password. Please try again.' 
            });
        }
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                error: 'Invalid authentication token.',
                requiresReauth: true
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                error: 'Your session has expired. Please login again.',
                requiresReauth: true
            });
        }
        console.error('Password change error:', error.message);
        return res.status(500).json({ 
            error: 'Server error during password change.' 
        });
    }
});

// Add new endpoint for avatar upload
router.post('/upload-avatar', upload.single('avatar'), async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            error: 'Authentication required.',
            requiresReauth: true
        });
    }

    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        // Verify the token and get user info
        const decoded = jwt.verify(token, JWT_SECRET);
        const users = await readSheet('Users');
        
        const userIndex = users.findIndex(u => u.user_id === decoded.user_id);
        const user = users[userIndex];

        if (!user) {
            return res.status(404).json({ 
                error: 'User not found.',
                requiresReauth: true
            });
        }

        // Delete old avatar from Cloudinary if it exists
        if (user.avatar) {
            try {
                // Extract public_id from the URL
                const publicId = user.avatar.split('/').slice(-1)[0].split('.')[0];
                await cloudinary.uploader.destroy(publicId);
            } catch (error) {
                console.log('Error deleting old avatar:', error.message);
            }
        }

        // Convert buffer to base64
        const b64 = Buffer.from(req.file.buffer).toString('base64');
        const dataURI = `data:${req.file.mimetype};base64,${b64}`;

        // Upload to Cloudinary with optimization
        const uploadResponse = await cloudinary.uploader.upload(dataURI, {
            folder: 'avatars',
            resource_type: 'auto',
            transformation: [
                { width: 200, height: 200, crop: 'fill' },
                { quality: 'auto' },
                { fetch_format: 'auto' }
            ]
        });

        // Update user's avatar field with the Cloudinary URL
        user.avatar = uploadResponse.secure_url;
        
        // Write updated user back into Google Sheets
        await updateSheetRow('Users', userIndex + 2, user);

        // Create a new token with the updated user info
        const newToken = jwt.sign({
            email: user.email,
            role: user.role,
            first_name: user.first_name,
            last_name: user.last_name,
            company: user.company,
            b2b_commission: user.b2b_commission,
            user_id: user.user_id,
            avatar: user.avatar,
            iat: Math.floor(Date.now() / 1000),
            jti: `${user.user_id}-${Date.now()}`
        }, JWT_SECRET, { 
            expiresIn: JWT_EXPIRY,
            algorithm: 'HS256'
        });

        return res.status(200).json({ 
            message: 'Avatar uploaded successfully',
            avatar: uploadResponse.secure_url,
            token: newToken
        });
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                error: 'Invalid authentication token.',
                requiresReauth: true
            });
        }
        console.error('Avatar upload error:', error.message);
        return res.status(500).json({ error: 'Server error during avatar upload' });
    }
});

module.exports = router;
