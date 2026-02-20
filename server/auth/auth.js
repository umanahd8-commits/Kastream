const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const https = require('https');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const User = require('../models/User');
const Coupon = require('../models/Coupon');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
    api_key: process.env.CLOUDINARY_API_KEY || '',
    api_secret: process.env.CLOUDINARY_API_SECRET || ''
});

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
});

const SECRET_KEY = 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2m';

const GAME_CONFIG = {
    timeLimitSeconds: Number(process.env.GAME_TIME_LIMIT_SECONDS) || 120,
    movesLimit: Number(process.env.GAME_MOVES_LIMIT) || 30,
    maxPlaysPerDay: Number(process.env.GAME_MAX_PLAYS_PER_DAY) || 2,
    rewardPerWin: Number(process.env.GAME_REWARD_PER_WIN) || 100,
    targetScore: Number(process.env.GAME_TARGET_SCORE) || 150,
    boardWidth: 8,
    candyTypes: 5
};

function getPlanConfig() {
    const namesRaw = process.env.PLAN_NAMES || '';
    const pricesRaw = process.env.PLAN_PRICES || '';
    const countRaw = process.env.PLAN_COUNT;

    const names = namesRaw
        .split(',')
        .map(value => value.trim())
        .filter(value => value.length > 0);

    const prices = pricesRaw
        .split(',')
        .map(value => value.trim())
        .filter(value => value.length > 0)
        .map(value => Number(value) || 0);

    let count = names.length;
    if (typeof countRaw === 'string' && countRaw.trim()) {
        const parsed = parseInt(countRaw, 10);
        if (parsed > 0) {
            count = Math.min(parsed, names.length, prices.length || names.length);
        }
    }

    if (!count || count < 1 || !names.length || !prices.length) {
        return [
            { id: 'starter', number: 1, name: 'Starter', price: 3000 },
            { id: 'lite', number: 2, name: 'Lite', price: 6000 },
            { id: 'pro', number: 3, name: 'Pro', price: 9000 },
            { id: 'elite', number: 4, name: 'Elite', price: 12000 }
        ];
    }

    const plans = [];
    for (let index = 0; index < count && index < names.length && index < prices.length; index++) {
        const name = names[index];
        const price = prices[index] || 0;
        let id = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        if (!id) {
            id = 'plan_' + (index + 1);
        }
        plans.push({
            id,
            number: index + 1,
            name,
            price
        });
    }

    return plans;
}

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https
            .get(url, res => {
                let data = '';
                res.on('data', chunk => {
                    data += chunk;
                });
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        resolve(parsed);
                    } catch (err) {
                        reject(err);
                    }
                });
            })
            .on('error', reject);
    });
}

async function getLagosDateInfo() {
    try {
        const data = await fetchJson('https://worldtimeapi.org/api/timezone/Africa/Lagos');
        if (!data || !data.datetime) {
            throw new Error('Invalid time data');
        }
        const date = new Date(data.datetime);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const daysInMonth = new Date(year, month, 0).getDate();
        const monthName = date.toLocaleString('en-US', { month: 'long' });
        const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return { year, month, day, daysInMonth, monthName, dateKey };
    } catch (e) {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const day = now.getDate();
        const daysInMonth = new Date(year, month, 0).getDate();
        const monthName = now.toLocaleString('en-US', { month: 'long' });
        const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return { year, month, day, daysInMonth, monthName, dateKey };
    }
}

function checkRemoteUrl(url) {
    return new Promise((resolve, reject) => {
        const req = https.request(
            url,
            {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept-Encoding': 'identity'
                }
            },
            res => {
                const status = res.statusCode || 0;
                const location = res.headers.location || '';
                res.resume();
                resolve({ status, location });
            }
        );

        req.on('error', reject);
        req.end();
    });
}

