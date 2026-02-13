const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../db'); // This is now the Supabase client

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

        // 1. Create User
        const { data: userData, error: userError } = await supabase
            .from('users')
            .insert([{ email, password_hash: hashedPassword }])
            .select()
            .single();

        if (userError) {
            if (userError.code === '23505') { // Unique violation
                return res.status(400).json({ error: 'Email already exists' });
            }
            throw userError;
        }

        const userId = userData.id;

        // 2. Create default character
        const name = email.split('@')[0];
        const { error: charError } = await supabase
            .from('characters')
            .insert([{ user_id: userId, name }]);

        if (charError) {
            // Ideally we should rollback user creation here, but for now just log
            console.error('Failed to create character:', charError);
            // In a real app we'd want a transaction or manual cleanup
        }

        // 3. Log creation
        await supabase
            .from('event_log')
            .insert([{
                user_id: userId,
                event_type: 'ACCOUNT_CREATED',
                details_json: { email }
            }]);

        const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({ token, userId });
    } catch (err) {
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
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Update last active / timezone
        // We use 'UTC' as a placeholder for now
        await supabase
            .from('users')
            .update({ timezone: 'UTC' })
            .eq('id', user.id);

        // Log login
        await supabase
            .from('user_activity')
            .insert([{ user_id: user.id, activity_type: 'LOGIN' }]);

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, userId: user.id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
