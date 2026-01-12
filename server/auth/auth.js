const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, '../users/users.json');
const SECRET_KEY = 'your-secret-key'; // In production, use environment variable

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
        const token = jwt.sign({ id: newUser.id, username: newUser.username }, SECRET_KEY, { expiresIn: '1h' });

        res.status(201).json({ 
            message: 'User registered successfully', 
            token,
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                fullName: newUser.fullName
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

        const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '1h' });

        res.json({ 
            message: 'Login successful', 
            token,
             user: {
                id: user.id,
                username: user.username,
                email: user.email,
                fullName: user.fullName
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
