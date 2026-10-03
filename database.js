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

// Create base table if missing
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'student'
        )
    `);

    // Safely add any missing columns if the table was created earlier
    const columns = [
        "ALTER TABLE users ADD COLUMN gender TEXT",
        "ALTER TABLE users ADD COLUMN course TEXT",
        "ALTER TABLE users ADD COLUMN contact TEXT",
        "ALTER TABLE users ADD COLUMN id_card TEXT",
        "ALTER TABLE users ADD COLUMN diet TEXT"
    ];

    columns.forEach((query) => {
        db.run(query, (err) => {
            // Ignore error if column already exists
        });
    });
});

module.exports = db;