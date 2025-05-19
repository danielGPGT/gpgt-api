require('dotenv').config();
const express = require('express');
const sheetRoutes = require('./routes/sheets');
const authRoutes = require('./routes/auth'); // <-- Add this
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['http://localhost:5173'];

app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(helmet({
    crossOriginResourcePolicy: false
}));
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.use('/api/v1', authRoutes); // <-- Mount auth first
app.use('/api/v1', sheetRoutes); // <-- Mount sheets after

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
