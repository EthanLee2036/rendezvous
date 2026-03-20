# RendezVous — Smart Scheduling (Multi-user)

A Doodle alternative with user accounts, visual time grid, timezone support, and real-time voting.

## Features
- 🔐 User accounts (email/password + Google login)
- 📅 Each user only sees their own polls
- 🎨 Drag-to-paint time slot grid with presets
- 🌐 Timezone detection + conversion
- 🗳️ Public voting — no login needed to vote
- 📊 Live results + best slot detection
- 📥 CSV export

## Quick Start

### 1. Supabase Setup
1. Create project at [supabase.com](https://supabase.com)
2. Run `supabase-setup.sql` in SQL Editor
3. Enable Google Auth: Authentication → Providers → Google → toggle ON
4. Copy Project URL + Publishable key from Settings → API Keys

### 2. Local Dev
```bash
cp .env.local.example .env.local   # fill in Supabase credentials
npm install
npm run dev
```

### 3. Deploy to Vercel
1. Push to GitHub
2. Import in [vercel.com](https://vercel.com)
3. Add environment variables
4. Deploy

## How It Works
- **Logged-in users**: See dashboard with their polls, can create/delete polls
- **Anonymous visitors**: Can only access poll voting pages via direct link
- **Poll creator** shares `yourdomain.com/poll/abc-123` — voters open and vote, no signup needed
- Each user's polls are completely private from other users

## Google OAuth Setup (Optional)
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth credentials (Web application)
3. Set authorized redirect URI: `https://YOUR-PROJECT-ID.supabase.co/auth/v1/callback`
4. In Supabase: Authentication → Providers → Google → paste Client ID + Secret
