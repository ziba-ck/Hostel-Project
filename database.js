const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./hostel.db');

db.serialize(() => {
    // 1. Users & Profiles (Student / Admin / Staff)
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT UNIQUE,
        password TEXT,
        role TEXT DEFAULT 'student',
        gender TEXT,
        course TEXT,
        contact TEXT,
        id_card TEXT,
        diet TEXT
    )`);

    // 2. Room Allocations
    db.run(`CREATE TABLE IF NOT EXISTS rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        room_number TEXT,
        block TEXT,
        status TEXT DEFAULT 'Allocated',
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // 3. Fee Management
    db.run(`CREATE TABLE IF NOT EXISTS fees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        amount REAL,
        status TEXT DEFAULT 'Pending',
        due_date TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // 4. Complaints & Requests
    db.run(`CREATE TABLE IF NOT EXISTS complaints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        category TEXT,
        description TEXT,
        status TEXT DEFAULT 'Open',
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // 5. Food & Menu Management
    db.run(`CREATE TABLE IF NOT EXISTS menu (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        day TEXT,
        breakfast TEXT,
        lunch TEXT,
        dinner TEXT
    )`);

    // 6. Check-In / Check-Out Operations
    db.run(`CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);
});

module.exports = db;