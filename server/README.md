# Server Layout and Configuration

## Overview

- Tech stack: Node.js, Express, MongoDB (Mongoose).
- Purpose: authentication, admin dashboard APIs, notifications, coupons, and game logic.
- Static files are served from `../public` (the web UI, including admin pages).

Two entrypoints exist:

- `start.js`: production-oriented launcher with HTTP→HTTPS redirect and configurable ACME directory.
- `index.js`: earlier launcher with similar behavior; prefer `start.js` for new setups.

Both entrypoints load `.env` from the `server` directory:

- Path: `server/.env`
- Loader: `require('dotenv').config({ path: path.join(__dirname, '.env') })`

## Directory Structure

- `auth/auth.js`
  - Main API router mounted at `/api/auth`.
  - Handles:
    - User registration and login.
    - Admin login and admin-only endpoints.
    - Coupon generation and listing.
    - Game endpoints (plays per day, rewards).
    - Social/engagement endpoints (TikTok, WhatsApp, Telegram, Facebook).
    - Profile avatar upload via Cloudinary.
- `middleware/auth.js`
  - JWT verification middleware used as `verifyToken`.
  - Sets `req.user` on success and returns HTTP 401 or 400 on auth failure.
- `config/db.js`
  - Connects to MongoDB using `MONGO_URI`.
- `models/User.js`
  - Mongoose schema for users (auth, balances, plans, tasks, game stats, profile, bank accounts, transactions).
- `models/Coupon.js`
  - Mongoose schema for coupons (admin-generated signup coupons).
- `routes/notifications.js`
  - Notification endpoints mounted at `/api/notifications` and protected by `verifyToken`.
- `users/users.json`
  - Legacy/static user store; replaced by MongoDB for live use.

## Core Environment Variables

All env variables are read from `server/.env`. Only the most important keys are listed here.

### Database

- `MONGO_URI` (required)
  - MongoDB connection string.
  - Example: `mongodb+srv://user:pass@cluster.mongodb.net/dbname`

### HTTP / HTTPS / Domain

- `PORT`
  - Port for dev mode when running on Windows.
  - Default: `3000`.
- `DOMAIN`
  - Public domain for redirects in production.
  - Default: `protege.name.ng`.
- `SSL_KEY`
  - Path to TLS private key file (used by `start.js`).
  - Default: `/etc/letsencrypt/live/protege.name.ng/privkey.pem`.
- `SSL_CERT`
  - Path to TLS certificate chain file (used by `start.js`).
  - Default: `/etc/letsencrypt/live/protege.name.ng/fullchain.pem`.
- `ACME_CHALLENGE_DIR`
  - Directory for Certbot HTTP-01 ACME challenges.
  - Default: `/var/www/letsencrypt/.well-known/acme-challenge`.
- `FORCE_DEV`
  - If set to `"1"`, `start.js` runs in dev mode even on Linux (skips HTTPS).

### JWT and Auth

- `JWT_EXPIRES_IN`
  - Token lifetime for user JWTs.
  - Default: `'2m'` (2 minutes).
  - Format: anything accepted by `jsonwebtoken` (e.g. `15m`, `1h`, `7d`).
- `ADMIN_USERNAME`
  - Optional environment admin username.
  - If provided together with `ADMIN_PASSWORD`, enables login for an env-configured admin account.
- `ADMIN_PASSWORD`
  - Password for the env-configured admin account.

> Note: `SECRET_KEY` for JWT signing is currently hardcoded in code. For production, you should move this to an env var and keep it secret.

### User IDs and Plans

- `USER_ID_PREFIX`
  - Prefix for generated `userId` values.
  - Default: `PROTE`.
  - When a user registers, the server generates: `userId = USER_ID_PREFIX + <6 random digits>`.

- `PLAN_COUNT`
  - Number of subscription plans available.
  - Used to parse plan arrays and clamp their length.
  - Example: `PLAN_COUNT=4`.

- `PLAN_NAMES`
  - Comma-separated list of plan names.
  - Used for both user plans and coupon generation.
  - Example:
    - `PLAN_NAMES=STARTER,LITE,PRO,ELITE`

- `PLAN_PRICES`
  - Comma-separated list of plan prices (in NGN).
  - Must align with `PLAN_NAMES` by index.
  - Example:
    - `PLAN_PRICES=3000,6000,9000,12000 #currency in nira`

Plan parsing rules:

- Names and prices are split on commas and trimmed.
- `PLAN_COUNT` limits how many entries are used, but cannot exceed the available names/prices.
- Each plan becomes:
  - `id`:
    - Derived from the name, lowercased and normalized:
    - Non-alphanumeric characters → `_`, leading/trailing `_` removed.
    - Fallback `plan_<index>` if the name does not yield a usable id.
  - `number`:
    - 1-based plan index.
  - `name`:
    - Raw plan name from `PLAN_NAMES`.
  - `price`:
    - Numeric price from `PLAN_PRICES`, invalid values become `0`.
- If configuration is invalid (no names or no prices), a safe default set of 4 plans is used:
  - Starter (₦3,000), Lite (₦6,000), Pro (₦9,000), Elite (₦12,000).

These plans are exposed via:

- `GET /api/auth/admin/plans`
  - Used by the admin Coupons page to populate the plan dropdown.

