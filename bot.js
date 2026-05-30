require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const mysql = require('mysql2');
const http = require('http');

const token = process.env.BOT_TOKEN;
const PORT = process.env.PORT || 3002;

// ── HTTP server — Render ke liye ──
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('CashZilla Bot is running.');
}).listen(PORT, () => console.log(`🌐 Health check on port ${PORT}`));

// ── Database — Aiven SSL support ──
const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false },
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 5
});

// DB test
db.query('SELECT 1', (err) => {
  if (err) console.error('❌ DB connection failed:', err.message);
  else console.log('✅ Database connected');
});

// ── Bot — 409 conflict fix ──
const bot = new TelegramBot(token, { polling: false });
bot.deleteWebHook()
  .then(() => { bot.startPolling({ restart: false }); console.log('🚀 CashZilla Bot Active...'); })
  .catch(() => bot.startPolling({ restart: false }));

// ── /start ──
bot.onText(/\/start(?:\s+(.+))?/, (msg, match) => {
  const chatId = String(msg.chat.id);
  const firstName = msg.from.first_name || 'Friend';
  const refCode = match?.[1] || null;

  db.query('SELECT id FROM users WHERE telegram_id = ?', [chatId], (err, rows) => {
    if (err) return console.error('DB error:', err.message);

    if (!rows.length) {
      db.query(
        'INSERT INTO users (telegram_id, name, first_name, points, balance, joined_at, last_active) VALUES (?, ?, ?, 10, 0, NOW(), NOW())',
        [chatId, firstName, firstName],
        (err2) => {
          if (err2) console.error('Insert error:', err2.message);
          // Handle referral
          if (refCode?.startsWith('ref_')) {
            const refTgId = refCode.replace('ref_', '');
            db.query('SELECT id FROM users WHERE telegram_id = ?', [refTgId], (e, refRows) => {
              if (!e && refRows.length && refTgId !== chatId) {
                db.query('SELECT id FROM users WHERE telegram_id = ?', [chatId], (e2, newRows) => {
                  if (!e2 && newRows.length) {
                    db.query(
                      'INSERT IGNORE INTO referrals (referrer_id, referred_id, coins_earned, pending_coins, is_active) VALUES (?,?,0,0,1)',
                      [refRows[0].id, newRows[0].id]
                    );
                  }
                });
              }
            });
          }
          sendWelcome(chatId, firstName, true);
        }
      );
    } else {
      db.query('UPDATE users SET name=?, first_name=?, last_active=NOW() WHERE telegram_id=?', [firstName, firstName, chatId]);
      sendWelcome(chatId, firstName, false);
    }
  });
});

function sendWelcome(chatId, firstName, isNew) {
  const domain = process.env.DOMAIN || '';
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🚀 Open App', web_app: { url: `${domain}/telegram/dashboard.html` } }],
        [{ text: '🧠 Quiz', web_app: { url: `${domain}/telegram/quiz.html` } },
         { text: '✅ Tasks', web_app: { url: `${domain}/telegram/tasks.html` } }],
        [{ text: '🎰 Spin', web_app: { url: `${domain}/telegram/spin.html` } },
         { text: '💰 Withdraw', web_app: { url: `${domain}/telegram/withdrawals.html` } }]
      ]
    }
  };
  const text = isNew
    ? `🎉 *Welcome ${firstName}!*\n\nYou got *10 free coins* as a welcome gift! 🎁\n\nEarn real crypto — quiz, tasks, spin & refer.`
    : `👋 *Welcome back ${firstName}!*\n\nReady to earn more today?`;
  bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...keyboard })
    .catch(e => console.error('Send error:', e.message));
}

bot.on('polling_error', err => console.error('Polling error:', err.code, err.message));
process.on('uncaughtException', err => console.error('Uncaught:', err.message));
