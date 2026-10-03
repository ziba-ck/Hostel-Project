const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'hostel.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database.');
    }
});

db.serialize(() => {
    // Create users table if missing
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'student',
            gender TEXT,
            course TEXT,
            contact TEXT,
            id_card TEXT,
            diet TEXT
        )
    `);

    // Safely add missing columns if an old table exists
    const cols = ['gender', 'course', 'contact', 'id_card', 'diet'];
    cols.forEach(col => {
        db.run(`ALTER TABLE users ADD COLUMN ${col} TEXT`, () => {
            // Ignore error if column already exists
        });
    });
});

module.exports = db;