# Feeb Setup Guide

This guide will help you set up the Feeb monorepo for local development.

## Prerequisites

Before you begin, ensure you have:

- ✅ Node.js 20+ installed
- ✅ pnpm 8+ installed (`npm install -g pnpm`)
- ✅ Python 3.9-3.12 installed
- ✅ PostgreSQL 14+ (for the ingredient API)
- ✅ A Supabase account (free tier works)

## Step-by-Step Setup

### 1. Clone and Install Dependencies

```bash
git clone https://github.com/AlexanderKok/feeb.git
cd feeb
pnpm install
```

This will install all dependencies for the frontend and CLI tool.

### 2. Set Up Supabase Authentication

#### Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/sign in
2. Click "New Project"
3. Fill in:
   - **Name**: feeb (or your preferred name)
   - **Database Password**: Choose a strong password
   - **Region**: Choose closest to you
4. Wait for the project to be created (~2 minutes)

#### Get Your Credentials

1. In your Supabase project, go to **Settings** > **API**
2. Copy the following values:
   - **Project URL** (under "Project URL")
   - **anon public** key (under "Project API keys")

#### Configure the Frontend

Create a `.env` file in `apps/web/`:

```bash
cd apps/web
cat > .env << EOF
VITE_SUPABASE_URL=your-project-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
EOF
```

Replace `your-project-url.supabase.co` and `your-anon-key` with your actual values.

#### Enable Google OAuth (Optional)

If you want to enable Google sign-in:

1. Get OAuth credentials from [Google Cloud Console](https://console.cloud.google.com)
2. In Supabase, go to **Authentication** > **Providers**
3. Click on **Google** and enable it
4. Add your Client ID and Client Secret

### 3. Set Up the Ingredient API

#### Create Python Virtual Environment

```bash
cd apps/api
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

#### Configure Database

For development, you can use SQLite (easier) or PostgreSQL (production-like).

**Option A: SQLite (Recommended for Development)**

```bash
cp env.example .env
# Edit .env and set:
# DATABASE_URL=sqlite+aiosqlite:///./ingredient_api.db
```

**Option B: PostgreSQL**

```bash
cp env.example .env
# Edit .env and set:
# DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/feeb_db
```

#### Initialize Database

```bash
# Run migrations
alembic upgrade head

# Import sample data (10k products, ~5 minutes)
SAMPLE_PRODUCT_LIMIT=10000 python -m data_pipeline.import_off
```

Or use the root-level command:
```bash
cd ../..  # Back to root
pnpm api:import:sample
```

### 4. Start Development

#### Option A: Frontend Only

```bash
# From repository root
pnpm dev
```

Visit `http://localhost:5173` - you'll see the login page.

#### Option B: Frontend + API

```bash
# Terminal 1: Start frontend
pnpm dev

# Terminal 2: Start API
pnpm api:dev

# Or use concurrently:
pnpm dev:all
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:8000`
- API Docs: `http://localhost:8000/docs`

## Testing the Setup

### Test Frontend Authentication

1. Visit `http://localhost:5173`
2. Click "Sign up" 
3. Create an account with email/password
4. Check your email for confirmation (Supabase sends a confirmation email)
5. Click the confirmation link
6. Sign in with your credentials
7. You should see the main app interface

### Test the API

```bash
# Check API health
curl http://localhost:8000/health

# Search for an ingredient
curl "http://localhost:8000/ingredients/wheat"

# Expected response: ingredient data with allergens
```

## Troubleshooting

### Frontend: "Supabase URL or Anon Key is missing"

- Make sure you created `apps/web/.env` with the correct values
- Restart the dev server after creating the `.env` file

### API: Database connection error

- Check your `DATABASE_URL` in `apps/api/.env`
- For PostgreSQL, ensure the database exists and is running
- For SQLite, the database file will be created automatically

### API: "No data found"

- You need to import data first: `pnpm api:import:sample`
- Check import status: `pnpm api:status`

### pnpm: "No package.json found"

- Make sure you're running `pnpm dev` from the repository root
- If you're in a subdirectory, navigate back: `cd ../..`

## Next Steps

- Read the [main README](./README.md) for detailed documentation
- Check out the [frontend README](./apps/web/README.md)
- Explore the [API documentation](./apps/api/README.md)
- Start building your allergen-aware kitchen assistant! 🍳

## Quick Reference

```bash
# Frontend development
pnpm dev              # Start frontend
pnpm build            # Build for production

# API development  
pnpm api:dev          # Start API server
pnpm api:import       # Import full dataset
pnpm api:import:sample # Import sample (10k)
pnpm api:test         # Run tests
pnpm api:status       # Check import status

# Both services
pnpm dev:all          # Run frontend + API
```

## Getting Help

- Check the [troubleshooting section](./apps/api/TROUBLESHOOTING.md) in the API docs
- Open an issue on GitHub
- Review the Supabase [authentication docs](https://supabase.com/docs/guides/auth)

---

Happy coding! 🚀

