const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const authRoutes = require('./auth/auth');
const notificationRoutes = require('./routes/notifications');
const verifyToken = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(morgan('dev'));
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

// Public Routes
app.use('/api/auth', authRoutes);

// Protected Routes
app.use('/api/notifications', verifyToken, notificationRoutes);

// Fallback to index.html for SPA-like behavior (optional, but good for some setups)
// Or just let express.static handle it.
// Since we have specific html files, we can just rely on static serving.

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
});
