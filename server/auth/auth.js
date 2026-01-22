const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const SECRET_KEY = 'your-secret-key'; // In production, use environment variable
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2m';

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
            role: user.role || 'user'
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
