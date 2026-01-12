const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const authRoutes = require('./auth/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(morgan('dev'));
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/auth', authRoutes);

// Fallback to index.html for SPA-like behavior (optional, but good for some setups)
// Or just let express.static handle it.
// Since we have specific html files, we can just rely on static serving.

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
