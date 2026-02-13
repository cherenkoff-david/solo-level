const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'solo-level-secret-key-dev';

// Register
router.post('/register', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const insertUser = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)');
        const result = insertUser.run(email, hashedPassword);
        const userId = result.lastInsertRowid;

        // Create default character
        const insertChar = db.prepare(`
      INSERT INTO characters (user_id, name) VALUES (?, ?)
    `);
        const name = email.split('@')[0];
        insertChar.run(userId, name);

        // Log creation
        const logEvent = db.prepare('INSERT INTO event_log (user_id, event_type, details_json) VALUES (?, ?, ?)');
        logEvent.run(userId, 'ACCOUNT_CREATED', JSON.stringify({ email }));

        const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({ token, userId });
    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(400).json({ error: 'Email already exists' });
        }
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }

    try {
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Update last active
        db.prepare('UPDATE users SET timezone = ? WHERE id = ?').run('UTC', user.id); // Placeholder for timezone update

        // Log login
        db.prepare('INSERT INTO user_activity (user_id, activity_type) VALUES (?, ?)').run(user.id, 'LOGIN');

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, userId: user.id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
