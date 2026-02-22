const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const fs = require('fs');
const http = require('http');
const https = require('https');
const connectDB = require('./config/db');

const authRoutes = require('./auth/auth');
const notificationRoutes = require('./routes/notifications');
const verifyToken = require('./middleware/auth');

const app = express();

// Connect to Database
connectDB();

// ACME webroot (matches certbot config)
app.use(
    "/.well-known/acme-challenge",
    express.static("/var/www/letsencrypt")
);

// Middleware
app.use(morgan('dev'));
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

// Public Routes
app.use('/api/auth', authRoutes);

// Protected Routes
app.use('/api/notifications', verifyToken, notificationRoutes);

const DOMAIN = process.env.DOMAIN || "protege.name.ng";

// HTTPS certs paths
const SSL_KEY = "/etc/letsencrypt/live/protege.name.ng/privkey.pem";
const SSL_CERT = "/etc/letsencrypt/live/protege.name.ng/fullchain.pem";

// Check if we are in Local Development (Windows) or Production (Linux/EC2)
if (process.platform === 'win32') {
    // Local Development Fallback
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Development Server is running on http://0.0.0.0:${PORT}`);
    });
} else {
    // Production/EC2 Mode

    // Always start HTTP server (needed for certbot renew)
    http.createServer((req, res) => {
        if (req.url.startsWith("/.well-known/acme-challenge/")) return app(req, res);
        const host = req.headers.host || DOMAIN;
        res.writeHead(301, { Location: `https://${host}${req.url}` });
        res.end();
    }).listen(80, "0.0.0.0", () => console.log("HTTP Server running on port 80"));

    // Start HTTPS only if certs exist/readable
    if (fs.existsSync(SSL_KEY) && fs.existsSync(SSL_CERT)) {
        https.createServer(
            { key: fs.readFileSync(SSL_KEY), cert: fs.readFileSync(SSL_CERT) },
            app
        ).listen(443, "0.0.0.0", () => console.log("HTTPS Server running on port 443"));
    } else {
        console.log("SSL certs not found/readable; HTTPS not started yet.");
    }
}
