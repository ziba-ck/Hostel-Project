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

// Home Page (Login & Registration)
app.get('/', (req, res) => {
    const registered = req.query.registered;
    res.render('login', { error: null, success: registered ? 'Registration successful! Please login below.' : null });
});

// Registration Route
app.post('/register', (req, res) => {
    const { name, email, password, gender, course, contact, id_card, diet, role } = req.body;
    const userRole = role || 'student';

    db.run(
        `INSERT INTO users (name, email, password, role, gender, course, contact, id_card, diet) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, email, password, userRole, gender || '', course || '', contact || '', id_card || '', diet || ''],
        function (err) {
            if (err) {
                console.error("REGISTER ERROR:", err.message);
                return res.render('register', { error: err.message });
            }
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
        if (user.role === 'admin') {
            res.redirect('/admin');
        } else {
            res.redirect('/student');
        }
    });
});

// Student Dashboard Route
app.get('/student', (req, res) => {
    if (!req.session.user) return res.redirect('/');
    res.render('student_dashboard', { user: req.session.user });
});

// Admin Dashboard Route
app.get('/admin', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') return res.redirect('/');
    db.all(`SELECT * FROM users WHERE role = 'student'`, [], (err, students) => {
        res.render('admin_dashboard', { students: students || [] });
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