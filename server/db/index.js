const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, 'game.db');
const db = new Database(dbPath); // , { verbose: console.log }

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Initialize schema
const schemaPath = path.resolve(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');
db.exec(schema);

module.exports = db;
