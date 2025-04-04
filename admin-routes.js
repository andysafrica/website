const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');

// SQLite connection
const db = new sqlite3.Database('./users.db', (err) => {
  if (err) {
    console.error('❌ Failed to connect to SQLite:', err.message);
  } else {
    console.log('✅ Connected to SQLite from admin routes');
  }
});

router.use(bodyParser.json());

// Debug route
router.get('/ping', (req, res) => {
  res.json({ message: 'admin-routes.js is live!' });
});

// ✅ Admin login
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Missing credentials' });
  }

  if (username === 'chief_organizer' && password === process.env.ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    console.log("✅ Login session established:", req.session);
    return res.json({ message: 'Login successful', token: 'authenticated' });
  }

  return res.status(401).json({ error: 'Invalid credentials' });
});

// TEMP: Debug cookie header
router.use((req, res, next) => {
  console.log("🍪 Incoming Cookie:", req.headers.cookie);
  next();
});

// ✅ Auth middleware
router.use('/dashboard', (req, res, next) => {
  console.log("🔐 Session data at /admin/dashboard:", req.session);
  if (req.session?.isAdmin) {
    return next();
  }
  return res.status(403).json({ error: 'Unauthorized access' });
});

// ✅ Fetch all articles for admin view
router.get('/articles', (req, res) => {
  db.all(`SELECT id, title, created_at FROM articles ORDER BY created_at DESC`, [], (err, rows) => {
    if (err) {
      console.error("❌ Admin fetch articles failed:", err.message);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(rows);
  });
});

// ✅ Fetch article by ID (for editing)
router.get('/articles/:id', (req, res) => {
  const { id } = req.params;
  db.get(`SELECT id, title, content FROM articles WHERE id = ?`, [id], (err, row) => {
    if (err) {
      console.error(`❌ Failed to fetch article ${id}:`, err.message);
      return res.status(500).json({ error: "Failed to fetch article" });
    }
    if (!row) {
      return res.status(404).json({ error: "Article not found" });
    }
    res.json(row);
  });
});

// ✅ Add article
router.post('/dashboard/add-article', (req, res) => {
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required.' });
  }

  const sql = `INSERT INTO articles (title, content) VALUES (?, ?)`;
  db.run(sql, [title, content], function (err) {
    if (err) {
      console.error('❌ Failed to insert article:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    console.log(`📝 New article created: "${title}" (ID: ${this.lastID})`);
    return res.json({ message: 'Article added successfully', id: this.lastID });
  });
});

// ✅ Edit article
router.put('/dashboard/edit-article/:id', (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required.' });
  }

  db.run(`UPDATE articles SET title = ?, content = ? WHERE id = ?`,
    [title, content, id],
    function (err) {
      if (err) {
        console.error(`❌ Failed to update article ${id}:`, err.message);
        return res.status(500).json({ error: 'Database error' });
      }
      console.log(`📝 Article updated: "${title}" (ID: ${id})`);
      return res.json({ message: 'Article updated successfully' });
    }
  );
});

// ✅ Logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Logged out successfully' });
  });
});

// ✅ DELETE Article
router.delete('/dashboard/delete-article/:id', (req, res) => {
  const articleId = req.params.id;

  if (!articleId) {
    return res.status(400).json({ error: 'Missing article ID' });
  }

  const sql = `DELETE FROM articles WHERE id = ?`;
  db.run(sql, [articleId], function (err) {
    if (err) {
      console.error('❌ Failed to delete article:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }

    console.log(`🗑️ Deleted article with ID: ${articleId}`);
    res.json({ message: 'Article deleted successfully' });
  });
});


module.exports = router;
