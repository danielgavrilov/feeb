# Feeb - Allergen-Aware Kitchen Assistant

A monorepo containing the complete Feeb application ecosystem, including a React frontend, Python ingredient API, and development tooling.

## 🏗️ Repository Structure

```
feeb/
├── apps/
│   ├── web/          # React + TypeScript frontend (Lovable design)
│   └── api/          # Python FastAPI ingredient database
├── feeb/             # create-volo-app CLI tool
├── package.json      # Root workspace configuration
└── pnpm-workspace.yaml
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+
- Python 3.9-3.12
- PostgreSQL 14+ (for production API)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/AlexanderKok/feeb.git
   cd feeb
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Set up Supabase (Frontend Authentication):**
   - Create a project at [supabase.com](https://supabase.com)
   - Copy your project URL and anon key
   - Create `apps/web/.env`:
     ```env
     VITE_SUPABASE_URL=your-project-url.supabase.co
     VITE_SUPABASE_ANON_KEY=your-anon-key
     ```

4. **Start the frontend:**
   ```bash
   pnpm dev
   ```
   The app will be available at `http://localhost:5173`

## 📱 Frontend (apps/web)

React application built with Vite, TypeScript, and Shadcn UI components.

### Features
- 🔐 Supabase Authentication (Email/Password + Google OAuth)
- 🎨 Modern UI with Tailwind CSS
- 📱 Responsive design
- 🍳 Recipe management and allergen tracking

### Development
```bash
# Start dev server
pnpm dev

# Build for production
pnpm build
```

### Authentication Setup

The frontend uses Supabase for authentication. You need to:

1. Create a Supabase project
2. Enable Email provider in Authentication > Providers
3. (Optional) Enable Google OAuth:
   - Get OAuth credentials from Google Cloud Console
   - Add them to Supabase Authentication > Providers > Google
4. Add your Supabase credentials to `apps/web/.env`

## 🔌 Ingredient API (apps/api)

Python FastAPI service providing ingredient and allergen data from OpenFoodFacts.

### Features
- 🔍 Ingredient search with allergen detection
- 🥜 OpenFoodFacts integration
- 📊 PostgreSQL database with async SQLAlchemy
- 🚀 No authentication required (public API)
- 🐳 Docker support for easy setup

### 🐳 Docker Setup (Recommended)

The easiest way to get started with the API and PostgreSQL:

```bash
cd apps/api

# Start PostgreSQL + FastAPI in Docker
docker compose up -d

# Run database migrations
./scripts/docker_migrate.sh

# (Optional) Import OpenFoodFacts data
./scripts/docker_import.sh
```

That's it! API is now running at http://localhost:8000

📖 **See [DOCKER_QUICKSTART.md](DOCKER_QUICKSTART.md) for detailed instructions**

### 💻 Manual Setup (Alternative)

<details>
<summary>Click to expand manual setup instructions</summary>

1. **Navigate to API directory:**
   ```bash
   cd apps/api
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure database:**
   ```bash
   cp env.example .env
   # Edit .env with your PostgreSQL connection string
   ```

5. **Run migrations:**
   ```bash
   alembic upgrade head
   ```

6. **Import data:**
   ```bash
   # Sample import (10k products, ~5 minutes)
   pnpm api:import:sample

   # Or full import (~3.5M products, 45-80 minutes)
   pnpm api:import
   ```

7. **Start the API:**
   ```bash
   pnpm api:dev
   ```
   API available at `http://localhost:8000`
   Docs at `http://localhost:8000/docs`

</details>

### API Scripts (from root)

```bash
pnpm api:dev          # Start development server
pnpm api:setup        # Initialize database
pnpm api:import       # Full data import
pnpm api:import:sample # Sample import (10k products)
pnpm api:status       # Check import status
pnpm api:test         # Run tests
```

## 🛠️ CLI Tool (feeb/)

The `create-volo-app` CLI for scaffolding full-stack applications.

### Development
```bash
pnpm cli:build        # Build the CLI
pnpm cli:test         # Test the CLI
```

See [feeb/README.md](./feeb/README.md) for detailed documentation.

## 📦 Workspace Scripts

All scripts can be run from the repository root:

```bash
# Frontend
pnpm dev              # Start frontend dev server
pnpm build            # Build frontend for production

# Run both frontend and API
pnpm dev:all          # Start frontend + API concurrently

# API (Python)
pnpm api:dev          # Start API server
pnpm api:setup        # Initialize database
pnpm api:import       # Import OpenFoodFacts data
pnpm api:test         # Run API tests

# CLI Tool
pnpm cli:build        # Build create-volo-app
pnpm cli:test         # Test create-volo-app
```

## 🔧 Development Workflow

### Working on the Frontend

```bash
# Install new dependencies
cd apps/web
pnpm add <package-name>

# Or from root
pnpm --filter web add <package-name>
```

### Working on the API

```bash
# From root
cd apps/api
source venv/bin/activate
pip install <package-name>
pip freeze > requirements.txt
```

### Running Both Services

```bash
# Terminal 1: Frontend
pnpm dev

# Terminal 2: API
pnpm api:dev

# Or use concurrently:
pnpm dev:all
```

## 🌐 Architecture

### Frontend → API Integration

The frontend can call the ingredient API:

```typescript
// Example: Fetch ingredient data
const response = await fetch(
  `http://localhost:8000/ingredients/${encodeURIComponent(ingredientName)}`
);
const data = await response.json();
```

### Authentication Flow

1. User visits the app → redirected to `/login`
2. User signs up/signs in with Supabase
3. Supabase manages session and tokens
4. Protected routes check authentication status
5. Ingredient API remains public (no auth required)

## 📚 Documentation

### Quick Start Guides
- [Docker Quick Start](./DOCKER_QUICKSTART.md) - Get started with Docker in 3 minutes

### Component Documentation
- [Frontend Documentation](./apps/web/README.md)
- [API Documentation](./apps/api/README.md)
- [Docker Setup Guide](./apps/api/DOCKER_README.md)
- [Frontend Docker Integration](./apps/web/DOCKER_INTEGRATION.md)
- [CLI Tool Documentation](./feeb/README.md)

## 🧪 Testing

```bash
# Frontend tests (if configured)
pnpm --filter web test

# API tests
pnpm api:test
```

## 🚢 Deployment

### Frontend (Vercel/Netlify/Cloudflare Pages)

```bash
cd apps/web
pnpm build
# Deploy the `dist` folder
```

Environment variables needed:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### API (Docker)

For local development, use Docker Compose (see [DOCKER_QUICKSTART.md](DOCKER_QUICKSTART.md)):

```bash
cd apps/api
docker compose up -d
```

For production deployment:

```bash
cd apps/api
docker build -t feeb-api .
docker run -p 8000:8000 --env-file .env feeb-api
```

### Supabase Migration

The API is designed to work seamlessly with Supabase PostgreSQL. To migrate:

1. Get your Supabase connection string
2. Update `apps/api/.env`:
   ```env
   DATABASE_URL=postgresql+asyncpg://postgres.xxx:[password]@db.xxx.supabase.com:5432/postgres
   ```
3. Run migrations: `alembic upgrade head`

No code changes needed!

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details

## 🙏 Acknowledgments

- [OpenFoodFacts](https://world.openfoodfacts.org) - Open food database
- [Supabase](https://supabase.com) - Authentication and database
- [Lovable](https://lovable.dev) - Frontend design
- [create-volo-app](https://github.com/VoloBuilds/create-volo-app) - Project scaffolding

---

**Built with ❤️ for safer cooking**

