# AI Agent Context for Feeb Project

This document provides context and guidelines for AI coding assistants working on the Feeb project.

## Project Overview

**Feeb** is an allergen-aware kitchen assistant that helps users identify allergens in ingredients and recipes. It's a monorepo containing two main components:

1. **Web Frontend** (`apps/web/`) - React + TypeScript application with Supabase authentication
2. **Ingredient API** (`apps/api/`) - Python FastAPI service with OpenFoodFacts data integration

## Repository Structure

```
feeb/
├── apps/
│   ├── web/              # React frontend (Vite + TypeScript + Tailwind)
│   │   ├── src/
│   │   │   ├── components/    # Shadcn UI components
│   │   │   ├── contexts/      # React contexts (Auth, etc.)
│   │   │   ├── hooks/         # Custom React hooks
│   │   │   ├── pages/         # Page components
│   │   │   └── data/          # Mock/static data
│   │   └── package.json
│   │
│   └── api/              # Python FastAPI backend
│       ├── app/
│       │   ├── main.py        # FastAPI application entry
│       │   ├── models.py      # SQLAlchemy models
│       │   ├── routes.py      # API endpoints
│       │   ├── dal.py         # Data Access Layer
│       │   └── database.py    # Database connection
│       ├── data_pipeline/     # OpenFoodFacts import scripts
│       ├── alembic/           # Database migrations
│       ├── scripts/           # Utility scripts
│       └── requirements.txt
│
└── package.json          # Root workspace configuration
```

## Technology Stack

### Frontend (`apps/web/`)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI
- **Authentication**: Supabase (Email/Password + Google OAuth)
- **State Management**: React Context + Hooks
- **HTTP Client**: Fetch API
- **Package Manager**: pnpm

### Backend (`apps/api/`)
- **Framework**: FastAPI
- **Language**: Python 3.9-3.12
- **ORM**: SQLAlchemy 2.0 (async)
- **Database**: PostgreSQL 14+
- **Migrations**: Alembic
- **Data Source**: OpenFoodFacts
- **HTTP Client**: httpx (async)
- **Validation**: Pydantic

## Development Workflow

### Running the Application

```bash
# From repository root:

# Start frontend only
pnpm dev

# Start both frontend and API
pnpm dev:all

# API commands
pnpm api:dev           # Start API server
pnpm api:setup         # Initialize database
pnpm api:import        # Full OpenFoodFacts import
pnpm api:import:sample # Sample import (10k products)
pnpm api:status        # Check import status
pnpm api:test          # Run API tests

# Build frontend for production
pnpm build
```

### Using Docker (API)

The API can be run with Docker Compose:

```bash
cd apps/api
docker compose up -d           # Start services
./scripts/docker_migrate.sh    # Run migrations
./scripts/docker_import.sh     # Import data
```

## Code Conventions

### Frontend (`apps/web/`)

**File Organization:**
- Components use PascalCase: `MenuView.tsx`, `RecipeCard.tsx`
- Hooks use camelCase with `use` prefix: `useAuth.ts`, `useRecipes.ts`
- Utilities use camelCase: `utils.ts`, `api.ts`
- Constants use UPPER_SNAKE_CASE

**Component Patterns:**
```typescript
// Prefer functional components with TypeScript
interface ComponentProps {
  title: string;
  onAction: () => void;
}

export function Component({ title, onAction }: ComponentProps) {
  // Component logic
  return <div>{title}</div>;
}
```

**Shadcn UI:**
- Components are in `src/components/ui/`
- Generated via `pnpm dlx shadcn-ui@latest add <component>`
- Customizable via `components.json`

**Authentication:**
- Uses Supabase client initialized in `src/contexts/AuthContext.tsx`
- Protected routes check auth status
- Session managed automatically by Supabase

**Styling:**
- Use Tailwind utility classes
- Custom styles in `.css` files when necessary
- Follow mobile-first responsive design

### Backend (`apps/api/`)

**File Organization:**
- Models in `app/models.py` (SQLAlchemy)
- Routes in `app/routes.py` (FastAPI endpoints)
- Data Access Layer in `app/dal.py`
- Database connection in `app/database.py`
- Configuration in `app/config.py`