### Game Configuration

All values have sensible defaults if not provided.

- `GAME_TIME_LIMIT_SECONDS`
  - Per-game time limit in seconds.
  - Default: `120`.
- `GAME_MOVES_LIMIT`
  - Maximum moves per game.
  - Default: `30`.
- `GAME_MAX_PLAYS_PER_DAY`
  - Max number of games a user can play per day.
  - Default: `2`.
- `GAME_REWARD_PER_WIN`
  - Reward amount added to `taskBalance` on each win.
  - Default: `100`.
- `GAME_TARGET_SCORE`
  - Score threshold needed to consider a game a win.
  - Default: `150`.

### Cloudinary (Avatar Upload)

User avatars are uploaded to Cloudinary using these env vars:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

If any of these are missing, avatar upload endpoints return a 500 error indicating that image upload service is not configured.

### Other External APIs

The server uses a world time API to derive Lagos time if available:

- Endpoint: `https://worldtimeapi.org/api/timezone/Africa/Lagos`
- If this call fails, it falls back to local server time.

There are no special env variables required for this; it is purely external.

## Admin Endpoints and Session Handling

Admin endpoints live under `/api/auth/admin/*` and are protected by:

- `verifyToken` (JWT authentication).
- `requireAdmin` (role check).

Key admin routes:

- `POST /api/auth/admin/login`
  - Admin login; returns `token` and `admin` info on success.
- `GET /api/auth/admin/overview`
  - Returns high-level stats (`totalUsers`, total balances).
- `GET /api/auth/admin/users`
  - Paged user listing with search.
- `GET /api/auth/admin/plans`
  - Returns env-driven plan configuration.
- `POST /api/auth/admin/coupons/generate`
  - Generates coupons for a selected plan.
- `GET /api/auth/admin/coupons`
  - Paged coupon listing with search.

Session expiry / invalid token semantics:

- If the `Authorization` header is missing:
  - `verifyToken` returns HTTP 401.
- If the JWT is invalid or expired:
  - `verifyToken` returns HTTP 400 with `{ message: 'Invalid token.' }`.
- The admin frontend treats HTTP 400, 401, and 403 from admin endpoints as:
  - Session expired → log out and redirect to the admin login page.

## Coupons System

Coupons are stored via `models/Coupon.js` and managed by admin endpoints.

- Each coupon contains:
  - `code`: unique coupon code.
  - `planId`: derived from the env-driven plan id.
  - `planName`: plan name as configured in env.
  - `amount`: plan price at generation time.
  - `used`: boolean flag indicating if it has been redeemed.
  - `usedBy`: username of the user who redeemed it (to be set during signup flow).
  - `usedAt`: timestamp when the coupon was used.
  - `createdAt` / `updatedAt`: managed by Mongoose timestamps.

Admin UX:

- Retrieves plans from `/api/auth/admin/plans`.
- Generates coupons tied to the selected plan via `/api/auth/admin/coupons/generate`.
- Lists and searches coupons via `/api/auth/admin/coupons`.

## Notifications Routes

Mounted at `/api/notifications`, protected by `verifyToken`.

- Intended to deliver user-specific notifications to authenticated clients.

## Summary of Required Env for a Minimal Setup

At minimum you should configure:

- `MONGO_URI`
- `USER_ID_PREFIX` (optional but recommended; defaults to `PROTE`)
- `PLAN_COUNT`, `PLAN_NAMES`, `PLAN_PRICES`
- `JWT_EXPIRES_IN` (short-lived tokens in production)
- `ADMIN_USERNAME`, `ADMIN_PASSWORD` (for admin access)
- `DOMAIN`, `PORT` (depending on environment)

For avatars, add:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

For HTTPS in production, ensure:

- `SSL_KEY`
- `SSL_CERT`

## Example `.env`

Below is a sample `.env` containing all the important configuration keys.  
Copy this into `server/.env` and fill in the values marked with placeholders.

```env
# --- Database ---
MONGO_URI=mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/DATABASE

# --- HTTP / HTTPS / Domain ---
PORT=3000
DOMAIN=protege.name.ng
SSL_KEY=/etc/letsencrypt/live/protege.name.ng/privkey.pem
SSL_CERT=/etc/letsencrypt/live/protege.name.ng/fullchain.pem
ACME_CHALLENGE_DIR=/var/www/letsencrypt/.well-known/acme-challenge
# Force dev-style single HTTP server even on Linux (optional)
FORCE_DEV=1

# --- JWT / Auth ---
# Example: 15m, 1h, 7d etc.
JWT_EXPIRES_IN=2m
ADMIN_USERNAME=your-admin-username
ADMIN_PASSWORD=your-admin-password

# --- User IDs and Plans ---
USER_ID_PREFIX=PROTE
PLAN_COUNT=4
PLAN_NAMES=STARTER,LITE,PRO,ELITE
PLAN_PRICES=3000,6000,9000,12000

# --- Game Configuration ---
GAME_TIME_LIMIT_SECONDS=120
GAME_MOVES_LIMIT=30
GAME_MAX_PLAYS_PER_DAY=2
GAME_REWARD_PER_WIN=100
GAME_TARGET_SCORE=150

# --- Cloudinary (Avatar Upload) ---
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```
