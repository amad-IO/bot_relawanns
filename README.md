# 🤖 Relawanns Telegram Bots

Two Telegram bots for managing Relawanns volunteer registration events.

## 📁 Structure

```
bot/
├── bot_admin/          # Admin control bot
└── bot_relawanns/      # Notification & export bot
```

## 🤖 Bots

### Bot Admin (@relawanns_control)
**Features:**
- ✅ Open/Close registration
- ✅ Edit event details (title, date, location, description, etc.)
- ✅ Edit Google Drive link
- ✅ View registrants
- ✅ Export to Excel with embedded images
- ✅ Clear database
- ✅ Dashboard statistics

### Bot Relawanns
**Features:**
- ✅ Receive new registration notifications
- ✅ Dashboard statistics
- ✅ Excel export with payment proof
- ✅ Open/Close registration controls

## 🚀 Setup

### Prerequisites
- Node.js 18+
- PostgreSQL database (Supabase)
- Telegram bot tokens

### Installation

**Bot Admin:**
```bash
cd bot/bot_admin
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

**Bot Relawanns:**
```bash
cd bot/bot_relawanns
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

### Environment Variables

Create `.env` file in each bot folder:

**bot_admin/.env:**
```env
BOT_TOKEN=your_admin_bot_token
DATABASE_URL=your_postgres_connection_string
ADMIN_TELEGRAM_IDS=your_telegram_id
PORT=3000
```

**bot_relawanns/.env:**
```env
BOT_TOKEN=your_bot_token
DATABASE_URL=your_postgres_connection_string
ADMIN_TELEGRAM_ID=your_telegram_id
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

## 📦 Build

```bash
npm run build
```

## 🚀 Deploy to Azure

See [AZURE_DEPLOYMENT_GUIDE.md](./AZURE_DEPLOYMENT_GUIDE.md) for detailed instructions.

## 📝 Commands

### Bot Admin
- `/start` - Main menu
- `/dashboard` - View statistics
- `/open` - Open registration
- `/close` - Close registration
- `/export` - Export registrants to Excel
- `/clear` - Clear database

### Bot Relawanns
- `/start` - Main menu
- `/dashboard` - View statistics
- `/recap` - Export Excel report

## 🔐 Security

- ✅ `.env` files excluded from git
- ✅ Admin-only access control
- ✅ Error notifications to Telegram
- ✅ Secure database connections

## 📊 Features

### Excel Export
- Embedded payment proof images
- Formatted headers
- Auto-fit columns
- Date-based filenames

### Error Monitoring
- Automatic crash detection
- Telegram notifications with error details
- Bot identification in messages
- Auto-restart on Azure

## 🛠️ Tech Stack

- TypeScript
- Grammy (Telegram bot framework)
- PostgreSQL (via Supabase)
- ExcelJS
- Axios

## 📄 License

Private - Relawanns Project

## 👨‍💻 Author

Relawanns Team
