const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./database');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'hostel_secret_key',
    resave: false,
    saveUninitialized: true
}));

// Home Page
app.get('/', (req, res) => {
    const registered = req.query.registered;
    res.render('login', { 
        error: null, 
        success: registered ? 'Registration successful! Please login below.' : null 
    });
});

// Student Registration
app.post('/register', (req, res) => {
    const { name, email, password, gender, course, contact, id_card, diet, role } = req.body;
    const userRole = role || 'student';

    db.run(
        `INSERT INTO users (name, email, password, role, gender, course, contact, id_card, diet) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, email, password, userRole, gender || '', course || '', contact || '', id_card || '', diet || ''],
        function (err) {
            if (err) {
                console.error("REGISTER ERROR:", err.message);
                const errorMsg = err.message.includes('UNIQUE') 
                    ? 'An account with this email address already exists. Please log in above.' 
                    : err.message;
                return res.render('login', { error: errorMsg, success: null });
            }
            
            const userId = this.lastID;
            // Default Room Allocation & Fee Entry upon registration
            db.run(`INSERT INTO rooms (user_id, room_number, block) VALUES (?, '101', 'Block A')`, [userId]);
            db.run(`INSERT INTO fees (user_id, amount, status, due_date) VALUES (?, 5000, 'Pending', '2026-11-01')`, [userId]);
            
            res.redirect('/?registered=true');
        }
    );
});

// Login Route
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    db.get(`SELECT * FROM users WHERE email = ? AND password = ?`, [email, password], (err, user) => {
        if (err || !user) {
            return res.render('login', { error: 'Invalid email or password', success: null });
        }
        req.session.user = user;
        res.redirect('/student');
    });
});

// Student Dashboard (Combines all 6 feature modules)
app.get('/student', (req, res) => {
    if (!req.session.user) return res.redirect('/');
    const userId = req.session.user.id;

    db.get(`SELECT * FROM rooms WHERE user_id = ?`, [userId], (err, room) => {
        db.get(`SELECT * FROM fees WHERE user_id = ?`, [userId], (err, fee) => {
            db.all(`SELECT * FROM complaints WHERE user_id = ?`, [userId], (err, complaints) => {
                db.all(`SELECT * FROM logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT 5`, [userId], (err, logs) => {
                    res.render('student_dashboard', {
                        user: req.session.user,
                        room: room || { room_number: 'Unassigned', block: 'N/A', status: 'Pending' },
                        fee: fee || { amount: 0, status: 'No Record', due_date: 'N/A' },
                        complaints: complaints || [],
                        logs: logs || []
                    });
                });
            });
        });
    });
});

// File Complaint Route
app.post('/complaint', (req, res) => {
    if (!req.session.user) return res.redirect('/');
    const { category, description } = req.body;
    db.run(`INSERT INTO complaints (user_id, category, description) VALUES (?, ?, ?)`, 
        [req.session.user.id, category, description], () => {
            res.redirect('/student');
        }
    );
});

// Check-In / Check-Out Operations Route
app.post('/check-log', (req, res) => {
    if (!req.session.user) return res.redirect('/');
    const { action } = req.body;
    db.run(`INSERT INTO logs (user_id, action) VALUES (?, ?)`, [req.session.user.id, action], () => {
        res.redirect('/student');
    });
});

// Logout Route
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});