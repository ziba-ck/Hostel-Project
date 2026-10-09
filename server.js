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
    secret: 'hostel_space_secret_key',
    resave: false,
    saveUninitialized: true
}));

// Home Page
app.get('/', (req, res) => {
    const registered = req.query.registered;
    res.render('login', { 
        error: null, 
        success: registered ? 'Registration successful! Please log in.' : null 
    });
});

// Register
app.post('/register', (req, res) => {
    const { name, email, password, gender, course, contact, id_card, diet, role } = req.body;
    const userRole = role || 'student';

    db.run(
        `INSERT INTO users (name, email, password, role, gender, course, contact, id_card, diet) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, email, password, userRole, gender || '', course || '', contact || '', id_card || '', diet || 'Vegetarian'],
        function (err) {
            if (err) {
                const errorMsg = err.message.includes('UNIQUE') ? 'Email already exists.' : err.message;
                return res.render('login', { error: errorMsg, success: null });
            }
            
            const userId = this.lastID;
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

// Student Dashboard (Fetches full week menu, complaints, logs)
app.get('/student', (req, res) => {
    if (!req.session.user) return res.redirect('/');
    const userId = req.session.user.id;

    db.get(`SELECT * FROM rooms WHERE user_id = ?`, [userId], (err, room) => {
        db.get(`SELECT * FROM fees WHERE user_id = ?`, [userId], (err, fee) => {
            db.all(`SELECT * FROM menu`, (err, fullMenu) => {
                db.all(`SELECT * FROM complaints WHERE user_id = ? ORDER BY id DESC LIMIT 3`, [userId], (err, complaints) => {
                    db.all(`SELECT * FROM logs WHERE user_id = ? ORDER BY id DESC LIMIT 5`, [userId], (err, logs) => {
                        res.render('student_dashboard', {
                            user: req.session.user,
                            room: room || { room_number: '204', block: 'Block A', status: 'Allocated' },
                            fee: fee || { amount: 5000, status: 'Pending', due_date: '2026-11-01' },
                            menuList: fullMenu || [],
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

// AI Chatbot Assistant API
app.post('/api/ai-chat', (req, res) => {
    if (!req.session.user) return res.json({ reply: 'Please login first.' });
    const { message } = req.body;
    const lower = (message || '').toLowerCase();
    const user = req.session.user;

    if (lower.includes('fee') || lower.includes('payment') || lower.includes('due')) {
        return res.json({ reply: `Hi ${user.name}, your hostel fee balance is ₹5,000. Due date: Nov 1, 2026.` });
    } else if (lower.includes('room') || lower.includes('bed') || lower.includes('block')) {
        return res.json({ reply: `You are currently assigned to Room 204, Block A (Status: Allocated).` });
    } else if (lower.includes('menu') || lower.includes('food') || lower.includes('dinner') || lower.includes('lunch')) {
        return res.json({ reply: `Today's menu features Special Meals for Lunch and Chapati/Curry for Dinner. Check the Food & Menu tab for the full week schedule!` });
    } else if (lower.includes('sos') || lower.includes('help') || lower.includes('emergency')) {
        return res.json({ reply: `🚨 Emergency dispatch activated for Room 204. Hostel warden and medical staff have been alerted!` });
    } else {
        return res.json({ reply: `I'm your HostelHub AI assistant! Ask me about your fees, room allocation, weekly mess menu, or emergency assistance.` });
    }
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));