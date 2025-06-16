require('dotenv').config();
const express = require('express');
const sheetRoutes = require('./routes/sheets');
const authRoutes = require('./routes/auth');
const notificationRoutes = require('./routes/notifications');
const flightRoutes = require('./routes/flight');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const { apiKeyAuth } = require('./middleware/apiKeyAuth');
const jwtAuth = require('./middleware/jwtAuth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(cors({
    origin: ['http://localhost:5173', 'https://glowing-sundae-f3e045.netlify.app', 'https://portal.grandprixgrandtours.com'],
    credentials: true
}));

// Public routes (no auth required)
app.use('/api/v1/login', authRoutes);
app.use('/api/v1/flight', flightRoutes);

// Protected routes (require API key)
app.use('/api/v1', apiKeyAuth(), authRoutes); // Apply API key auth to auth routes
app.use('/api/v1', apiKeyAuth(), sheetRoutes); // Apply API key auth to sheet routes

// Notifications routes (require both API key and JWT)
app.use('/api/v1/notifications', apiKeyAuth(), jwtAuth(), notificationRoutes);

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
