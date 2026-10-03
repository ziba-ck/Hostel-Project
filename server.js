const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const db = require('./database');
const path = require('path');

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

app.use(session({
    secret: 'hostel_secret_key_123',
    resave: false,
    saveUninitialized: false
}));

const requireAuth = (role) => (req, res, next) => {
    if (!req.session.user) return res.redirect('/');
    if (role && req.session.user.role !== role) return res.status(403).send('Unauthorized Access');
    next();
};

// Home / Login
app.get('/', (req, res) => res.render('login', { error: null }));

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.render('login', { error: 'Invalid Email or Password' });
        }
        req.session.user = user;
        if (user.role === 'admin') res.redirect('/admin');
        else res.redirect('/student');
    });
});

// 1. Student Registration
app.post('/register', (req, res) => {
    const { name, email, password, gender, course, contact, id_proof, dietary_pref } = req.body;
    const hash = bcrypt.hashSync(password, 10);
    db.run(
        `INSERT INTO users (name, email, password, role, gender, course, contact, id_proof, dietary_pref) VALUES (?, ?, ?, 'student', ?, ?, ?, ?, ?)`,
        [name, email, hash, gender, course, contact, id_proof, dietary_pref],
        function (err) {
            if (err) return res.render('login', { error: 'Email already registered.' });
            db.run(`INSERT INTO payments (student_id, fee_type, amount, due_date) VALUES (?, 'Hostel & Mess Fee', 6000.00, '2026-11-30')`, [this.lastID]);
            res.render('login', { error: 'Registration successful! Please login.' });
        }
    );
});

// Student Portal
app.get('/student', requireAuth('student'), (req, res) => {
    const studentId = req.session.user.id;
    const studentGender = req.session.user.gender;

    db.get(`SELECT a.*, r.room_number, r.floor FROM allocations a JOIN rooms r ON a.room_id = r.id WHERE a.student_id = ?`, [studentId], (err, room) => {
        db.all(`SELECT * FROM payments WHERE student_id = ?`, [studentId], (err, payments) => {
            db.all(`SELECT * FROM complaints WHERE student_id = ?`, [studentId], (err, complaints) => {
                db.all(`SELECT * FROM menu`, (err, menu) => {
                    db.all(`SELECT * FROM check_in_out WHERE student_id = ? ORDER BY timestamp DESC`, [studentId], (err, logs) => {
                        db.all(`SELECT * FROM rooms WHERE status = 'available' AND occupied < capacity AND (gender_policy = ? OR gender_policy = 'Any')`, [studentGender], (err, availableRooms) => {
                            res.render('student_dashboard', { user: req.session.user, room, payments, complaints, menu, logs, availableRooms });
                        });
                    });
                });
            });
        });
    });
});

// 2. Room Allocation & De-allocation
app.post('/student/apply-room', requireAuth('student'), (req, res) => {
    const { roomId } = req.body;
    const studentId = req.session.user.id;
    db.run(`INSERT INTO allocations (student_id, room_id) VALUES (?, ?)`, [studentId, roomId], () => {
        db.run(`UPDATE rooms SET occupied = occupied + 1 WHERE id = ?`, [roomId], () => {
            res.redirect('/student');
        });
    });
});

app.post('/student/leave-room', requireAuth('student'), (req, res) => {
    const studentId = req.session.user.id;
    db.get(`SELECT room_id FROM allocations WHERE student_id = ?`, [studentId], (err, allocation) => {
        if (allocation) {
            db.run(`UPDATE rooms SET occupied = occupied - 1 WHERE id = ?`, [allocation.room_id]);
            db.run(`DELETE FROM allocations WHERE student_id = ?`, [studentId], () => {
                res.redirect('/student');
            });
        } else {
            res.redirect('/student');
        }
    });
});

// 3. Complaints
app.post('/student/complaint', requireAuth('student'), (req, res) => {
    const { category, description } = req.body;
    db.run(`INSERT INTO complaints (student_id, category, description) VALUES (?, ?, ?)`,
        [req.session.user.id, category, description], () => res.redirect('/student'));
});

// 4. Check In/Out Operations
app.post('/student/check-in-out', requireAuth('student'), (req, res) => {
    const { type, key_number, remarks } = req.body;
    db.run(`INSERT INTO check_in_out (student_id, type, key_number, remarks) VALUES (?, ?, ?, ?)`,
        [req.session.user.id, type, key_number, remarks], () => res.redirect('/student'));
});

// Admin Portal
app.get('/admin', requireAuth('admin'), (req, res) => {
    db.all(`SELECT c.*, u.name as student_name FROM complaints c JOIN users u ON c.student_id = u.id`, (err, complaints) => {
        db.all(`SELECT r.*, COUNT(a.id) as current_occupants FROM rooms r LEFT JOIN allocations a ON r.id = a.room_id GROUP BY r.id`, (err, rooms) => {
            db.all(`SELECT p.*, u.name as student_name FROM payments p JOIN users u ON p.student_id = u.id`, (err, payments) => {
                db.all(`SELECT io.*, u.name as student_name FROM check_in_out io JOIN users u ON io.student_id = u.id ORDER BY io.timestamp DESC`, (err, logs) => {
                    db.all(`SELECT * FROM menu`, (err, menu) => {
                        res.render('admin_dashboard', { complaints, rooms, payments, logs, menu });
                    });
                });
            });
        });
    });
});

app.post('/admin/resolve-complaint', requireAuth('admin'), (req, res) => {
    db.run(`UPDATE complaints SET status = 'Resolved' WHERE id = ?`, [req.body.complaintId], () => res.redirect('/admin'));
});

app.post('/admin/update-menu', requireAuth('admin'), (req, res) => {
    const { day, breakfast, lunch, dinner } = req.body;
    db.run(`UPDATE menu SET breakfast = ?, lunch = ?, dinner = ? WHERE day = ?`, [breakfast, lunch, dinner, day], () => res.redirect('/admin'));
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.listen(3000, () => console.log('Hostel Management Server running on http://localhost:3000'));