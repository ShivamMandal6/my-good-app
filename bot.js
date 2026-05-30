require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const mysql = require('mysql2');
const express = require('express');

const token = process.env.BOT_TOKEN;
const PORT = process.env.PORT || 3002;
const BOT_DOMAIN = process.env.BOT_DOMAIN || '';
const APP_DOMAIN = process.env.APP_DOMAIN || '';
const WEBHOOK_PATH = `/bot${token}`;
const WEBHOOK_URL = `${BOT_DOMAIN}${WEBHOOK_PATH}`;

// ── Express server ──
const app = express();
app.use(express.json());

// Health check — UptimeRobot ke liye
app.get('/', (req, res) => res.send('CashZilla Bot is running ✅'));

// ── Database ──
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

db.query('SELECT 1', (err) => {
  if (err) console.error('❌ DB connection failed:', err.message);
  else console.log('✅ Database connected');
});

// ── Bot — Webhook mode ──
const bot = new TelegramBot(token, { polling: false });

// Webhook route
app.post(WEBHOOK_PATH, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Server start karo pehle, phir webhook set karo
app.listen(PORT, async () => {
  console.log(`🌐 Server running on port ${PORT}`);
  try {
    await bot.setWebHook(WEBHOOK_URL);
    console.log(`🚀 CashZilla Bot Active — Webhook: ${WEBHOOK_URL}`);
  } catch (err) {
    console.error('Webhook error:', err.message);
  }
});

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
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🚀 Open App', web_app: { url: `${APP_DOMAIN}/telegram/dashboard.html` } }],
        [{ text: '🧠 Quiz', web_app: { url: `${APP_DOMAIN}/telegram/quiz.html` } },
         { text: '✅ Tasks', web_app: { url: `${APP_DOMAIN}/telegram/tasks.html` } }],
        [{ text: '🎰 Spin', web_app: { url: `${APP_DOMAIN}/telegram/spin.html` } },
         { text: '💰 Withdraw', web_app: { url: `${APP_DOMAIN}/telegram/withdrawals.html` } }]
      ]
    }
  };
  const text = isNew
    ? `🎉 *Welcome ${firstName}!*\n\nYou got *10 free coins* as a welcome gift! 🎁\n\nEarn real crypto — quiz, tasks, spin & refer.`
    : `👋 *Welcome back ${firstName}!*\n\nReady to earn more today?`;
  bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...keyboard })
    .catch(e => console.error('Send error:', e.message));
}

process.on('uncaughtException', err => console.error('Uncaught:', err.message));
