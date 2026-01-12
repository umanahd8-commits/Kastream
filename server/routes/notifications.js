const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Mock Notifications Data
const notifications = [
    {
        id: 1,
        type: 'general',
        message: 'Welcome to CASHX! Start earning today.',
        date: new Date().toISOString()
    },
    {
        id: 2,
        type: 'general',
        message: 'Maintenance scheduled for Sunday at 2 AM.',
        date: new Date().toISOString()
    }
];

// Get Notifications
router.get('/', (req, res) => {
    // In a real app, you would fetch user-specific notifications from a DB
    // For now, we return the mock general notifications plus a personalized one
    const userNotifications = [
        ...notifications,
        {
            id: 3,
            type: 'personal',
            message: `Hello ${req.user.username}, don't forget to complete your daily tasks!`,
            date: new Date().toISOString()
        }
    ];

    // Sort by date desc
    userNotifications.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(userNotifications);
});

module.exports = router;