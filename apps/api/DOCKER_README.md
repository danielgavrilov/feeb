# Docker Development Setup

This guide explains how to run the FastAPI backend with PostgreSQL using Docker for local development.

## 🚀 Quick Start

### 1. Prerequisites

- Docker Desktop installed and running
- Docker Compose (included with Docker Desktop)

### 2. Setup Environment

Copy the example environment file:

```bash
cp .env.docker.example .env
```

The default configuration should work out of the box:
- PostgreSQL user: `feeb_user`
- PostgreSQL password: `feeb_password`
- PostgreSQL database: `feeb_db`
- API port: `8000`

### 3. Start Services

**Note:** Docker Compose can be invoked as either `docker-compose` (older) or `docker compose` (newer). Use whichever is installed on your system. The helper scripts automatically detect the correct command.

```bash
# Using docker-compose (older versions)
docker-compose up

# OR using docker compose (newer versions)
docker compose up
```

Or run in detached mode (background):

```bash
docker-compose up -d
# OR
docker compose up -d
```

This will:
1. Pull the PostgreSQL 15 Alpine image
2. Build the FastAPI application image
3. Create a persistent volume for PostgreSQL data
4. Start both services with proper networking

### 4. Run Database Migrations

Once the services are running, execute Alembic migrations:

```bash
./scripts/docker_migrate.sh
```

Or manually:

```bash
docker-compose exec api alembic upgrade head
```

### 5. Verify Setup

Check that the API is running:

```bash
curl http://localhost:8000/health
```

Or visit http://localhost:8000/docs in your browser to see the interactive API documentation.

---

## 📋 Common Commands

### View Logs

```bash
# All services
docker-compose logs -f

# Just the API
docker-compose logs -f api

# Just PostgreSQL
docker-compose logs -f postgres
```

### Stop Services

```bash
# Stop containers (data persists)
docker-compose stop

# Stop and remove containers (data persists in volume)
docker-compose down

# Stop, remove containers AND delete data
docker-compose down -v
```

### Restart Services

```bash
# Restart all services
docker-compose restart

# Restart just the API
docker-compose restart api
```

### Access PostgreSQL

Connect to PostgreSQL using the helper script:

```bash
./scripts/docker_psql.sh
```

Or manually:

```bash
docker-compose exec postgres psql -U feeb_user -d feeb_db
```

Common PostgreSQL commands:
```sql
-- List tables
\dt

-- Describe a table
\d table_name

-- List databases
\l

-- Quit
\q
```

### Import OpenFoodFacts Data

```bash
./scripts/docker_import.sh
```

Or manually:

```bash
docker-compose exec api python -m data_pipeline.import_off
```

### Rebuild Containers

If you change dependencies or the Dockerfile:

```bash
docker-compose up --build
```

---

## 🔧 Development Workflow

### Hot Reload

The API container is configured with volume mounts for hot reload:
- Changes to files in `app/` directory will automatically reload the server
- Changes to `requirements.txt` require rebuilding: `docker-compose up --build`

### Running Tests

```bash
docker-compose exec api pytest
```

### Create New Migration

```bash
docker-compose exec api alembic revision --autogenerate -m "description"
```

### Accessing Container Shell

```bash
# API container
docker-compose exec api bash

# PostgreSQL container
docker-compose exec postgres sh
```

---

## 🌐 Connecting Frontend

The React frontend should connect to the dockerized API using:

### Frontend Environment Setup

Create or update `apps/web/.env`:

```env
VITE_API_URL=http://localhost:8000
```

The frontend API client (`src/lib/api.ts`) is already configured to use this environment variable.

### Start Frontend Development Server

From `apps/web/` directory:

```bash
npm run dev
```

The frontend will run on port 5173 (default Vite port) and connect to the dockerized API on port 8000.

---

## 🐛 Troubleshooting

### Port Already in Use

If port 8000 or 5432 is already in use:

1. Stop the conflicting service
2. Or modify `docker-compose.yml` to use different ports:
   ```yaml
   ports:
     - "8001:8000"  # Maps container port 8000 to host port 8001
   ```

### PostgreSQL Connection Issues

Check that the postgres service is healthy:

```bash
docker-compose ps
```

The `STATUS` should show "healthy". If not, check logs:

```bash
docker-compose logs postgres
```

### API Won't Start

1. Check if postgres is healthy first
2. View API logs:
   ```bash
   docker-compose logs api
   ```
3. Verify environment variables are set correctly in `.env`

### Database Permission Errors

If you encounter permission errors, ensure the postgres volume has proper ownership:

```bash
docker-compose down -v  # Warning: This deletes all data!
docker-compose up
```

### Clean Slate

To completely reset everything:

```bash
# Stop and remove everything
docker-compose down -v

# Remove all images (optional)
docker-compose down --rmi all

# Start fresh
docker-compose up --build
```

---

## 📊 Database Management

### Backup Database

```bash
docker-compose exec postgres pg_dump -U feeb_user feeb_db > backup.sql
```

### Restore Database

```bash
cat backup.sql | docker-compose exec -T postgres psql -U feeb_user -d feeb_db
```

### View Database Size

```bash
docker-compose exec postgres psql -U feeb_user -d feeb_db -c "\l+"
```

---

## 🚢 Supabase Migration Path

This Docker setup is designed to be compatible with Supabase. When you're ready to migrate:

1. **Export your schema** (Alembic migrations will work the same)
2. **Update environment variables**:
   ```env
   DATABASE_URL=postgresql+asyncpg://user:password@db.xxx.supabase.co:5432/postgres
   ```
3. **Run migrations** against Supabase:
   ```bash
   alembic upgrade head
   ```

No code changes required! The same asyncpg driver and SQLAlchemy models work with both local PostgreSQL and Supabase.

---

## 📝 Architecture

```
┌─────────────────────────────────────────────┐
│  Host Machine                               │
│                                             │
│  ┌─────────────────┐                       │
│  │  Frontend       │                       │
│  │  (npm run dev)  │                       │
│  │  Port: 5173     │                       │
│  └────────┬────────┘                       │
│           │                                 │
│           │ HTTP :8000                      │
│           ▼                                 │
│  ┌─────────────────────────────────────┐  │
│  │  Docker Compose Network             │  │
│  │                                     │  │
│  │  ┌──────────────┐  ┌─────────────┐ │  │
│  │  │  API         │  │  PostgreSQL │ │  │
│  │  │  Container   ├──┤  Container  │ │  │
│  │  │  Port: 8000  │  │  Port: 5432 │ │  │
│  │  └──────────────┘  └─────────────┘ │  │
│  │                                     │  │
│  │  Volume: postgres_data (persistent) │  │
│  └─────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

---

## 🎯 Next Steps

1. ✅ Docker services running
2. ✅ Database migrations applied
3. ✅ Data imported (optional)
4. ✅ Frontend connected
5. 🚀 Start building!

For API usage and endpoints, see the main [README.md](README.md) or visit http://localhost:8000/docs

