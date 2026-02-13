const express = require('express');
const supabase = require('../db'); // Supabase client
const auth = require('../middleware/auth');

const router = express.Router();

// Get full game state
router.get('/state', auth, async (req, res) => {
    try {
        const userId = req.user.userId;

        const { data: character, error: charError } = await supabase
            .from('characters')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (charError) throw charError;

        const { data: tasks, error: taskError } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', userId);

        if (taskError) throw taskError;

        const { data: habits, error: habitError } = await supabase
            .from('habits')
            .select('*')
            .eq('user_id', userId);

        if (habitError) throw habitError;

        // JSON fields are automatically parsed by Supabase/Postgres JSONB
        // So we don't need manual JSON.parse here if the schema uses JSONB.
        // And we made sure schema_pg.sql uses JSONB.
        // We might want to restructure the response to match frontend expectations if needed
        // But frontend expects object with parsed properties, which they are now.

        // Compatibility mapping if needed:
        // character.clothing = character.clothing_json ...
        // Checks:
        if (character) {
            character.stats = character.stats_json || {};
            character.clothing = character.clothing_json || {};
            // Remove _json fields if frontend doesn't expect them?
            // Frontend might expect `stats` not `stats_json`.
            // In SQLite code: character.stats = JSON.parse(...)
            // So we need to ensure response has `stats`.
            // Postgres `stats_json` column. Supabase returns `stats_json`.
            // We should map it.
        }

        tasks.forEach(t => {
            t.rewards = t.rewards_json || {};
            t.penalty = t.penalty_json || {};
            t.checklist = t.checklist_json || [];
            t.aspects = t.aspects_json || [];
        });

        res.json({ character, tasks, habits });
    } catch (err) {
        console.error('State Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create Task
router.post('/tasks', auth, async (req, res) => {
    const { title, difficulty, aspects, deadline } = req.body;
    if (!title || !difficulty) return res.status(400).json({ error: 'Title and difficulty required' });

    try {
        // Calculate rewards
        const rewards = { xp: 10, coins: 5 }; // Placeholder
        const penalty = { hp: 5, coins: 0 };

        const { data: newTask, error } = await supabase
            .from('tasks')
            .insert([{
                user_id: req.user.userId,
                title,
                difficulty,
                rewards_json: rewards,
                penalty_json: penalty,
                aspects_json: aspects || [],
                deadline
            }])
            .select()
            .single();

        if (error) throw error;

        // Map back for frontend
        newTask.rewards = newTask.rewards_json;
        newTask.penalty = newTask.penalty_json;

        res.status(201).json(newTask);
    } catch (err) {
        console.error('Create Task Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Complete Task
router.post('/tasks/:id/complete', auth, async (req, res) => {
    try {
        const userId = req.user.userId;
        const taskId = req.params.id;

        // 1. Fetch task
        const { data: task, error: fetchError } = await supabase
            .from('tasks')
            .select('*')
            .eq('id', taskId)
            .eq('user_id', userId)
            .single();

        if (fetchError || !task) return res.status(404).json({ error: 'Task not found' });
        if (task.status === 'COMPLETED') return res.status(400).json({ error: 'Already completed' });

        const rewards = task.rewards_json || {};

        // 2. Update task status
        const { error: updateError } = await supabase
            .from('tasks')
            .update({ status: 'COMPLETED' })
            .eq('id', taskId);

        if (updateError) throw updateError;

        // 3. Update character (Fetch -> Calculate -> Update)
        const { data: char, error: charFetchError } = await supabase
            .from('characters')
            .select('xp, coins')
            .eq('user_id', userId)
            .single();

        if (charFetchError) throw charFetchError;

        const { error: charUpdateError } = await supabase
            .from('characters')
            .update({
                xp: (char.xp || 0) + (rewards.xp || 0),
                coins: (char.coins || 0) + (rewards.coins || 0)
            })
            .eq('user_id', userId);

        if (charUpdateError) throw charUpdateError;

        // 4. Log event
        await supabase
            .from('event_log')
            .insert([{
                user_id: userId,
                event_type: 'TASK_COMPLETE',
                details_json: { taskId: task.id, rewards }
            }]);

        res.json({ success: true, rewards });
    } catch (err) {
        console.error('Complete Task Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create Habit
router.post('/habits', auth, async (req, res) => {
    const { title, difficulty } = req.body;
    try {
        const { data: newHabit, error } = await supabase
            .from('habits')
            .insert([{
                user_id: req.user.userId,
                title,
                difficulty
            }])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json(newHabit);
    } catch (err) {
        console.error('Create Habit Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Complete Habit
router.post('/habits/:id/complete', auth, async (req, res) => {
    try {
        const userId = req.user.userId;
        const habitId = req.params.id;

        const { data: habit, error: fetchError } = await supabase
            .from('habits')
            .select('*')
            .eq('id', habitId)
            .eq('user_id', userId)
            .single();

        if (fetchError || !habit) return res.status(404).json({ error: 'Habit not found' });

        const today = new Date().toISOString().split('T')[0];
        if (habit.last_completed_date === today) {
            return res.status(400).json({ error: 'Already completed today' });
        }

        // Update habit
        const { error: updateError } = await supabase
            .from('habits')
            .update({
                streak: (habit.streak || 0) + 1,
                last_completed_date: today
            })
            .eq('id', habitId);

        if (updateError) throw updateError;

        // Update character rewards
        const { data: char, error: charFetchError } = await supabase
            .from('characters')
            .select('xp, coins')
            .eq('user_id', userId)
            .single();

        if (charFetchError) throw charFetchError;

        await supabase
            .from('characters')
            .update({
                xp: (char.xp || 0) + 10,
                coins: (char.coins || 0) + 5
            })
            .eq('user_id', userId);

        res.json({ success: true, streak: (habit.streak || 0) + 1 });
    } catch (err) {
        console.error('Complete Habit Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Heartbeat / Activity
router.post('/activity/heartbeat', auth, async (req, res) => {
    try {
        // Update last_active_date
        const { error } = await supabase
            .from('characters')
            .update({ last_active_date: new Date().toISOString() })
            .eq('user_id', req.user.userId);

        if (error) throw error;

        res.json({ status: 'ok' });
    } catch (err) {
        console.error('Heartbeat Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
