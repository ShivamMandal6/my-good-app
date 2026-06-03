require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const mysql = require('mysql2');
const express = require('express');

const token = process.env.BOT_TOKEN;
const PORT = process.env.PORT || 3002;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const APP_URL = process.env.APP_DOMAIN || '';

// ── Express server ──
const app = express();
app.use(express.json());

app.get('/', (req, res) => res.send('CashTitan Bot is running ✅'));

app.post('/bot' + token, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

app.listen(PORT, () => console.log(`🌐 Server running on port ${PORT}`));

// ── Database ──
const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'defaultdb',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

db.getConnection((err, conn) => {
  if (err) console.error('❌ DB Error:', err.message);
  else { console.log('✅ Database connected'); conn.release(); }
});

// ── Bot ──
const bot = new TelegramBot(token, { polling: false });

async function startBot() {
  try {
    await bot.deleteWebHook();
    if (WEBHOOK_URL) {
      await bot.setWebHook(WEBHOOK_URL + '/bot' + token);
      console.log('🚀 CashTitan Bot Active — Webhook mode');
    } else {
      await new Promise(r => setTimeout(r, 2000));
      bot.startPolling({ restart: true });
      console.log('🚀 CashTitan Bot Active — Polling mode');
    }
  } catch (err) {
    console.error('Bot start error:', err.message);
    setTimeout(startBot, 5000);
  }
}
startBot();

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
        [{ text: '🚀 Open App & Earn', web_app: { url: APP_URL + '/telegram/dashboard.html' } }],
        [
          { text: '🧠 Play Quiz', web_app: { url: APP_URL + '/telegram/quiz.html' } },
          { text: '✅ Tasks', web_app: { url: APP_URL + '/telegram/tasks.html' } }
        ],
        [
          { text: '🎰 Spin', web_app: { url: APP_URL + '/telegram/spin.html' } },
          { text: '💰 Withdraw', web_app: { url: APP_URL + '/telegram/withdrawals.html' } }
        ]
      ]
    }
  };

  const text = isNew
    ? `🚀 *Welcome to CashTitan, ${firstName}!*\n\n🌍 *Turn your knowledge into real money!*\n\n📝 *How to Earn:*\n1️⃣ Play Quiz & answer questions 🧠\n2️⃣ Complete Tasks ✅\n3️⃣ Spin the wheel daily 🎰\n4️⃣ Invite friends & earn 10% commission 👥\n\n🎁 You got *10 free coins* as welcome gift!\n\n*Tap below to start earning!* 👇`
    : `👋 *Welcome back, ${firstName}!*\n\n💰 Ready to earn more today?\n\n*Tap below to continue!* 👇`;

  bot.sendMessage(chatId, text, { parse_mode: 'Markdown', ...keyboard })
    .catch(e => console.error('Send error:', e.message));
}

bot.on('polling_error', err => console.error('Polling error:', err.code, err.message));
process.on('uncaughtException', err => console.error('Uncaught:', err.message));
