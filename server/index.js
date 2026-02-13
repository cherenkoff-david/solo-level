const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes will be added here
app.use('/api/auth', require('./routes/auth'));
app.use('/api/game', require('./routes/game'));

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Cron
require('./cron/daily_reset').startDailyJob();

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
