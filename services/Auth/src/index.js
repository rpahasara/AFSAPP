// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');

// ...existing code...

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// ...existing code...