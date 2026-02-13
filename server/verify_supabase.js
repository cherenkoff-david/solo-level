require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY; // Using anon key

console.log('Testing connection to:', supabaseUrl);
console.log('Using key length:', supabaseKey ? supabaseKey.length : 0);

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    try {
        // Try to selecting from a system table or just users if exists
        // We don't know if users table exists yet if they haven't run migration
        // But we can try to get auth settings or something simple?
        // Let's try to just select from 'users' and catch error
        const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });

        if (error) {
            console.error('Connection Error:', error.message);
            console.error('Details:', error);
        } else {
            console.log('Connection Successful! users count:', data);
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

testConnection();
