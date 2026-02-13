const cron = require('node-cron');
const db = require('../db');

function startDailyJob() {
    // Run every day at 00:05
    cron.schedule('5 0 * * *', () => {
        console.log('Running daily reset...');
        try {
            runDailyReset();
        } catch (e) {
            console.error('Daily reset failed:', e);
        }
    });
}

function runDailyReset() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const transaction = db.transaction(() => {
        // 1. Check Habits
        // Find all active habits that were NOT completed yesterday
        // AND were not created today (to give grace period)
        const habits = db.prepare(`
      SELECT * FROM habits 
      WHERE is_active = 1 
      AND (last_completed_date IS NULL OR last_completed_date < ?)
      AND date(created_at) <= ?
    `).all(yesterdayStr, yesterdayStr);

        habits.forEach(h => {
            // Reset streak
            db.prepare('UPDATE habits SET streak = 0 WHERE id = ?').run(h.id);

            // Apply penalty (-5 HP)
            db.prepare('UPDATE characters SET hp = MAX(1, hp - 5) WHERE user_id = ?').run(h.user_id);

            // Log penalty
            db.prepare("INSERT INTO event_log (user_id, event_type, details_json) VALUES (?, ?, ?)")
                .run(h.user_id, 'PENALTY_HABIT', JSON.stringify({ habitId: h.id, penalty: { hp: 5 } }));
        });

        // 2. Check Task Deadlines
        // Find tasks that are ACTIVE and deadline has passed
        const now = new Date().toISOString();
        const overdueTasks = db.prepare("SELECT * FROM tasks WHERE status = 'ACTIVE' AND deadline < ?").all(now);

        overdueTasks.forEach(t => {
            db.prepare("UPDATE tasks SET status = 'FAILED' WHERE id = ?").run(t.id);

            // Apply penalty (-10 HP)
            db.prepare('UPDATE characters SET hp = MAX(1, hp - 10) WHERE user_id = ?').run(t.user_id);

            db.prepare("INSERT INTO event_log (user_id, event_type, details_json) VALUES (?, ?, ?)")
                .run(t.user_id, 'PENALTY_TASK', JSON.stringify({ taskId: t.id, penalty: { hp: 10 } }));
        });

        // 3. Check Inactivity (Simplification: just log for MVP)
        // Real implementation would check user_activity table for yesterday
    });

    transaction();
}

module.exports = { startDailyJob, runDailyReset };
