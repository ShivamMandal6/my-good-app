require('dotenv').config();
const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const PORT = process.env.ADMIN_PORT || 3001;

app.use(bodyParser.json({ limit: '10mb' }));
app.use(cors());
app.use(express.static(__dirname + '/admin'));

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10
});

// =============================================
// ADMIN AUTH MIDDLEWARE
// =============================================
function adminAuth(req, res, next) {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  next();
}

// =============================================
// ADMIN LOGIN
// =============================================
app.post("/admin/api/login", (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    res.json({ success: true, token: process.env.ADMIN_TOKEN });
  } else {
    res.status(401).json({ success: false, message: "Invalid credentials" });
  }
});

// =============================================
// DASHBOARD STATS
// =============================================
app.get("/admin/api/stats", adminAuth, (req, res) => {
  const stats = {};
  db.query("SELECT COUNT(*) as total_users FROM users", (err, r1) => {
    stats.total_users = r1?.[0]?.total_users || 0;
    db.query("SELECT COALESCE(SUM(balance),0) as total_earnings FROM users", (err, r2) => {
      stats.total_earnings = r2?.[0]?.total_earnings || 0;
      db.query("SELECT COUNT(*) as total_quizzes FROM quizzes", (err, r3) => {
        stats.total_quizzes = r3?.[0]?.total_quizzes || 0;
        db.query("SELECT COUNT(*) as pending_withdrawals FROM withdrawals WHERE status='pending'", (err, r4) => {
          stats.pending_withdrawals = r4?.[0]?.pending_withdrawals || 0;
          db.query("SELECT COUNT(*) as quizzes_won FROM quiz_results", (err, r5) => {
            stats.quizzes_won = r5?.[0]?.quizzes_won || 0;
            db.query("SELECT COALESCE(SUM(failed_quizzes),0) as quizzes_failed FROM users", (err, r6) => {
              stats.quizzes_failed = r6?.[0]?.quizzes_failed || 0;
              db.query("SELECT COUNT(*) as active_users FROM users WHERE last_active >= NOW() - INTERVAL 5 MINUTE", (err, r7) => {
                stats.active_users = r7?.[0]?.active_users || 0;
                res.json({ success: true, ...stats });
              });
            });
          });
        });
      });
    });
  });
});

// =============================================
// NOTIFICATIONS
// =============================================
app.get("/admin/api/notifications", adminAuth, (req, res) => {
  const sql = "SELECT w.*, u.name as user_name FROM withdrawals w JOIN users u ON w.user_id = u.id WHERE w.status = 'pending' ORDER BY w.created_at DESC LIMIT 10";
  db.query(sql, (err, results) => {
    res.json({ success: true, notifications: results || [] });
  });
});

// =============================================
// USERS MANAGEMENT
// =============================================
app.get("/admin/api/users", adminAuth, (req, res) => {
  db.query("SELECT * FROM users ORDER BY id DESC", (err, results) => {
    res.json({ success: true, users: results || [] });
  });
});

app.get("/admin/api/users/search", adminAuth, (req, res) => {
  const q = `%${req.query.q || ''}%`;
  db.query("SELECT * FROM users WHERE name LIKE ? OR telegram_id LIKE ?", [q, q], (err, results) => {
    res.json({ success: true, users: results || [] });
  });
});

app.post("/admin/api/users/:id/ban", adminAuth, (req, res) => {
  db.query("UPDATE users SET is_banned = ? WHERE id = ?", [req.body.is_banned, req.params.id], (err) => {
    res.json({ success: !err });
  });
});

app.post("/admin/api/users/:id/add_points", adminAuth, (req, res) => {
  db.query("UPDATE users SET points = points + ? WHERE id = ?", [req.body.points, req.params.id], (err) => {
    res.json({ success: !err });
  });
});

// =============================================
// QUIZ MANAGEMENT
// =============================================
app.get("/admin/api/quizzes", adminAuth, (req, res) => {
  db.query("SELECT * FROM quizzes ORDER BY id DESC", (err, results) => {
    res.json({ success: true, quizzes: results || [] });
  });
});

app.post("/admin/api/quizzes", adminAuth, (req, res) => {
  const { title, total_points, ...rest } = req.body;
  db.query("INSERT INTO quizzes SET ?", [req.body], (err, result) => {
    if (err) return res.json({ success: false, error: err });
    res.json({ success: true, id: result.insertId });
  });
});

app.put("/admin/api/quizzes/:id", adminAuth, (req, res) => {
  db.query("UPDATE quizzes SET ? WHERE id = ?", [req.body, req.params.id], (err) => {
    res.json({ success: !err });
  });
});

app.delete("/admin/api/quizzes/:id", adminAuth, (req, res) => {
  db.query("DELETE FROM quizzes WHERE id = ?", [req.params.id], (err) => {
    res.json({ success: !err });
  });
});

