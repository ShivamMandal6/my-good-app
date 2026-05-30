require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const mysql = require('mysql2');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

console.log("🚀 CashZilla Bot Active...");

// Database Pool
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10
});

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || "Friend";
  const joinedAt = new Date();

  db.query('SELECT * FROM users WHERE telegram_id = ?', [chatId], (err, results) => {
    if (err) return;

    if (results.length === 0) {
      const insertSql = "INSERT INTO users (telegram_id, name, points, joined_at, balance) VALUES (?, ?, 10, ?, 0)";
      db.query(insertSql, [chatId, firstName, joinedAt], (err2) => {
        sendWelcomeMessage(chatId, firstName, true);
      });
    } else {
      db.query('UPDATE users SET name = ? WHERE telegram_id = ?', [firstName, chatId]);
      sendWelcomeMessage(chatId, firstName, false);
    }
  });
});

function sendWelcomeMessage(chatId, firstName, isNewUser) {
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🚀 Open App", web_app: { url: `${process.env.DOMAIN}/telegram/dashboard.html` } }],
        [{ text: "🧠 Play Quiz", web_app: { url: `${process.env.DOMAIN}/telegram/quiz.html` } },
         { text: "💰 Withdraw", web_app: { url: `${process.env.DOMAIN}/telegram/withdrawals.html` } }]
      ]
    }
  };

  const message = isNewUser 
    ? `🚀 *Welcome ${firstName}!* \n\nEarn money by playing quizzes. You got *10 Coins* as a gift! 🎁`
    : `👋 *Welcome Back ${firstName}!* \n\nReady to earn more today?`;

  bot.sendMessage(chatId, message, { parse_mode: "Markdown", ...keyboard });
}