**Code Patterns:**
```python
# Use async/await consistently
async def get_ingredient(db: AsyncSession, name: str):
    result = await db.execute(select(Ingredient).where(Ingredient.name == name))
    return result.scalar_one_or_none()

# Pydantic models for validation
class IngredientResponse(BaseModel):
    code: str
    name: str
    allergens: list[AllergenInfo]
    
    class Config:
        from_attributes = True
```

**Database:**
- PostgreSQL with asyncpg driver
- Async SQLAlchemy ORM
- Alembic for migrations
- Connection pooling configured in `database.py`

**API Design:**
- RESTful endpoints
- Pydantic models for request/response validation
- No authentication required (public API)
- CORS enabled for frontend integration

## Important Implementation Details

### Frontend Authentication
- Supabase client is initialized in `AuthContext`
- Protected routes redirect to `/login` if unauthenticated
- Google OAuth requires setup in Supabase console
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

### API Data Import
- OpenFoodFacts data in 3 sources: ingredients, allergens, products
- Import scripts in `data_pipeline/`
- Sample import: ~10k products, ~5 minutes
- Full import: ~3.5M products, 45-80 minutes
- Status check: `./scripts/check_import_status.sh`

### Database Schema
- 6 main tables: `ingredient`, `allergen`, `ingredient_allergen`, `product`, `product_ingredient`, `product_allergen`
- Many-to-many relationships
- Indexed for performance
- Migrations in `alembic/versions/`

### Monorepo Management
- Uses pnpm workspaces
- Root `package.json` defines workspace scripts
- Each app (`web` and `api`) has its own `package.json`
- Python virtualenv in `apps/api/venv/`

## Common Tasks

### Adding a New Frontend Component
```bash
cd apps/web
# Use shadcn for UI components
pnpm dlx shadcn-ui@latest add <component-name>
# Or create custom component in src/components/
```

### Adding a New API Endpoint
1. Define route handler in `apps/api/app/routes.py`
2. Add Pydantic models for request/response
3. Implement data access in `apps/api/app/dal.py`
4. Update tests in `apps/api/tests/`

### Database Migration

**⚠️ CRITICAL: Always follow this workflow when changing database models to avoid data loss!**

When making changes to SQLAlchemy models in `apps/api/app/models.py`:

```bash
cd apps/api
source venv/bin/activate

# 1. Check current migration state
alembic current

# 2. Auto-generate migration based on model changes
alembic revision --autogenerate -m "Description of changes"

# 3. IMPORTANT: Review the generated migration file in alembic/versions/
#    - Check that it captures all your changes
#    - Verify upgrade() and downgrade() logic
#    - Look for data migration needs

# 4. Apply the migration
alembic upgrade head

# 5. Verify migration was applied
alembic current

# 6. Restart the API server to reload models
#    If running with --reload, it should auto-reload
```

**Common Migration Pitfalls:**

1. **Never edit models without creating a migration first**
   - Changing models.py without a migration causes the code to expect a schema that doesn't exist in the database
   - This results in runtime errors like "table/column doesn't exist"

2. **Always run `alembic upgrade head` after pulling new code**
   - If someone else created a migration, you need to apply it to your local database
   - Check with `alembic current` to see if you're behind

3. **SQLAlchemy Method Names:**
   - Use `nulls_last()` not `nullsLast()` (snake_case, not camelCase)
   - Use `model_validate()` not `from_orm()` (Pydantic v2 syntax)

4. **Handling Merge Conflicts:**
   - If multiple migration heads exist, create a merge migration:
     ```bash
     alembic merge -m "merge migration heads" <head1> <head2>
     alembic upgrade head
     ```

5. **Data Migration:**
   - If renaming/removing columns with data, add data migration logic in the migration file
   - Test migrations on a copy of production data before deploying

### Adding a New Dependency
```bash
# Frontend
cd apps/web
pnpm add <package-name>

# API
cd apps/api
source venv/bin/activate
pip install <package-name>
pip freeze > requirements.txt
```

## Environment Variables

