require('dotenv').config();
const express = require('express');
const sheetRoutes = require('./routes/sheets');
const authRoutes = require('./routes/auth'); // <-- Add this
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(cors({
    origin: ['http://localhost:5173', 'https://glowing-sundae-f3e045.netlify.app', 'https://portal.grandprixgrandtours.com/'],
    credentials: true
}));

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
