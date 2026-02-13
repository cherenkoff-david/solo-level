require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const isProd = process.env.NODE_ENV === 'production';

const supabaseUrl = isProd
    ? process.env.SUPABASE_URL_PROD
    : process.env.SUPABASE_URL_LOCAL;

const supabaseKey = isProd
    ? process.env.SUPABASE_SERVICE_KEY_PROD
    : process.env.SUPABASE_SERVICE_KEY_LOCAL;

console.log(`[Supabase] Initializing client for environment: ${isProd ? 'PRODUCTION' : 'LOCAL'}`);

if (!supabaseUrl || !supabaseKey) {
    console.error(`Missing Supabase credentials for ${isProd ? 'PRODUCTION' : 'LOCAL'} environment.`);
    // We don't throw here to avoid crashing immediately during dev if not needed yet, 
    // but in production this should probably fail hard.
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