function generateGameBoard(width, typesCount) {
    const total = width * width;
    const board = [];

    for (let index = 0; index < total; index++) {
        let type;
        let safe = false;

        while (!safe) {
            type = Math.floor(Math.random() * typesCount);
            safe = true;

            const row = Math.floor(index / width);
            const col = index % width;

            if (col >= 2) {
                const left1 = board[index - 1];
                const left2 = board[index - 2];
                if (left1 === type && left2 === type) {
                    safe = false;
                }
            }

            if (!safe) continue;

            if (row >= 2) {
                const up1 = board[index - width];
                const up2 = board[index - 2 * width];
                if (up1 === type && up2 === type) {
                    safe = false;
                }
            }
        }

        board.push(type);
    }

    return board;
}

function getEnvAdminConfig() {
    const username = process.env.ADMIN_USERNAME || '';
    const password = process.env.ADMIN_PASSWORD || '';
    if (!username || !password) return null;
    return { username, password };
}

// Register Route
router.post('/register', async (req, res) => {
    try {
        const { fullName, email, username, referrer, country, password, phone, couponCode, packageType, terms } = req.body;

        // Validation
        if (!fullName || !email || !username || !password || !phone || !packageType) {
            return res.status(400).json({ message: 'Please fill in all required fields' });
        }

        if (!terms) {
            return res.status(400).json({ message: 'You must accept the Terms & Conditions' });
        }

        // Check if user exists
        const userExists = await User.findOne({ $or: [{ email }, { username }] });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const rawPrefix = process.env.USER_ID_PREFIX || 'PROTE';
        const safePrefix = String(rawPrefix || '').trim() || 'PROTE';
        const randomDigits = Math.floor(100000 + Math.random() * 900000);
        const userId = `${safePrefix}${randomDigits}`;

        const newUser = new User({
            fullName,
            email,
            username,
            userId,
            referrer,
            country,
            password: hashedPassword,
            phone,
            couponCode,
            packageType,
            referralCode: username // Use username as referral code to ensure uniqueness
        });

        await newUser.save();

        // Generate Token
        const token = jwt.sign({ id: newUser.id, username: newUser.username }, SECRET_KEY, { expiresIn: JWT_EXPIRES_IN });

        res.status(201).json({ 
            message: 'User registered successfully', 
            token,
            user: {
                id: newUser.userId || newUser.id,
                referralCode: newUser.referralCode,
                username: newUser.username,
                email: newUser.email,
                fullName: newUser.fullName,
                country: newUser.country
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Login Route
router.post('/login', async (req, res) => {
    try {
        const { loginId, password } = req.body;

        if (!loginId || !password) {
            return res.status(400).json({ message: 'Please provide ID and password' });
        }

        // Allow login with email or username
        const user = await User.findOne({ $or: [{ email: loginId }, { username: loginId }] });

        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: JWT_EXPIRES_IN });

        res.json({ 
            message: 'Login successful',  
            token,
             user: {
                id: user.userId || user.id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                packageType: user.packageType,
                referrer: user.referrer,
                balance: user.balance || 0,
                taskBalance: user.taskBalance || 0,
                availableTasks: user.availableTasks || 0,
                country: user.country
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

const verifyToken = require('../middleware/auth');

function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access only' });
    }
    next();
}

router.post('/admin/login', async (req, res) => {
    try {
        const { loginId, password } = req.body || {};

        if (!loginId || !password) {
            return res.status(400).json({ message: 'Please provide ID and password' });
        }

        const envAdmin = getEnvAdminConfig();

        if (envAdmin && loginId === envAdmin.username && password === envAdmin.password) {
            const token = jwt.sign(
                { id: 'env-admin', username: envAdmin.username, role: 'admin', envAdmin: true },
                SECRET_KEY,
                { expiresIn: JWT_EXPIRES_IN }
            );

            return res.json({
                message: 'Admin login successful',
                token,
                admin: {
                    id: 'env-admin',
                    username: envAdmin.username,
                    envAdmin: true
                }
            });
        }

        const user = await User.findOne({
            $or: [{ email: loginId }, { username: loginId }],
            role: 'admin'
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid admin credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid admin credentials' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: 'admin', envAdmin: false },
            SECRET_KEY,
            { expiresIn: JWT_EXPIRES_IN }
        );

        res.json({
            message: 'Admin login successful',
            token,
            admin: {
                id: user.userId || user.id,
                username: user.username,
                email: user.email,
                envAdmin: false
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get Current User (Protected)
router.get('/me', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            id: user.userId || user.id,
            username: user.username,
            email: user.email,
            fullName: user.fullName,
            phone: user.phone,
            packageType: user.packageType,
            referrer: user.referrer,
            balance: user.balance || 0,
            taskBalance: user.taskBalance || 0,
            availableTasks: user.availableTasks || 0,
            country: user.country,
            role: user.role || 'user',
            tiktokProfileUrl: user.tiktokProfileUrl || null,
            telegramUsername: user.telegramUsername || null,
            whatsappNumber: user.whatsappNumber || null,
            facebookProfileUrl: user.facebookProfileUrl || null,
            avatarUrl: user.avatarUrl || null
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get Dashboard Data (Protected)
router.get('/dashboard', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            username: user.username,
            fullName: user.fullName,
            packageType: user.packageType,
            country: user.country,
            balance: user.balance || 0,
            taskBalance: user.taskBalance || 0,
            availableTasks: user.availableTasks || 0,
            dailyEarnings: user.dailyEarnings || 0,
            referrer: user.referrer
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get Withdraw Data (Protected)
router.get('/withdraw-info', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            balance: user.balance || 0,
            taskBalance: user.taskBalance || 0,
            country: user.country,
            bankAccounts: user.bankAccounts || []
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/game/state', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { dateKey } = await getLagosDateInfo();

        if (user.gameLastPlayDate !== dateKey) {
            user.gameLastPlayDate = dateKey;
            user.gamePlaysToday = 0;
            user.gameTotalEarnedToday = 0;
            await user.save();
        }

        const playsToday = user.gamePlaysToday || 0;
        const playsRemaining = Math.max(0, GAME_CONFIG.maxPlaysPerDay - playsToday);

        res.json({
            dailyEarnings: user.dailyEarnings || 0,
            todayGameEarnings: user.gameTotalEarnedToday || 0,
            playsToday,
            playsRemaining,
            maxPlaysPerDay: GAME_CONFIG.maxPlaysPerDay,
            timeLimitSeconds: GAME_CONFIG.timeLimitSeconds,
            movesLimit: GAME_CONFIG.movesLimit,
            rewardPerWin: GAME_CONFIG.rewardPerWin,
            targetScore: GAME_CONFIG.targetScore
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/game/start', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { dateKey } = await getLagosDateInfo();

        if (user.gameLastPlayDate !== dateKey) {
            user.gameLastPlayDate = dateKey;
            user.gamePlaysToday = 0;
            user.gameTotalEarnedToday = 0;
        }

        const playsToday = user.gamePlaysToday || 0;
        if (playsToday >= GAME_CONFIG.maxPlaysPerDay) {
            const playsRemaining = 0;
            return res.status(400).json({
                message: 'Daily game limit reached',
                playsToday,
                playsRemaining
            });
        }

        user.gamePlaysToday = playsToday + 1;
        user.gameLastPlayDate = dateKey;
        await user.save();

        const board = generateGameBoard(GAME_CONFIG.boardWidth, GAME_CONFIG.candyTypes);
        const updatedPlaysToday = user.gamePlaysToday || 0;
        const playsRemaining = Math.max(0, GAME_CONFIG.maxPlaysPerDay - updatedPlaysToday);

        res.json({
            board,
            playsToday: updatedPlaysToday,
            playsRemaining,
            maxPlaysPerDay: GAME_CONFIG.maxPlaysPerDay,
            timeLimitSeconds: GAME_CONFIG.timeLimitSeconds,
            movesLimit: GAME_CONFIG.movesLimit,
            rewardPerWin: GAME_CONFIG.rewardPerWin,
            targetScore: GAME_CONFIG.targetScore
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/game/finish', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { dateKey } = await getLagosDateInfo();

        if (user.gameLastPlayDate !== dateKey) {
            user.gameLastPlayDate = dateKey;
            user.gamePlaysToday = 0;
            user.gameTotalEarnedToday = 0;
        }

        const rawScore = req.body && typeof req.body.score === 'number' ? req.body.score : 0;
        const score = rawScore < 0 ? 0 : rawScore;

        let win = false;
        let reward = 0;

        if (score >= GAME_CONFIG.targetScore) {
            win = true;
            reward = GAME_CONFIG.rewardPerWin;
            user.gameTotalEarnedToday = (user.gameTotalEarnedToday || 0) + reward;
            user.taskBalance = (user.taskBalance || 0) + reward;
            user.dailyEarnings = (user.dailyEarnings || 0) + reward;
            user.transactions = user.transactions || [];
            user.transactions.push({
                type: 'game',
                amount: reward,
                currency: 'NGN',
                direction: 'credit',
                source: 'game',
                description: 'Game earning'
            });
            await user.save();
        }

        const playsToday = user.gamePlaysToday || 0;
        const playsRemaining = Math.max(0, GAME_CONFIG.maxPlaysPerDay - playsToday);

        res.json({
            win,
            reward,
            targetScore: GAME_CONFIG.targetScore,
            score,
            todayGameEarnings: user.gameTotalEarnedToday || 0,
            dailyEarnings: user.dailyEarnings || 0,
            playsToday,
            playsRemaining
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/admin/overview', verifyToken, requireAdmin, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({});

        const aggregates = await User.aggregate([
            {
                $group: {
                    _id: null,
                    totalBalance: { $sum: '$balance' },
                    totalTaskBalance: { $sum: '$taskBalance' }
                }
            }
        ]);

        const agg = aggregates[0] || {};

        res.json({
            totalUsers,
            totalBalance: agg.totalBalance || 0,
            totalTaskBalance: agg.totalTaskBalance || 0
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/admin/plans', verifyToken, requireAdmin, (req, res) => {
    try {
        const plans = getPlanConfig();
        res.json({ plans });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

function generateCouponCode() {
    const segment = () => Math.random().toString(36).substring(2, 6).toUpperCase();
    return 'PROT-' + segment() + '-' + segment();
}

router.post('/admin/coupons/generate', verifyToken, requireAdmin, async (req, res) => {
    try {
        const { planId, count } = req.body || {};

        if (!planId) {
            return res.status(400).json({ message: 'planId is required' });
        }

        let total = parseInt(count, 10);
        if (!total || total < 1) total = 1;
        if (total > 500) total = 500;

        const plans = getPlanConfig();
        const plan = plans.find(p => p.id === planId);
        if (!plan) {
            return res.status(400).json({ message: 'Invalid plan' });
        }

        const coupons = [];
        for (let index = 0; index < total; index++) {
            const code = generateCouponCode();
            coupons.push({
                code,
                planId: plan.id,
                planName: plan.name,
                amount: plan.price,
                used: false
            });
        }

        const created = await Coupon.insertMany(coupons, { ordered: false });

        res.json({
            message: 'Coupons generated',
            count: created.length
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/admin/coupons', verifyToken, requireAdmin, async (req, res) => {
    try {
        const pageRaw = req.query.page;
        const limitRaw = req.query.limit;
        const searchRaw = req.query.search || '';

        let page = parseInt(pageRaw, 10);
        if (!page || page < 1) page = 1;

        let limit = parseInt(limitRaw, 10);
        if (!limit || limit < 1 || limit > 100) limit = 10;

        const search = searchRaw.trim();
        const filter = {};

        if (search) {
            const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            filter.$or = [{ code: regex }, { usedBy: regex }, { planName: regex }];
        }

        const [totalCount, coupons] = await Promise.all([
            Coupon.countDocuments(filter),
            Coupon.find(filter)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
        ]);

        const mapped = coupons.map(c => ({
            id: c.id,
            code: c.code,
            planName: c.planName,
            amount: c.amount,
            used: !!c.used,
            usedBy: c.usedBy || null,
            createdAt: c.createdAt,
            usedAt: c.usedAt
        }));

        res.json({
            totalCount,
            page,
            pageSize: limit,
            coupons: mapped
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/admin/users', verifyToken, requireAdmin, async (req, res) => {
    try {
        const pageRaw = req.query.page;
        const limitRaw = req.query.limit;
        const search = (req.query.search || '').trim();

        let page = parseInt(pageRaw, 10);
        if (!page || page < 1) page = 1;

        let limit = parseInt(limitRaw, 10);
        if (!limit || limit < 1 || limit > 100) limit = 20;

        const filter = {};

        if (search) {
            const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            filter.$or = [
                { username: regex },
                { email: regex },
                { userId: regex }
            ];
        }

        const [totalUsers, filteredCount, users] = await Promise.all([
            User.countDocuments({}),
            User.countDocuments(filter),
            User.find(filter)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
        ]);

        const mapped = users.map(u => ({
            id: u.userId || String(u._id),
            username: u.username,
            plan: u.packageType || null,
            role: u.role || 'user',
            balance: u.balance || 0
        }));

        res.json({
            totalUsers,
            filteredCount,
            page,
            pageSize: limit,
            users: mapped
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Monetization connections (Protected)
router.get('/monetization', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            tiktokProfileUrl: user.tiktokProfileUrl || null,
            telegramUsername: user.telegramUsername || null,
            whatsappNumber: user.whatsappNumber || null,
            facebookProfileUrl: user.facebookProfileUrl || null
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/streak', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { year, month, day, daysInMonth, monthName, dateKey } = await getLagosDateInfo();

        let streakCurrent = user.streakCurrent || 0;
        let streakLastCheckinDate = user.streakLastCheckinDate || null;
        let streakYear = user.streakYear;
        let streakMonth = user.streakMonth;

        if (streakYear !== year || streakMonth !== month) {
            streakCurrent = 0;
        }

        const hasCheckedInToday = streakLastCheckinDate === dateKey;

        let potentialStreak = streakCurrent;
        if (!hasCheckedInToday) {
            if (streakLastCheckinDate) {
                const current = new Date(dateKey);
                const previous = new Date(streakLastCheckinDate);
                const diffDays = Math.round((current - previous) / (1000 * 60 * 60 * 24));
                if (diffDays === 1 && streakYear === year && streakMonth === month) {
                    potentialStreak = streakCurrent + 1;
                } else {
                    potentialStreak = 1;
                }
            } else {
                potentialStreak = 1;
            }
        }

        const baseReward = 50;
        const bonusReward = 150;
        const potentialReward = potentialStreak > 0 && potentialStreak % 7 === 0 ? bonusReward : baseReward;

        res.json({
            hasCheckedInToday,
            currentStreak: streakCurrent,
            potentialStreak,
            todayPotentialReward: potentialReward,
            calendar: {
                year,
                month,
                monthName,
                dayOfMonth: day,
                daysInMonth
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/history', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const items = Array.isArray(user.transactions) ? user.transactions.slice() : [];
        items.sort((a, b) => {
            const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return db - da;
        });

        const limit = 200;
        const trimmed = items.slice(0, limit);

        res.json({
            transactions: trimmed
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/streak/checkin', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { year, month, day, daysInMonth, monthName, dateKey } = await getLagosDateInfo();

        if (user.streakLastCheckinDate === dateKey && user.streakYear === year && user.streakMonth === month) {
            return res.json({
                alreadyCheckedIn: true,
                currentStreak: user.streakCurrent || 0,
                todayReward: 0,
                hasCheckedInToday: true,
                calendar: {
                    year,
                    month,
                    monthName,
                    dayOfMonth: day,
                    daysInMonth
                },
                balance: user.balance,
                taskBalance: user.taskBalance
            });
        }

        let streakCurrent = user.streakCurrent || 0;

        if (user.streakYear !== year || user.streakMonth !== month) {
            streakCurrent = 0;
            user.streakDaysThisMonth = 0;
            user.streakTotalEarnedThisMonth = 0;
        }

        if (user.streakLastCheckinDate) {
            const current = new Date(dateKey);
            const previous = new Date(user.streakLastCheckinDate);
            const diffDays = Math.round((current - previous) / (1000 * 60 * 60 * 24));
            if (diffDays === 1 && user.streakYear === year && user.streakMonth === month) {
                streakCurrent += 1;
            } else {
                streakCurrent = 1;
            }
        } else {
            streakCurrent = 1;
        }

        const baseReward = 50;
        const bonusReward = 150;
        const todayReward = streakCurrent % 7 === 0 ? bonusReward : baseReward;

        user.streakCurrent = streakCurrent;
        user.streakLastCheckinDate = dateKey;
        user.streakYear = year;
        user.streakMonth = month;
        user.streakDaysThisMonth = (user.streakDaysThisMonth || 0) + 1;
        user.streakTotalEarnedThisMonth = (user.streakTotalEarnedThisMonth || 0) + todayReward;
        user.taskBalance = (user.taskBalance || 0) + todayReward;
        user.transactions = user.transactions || [];
        user.transactions.push({
            type: 'checkin',
            amount: todayReward,
            currency: 'NGN',
            direction: 'credit',
            source: 'streak',
            description: 'Daily check-in reward'
        });
        await user.save();

        res.json({
            alreadyCheckedIn: false,
            currentStreak: streakCurrent,
            todayReward,
            hasCheckedInToday: true,
            calendar: {
                year,
                month,
                monthName,
                dayOfMonth: day,
                daysInMonth
            },
            balance: user.balance,
            taskBalance: user.taskBalance
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/social/tiktok', verifyToken, async (req, res) => {
    try {
        const { url } = req.body;
        if (!url || typeof url !== 'string') {
            return res.status(400).json({ message: 'TikTok profile link is required' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.tiktokProfileUrl) {
            return res.json({
                message: 'TikTok profile already added',
                alreadyLinked: true,
                reward: 0,
                taskBalance: user.taskBalance || 0
            });
        }

        const { status } = await checkRemoteUrl(url);
        if (status !== 200) {
            return res.status(400).json({ message: 'TikTok profile link does not look valid', status });
        }

        user.tiktokProfileUrl = url;
        const reward = 150;
        user.taskBalance = (user.taskBalance || 0) + reward;
        user.transactions = user.transactions || [];
        user.transactions.push({
            type: 'task',
            amount: reward,
            currency: 'NGN',
            direction: 'credit',
            source: 'tiktok',
            description: 'TikTok monetization earning'
        });
        await user.save();

        res.json({
            message: 'TikTok profile added successfully',
            alreadyLinked: false,
            reward,
            taskBalance: user.taskBalance
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/social/telegram', verifyToken, async (req, res) => {
    try {
        let { username } = req.body;
        if (!username || typeof username !== 'string') {
            return res.status(400).json({ message: 'Telegram username is required' });
        }

        username = username.trim();
        if (username.startsWith('@')) {
            username = username.slice(1);
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.telegramUsername) {
            return res.json({
                message: 'Telegram username already added',
                alreadyLinked: true,
                reward: 0,
                taskBalance: user.taskBalance || 0
            });
        }

        const url = `https://t.me/${encodeURIComponent(username)}`;
        const { status } = await checkRemoteUrl(url);
        if (status !== 200) {
            return res.status(400).json({ message: 'Telegram username does not look valid', status });
        }

        user.telegramUsername = username;
        const reward = 150;
        user.taskBalance = (user.taskBalance || 0) + reward;
        user.transactions = user.transactions || [];
        user.transactions.push({
            type: 'task',
            amount: reward,
            currency: 'NGN',
            direction: 'credit',
            source: 'telegram',
            description: 'Telegram monetization earning'
        });
        await user.save();

        res.json({
            message: 'Telegram username added successfully',
            alreadyLinked: false,
            reward,
            taskBalance: user.taskBalance
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/social/whatsapp', verifyToken, async (req, res) => {
    try {
        let { phone } = req.body;
        if (!phone || typeof phone !== 'string') {
            return res.status(400).json({ message: 'WhatsApp phone number is required' });
        }

        phone = phone.trim().replace(/[^0-9]/g, '');

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.whatsappNumber) {
            return res.json({
                message: 'WhatsApp number already added',
                alreadyLinked: true,
                reward: 0,
                taskBalance: user.taskBalance || 0
            });
        }

        const url = `https://wa.me/${phone}`;
        const { status } = await checkRemoteUrl(url);
        if (status !== 200 && status !== 302) {
            return res.status(400).json({ message: 'WhatsApp number does not look valid', status });
        }

        user.whatsappNumber = phone;
        const reward = 150;
        user.taskBalance = (user.taskBalance || 0) + reward;
        user.transactions = user.transactions || [];
        user.transactions.push({
            type: 'task',
            amount: reward,
            currency: 'NGN',
            direction: 'credit',
            source: 'whatsapp',
            description: 'WhatsApp monetization earning'
        });
        await user.save();

        res.json({
            message: 'WhatsApp number added successfully',
            alreadyLinked: false,
            reward,
            taskBalance: user.taskBalance
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/social/facebook', verifyToken, async (req, res) => {
    try {
        const { url } = req.body;
        if (!url || typeof url !== 'string') {
            return res.status(400).json({ message: 'Facebook page/profile link is required' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.facebookProfileUrl) {
            return res.json({
                message: 'Facebook link already added',
                alreadyLinked: true,
                reward: 0,
                taskBalance: user.taskBalance || 0
            });
        }

        user.facebookProfileUrl = url;
        const reward = 150;
        user.taskBalance = (user.taskBalance || 0) + reward;
        user.transactions = user.transactions || [];
        user.transactions.push({
            type: 'task',
            amount: reward,
            currency: 'NGN',
            direction: 'credit',
            source: 'facebook',
            description: 'Facebook monetization earning'
        });
        await user.save();

        res.json({
            message: 'Facebook link added successfully',
            alreadyLinked: false,
            reward,
            taskBalance: user.taskBalance
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/profile/avatar', verifyToken, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        if (!req.file.mimetype || !req.file.mimetype.startsWith('image/')) {
            return res.status(400).json({ message: 'Only image uploads are allowed' });
        }

        if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
            return res.status(500).json({ message: 'Image upload service is not configured' });
        }

        const uploadResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                { folder: 'cashx_avatars' },
                (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                }
            );
            stream.end(req.file.buffer);
        });

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.avatarUrl = uploadResult.secure_url || uploadResult.url || user.avatarUrl;
        await user.save();

        res.json({
            message: 'Avatar updated',
            avatarUrl: user.avatarUrl
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Add Bank/Payment Account
router.post('/bank-accounts', verifyToken, async (req, res) => {
    try {
        const { type, bankName, accountName, accountNumber, network, walletAddress, paypalName, paypalEmail } = req.body;
        
        // Basic validation
        if (!type) {
             return res.status(400).json({ message: 'Account type is required' });
        }

        const newAccount = { type };

        if (type === 'bank') {
            if (!bankName || !accountName || !accountNumber) {
                return res.status(400).json({ message: 'All bank fields are required' });
            }
            const cleanedNumber = String(accountNumber).trim().replace(/[^0-9]/g, '');
            if (!/^[0-9]{10}$/.test(cleanedNumber)) {
                return res.status(400).json({ message: 'Account number must be 10 digits' });
            }
            newAccount.bankName = bankName.trim();
            newAccount.accountName = accountName.trim();
            newAccount.accountNumber = cleanedNumber;
        } else if (type === 'usdt') {
            if (!network || !walletAddress) {
                return res.status(400).json({ message: 'Network and wallet address are required' });
            }
            newAccount.network = network;
            newAccount.walletAddress = walletAddress;
        } else if (type === 'paypal') {
            if (!paypalName || !paypalEmail) {
                return res.status(400).json({ message: 'PayPal name and email are required' });
            }
            newAccount.paypalName = paypalName;
            newAccount.paypalEmail = paypalEmail;
        } else {
             return res.status(400).json({ message: 'Invalid account type' });
        }
        
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.bankAccounts.push(newAccount);
        await user.save();

        res.json({ message: 'Account added successfully', bankAccounts: user.bankAccounts });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete Bank Account
router.delete('/bank-accounts/:id', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.bankAccounts = user.bankAccounts.filter(acc => acc._id.toString() !== req.params.id);
        await user.save();

        res.json({ message: 'Bank account removed', bankAccounts: user.bankAccounts });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
