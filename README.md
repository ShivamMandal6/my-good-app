# 🦖 Telegram Quiz-to-Earn Mini App

A complete open-source Telegram Mini App where users play quizzes and earn rewards. Includes:
- 🎮 User Mini App (quizzes, dashboard, withdrawals)
- 👨‍💼 Admin Panel (manage users, quizzes, withdrawals, ads)
- 🤖 Telegram Bot (handles `/start`, sends app link)
- 💰 Withdrawal System (Binance email payouts)
- 📺 Ads Integration (Monetag, Adsterra ready)

---

## 📦 Tech Stack

- **Backend**: Node.js + Express
- **Database**: MySQL 8.x
- **Bot**: node-telegram-bot-api
- **Frontend**: Vanilla HTML/CSS/JS (no build step)
- **Process Manager**: PM2
- **Web Server**: Nginx (reverse proxy)
- **OS**: AlmaLinux 10 / RHEL 9 / Rocky Linux 9 / CentOS Stream 9

---

## 🚀 Quick Start

**Read the full deployment guide**: `DEPLOYMENT_GUIDE.pdf` (included)

The guide covers everything from buying a VPS to going live, step-by-step, A to Z.

---

## 📁 Project Structure

```
TelegramMiniApp/
├── server.js              # User API (port 3000)
├── admin_server.js        # Admin API (port 4000)
├── bot.js                 # Telegram bot
├── package.json           # Node dependencies
├── database.sql           # Database schema + demo data
├── .env.example           # Credentials template
│
├── user/                  # Public landing page
│   └── index.html
│
├── telegram/              # Mini app pages (in-Telegram)
│   ├── dashboard.html
│   ├── quiz.html
│   ├── withdrawals.html
│   └── earnings.html
│
└── admin/                 # Admin panel
    ├── login.html
    ├── dashboard.html
    ├── quiz.html
    ├── ads.html
    ├── user-search.html
    └── withdraw-panel.html
```

---

## 🔐 What You Need to Replace Before Deploying

Search the codebase for these placeholders and replace with your actual values:

| Placeholder | Replace With |
|---|---|
| `YOUR_BOT_TOKEN_HERE` | Your Telegram bot token from @BotFather |
| `YOUR_MYSQL_PASSWORD_HERE` | Your MySQL root password |
| `your_database_name` | Your database name (e.g., `myapp_db`) |
| `yourdomain.com` | Your actual domain |
| `admin.yourdomain.com` | Your admin subdomain |
| `@YourBotName_bot` | Your bot's username |
| `CHANGE_THIS_PASSWORD` | Strong admin password |
| `your_telegram_username` | Your Telegram contact handle |

---

## 🧪 Default Admin Login

After installing, log in to the admin panel with:
- **Username**: `admin`
- **Password**: `CHANGE_THIS_PASSWORD`

⚠️ **CHANGE THIS IMMEDIATELY** by editing `database.sql` before importing, OR by running:
```sql
UPDATE admin SET password='YOUR_NEW_PASSWORD' WHERE username='admin';
```

---

## 📚 Full Documentation

See `DEPLOYMENT_GUIDE.pdf` for:
- Buying VPS hosting (recommended providers)
- Installing AlmaLinux 10 / Node.js / MySQL / Nginx
- Connecting domain & SSL setup
- Importing database & configuring code
- Bot setup (BotFather)
- Going live & testing
- Troubleshooting

---

## 📜 License

MIT — Feel free to use, modify, and distribute. Attribution appreciated but not required.

---

## ⭐ Credits

Built with ❤️ as an open template for the Telegram Mini App community.
