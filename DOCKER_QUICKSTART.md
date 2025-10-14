# Docker Quick Start Guide

Get the Feeb backend running with PostgreSQL in 3 minutes.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop) installed and running

## Quick Start

### 1. Start Backend Services

```bash
cd apps/api

# Start PostgreSQL + FastAPI in Docker
docker compose up -d
```

**Expected output:**
```
✔ Container feeb-postgres  Running
✔ Container feeb-api       Running
```

### 2. Run Database Migrations

```bash
# Still in apps/api/
./scripts/docker_migrate.sh
```

**Expected output:**
```
🔄 Running Alembic migrations in Docker container...
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
✅ Migrations completed successfully!
```

### 3. Verify API is Running

```bash
curl http://localhost:8000/health
```

**Expected output:**
```json
{"status":"ok","db_connected":true}
```

Or visit http://localhost:8000/docs in your browser to see the API documentation.

### 4. Start Frontend (Optional)

```bash
cd apps/web

# Create environment file
echo "VITE_API_URL=http://localhost:8000" > .env

# Start frontend dev server
npm run dev
```

Visit http://localhost:5173 to see the frontend.

## Common Commands

```bash
# View logs
docker compose logs -f

# Stop services (data persists)
docker compose down

# Restart services
docker compose restart

# Access PostgreSQL shell
./scripts/docker_psql.sh

# Import OpenFoodFacts data (optional, takes 5-10 minutes)
./scripts/docker_import.sh
```

## Troubleshooting

### "Cannot connect to Docker daemon"
- Make sure Docker Desktop is running
- On Linux, add your user to the docker group: `sudo usermod -aG docker $USER`

### "Port 8000 is already in use"
Edit `apps/api/docker-compose.yml` and change the port mapping:
```yaml
api:
  ports:
    - "8001:8000"  # Changed from 8000:8000
```

Then update frontend .env: `VITE_API_URL=http://localhost:8001`

### "Migration failed" or "Database connection error"
```bash
# Check if postgres is healthy
docker ps

# If not healthy, restart
docker compose restart postgres

# Wait 5 seconds, then try migration again
./scripts/docker_migrate.sh
```

### Fresh Start (Deletes All Data!)
```bash
docker compose down -v
docker compose up -d
./scripts/docker_migrate.sh
```

## What's Running?

- **PostgreSQL**: http://localhost:5432
  - Database: `feeb_db`
  - User: `feeb_user`
  - Password: `feeb_password`

- **FastAPI**: http://localhost:8000
  - API Docs: http://localhost:8000/docs
  - Health Check: http://localhost:8000/health

- **Frontend** (if started): http://localhost:5173

## Next Steps

1. ✅ Services running
2. ✅ Migrations applied
3. 📥 [Optional] Import data with `./scripts/docker_import.sh`
4. 🚀 Start building!

## Learn More

- [Detailed Docker Documentation](apps/api/DOCKER_README.md)
- [Implementation Details](apps/api/DOCKER_IMPLEMENTATION.md)
- [Frontend Integration Guide](apps/web/DOCKER_INTEGRATION.md)
- [API Documentation](apps/api/README.md)

---

**Need help?** Check the troubleshooting sections in the detailed documentation above.

