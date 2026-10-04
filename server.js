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
    secret: 'hostel_oop_secret_key',
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
        [name, email, password, userRole, gender || '', course || '', contact || '', id_card || '', diet || 'Vegetarian'],
        function (err) {
            if (err) {
                const errorMsg = err.message.includes('UNIQUE') 
                    ? 'An account with this email address already exists.' 
                    : err.message;
                return res.render('login', { error: errorMsg, success: null });
            }
            
            const userId = this.lastID;
            // Create default room and fee entries for new user
            db.run(`INSERT INTO rooms (user_id, room_number, block) VALUES (?, '204', 'Block A')`, [userId]);
            db.run(`INSERT INTO fees (user_id, amount, status, due_date) VALUES (?, 5000, 'Pending', '2026-11-01')`, [userId]);
            
            res.redirect('/?registered=true');
        }
    );
});

// Login
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

// Dashboard Route (Aggregates all modules)
app.get('/student', (req, res) => {
    if (!req.session.user) return res.redirect('/');
    const userId = req.session.user.id;

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];

    db.get(`SELECT * FROM rooms WHERE user_id = ?`, [userId], (err, room) => {
        db.get(`SELECT * FROM fees WHERE user_id = ?`, [userId], (err, fee) => {
            db.get(`SELECT * FROM menu WHERE day = ?`, [today], (err, todaysMenu) => {
                db.all(`SELECT * FROM complaints WHERE user_id = ? ORDER BY id DESC LIMIT 3`, [userId], (err, complaints) => {
                    db.all(`SELECT * FROM logs WHERE user_id = ? ORDER BY id DESC LIMIT 4`, [userId], (err, logs) => {
                        res.render('student_dashboard', {
                            user: req.session.user,
                            room: room || { room_number: '204', block: 'Block A', status: 'Allocated' },
                            fee: fee || { amount: 5000, status: 'Pending', due_date: '2026-11-01' },
                            menu: todaysMenu || { breakfast: 'Dosa', lunch: 'Meals', dinner: 'Chapati' },
                            complaints: complaints || [],
                            logs: logs || []
                        });
                    });
                });
            });
        });
    });
});

// Submit Complaint
app.post('/complaint', (req, res) => {
    if (!req.session.user) return res.redirect('/');
    const { category, description } = req.body;
    db.run(`INSERT INTO complaints (user_id, category, description) VALUES (?, ?, ?)`, 
        [req.session.user.id, category, description], () => {
            res.redirect('/student');
        }
    );
});

// Check-In / Check-Out Log
app.post('/check-log', (req, res) => {
    if (!req.session.user) return res.redirect('/');
    const { action } = req.body;
    db.run(`INSERT INTO logs (user_id, action) VALUES (?, ?)`, [req.session.user.id, action], () => {
        res.redirect('/student');
    });
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));