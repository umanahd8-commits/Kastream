const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const https = require('https');
const User = require('../models/User');

const SECRET_KEY = 'your-secret-key'; // In production, use environment variable
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2m';

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

        // Generate custom userId
        const randomDigits = Math.floor(100000 + Math.random() * 900000);
        const userId = `CASHX${randomDigits}`;

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
            facebookProfileUrl: user.facebookProfileUrl || null
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

// Add Bank/Payment Account
router.post('/bank-accounts', verifyToken, async (req, res) => {
    try {
        const { type, bankName, accountName, accountNumber, network, walletAddress, paypalName, paypalEmail } = req.body;
        
        // Basic validation
        if (!type) {
             return res.status(400).json({ message: 'Account type is required' });
        }

        const newAccount = { type };

        // Type-specific validation
        if (type === 'bank') {
            if (!bankName || !accountName || !accountNumber) {
                return res.status(400).json({ message: 'All bank fields are required' });
            }
            newAccount.bankName = bankName;
            newAccount.accountName = accountName;
            newAccount.accountNumber = accountNumber;
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