### Frontend (`apps/web/.env`)
```env
VITE_SUPABASE_URL=your-project-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### API (`apps/api/.env`)
```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/feeb_db
SAMPLE_PRODUCT_LIMIT=10000  # Optional: limit import size
```

## Testing

### Frontend
```bash
cd apps/web
# Testing not yet fully configured
```

### API
```bash
cd apps/api
source venv/bin/activate
pytest tests/ -v
```

## Deployment

### Frontend
- Deploy to Vercel, Netlify, or Cloudflare Pages
- Build command: `pnpm build`
- Output directory: `apps/web/dist`
- Set environment variables in hosting platform

### API
- Docker recommended for deployment
- Use `docker-compose.yml` for local development
- Production: build Dockerfile and deploy to container platform
- Works seamlessly with Supabase PostgreSQL

## Known Issues & Gotchas

1. **Python 3.13 not supported** - Use Python 3.9-3.12 due to asyncpg compatibility
2. **Virtual environment activation** - Scripts require `source venv/bin/activate` before running
3. **Docker on Mac** - May require increased memory allocation for full imports
4. **Supabase auth** - Requires proper configuration of redirect URLs
5. **CORS** - API CORS is configured for development; update for production
6. **Data import time** - Full OpenFoodFacts import takes 45-80 minutes

## Documentation References

- **Main README**: `/README.md` - Project overview and setup
- **Docker Quick Start**: `/DOCKER_QUICKSTART.md` - Docker setup guide
- **API README**: `/apps/api/README.md` - Detailed API documentation
- **Web README**: `/apps/web/README.md` - Frontend setup
- **Scripts README**: `/apps/api/scripts/README.md` - Script documentation

## Security Guidelines for AI Agents

**⚠️ CRITICAL: Never expose secrets in documentation or code commits!**

### Documentation File Location

When creating debug, fix, or session documentation:

**✅ DO:**
- Save ALL documentation files to `.internal-docs/` directory
- Use naming: `FEATURE_NAME_FIX.md`, `FEATURE_NAME_COMPLETE.md`, etc.
- These files are automatically excluded from git via `.gitignore`

**❌ DON'T:**
- Save documentation files to repository root
- Create `*_FIX.md`, `*_COMPLETE.md`, `*_SUMMARY.md` files outside `.internal-docs/`
- Assume documentation files will be manually cleaned up

### Secret Redaction

When including configuration examples or debugging output:

**✅ DO - Use placeholders:**
```env
GEMINI_API_KEY=your_api_key_here
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/feeb_db
VITE_SUPABASE_URL=your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**❌ DON'T - Include actual values:**
```env
# WRONG - Never do this!
GEMINI_API_KEY=sd;gknaweognwoNGQOWN4&*#NNWFEF
DATABASE_URL=postgresql://admin:secretpass123@prod.example.com/db
```

### Secret Patterns to Always Redact

- **API Keys**: Google/Gemini API keys, Supabase keys, OpenAI keys
- **Passwords**: Database passwords, service passwords
- **Tokens**: Auth tokens, session tokens, JWT tokens
- **Connection Strings**: Full database URLs with credentials
- **Email Addresses**: Personal or production email addresses
- **Domain Names**: Production domains (use `example.com` instead)
- **IP Addresses**: Production server IPs

### Placeholder Patterns

Use these placeholder formats:
- API Keys: `your_api_key_here`, `xxx...xxx`, `<REDACTED>`
- Passwords: `your_password`, `<password>`, `***`
- URLs: `your-project.supabase.co`, `example.com`, `localhost`
- Emails: `user@example.com`, `your-email@domain.com`

### Before Creating Any File

Ask yourself:
1. Does this file contain any secrets or credentials?
2. Should this file be in `.internal-docs/` instead of repo root?
3. Have I redacted all sensitive information?
4. Would I be comfortable with this being in a public repository?

## Git Workflow

- Main branch: `main`
- Clean working tree preferred
- Use conventional commits when possible
- Test changes before committing
- Python code should be formatted with `black`
- TypeScript code should pass ESLint
- **Never commit files containing secrets** - check `.gitignore` includes them

## Contact & Support

- Repository: https://github.com/AlexanderKok/feeb
- Issues: Use GitHub Issues for bug reports
- Discussions: Use GitHub Discussions for questions

---

**Last Updated**: October 22, 2025

**Note for AI Agents**: This project is actively developed. Always check the latest README files for updates. When making changes, consider the impact across the monorepo and test both frontend and backend integration.

# instruction for Codex:
Do not modify or stage changes to `pnpm-lock.yaml` or any lockfiles. 
If dependencies are needed, assume they are already installed.