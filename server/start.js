"use strict";

const path = require("path");
// Explicitly load .env from the server directory
require("dotenv").config({ path: path.join(__dirname, '.env') });

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const fs = require("fs");
const http = require("http");
const https = require("https");
const connectDB = require('./config/db');

const authRoutes = require("./auth/auth");
const notificationRoutes = require("./routes/notifications");
const verifyToken = require("./middleware/auth");

const app = express();

// Connect to Database
connectDB();

// ACME challenges for certbot (webroot mode)
const ACME_CHALLENGE_DIR =
  process.env.ACME_CHALLENGE_DIR || "/var/www/letsencrypt/.well-known/acme-challenge";

// 1) ACME challenge MUST come first
app.use("/.well-known/acme-challenge", express.static(ACME_CHALLENGE_DIR));

// Debug endpoint
app.get("/__acme_test", (req, res) => {
  res.json({
    acmeDir: ACME_CHALLENGE_DIR,
    exists: fs.existsSync(ACME_CHALLENGE_DIR),
  });
});

// Middleware
app.use(morgan("dev"));
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "../public")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/notifications", verifyToken, notificationRoutes);

// SSL paths
const SSL_KEY = process.env.SSL_KEY || "/etc/letsencrypt/live/protege.name.ng/privkey.pem";
const SSL_CERT = process.env.SSL_CERT || "/etc/letsencrypt/live/protege.name.ng/fullchain.pem";

const DOMAIN = process.env.DOMAIN || "protege.name.ng";

function startHttpRedirect() {
  http
    .createServer((req, res) => {
      if (req.url.startsWith("/.well-known/acme-challenge/")) return app(req, res);

      const host = req.headers.host || DOMAIN;
      res.writeHead(301, { Location: `https://${host}${req.url}` });
      res.end();
    })
    .listen(80, "0.0.0.0", () => console.log("✅ HTTP listening on :80 (ACME + redirect)"));
}

function startHttps() {
  const opts = { key: fs.readFileSync(SSL_KEY), cert: fs.readFileSync(SSL_CERT) };
  https
    .createServer(opts, app)
    .listen(443, "0.0.0.0", () => console.log("✅ HTTPS listening on :443"));
}

function startDev() {
  const port = Number(process.env.PORT || 3000);
  app.listen(port, "0.0.0.0", () => console.log(`✅ DEV listening on :${port}`));
}

// Always prefer production ports on Linux; dev only if explicitly requested
if (process.platform === "win32" || process.env.FORCE_DEV === "1") {
  // Local development
  startDev();
} else {
  // Production (behind Nginx reverse proxy)
  const port = Number(process.env.PORT || 3000);
  app.listen(port, "0.0.0.0", () => {
    console.log(`✅ Production mode (proxy) listening on :${port}`);
  });
}