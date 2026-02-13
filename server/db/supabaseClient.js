require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_KEY environment variables');
    // We don't throw here to avoid crashing immediately during dev if not needed yet, 
    // but in production this should probably fail hard.
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
