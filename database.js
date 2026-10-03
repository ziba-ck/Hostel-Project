const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./hostel.db');

db.serialize(() => {
    // 1. Student & Staff Profiles (Encapsulation / Inheritance)
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT CHECK(role IN ('student', 'admin')) NOT NULL,
        gender TEXT,
        course TEXT,
        contact TEXT,
        id_proof TEXT,
        dietary_pref TEXT DEFAULT 'Vegetarian'
    )`);

    // 2. Room Allocation (Gender & Capacity Limits)
    db.run(`CREATE TABLE IF NOT EXISTS rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_number TEXT UNIQUE NOT NULL,
        floor INTEGER NOT NULL,
        gender_policy TEXT CHECK(gender_policy IN ('Male', 'Female', 'Any')) NOT NULL,
        capacity INTEGER NOT NULL,
        occupied INTEGER DEFAULT 0,
        status TEXT DEFAULT 'available'
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS allocations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER,
        room_id INTEGER,
        allocation_date DATE DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(student_id) REFERENCES users(id),
        FOREIGN KEY(room_id) REFERENCES rooms(id)
    )`);

    // 3. Detailed Fee Management
    db.run(`CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER,
        fee_type TEXT DEFAULT 'Accommodation',
        amount REAL NOT NULL,
        due_date DATE NOT NULL,
        status TEXT DEFAULT 'unpaid',
        penalty REAL DEFAULT 0,
        FOREIGN KEY(student_id) REFERENCES users(id)
    )`);

    // 4. Complaints & Maintenance Tracking
    db.run(`CREATE TABLE IF NOT EXISTS complaints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER,
        category TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATE DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(student_id) REFERENCES users(id)
    )`);

    // 5. Food & Menu Management
    db.run(`CREATE TABLE IF NOT EXISTS menu (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        day TEXT UNIQUE NOT NULL,
        breakfast TEXT NOT NULL,
        lunch TEXT NOT NULL,
        dinner TEXT NOT NULL
    )`);

    // 6. Check In / Check Out Operations
    db.run(`CREATE TABLE IF NOT EXISTS check_in_out (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER,
        type TEXT CHECK(type IN ('Check-In', 'Check-Out')) NOT NULL,
        key_number TEXT,
        timestamp DATE DEFAULT CURRENT_TIMESTAMP,
        remarks TEXT,
        FOREIGN KEY(student_id) REFERENCES users(id)
    )`);

    // Seed initial admin, rooms, and weekly menu
    db.get("SELECT count(*) as count FROM users WHERE role = 'admin'", (err, row) => {
        if (row && row.count === 0) {
            const bcrypt = require('bcryptjs');
            const hashedPwd = bcrypt.hashSync('admin123', 10);
            db.run(`INSERT INTO users (name, email, password, role) VALUES ('Hostel Warden', 'admin@hostel.com', ?, 'admin')`, [hashedPwd]);

            db.run(`INSERT INTO rooms (room_number, floor, gender_policy, capacity) VALUES ('101', 1, 'Female', 2), ('102', 1, 'Male', 2), ('201', 2, 'Female', 3)`);

            const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            days.forEach(day => {
                db.run(`INSERT INTO menu (day, breakfast, lunch, dinner) VALUES (?, 'Puri & Bhaji', 'Rice, Dal & Veggies', 'Chapati & Curry')`, [day]);
            });
        }
    });
});

module.exports = db;