require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const path = require('path');

const adminRoutes = require('./admin-routes');
const imageUploadRoutes = require('./image-upload');

console.log("Loaded ADMIN_PASSWORD:", process.env.ADMIN_PASSWORD);

const app = express();
const PORT = 3000;

app.set('trust proxy', 1);

// --- MIDDLEWARE ---
app.use(cors({
  origin: 'https://cdso.tech',
  credentials: true
}));
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'supersecretkey',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: true,
    sameSite: 'none',
    httpOnly: true
  }
}));

// --- ROUTES ---
app.use('/admin', adminRoutes);
app.use('/upload-image', imageUploadRoutes);
app.use('/images', express.static(path.join(__dirname, 'images')));

// ✅ CHECK SESSION ROUTE — moved here, before static middleware
app.get('/check-session', (req, res) => {
  res.json({ username: req.session.username || null });
});

app.use(express.static(__dirname));

// --- INIT DATABASE ---
const db = new sqlite3.Database('./users.db', (err) => {
  if (err) {
    console.error("Database Connection Error:", err.message);
  } else {
    console.log("✅ Connected to SQLite database.");
  }
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firstName TEXT,
    lastName TEXT,
    country TEXT,
    username TEXT UNIQUE,
    password TEXT,
    email TEXT UNIQUE,
    confirmed INTEGER DEFAULT 0
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    comment TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    article_id INTEGER,
    parent_id INTEGER
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// --- EMAIL SETUP ---
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.SMTP_USERNAME,
    pass: process.env.SMTP_PASSWORD
  },
  tls: {
    rejectUnauthorized: false
  }
});

// --- CONTACT FORM ---
app.post('/contact', (req, res) => {
  const { name, company, email, phone } = req.body;
  const mailOptions = {
    from: process.env.SMTP_RECIPIENT,
    to: process.env.SMTP_RECIPIENT,
    subject: 'New Contact Message',
    text: `Name: ${name}\nCompany: ${company}\nEmail: ${email}\nPhone: ${phone}`
  };
  transporter.sendMail(mailOptions, (error) => {
    if (error) {
      console.error("❌ Failed to send contact email:", error);
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.json({ message: 'Message sent successfully!' });
  });
});

// --- USER REGISTRATION ---
app.post('/register', (req, res) => {
  const { firstName, lastName, country, username, email, password } = req.body;
  if (!firstName || !lastName || !country || !username || !email || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const checkSQL = `SELECT * FROM users WHERE username = ? OR email = ?`;
  db.get(checkSQL, [username, email], (err, row) => {
    if (err) {
      console.error("❌ Registration check failed:", err);
      return res.status(500).json({ error: 'Registration failed' });
    }

    if (row) {
      return res.status(409).json({ error: "Username or email already in use" });
    }

    const insertSQL = `INSERT INTO users (firstName, lastName, country, username, email, password) VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(insertSQL, [firstName, lastName, country, username, email, password], function (err) {
      if (err) {
        console.error("❌ Registration DB error:", err);
        return res.status(500).json({ error: 'Registration failed' });
      }

      const mailOptions = {
        from: process.env.SMTP_RECIPIENT,
        to: email,
        subject: 'CDSO Registration Successful',
        text: `Hello ${firstName},\n\nWelcome to CDSO! Your registration was successful.`
      };
      transporter.sendMail(mailOptions, (error) => {
        if (error) console.error("❌ Registration email failed:", error);
      });

      req.session.username = username;
      res.json({ message: "Registration successful" });
    });
  });
});

// --- LOGIN ROUTE ---
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  db.get(`SELECT * FROM users WHERE username = ? AND password = ?`, [username, password], (err, row) => {
    if (err) {
      console.error("❌ Login DB error:", err);
      return res.status(500).json({ error: "Login failed" });
    }

    if (!row) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    req.session.username = username;
    console.log("🔐 User logged in:", { id: row.id, username });
    res.json({ message: "Login successful" });
  });
});

// --- ARTICLES & COMMENTS ---
app.get('/articles', (req, res) => {
  db.all(`SELECT id, title, content, created_at FROM articles ORDER BY created_at DESC`, [], (err, rows) => {
    if (err) {
      console.error("❌ Failed to fetch articles:", err);
      return res.status(500).json({ error: "Failed to fetch articles" });
    }
    res.json(rows);
  });
});

app.get('/comments/:articleId', (req, res) => {
  const { articleId } = req.params;
  db.all(`SELECT id, username, comment, parent_id FROM comments WHERE article_id = ? ORDER BY timestamp ASC`, [articleId], (err, rows) => {
    if (err) {
      console.error("❌ Failed to fetch comments:", err);
      return res.status(500).json({ error: "Failed to fetch comments" });
    }
    res.json(rows);
  });
});

app.post('/comment/:articleId', (req, res) => {
  const { articleId } = req.params;
  const { comment, parent_id = null } = req.body;
  const username = req.session.username || null;

  if (!username || !comment) {
    return res.status(401).json({ error: "You must be logged in to post a comment" });
  }

  db.run(
    `INSERT INTO comments (username, comment, article_id, parent_id) VALUES (?, ?, ?, ?)`,
    [username, comment, articleId, parent_id],
    function (err) {
      if (err) {
        console.error("❌ Failed to insert comment:", err);
        return res.status(500).json({ error: "Database error" });
      }
      res.json({ message: "Comment posted successfully", commentId: this.lastID });
    }
  );
});

// --- START SERVER ---
app.listen(PORT, () =>
  console.log(`🚀 Server running on https://cdso.tech:${PORT}`)
);
