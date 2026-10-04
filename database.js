const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./hostel.db');

db.serialize(() => {
    // 1. Users Table
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

    // Ensure columns exist if migrating from old database
    const columns = ['gender', 'course', 'contact', 'id_card', 'diet'];
    columns.forEach(col => {
        db.run(`ALTER TABLE users ADD COLUMN ${col} TEXT`, (err) => {});
    });

    // 2. Room Allocations Table
    db.run(`CREATE TABLE IF NOT EXISTS rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        room_number TEXT,
        block TEXT,
        status TEXT DEFAULT 'Allocated',
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // 3. Fee Management Table
    db.run(`CREATE TABLE IF NOT EXISTS fees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        amount REAL,
        status TEXT DEFAULT 'Pending',
        due_date TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // 4. Complaints & Requests Table
    db.run(`CREATE TABLE IF NOT EXISTS complaints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        category TEXT,
        description TEXT,
        status TEXT DEFAULT 'Open',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // 5. Food & Menu Management Table
    db.run(`CREATE TABLE IF NOT EXISTS menu (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        day TEXT UNIQUE,
        breakfast TEXT,
        lunch TEXT,
        dinner TEXT
    )`);

    // Populate default weekly menu if empty
    db.get(`SELECT COUNT(*) AS count FROM menu`, (err, row) => {
        if (row && row.count === 0) {
            const defaultMenu = [
                ['Monday', 'Idli & Sambar', 'Veg Meal / Chicken Curry', 'Chapati & Paneer'],
                ['Tuesday', 'Dosa & Chutney', 'Meals & Fish Fry', 'Fried Rice & Gobi Manchurian'],
                ['Wednesday', 'Puri Masala', 'Kerala Veg Meals', 'Egg Curry & Rice'],
                ['Thursday', 'Appam & Stew', 'Sambar Rice & Veggies', 'Chapati & Dal Fry'],
                ['Friday', 'Puttu & Kadala', 'Special Biryani', 'Porotta & Chicken/Veg Kurma'],
                ['Saturday', 'Upma & Banana', 'Curd Rice & Pickle', 'Noodles / Veg Pasta'],
                ['Sunday', 'Masala Dosa', 'Ghee Rice & Chicken/Paneer', 'Light Meals & Soup']
            ];
            const stmt = db.prepare(`INSERT INTO menu (day, breakfast, lunch, dinner) VALUES (?, ?, ?, ?)`);
            defaultMenu.forEach(item => stmt.run(item));
            stmt.finalize();
        }
    });

    // 6. Check-In / Check-Out Operations Table
    db.run(`CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);
});

module.exports = db;