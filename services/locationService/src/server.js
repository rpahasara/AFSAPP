const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import DB connection
const connectDB = require('./config/db');

// Import models to ensure they're registered
require('./models/Location');

// Import routes
const locationRoutes = require('./routes/locationRoutes');

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors({
    origin: [
        process.env.CORS_ORIGIN || 'http://localhost:5173',
        'http://localhost:8080',
        'http://4.236.138.4',
        'https://4.236.138.4',
        'https://localhost:5173',
        'https://localhost:8080'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api/locations', locationRoutes);

// Health check route
app.get('/', (req, res) => res.json({
    service: 'Location Service',
    status: 'running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
}));

// 404 Route handler
app.use((req, res) => {
    console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ 
        success: false, 
        message: 'Route not found',
        path: req.originalUrl,
        method: req.method
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error occurred:', err);
    
    // Handle validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }
    
    // Handle MongoDB duplicate key errors
    if (err.code === 11000) {
        return res.status(400).json({
            success: false,
            message: 'Duplicate entry found'
        });
    }
    
    // Default error response
    res.status(err.status || 500).json({ 
        success: false, 
        message: err.message || 'Internal server error' 
    });
});

const PORT = process.env.PORT || 5003;
app.listen(PORT, () => {
    console.log(`✅ Location service running on port ${PORT}`);
    console.log(`🔗 Health check available at: http://localhost:${PORT}/`);
    console.log(`📍 API endpoints at: http://localhost:${PORT}/api/locations`);
});
