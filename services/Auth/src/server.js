const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

// Load environment variables
try {
    dotenv.config({path: path.join(__dirname, '../.env')});
} catch (error) {
    console.log('No .env file found, using environment variables');
}

// Import DB connection
const connectDB = require('./config/db');

// Import routes
const userRoutes = require('./routes/userRoutes');

// Connect to database
connectDB();

const app = express();

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

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

// Cookie parser middleware
app.use(cookieParser());

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API routes
app.use('/api/auth', userRoutes);

// Health check route
app.get('/', (req, res) => res.json({
    service: 'Auth Service',
    status: 'running',
    timestamp: new Date().toISOString()
}));

// 404 Route handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error occurred:', err);
    
    // Handle multer errors
    if (err.name === 'MulterError') {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
                success: false, 
                message: 'File too large. Maximum size is 5MB.' 
            });
        }
        return res.status(400).json({ 
            success: false, 
            message: `File upload error: ${err.message}` 
        });
    }
    
    // Handle validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }
    
    // Default error response
    res.status(err.status || 500).json({ 
        success: false, 
        message: err.message || 'Internal server error' 
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Auth service running on port ${PORT}`);
});