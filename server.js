const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const db = require('./database');
const path = require('path');

const app = express();

// Body parsers & static assets
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// Session setup
app.use(session({
    secret: 'hostel_secret_key_123',
    resave: false,
    saveUninitialized: false
}));

// Authentication Middleware
const requireAuth = (role) => (req, res, next) => {
    if (!req.session.user) return res.redirect('/');
    if (role && req.session.user.role !== role) return res.status(403).send('Unauthorized Access');
    next();
};

// --- Routes ---

// Home / Login
app.get('/', (req, res) => {
    res.render('login', { error: null });
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err || !user) return res.render('login', { error: 'Invalid email or password' });
        
        if (bcrypt.compareSync(password, user.password)) {
            req.session.user = user;
            if (user.role === 'admin') return res.redirect('/admin');
            return res.redirect('/student');
        }
        res.render('login', { error: 'Invalid email or password' });
    });
});

// Register Page
app.get('/register', (req, res) => {
    res.render('register', { error: null });
});

// Process Registration
app.post('/register', (req, res) => {
    const { name, email, password, role } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);
    const userRole = role || 'student';

    db.run(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        [name, email, hashedPassword, userRole],
        function (err) {
            if (err) {
                return res.render('register', { error: 'Email already registered or database error' });
            }
            res.redirect('/');
        }
    );
});

// Student Dashboard
app.get('/student', requireAuth('student'), (req, res) => {
    res.render('student_dashboard', { user: req.session.user });
});

// Admin Dashboard
app.get('/admin', requireAuth('admin'), (req, res) => {
    db.all('SELECT * FROM users WHERE role = "student"', [], (err, students) => {
        res.render('admin_dashboard', { user: req.session.user, students: students || [] });
    });
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// --- Server Port Setup for Deployment ---
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});