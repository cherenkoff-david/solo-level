const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// FORCE Polyfill fetch to avoid WebAssembly OOM on small servers
const fetch = require('node-fetch');
global.fetch = fetch;
global.Headers = fetch.Headers;
global.Request = fetch.Request;
global.Response = fetch.Response;

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/game', require('./routes/game'));

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Cron Jobs
require('./cron/daily_reset').startDailyJob();

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
