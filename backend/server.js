require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const forgotPasswordRoutes = require('./routes/forgot-password');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payment');
const consumerRoutes = require('./routes/consumers');
const recommendationRoutes = require('./routes/recommendations');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static frontend assets from the ../frontend directory (after repo reorganization)
// this makes the backend server act as the web server as well
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', forgotPasswordRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/consumers', consumerRoutes);
app.use('/api/recommendations', recommendationRoutes);

// simple health check endpoint (useful to verify server is up)
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Fallback to frontend/index.html for root path or handle generic frontend routing if needed
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Database Connection
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/eagri_platform';


// Connect string with error handling
mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB connection established.'))
    .catch((error) => console.error("MongoDB connection failed:", error.message));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
