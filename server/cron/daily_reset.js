const cron = require('node-cron');
const supabase = require('../db');

function startDailyJob() {
    // Run every day at 00:05
    cron.schedule('5 0 * * *', async () => {
        console.log('Running daily reset...');
        try {
            await runDailyReset();
        } catch (e) {
            console.error('Daily reset failed:', e);
        }
    });
}

async function runDailyReset() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Note: Supabase/Postgres logic for 'date' comparison might differ slightly from SQLite strings
    // But since we use ISO strings (YYYY-MM-DD) for dates, string comparison should still work for standard columns.
    // However, `details_json` is JSONB now.

    // 1. Check Habits
    // Find all active habits that were NOT completed yesterday (or at all)
    // AND were created on or before yesterday

    // Supabase doesn't support complex OR logic like (A OR B) easily in one filter string without raw PostgREST.
    // .or('last_completed_date.is.null,last_completed_date.lt.' + yesterdayStr)

    const { data: habits, error: habitsError } = await supabase
        .from('habits')
        .select('*')
        .eq('is_active', true)
        .or(`last_completed_date.is.null,last_completed_date.lt.${yesterdayStr}`)
        .lte('created_at', yesterday.toISOString()); // created_at is timestamp

    if (habitsError) {
        console.error('Error fetching habits for reset:', habitsError);
        return;
    }

    if (habits) {
        for (const h of habits) {
            // Reset streak
            await supabase
                .from('habits')
                .update({ streak: 0 })
                .eq('id', h.id);

            // Fetch character to apply penalty
            const { data: char } = await supabase
                .from('characters')
                .select('hp')
                .eq('user_id', h.user_id)
                .single();

            if (char) {
                const newHp = Math.max(1, char.hp - 5);
                await supabase
                    .from('characters')
                    .update({ hp: newHp })
                    .eq('user_id', h.user_id);
            }

            // Log penalty
            await supabase
                .from('event_log')
                .insert([{
                    user_id: h.user_id,
                    event_type: 'PENALTY_HABIT',
                    details_json: { habitId: h.id, penalty: { hp: 5 } }
                }]);
        }
    }

    // 2. Check Task Deadlines
    const now = new Date().toISOString();
    const { data: overdueTasks, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('status', 'ACTIVE')
        .lt('deadline', now);

    if (taskError) {
        console.error('Error fetching overdue tasks:', taskError);
        return;
    }

    if (overdueTasks) {
        for (const t of overdueTasks) {
            await supabase
                .from('tasks')
                .update({ status: 'FAILED' })
                .eq('id', t.id);

            // Fetch character
            const { data: char } = await supabase
                .from('characters')
                .select('hp')
                .eq('user_id', t.user_id)
                .single();

            if (char) {
                const newHp = Math.max(1, char.hp - 10);
                await supabase
                    .from('characters')
                    .update({ hp: newHp })
                    .eq('user_id', t.user_id);
            }

            await supabase
                .from('event_log')
                .insert([{
                    user_id: t.user_id,
                    event_type: 'PENALTY_TASK',
                    details_json: { taskId: t.id, penalty: { hp: 10 } }
                }]);
        }
    }
}

module.exports = { startDailyJob, runDailyReset };
