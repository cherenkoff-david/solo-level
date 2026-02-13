const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'solo-level-secret-key-dev';

// Authenticate middleware
module.exports = (req, res, next) => {
    const token = req.header('x-auth-token');

    if (!token) {
        return res.status(401).json({ error: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Token is not valid' });
    }
};
