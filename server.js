require('dotenv').config();
const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const PORT = process.env.USER_PORT || 3000;

app.use(bodyParser.json({ limit: '10mb' }));
app.use(cors());
app.use(express.static(__dirname + '/user'));
app.use('/telegram', express.static(__dirname + '/telegram'));

const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'cashzilla',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

db.getConnection((err, connection) => {
  if (err) {
    console.error('❌ MySQL Connection Failed:', err.message);
  } else {
    console.log('✅ Connected to MySQL Database (Pool)');
    connection.release();
  }
});

// ── DATABASE SETUP ROUTE (one-time use) ──
app.get("/setup", (req, res) => {
  const secret = req.query.secret;
  if (secret !== process.env.ADMIN_TOKEN) {
    return res.status(401).send("Unauthorized");
  }

  const queries = [
    `CREATE TABLE IF NOT EXISTS users (
      id INT NOT NULL AUTO_INCREMENT,
      telegram_id VARCHAR(50) DEFAULT NULL,
      name VARCHAR(100) DEFAULT NULL,
      first_name VARCHAR(100) DEFAULT NULL,
      points INT DEFAULT 0,
      balance DECIMAL(10,2) DEFAULT 0.00,
      binance_email VARCHAR(100) DEFAULT NULL,
      is_banned TINYINT(1) DEFAULT 0,
      failed_quizzes INT DEFAULT 0,
      last_active TIMESTAMP NULL DEFAULT NULL,
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY telegram_id (telegram_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS quizzes (
      id INT NOT NULL AUTO_INCREMENT,
      title VARCHAR(255) NOT NULL,
      total_points INT DEFAULT 100,
      time_per_question INT DEFAULT 15,
      is_active TINYINT(1) DEFAULT 1,
      question1 TEXT, option1a VARCHAR(255), option1b VARCHAR(255), option1c VARCHAR(255), option1d VARCHAR(255), correct1 VARCHAR(255),
      question2 TEXT, option2a VARCHAR(255), option2b VARCHAR(255), option2c VARCHAR(255), option2d VARCHAR(255), correct2 VARCHAR(255),
      question3 TEXT, option3a VARCHAR(255), option3b VARCHAR(255), option3c VARCHAR(255), option3d VARCHAR(255), correct3 VARCHAR(255),
      question4 TEXT, option4a VARCHAR(255), option4b VARCHAR(255), option4c VARCHAR(255), option4d VARCHAR(255), correct4 VARCHAR(255),
      question5 TEXT, option5a VARCHAR(255), option5b VARCHAR(255), option5c VARCHAR(255), option5d VARCHAR(255), correct5 VARCHAR(255),
      question6 TEXT, option6a VARCHAR(255), option6b VARCHAR(255), option6c VARCHAR(255), option6d VARCHAR(255), correct6 VARCHAR(255),
      question7 TEXT, option7a VARCHAR(255), option7b VARCHAR(255), option7c VARCHAR(255), option7d VARCHAR(255), correct7 VARCHAR(255),
      question8 TEXT, option8a VARCHAR(255), option8b VARCHAR(255), option8c VARCHAR(255), option8d VARCHAR(255), correct8 VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS quiz_results (
      id INT NOT NULL AUTO_INCREMENT,
      user_id INT NOT NULL,
      quiz_id INT NOT NULL,
      score INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS tasks (
      id INT NOT NULL AUTO_INCREMENT,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      image_url VARCHAR(255),
      task_type ENUM('YouTube','Instagram','Website','Telegram','Twitter','Custom') DEFAULT 'Custom',
      reward_coins DECIMAL(10,2) DEFAULT 0,
      link VARCHAR(500),
      proof_type ENUM('Screenshot','Text','Both') DEFAULT 'Screenshot',
      is_active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS task_submissions (
      id INT NOT NULL AUTO_INCREMENT,
      user_id INT NOT NULL,
      task_id INT NOT NULL,
      screenshot_url MEDIUMTEXT,
      text_proof TEXT,
      status ENUM('Pending','Approved','Rejected') DEFAULT 'Pending',
      rejection_reason TEXT,
      submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS spins (
      id INT NOT NULL AUTO_INCREMENT,
      user_id INT NOT NULL,
      reward_amount INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS ads (
      id INT NOT NULL AUTO_INCREMENT,
      title VARCHAR(255) NOT NULL,
      link VARCHAR(500),
      reward_coins DECIMAL(10,2) DEFAULT 10,
      cooldown_minutes INT DEFAULT 60,
      icon VARCHAR(10) DEFAULT '📺',
      is_enabled TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS ad_views (
      id INT NOT NULL AUTO_INCREMENT,
      user_id INT NOT NULL,
      ad_id INT NOT NULL,
      viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS referrals (
      id INT NOT NULL AUTO_INCREMENT,
      referrer_id INT NOT NULL,
      referred_id INT NOT NULL,
      coins_earned INT DEFAULT 0,
      pending_coins INT DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS withdrawals (
      id INT NOT NULL AUTO_INCREMENT,
      user_id INT NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      method VARCHAR(50) DEFAULT 'binance',
      account VARCHAR(255),
      status ENUM('pending','paid','rejected') DEFAULT 'pending',
      admin_note TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `INSERT IGNORE INTO ads (title, link, reward_coins, cooldown_minutes, icon, is_enabled) VALUES
      ('Watch Ad 1', 'https://example.com/ad1', 10, 60, '📺', 1),
      ('Watch Ad 2', 'https://example.com/ad2', 15, 60, '🎬', 1),
      ('Watch Ad 3', 'https://example.com/ad3', 10, 60, '📱', 1)`,

    `ALTER TABLE tasks MODIFY COLUMN reward_coins DECIMAL(10,2) DEFAULT 0`,

    `ALTER TABLE ads MODIFY COLUMN reward_coins DECIMAL(10,2) DEFAULT 10`
  ];

  let completed = 0;
  let errors = [];

  queries.forEach((sql, i) => {
    db.query(sql, (err) => {
      completed++;
      if (err) errors.push(`Query ${i+1}: ${err.message}`);
      if (completed === queries.length) {
        // Safe column addition — ignore duplicate column errors
        const alterQueries = [
          \`ALTER TABLE quizzes ADD COLUMN time_per_question INT DEFAULT 15\`,
          \`ALTER TABLE quizzes ADD COLUMN is_active TINYINT(1) DEFAULT 1\`
        ];
        let altDone = 0;
        alterQueries.forEach(sql => {
          db.query(sql, () => { // ignore error if column already exists
            altDone++;
            if(altDone === alterQueries.length) {
              if (errors.length) {
                res.status(500).json({ success: false, errors });
              } else {
                res.json({ success: true, message: "✅ All tables created successfully!" });
              }
            }
          });
        });
      }
    });
  });
});

// --- HEARTBEAT ---
app.post("/api/heartbeat", (req, res) => {
  const { telegram_id } = req.body;
  db.query("UPDATE users SET last_active = NOW() WHERE telegram_id = ?", [telegram_id], () => res.json({ success: true }));
});

// --- USER & BALANCE ---
app.get("/api/user_balance/:telegram_id", (req, res) => {
  const { telegram_id } = req.params;
  db.query("SELECT * FROM users WHERE telegram_id = ?", [telegram_id], (err, results) => {
    if (err || !results.length) return res.json({ success: false, message: "User not found" });
    const u = results[0];
    u.total_usd = ((u.points || 0) / 1000).toFixed(3);
    u.usd_from_points = u.total_usd;
    res.json({ success: true, user: u });
  });
});

// --- QUIZ SYSTEM ---
app.get("/api/quizzes/:telegram_id", (req, res) => {
  const { telegram_id } = req.params;
  db.query("SELECT id FROM users WHERE telegram_id = ?", [telegram_id], (err, users) => {
    if (err || !users.length) return res.json({ success: false, quizzes: [] });
    const user_id = users[0].id;
    const sql = `SELECT * FROM quizzes WHERE id NOT IN (SELECT quiz_id FROM quiz_results WHERE user_id = ?) ORDER BY id DESC`;
    db.query(sql, [user_id], (err2, results) => {
      if (err2) return res.json({ success: false, error: err2 });
      res.json({ success: true, quizzes: results });
    });
  });
});

app.get("/api/quiz/:id", (req, res) => {
  db.query("SELECT * FROM quizzes WHERE id = ?", [req.params.id], (err, results) => {
    if (err || !results.length) return res.json({ success: false });
    res.json({ success: true, quiz: results[0] });
  });
});

app.post("/api/submit_quiz", (req, res) => {
  const { telegram_id, quiz_id, score } = req.body;
  db.query("SELECT id FROM users WHERE telegram_id = ?", [telegram_id], (err, users) => {
    if (err || !users.length) return res.json({ success: false });
    const user_id = users[0].id;
    db.query("INSERT INTO quiz_results (user_id, quiz_id, score) VALUES (?, ?, ?)", [user_id, quiz_id, score], (err2) => {
      if (err2) return res.json({ success: false, error: err2 });
      res.json({ success: true });
    });
  });
});

app.post("/api/fail_quiz", (req, res) => {
  const { telegram_id } = req.body;
  db.query("UPDATE users SET failed_quizzes = failed_quizzes + 1 WHERE telegram_id = ?", [telegram_id], () => {
    res.json({ success: true });
  });
});

app.post("/api/add_points", (req, res) => {
  const { telegram_id, points } = req.body;
  db.query("UPDATE users SET points = points + ? WHERE telegram_id = ?", [points, telegram_id], (err) => {
    if (err) return res.json({ success: false });
    res.json({ success: true });
  });
});

app.get("/api/user_played/:telegram_id", (req, res) => {
  const { telegram_id } = req.params;
  db.query("SELECT id FROM users WHERE telegram_id = ?", [telegram_id], (err, users) => {
    if (err || !users.length) return res.json({ success: false, played: [] });
    db.query("SELECT quiz_id FROM quiz_results WHERE user_id = ?", [users[0].id], (err2, results) => {
      res.json({ success: true, played: results.map(r => r.quiz_id) });
    });
  });
});

// --- TASK SYSTEM ---
app.get("/api/tasks/available/:telegram_id", (req, res) => {
  const { telegram_id } = req.params;
  db.query("SELECT id FROM users WHERE telegram_id = ?", [telegram_id], (err, users) => {
    if (err || !users.length) return res.json({ success: false, tasks: [] });
    const user_id = users[0].id;
    const sql = `SELECT * FROM tasks WHERE is_active = 1 AND id NOT IN (SELECT task_id FROM task_submissions WHERE user_id = ? AND status != 'Rejected')`;
    db.query(sql, [user_id], (err2, results) => {
      if (err2) return res.json({ success: false, error: err2 });
      res.json({ success: true, tasks: results });
    });
  });
});

app.get("/api/tasks/my/:telegram_id", (req, res) => {
  const { telegram_id } = req.params;
  db.query("SELECT id FROM users WHERE telegram_id = ?", [telegram_id], (err, users) => {
    if (err || !users.length) return res.json({ success: false, submissions: [] });
    const user_id = users[0].id;
    const sql = `SELECT ts.*, t.title, t.reward_coins, t.task_type FROM task_submissions ts JOIN tasks t ON ts.task_id = t.id WHERE ts.user_id = ? ORDER BY ts.submitted_at DESC`;
    db.query(sql, [user_id], (err2, results) => {
      if (err2) return res.json({ success: false, error: err2 });
      res.json({ success: true, submissions: results });
    });
  });
});

app.post("/api/tasks/submit", (req, res) => {
  const { user_id, task_id, screenshot_url, text_proof } = req.body;
  db.query("SELECT id FROM users WHERE telegram_id = ?", [user_id], (err, users) => {
    if (err || !users.length) return res.json({ success: false, message: "User not found" });
    const internal_id = users[0].id;
    const sql = "INSERT INTO task_submissions (user_id, task_id, screenshot_url, text_proof, status) VALUES (?, ?, ?, ?, 'Pending')";
    db.query(sql, [internal_id, task_id, screenshot_url, text_proof], (err2) => {
      if (err2) return res.json({ success: false, error: err2 });
      res.json({ success: true, message: "Task submitted for review" });
    });
  });
});

// --- SPIN WHEEL (User) ---
app.post("/api/spin/claim", (req, res) => {
  const { user_id, reward } = req.body;
  db.query("SELECT id FROM users WHERE telegram_id = ?", [user_id], (err, users) => {
    if (err || !users.length) return res.json({ success: false });
    const internal_id = users[0].id;
    db.query("INSERT INTO spins (user_id, reward_amount) VALUES (?, ?)", [internal_id, reward], (err2) => {
      if (err2) return res.json({ success: false });
      db.query("UPDATE users SET points = points + ? WHERE id = ?", [reward, internal_id], () => {
        res.json({ success: true, reward });
      });
    });
  });
});

app.get("/api/spin/history/:telegram_id", (req, res) => {
  const { telegram_id } = req.params;
  db.query("SELECT id FROM users WHERE telegram_id = ?", [telegram_id], (err, users) => {
    if (err || !users.length) return res.json({ success: false, history: [] });
    db.query("SELECT * FROM spins WHERE user_id = ? ORDER BY created_at DESC LIMIT 20", [users[0].id], (err2, results) => {
      res.json({ success: true, history: results });
    });
  });
});

// --- SPIN CONFIG ---
app.get("/api/spin/config", (req, res) => {
  const defaultSegments = [
    {label:"$0.01",color:"#FFD600",value:0.01,coins:10},
    {label:"Sorry!",color:"#FF66B2",value:0,coins:0},
    {label:"$0.00",color:"#00D1FF",value:0,coins:0},
    {label:"$0.05",color:"#00E676",value:0.05,coins:50},
    {label:"Sorry!",color:"#A29BFE",value:0,coins:0},
    {label:"$0.00",color:"#FF9F43",value:0,coins:0},
    {label:"$0.01",color:"#00D1FF",value:0.01,coins:10},
    {label:"$0.00",color:"#FFD600",value:0,coins:0}
  ];
  res.json({ success: true, segments: defaultSegments });
});

// --- ADS MODULE ---
app.get("/api/ads/active", (req, res) => {
  db.query("SELECT * FROM ads WHERE is_enabled = 1", (err, results) => {
    res.json({ success: true, ads: results || [] });
  });
});

app.post("/api/ads/view", (req, res) => {
  const { user_id, ad_id, reward } = req.body;
  db.query("SELECT id FROM users WHERE telegram_id = ?", [user_id], (err, users) => {
    if (err || !users.length) return res.json({ success: false });
    const internal_id = users[0].id;
    db.query("INSERT INTO ad_views (user_id, ad_id) VALUES (?, ?)", [internal_id, ad_id], () => {
      db.query("UPDATE users SET points = points + ? WHERE id = ?", [reward, internal_id], () => {
        res.json({ success: true });
      });
    });
  });
});

// --- REFERRAL SYSTEM ---
app.get("/api/referrals/:telegram_id", (req, res) => {
  const { telegram_id } = req.params;
  db.query("SELECT id FROM users WHERE telegram_id = ?", [telegram_id], (err, users) => {
    if (err || !users.length) return res.json({ success: false });
    const user_id = users[0].id;
    db.query("SELECT COUNT(*) as total_refs FROM referrals WHERE referrer_id = ?", [user_id], (err2, r1) => {
      db.query("SELECT COUNT(*) as active_refs FROM referrals WHERE referrer_id = ? AND is_active = 1", [user_id], (err3, r2) => {
        db.query("SELECT SUM(coins_earned) as total_earned FROM referrals WHERE referrer_id = ?", [user_id], (err4, r3) => {
          db.query("SELECT SUM(pending_coins) as pending_coins FROM referrals WHERE referrer_id = ?", [user_id], (err5, r4) => {
            res.json({
              success: true,
              total_refs: r1[0].total_refs || 0,
              active_refs: r2[0].active_refs || 0,
              total_earned: r3[0].total_earned || 0,
              pending_coins: r4[0].pending_coins || 0
            });
          });
        });
      });
    });
  });
});

app.post("/api/referrals/withdraw", (req, res) => {
  const { user_id } = req.body;
  db.query("SELECT id FROM users WHERE telegram_id = ?", [user_id], (err, users) => {
    if (err || !users.length) return res.json({ success: false });
    const internal_id = users[0].id;
    db.query("SELECT SUM(pending_coins) as total FROM referrals WHERE referrer_id = ?", [internal_id], (err2, r) => {
      const total = r[0].total || 0;
      if (total < 5000) return res.json({ success: false, message: "Minimum 5000 coins required" });
      db.query("UPDATE users SET points = points + ? WHERE id = ?", [total, internal_id], () => {
        db.query("UPDATE referrals SET pending_coins = 0 WHERE referrer_id = ?", [internal_id], () => {
          res.json({ success: true });
        });
      });
    });
  });
});

// --- WITHDRAWAL SYSTEM ---
app.get("/api/withdrawals/:telegram_id", (req, res) => {
  const { telegram_id } = req.params;
  db.query("SELECT id FROM users WHERE telegram_id = ?", [telegram_id], (err, users) => {
    if (err || !users.length) return res.json({ success: false, withdrawals: [] });
    db.query("SELECT * FROM withdrawals WHERE user_id = ? ORDER BY created_at DESC", [users[0].id], (err2, results) => {
      res.json({ success: true, withdrawals: results });
    });
  });
});

app.post("/api/withdraw", (req, res) => {
  const { telegram_id, amount, method, account } = req.body;
  db.query("SELECT id, points FROM users WHERE telegram_id = ?", [telegram_id], (err, users) => {
    if (err || !users.length) return res.json({ success: false, message: "User not found" });
    const user = users[0];
    const required_points = amount * 1000;
    if (user.points < required_points) return res.json({ success: false, message: "Insufficient balance" });
    db.query("INSERT INTO withdrawals (user_id, amount, method, account, status) VALUES (?, ?, ?, ?, 'pending')", [user.id, amount, method, account], (err2) => {
      if (err2) return res.json({ success: false, error: err2 });
      db.query("UPDATE users SET points = points - ? WHERE id = ?", [required_points, user.id], () => {
        res.json({ success: true, message: "Withdrawal requested successfully" });
      });
    });
  });
});

// --- EARNING HISTORY ---
app.get("/api/user_earning_history/:telegram_id", (req, res) => {
  const { telegram_id } = req.params;
  db.query("SELECT id FROM users WHERE telegram_id = ?", [telegram_id], (err, users) => {
    if (err || !users.length) return res.json({ success: false, history: [] });
    const sql = `SELECT qr.*, q.title as quiz_title, ROUND(qr.score / 1000, 3) as usd_earned FROM quiz_results qr JOIN quizzes q ON qr.quiz_id = q.id WHERE qr.user_id = ? ORDER BY qr.created_at DESC LIMIT 20`;
    db.query(sql, [users[0].id], (err2, results) => {
      res.json({ success: true, history: results });
    });
  });
});

// --- LEADERBOARD ---
app.get("/api/leaderboard", (req, res) => {
  const sql = "SELECT name, points as total_earned FROM users ORDER BY points DESC LIMIT 10";
  db.query(sql, (err, results) => {
    res.json({ success: true, leaderboard: results });
  });
});

app.listen(PORT, () => {
  console.log(`🚀 CashZilla API running on port ${PORT}`);
});