// =============================================
// TASK MANAGEMENT
// =============================================
app.get("/admin/api/tasks/stats", adminAuth, (req, res) => {
  const q = `SELECT 
    (SELECT COUNT(*) FROM tasks) as total,
    (SELECT COUNT(*) FROM tasks WHERE is_active=1) as active,
    (SELECT COUNT(*) FROM task_submissions WHERE status='Pending') as pending,
    (SELECT COUNT(*) FROM task_submissions WHERE status='Approved') as approved,
    (SELECT COUNT(*) FROM task_submissions WHERE status='Rejected') as rejected`;
  db.query(q, (err, r) => {
    if (err) return res.json({ success: false });
    res.json({ success: true, ...r[0] });
  });
});

app.get("/admin/api/tasks", adminAuth, (req, res) => {
  const sql = `SELECT t.*, COUNT(ts.id) as submission_count FROM tasks t LEFT JOIN task_submissions ts ON t.id = ts.task_id GROUP BY t.id ORDER BY t.id DESC`;
  db.query(sql, (err, results) => {
    if (err) return res.json({ success: false, error: err });
    res.json({ success: true, tasks: results });
  });
});

app.post("/admin/api/tasks", adminAuth, (req, res) => {
  const { title, description, link, reward_coins, task_type, proof_type, is_active } = req.body;
  db.query("INSERT INTO tasks (title, description, link, reward_coins, task_type, proof_type, is_active) VALUES (?,?,?,?,?,?,?)",
    [title, description, link, reward_coins, task_type, proof_type, is_active ?? 1], (err, result) => {
    if (err) return res.json({ success: false, error: err });
    res.json({ success: true, id: result.insertId });
  });
});

app.put("/admin/api/tasks/:id", adminAuth, (req, res) => {
  const { title, description, link, reward_coins, task_type, proof_type, is_active } = req.body;
  db.query("UPDATE tasks SET title=?, description=?, link=?, reward_coins=?, task_type=?, proof_type=?, is_active=? WHERE id=?",
    [title, description, link, reward_coins, task_type, proof_type, is_active, req.params.id], (err) => {
    if (err) return res.json({ success: false, error: err });
    res.json({ success: true });
  });
});

app.post("/admin/api/tasks/:id/toggle", adminAuth, (req, res) => {
  db.query("UPDATE tasks SET is_active=? WHERE id=?", [req.body.is_active, req.params.id], (err) => {
    res.json({ success: !err });
  });
});

app.delete("/admin/api/tasks/:id", adminAuth, (req, res) => {
  db.query("DELETE FROM tasks WHERE id=?", [req.params.id], (err) => {
    res.json({ success: !err });
  });
});

app.get("/admin/api/tasks/submissions", adminAuth, (req, res) => {
  const { status } = req.query;
  let sql = `SELECT ts.*, t.title as task_title, t.reward_coins, u.name as user_name FROM task_submissions ts JOIN tasks t ON ts.task_id = t.id JOIN users u ON ts.user_id = u.id`;
  let params = [];
  if (status && status !== 'all') { sql += ` WHERE ts.status=?`; params.push(status); }
  sql += ` ORDER BY ts.submitted_at DESC`;
  db.query(sql, params, (err, results) => {
    if (err) return res.json({ success: false, error: err });
    res.json({ success: true, submissions: results });
  });
});

app.post("/admin/api/tasks/submissions/:id/review", adminAuth, (req, res) => {
  const { status, rejection_reason } = req.body;
  db.query("SELECT ts.*, t.reward_coins FROM task_submissions ts JOIN tasks t ON ts.task_id=t.id WHERE ts.id=?", [req.params.id], (err, rows) => {
    if (err || !rows.length) return res.json({ success: false });
    const sub = rows[0];
    db.query("UPDATE task_submissions SET status=?, rejection_reason=? WHERE id=?", [status, rejection_reason || null, req.params.id], (err2) => {
      if (err2) return res.json({ success: false });
      if (status === 'Approved') {
        db.query("UPDATE users SET points=points+? WHERE id=?", [sub.reward_coins, sub.user_id], () => {});
      }
      res.json({ success: true });
    });
  });
});

// =============================================
// SPIN WHEEL MANAGEMENT
// =============================================
app.get("/admin/api/spin/history", adminAuth, (req, res) => {
  const sql = `SELECT s.*, u.name as user_name FROM spins s JOIN users u ON s.user_id = u.id ORDER BY s.created_at DESC LIMIT 50`;
  db.query(sql, (err, results) => {
    res.json({ success: true, history: results || [] });
  });
});

app.get("/admin/api/spin/stats", adminAuth, (req, res) => {
  db.query("SELECT COUNT(*) as total_spins, COALESCE(SUM(reward_amount),0) as total_rewards FROM spins", (err, r) => {
    res.json({ success: true, ...r[0] });
  });
});

// =============================================
// REFERRALS MANAGEMENT
// =============================================
app.get("/admin/api/referrals", adminAuth, (req, res) => {
  const sql = `SELECT r.*, u1.name as referrer_name, u2.name as referred_name FROM referrals r JOIN users u1 ON r.referrer_id = u1.id JOIN users u2 ON r.referred_id = u2.id ORDER BY r.created_at DESC LIMIT 100`;
  db.query(sql, (err, results) => {
    res.json({ success: true, referrals: results || [] });
  });
});

