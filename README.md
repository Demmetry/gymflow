# GymFlow — Gym Management SaaS

A complete gym management platform built with Next.js 14, Prisma, and Stripe.

## Quick Start (Ubuntu Linux)

### 1. Install Node.js (if not installed)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v   # Should show v20+
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup environment
```bash
cp .env.example .env
# The default SQLite config works out of the box
# Edit .env to change NEXTAUTH_SECRET to any random string
```

### 4. Setup database
```bash
npm run db:generate
npm run db:push
npm run db:seed
```

### 5. Run development server
```bash
npm run dev
# Open http://localhost:3000
```

### Demo Login
- Email: demo@gymflow.app
- Password: demo123456

## Deploy to Production (Vercel)

1. Push code to GitHub
2. Connect repo to Vercel
3. Add environment variables in Vercel dashboard
4. Change DATABASE_URL to a PostgreSQL URL (e.g., from Supabase or Neon)
5. Deploy!
