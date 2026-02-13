const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
// const { REWARDS, PENALTIES } = require('../../shared/constants'); // If shared is available, else import local

const router = express.Router();

// Get full game state
router.get('/state', auth, (req, res) => {
    try {
        const character = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(req.user.userId);
        const tasks = db.prepare('SELECT * FROM tasks WHERE user_id = ?').all(req.user.userId);
        const habits = db.prepare('SELECT * FROM habits WHERE user_id = ?').all(req.user.userId);

        // Parse JSON fields
        if (character) {
            character.stats = JSON.parse(character.stats_json || '{}');
            character.clothing = JSON.parse(character.clothing_json || '{}');
        }
        tasks.forEach(t => {
            t.rewards = JSON.parse(t.rewards_json || '{}');
            t.penalty = JSON.parse(t.penalty_json || '{}');
            t.checklist = JSON.parse(t.checklist_json || '[]');
            t.aspects = JSON.parse(t.aspects_json || '[]');
        });

        res.json({ character, tasks, habits });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create Task
router.post('/tasks', auth, (req, res) => {
    const { title, difficulty, aspects, deadline } = req.body;
    if (!title || !difficulty) return res.status(400).json({ error: 'Title and difficulty required' });

    try {
        // Calculate rewards based on difficulty (simple logic for now)
        const rewards = { xp: 10, coins: 5 }; // Placeholder
        const penalty = { hp: 5, coins: 0 };

        const stmt = db.prepare(`
      INSERT INTO tasks (user_id, title, difficulty, rewards_json, penalty_json, aspects_json, deadline)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
        const result = stmt.run(
            req.user.userId, title, difficulty,
            JSON.stringify(rewards), JSON.stringify(penalty), JSON.stringify(aspects || []), deadline
        );

        res.status(201).json({ id: result.lastInsertRowid, ...req.body, rewards, penalty });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Complete Task
router.post('/tasks/:id/complete', auth, (req, res) => {
    try {
        const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(req.params.id, req.user.userId);
        if (!task) return res.status(404).json({ error: 'Task not found' });
        if (task.status === 'COMPLETED') return res.status(400).json({ error: 'Already completed' });

        const rewards = JSON.parse(task.rewards_json);

        db.transaction(() => {
            // Update task
            db.prepare("UPDATE tasks SET status = 'COMPLETED' WHERE id = ?").run(task.id);

            // Update character
            db.prepare("UPDATE characters SET xp = xp + ?, coins = coins + ? WHERE user_id = ?")
                .run(rewards.xp || 0, rewards.coins || 0, req.user.userId);

            // Log event
            db.prepare("INSERT INTO event_log (user_id, event_type, details_json) VALUES (?, ?, ?)")
                .run(req.user.userId, 'TASK_COMPLETE', JSON.stringify({ taskId: task.id, rewards }));
        })();

        res.json({ success: true, rewards });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create Habit
router.post('/habits', auth, (req, res) => {
    const { title, difficulty } = req.body;
    try {
        const stmt = db.prepare("INSERT INTO habits (user_id, title, difficulty) VALUES (?, ?, ?)");
        const result = stmt.run(req.user.userId, title, difficulty);
        res.status(201).json({ id: result.lastInsertRowid, title, difficulty });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Complete Habit
router.post('/habits/:id/complete', auth, (req, res) => {
    try {
        const habit = db.prepare('SELECT * FROM habits WHERE id = ? AND user_id = ?').get(req.params.id, req.user.userId);
        if (!habit) return res.status(404).json({ error: 'Habit not found' });

        const today = new Date().toISOString().split('T')[0];
        if (habit.last_completed_date === today) {
            return res.status(400).json({ error: 'Already completed today' });
        }

        db.transaction(() => {
            // Update habit
            db.prepare("UPDATE habits SET streak = streak + 1, last_completed_date = ? WHERE id = ?")
                .run(today, habit.id);

            // Give rewards (simple constant for now)
            db.prepare("UPDATE characters SET xp = xp + 10, coins = coins + 5 WHERE user_id = ?")
                .run(req.user.userId);
        })();

        res.json({ success: true, streak: habit.streak + 1 });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Heartbeat / Activity
router.post('/activity/heartbeat', auth, (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        // Check if we already logged activity today? 
        // Actually we want to log every few minutes, but maybe just update `last_active_date` in character
        db.prepare("UPDATE characters SET last_active_date = CURRENT_TIMESTAMP WHERE user_id = ?").run(req.user.userId);

        res.json({ status: 'ok' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