app.get("/admin/api/referrals/stats", adminAuth, (req, res) => {
  db.query("SELECT COUNT(*) as total_referrals, COALESCE(SUM(coins_earned),0) as total_coins FROM referrals", (err, r) => {
    res.json({ success: true, ...r[0] });
  });
});

// =============================================
// ADS MANAGEMENT
// =============================================
app.get("/admin/api/ads/stats", adminAuth, (req, res) => {
  db.query("SELECT COUNT(*) as total_views, COALESCE(SUM(a.reward_coins),0) as total_coins FROM ad_views av JOIN ads a ON av.ad_id = a.id", (err, r1) => {
    db.query("SELECT COUNT(*) as today_views FROM ad_views WHERE DATE(viewed_at) = CURDATE()", (err, r2) => {
      db.query("SELECT COUNT(DISTINCT user_id) as unique_users FROM ad_views", (err, r3) => {
        res.json({ success: true, total_views: r1[0].total_views, total_coins: r1[0].total_coins, today_views: r2[0].today_views, unique_users: r3[0].unique_users });
      });
    });
  });
});

app.get("/admin/api/ads", adminAuth, (req, res) => {
  db.query("SELECT * FROM ads ORDER BY id DESC", (err, results) => {
    res.json({ success: true, ads: results || [] });
  });
});

app.post("/admin/api/ads", adminAuth, (req, res) => {
  const { title, link, reward_coins, cooldown_minutes, icon, is_enabled } = req.body;
  db.query("INSERT INTO ads (title, link, reward_coins, cooldown_minutes, icon, is_enabled) VALUES (?,?,?,?,?,?)",
    [title, link, reward_coins, cooldown_minutes || 60, icon || '📺', is_enabled ?? 1], (err, result) => {
    if (err) return res.json({ success: false, error: err });
    res.json({ success: true, id: result.insertId });
  });
});

app.put("/admin/api/ads/:id", adminAuth, (req, res) => {
  const { title, link, reward_coins, cooldown_minutes, icon, is_enabled } = req.body;
  db.query("UPDATE ads SET title=?, link=?, reward_coins=?, cooldown_minutes=?, icon=?, is_enabled=? WHERE id=?",
    [title, link, reward_coins, cooldown_minutes, icon, is_enabled, req.params.id], (err) => {
    res.json({ success: !err });
  });
});

app.post("/admin/api/ads/:id/toggle", adminAuth, (req, res) => {
  db.query("UPDATE ads SET is_enabled=? WHERE id=?", [req.body.is_enabled, req.params.id], (err) => {
    res.json({ success: !err });
  });
});

app.delete("/admin/api/ads/:id", adminAuth, (req, res) => {
  db.query("DELETE FROM ads WHERE id=?", [req.params.id], (err) => {
    res.json({ success: !err });
  });
});

// =============================================
// WITHDRAWALS MANAGEMENT
// =============================================
app.get("/admin/api/withdrawals/stats", adminAuth, (req, res) => {
  db.query("SELECT COUNT(*) as total, COALESCE(SUM(amount),0) as total_amount FROM withdrawals", (err, r1) => {
    db.query("SELECT COUNT(*) as pending FROM withdrawals WHERE status='pending'", (err, r2) => {
      db.query("SELECT COUNT(*) as paid FROM withdrawals WHERE status='paid'", (err, r3) => {
        res.json({ success: true, total: r1[0].total, total_amount: r1[0].total_amount, pending: r2[0].pending, paid: r3[0].paid });
      });
    });
  });
});

app.get("/admin/api/withdrawals", adminAuth, (req, res) => {
  const { status } = req.query;
  let sql = `SELECT w.*, u.name as user_name, u.telegram_id FROM withdrawals w JOIN users u ON w.user_id = u.id`;
  let params = [];
  if (status && status !== 'all') { sql += ` WHERE w.status=?`; params.push(status); }
  sql += ` ORDER BY w.created_at DESC`;
  db.query(sql, params, (err, results) => {
    res.json({ success: true, withdrawals: results || [] });
  });
});

app.post("/admin/api/update_withdraw", adminAuth, (req, res) => {
  const { id, status, note } = req.body;
  db.query("UPDATE withdrawals SET status=?, admin_note=? WHERE id=?", [status, note || null, id], (err) => {
    if (err) return res.json({ success: false, error: err });
    res.json({ success: true });
  });
});

// =============================================
// LEADERBOARD
// =============================================
app.get("/admin/api/leaderboard", adminAuth, (req, res) => {
  db.query("SELECT name, telegram_id, points, balance FROM users ORDER BY points DESC LIMIT 50", (err, results) => {
    res.json({ success: true, leaderboard: results || [] });
  });
});

app.listen(PORT, () => {
  console.log(`🚀 CashZilla Admin API running on port ${PORT}`);
});
