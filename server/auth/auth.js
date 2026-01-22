const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, '../users/users.json');
const SECRET_KEY = 'your-secret-key'; // In production, use environment variable
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2m';

// Helper to read users
const getUsers = () => {
    if (!fs.existsSync(USERS_FILE)) {
        return [];
    }
    const data = fs.readFileSync(USERS_FILE);
    return JSON.parse(data);
};

// Helper to save users
const saveUsers = (users) => {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

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

        const users = getUsers();

        // Check if user exists
        if (users.find(u => u.email === email || u.username === username)) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = {
            id: Date.now().toString(),
            fullName,
            email,
            username,
            referrer,
            country,
            password: hashedPassword,
            phone,
            couponCode,
            packageType,
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        saveUsers(users);

        // Generate Token
        const token = jwt.sign({ id: newUser.id, username: newUser.username }, SECRET_KEY, { expiresIn: JWT_EXPIRES_IN });

        res.status(201).json({ 
            message: 'User registered successfully', 
            token,
            user: {
                id: newUser.id,
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

        const users = getUsers();
        // Allow login with email or username
        const user = users.find(u => u.email === loginId || u.username === loginId);

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
                id: user.id,
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
router.get('/me', verifyToken, (req, res) => {
    try {
        const users = getUsers();
        const user = users.find(u => u.id === req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            id: user.id,
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
router.get('/dashboard', verifyToken, (req, res) => {
    try {
        const users = getUsers();
        const user = users.find(u => u.id === req.user.id);

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
            referrer: user.referrer
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get Withdraw Data (Protected)
router.get('/withdraw-info', verifyToken, (req, res) => {
    try {
        const users = getUsers();
        const user = users.find(u => u.id === req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            balance: user.balance || 0,
            taskBalance: user.taskBalance || 0,
            country: user.country
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
