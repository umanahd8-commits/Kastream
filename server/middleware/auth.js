const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key'; // In production, use environment variable
const User = require('../models/User');

const verifyToken = async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;
        
        console.log('Token verified for user:', decoded.username, 'expires at:', new Date(decoded.exp * 1000));

        // Session validation (Single Session Enforcement)
        if (decoded.sessionToken) {
            const user = await User.findById(decoded.id);
            if (!user || user.sessionToken !== decoded.sessionToken) {
                return res.status(401).json({ message: 'Session expired. Another login detected.' });
            }
        } else if (decoded.id !== 'env-admin') {
             // If no session token and not env-admin, might be an old token
             return res.status(401).json({ message: 'Invalid session. Please login again.' });
        }
        
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid token or session expired.' });
    }
};

module.exports = verifyToken;