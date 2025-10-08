# Troubleshooting Guide

Common issues and solutions for the Allergen-Aware Ingredient API.

---

## Python Version Issues

### ❌ Error: `asyncpg` fails to build with Python 3.13

**Symptoms:**
```
error: command '/usr/bin/clang' failed with exit code 1
ERROR: Failed building wheel for asyncpg
```

**Cause:** `asyncpg` has C extensions that are not yet compatible with Python 3.13.

**Solution:** Use Python 3.9, 3.10, 3.11, or 3.12

```bash
# Check your Python version
python --version

# If you have Python 3.13, use an older version
# Option 1: Use system Python 3.9-3.12
python3.12 -m venv venv

# Option 2: Use pyenv to install Python 3.12
pyenv install 3.12.0
pyenv local 3.12.0
python -m venv venv
```

**Alternative:** Use the existing feeb project venv (if it has Python 3.9-3.12):
```bash
# From ingredient-api directory
deactivate  # if in another venv
source ../feeb/.venv/bin/activate
pip install -r requirements.txt
```

---

## Environment Configuration Issues

### ❌ Error: `cp: .env.sample: No such file or directory`

**Cause:** The file is named `env.example` not `.env.sample`

**Solution:**
```bash
cp env.example .env
```

Or create `.env` directly:
```bash
cat > .env << 'EOF'
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/feeb_db
OFF_BASE_URL=https://world.openfoodfacts.org
DATA_SOURCE=off
SAMPLE_PRODUCT_LIMIT=10000
EOF
```

Then edit with your actual database credentials:
```bash
nano .env  # or vim, code, etc.
```

---

## Database Connection Issues

### ❌ Error: `connection to server ... failed`

**Symptoms:**
- Can't connect to PostgreSQL
- "db_connected": false in health check

**Solutions:**

1. **Verify PostgreSQL is running:**
```bash
# macOS with Homebrew
brew services list | grep postgresql

# Start if not running
brew services start postgresql@14
```

2. **Check if database exists:**
```bash
psql -U postgres -l | grep feeb_db
```

3. **Create database if missing:**
```bash
psql -U postgres -c "CREATE DATABASE feeb_db;"
```

4. **Test connection string:**
```bash
# Format: postgresql+asyncpg://USER:PASSWORD@HOST:PORT/DATABASE
# Example: postgresql+asyncpg://postgres:mypassword@localhost:5432/feeb_db

psql "postgresql://postgres:password@localhost:5432/feeb_db" -c "SELECT 1;"
```

5. **Update .env with correct credentials:**
```bash
# Edit .env file
DATABASE_URL=postgresql+asyncpg://YOUR_USER:YOUR_PASSWORD@localhost:5432/feeb_db
```

---

## Module/Import Errors

### ❌ Error: `ModuleNotFoundError: No module named 'app'`

**Cause:** Running from wrong directory or venv not activated

**Solution:**
```bash
# Make sure you're in the ingredient-api directory
cd /path/to/ingredient-api

# Activate virtual environment
source venv/bin/activate

# Verify packages installed
pip list | grep fastapi
```

---

## Alembic Migration Issues

### ❌ Error: `Can't locate revision identified by ...`

**Cause:** No migrations created yet

**Solution:**
```bash
# Create first migration
./scripts/init_migration.sh

# Or manually
alembic revision --autogenerate -m "Create ingredient allergen tables"
alembic upgrade head
```

### ❌ Error: `Target database is not up to date`

**Solution:**
```bash
# Apply all pending migrations
alembic upgrade head

# Check current version
alembic current

# View migration history
alembic history
```

---

## Data Import Issues

### ❌ Error: Import takes too long or runs out of memory

**Solution:** Reduce the product import limit

```bash
# Edit .env
SAMPLE_PRODUCT_LIMIT=1000  # Instead of 10000

# Re-run import
python -m data_pipeline.import_off
```

### ❌ Error: Download fails or times out

**Solutions:**

1. **Check internet connection:**
```bash
curl -I https://static.openfoodfacts.org
```

2. **Retry the import** - downloads resume automatically

3. **Use smaller dataset:**
```bash
# In .env
SAMPLE_PRODUCT_LIMIT=500
```

---

## API Server Issues

### ❌ Error: `Address already in use`

**Cause:** Port 8000 is already in use

**Solution:**
```bash
# Option 1: Use different port
uvicorn app.main:app --reload --port 8001

# Option 2: Kill process using port 8000
lsof -ti:8000 | xargs kill -9
```

### ❌ Error: `APPLICATION_ERROR` on startup

**Cause:** Database connection failed or migrations not applied

**Solution:**
```bash
# Check database connection
psql "$DATABASE_URL" -c "SELECT 1;"

# Apply migrations
alembic upgrade head

# Check for detailed error
uvicorn app.main:app --reload --log-level debug
```

---

## Testing Issues

### ❌ Error: Tests fail with database errors

**Cause:** Test database or aiosqlite not installed

**Solution:**
```bash
# Install test dependencies
pip install pytest pytest-asyncio aiosqlite

# Run tests
pytest tests/ -v
```

---

## Quick Fixes Checklist

When things don't work, try these in order:

- [ ] Check Python version: `python --version` (should be 3.9-3.12)
- [ ] Activate venv: `source venv/bin/activate`
- [ ] Install dependencies: `pip install -r requirements.txt`
- [ ] Create .env: `cp env.example .env`
- [ ] Edit .env with real database credentials
- [ ] Test database connection: `psql "$DATABASE_URL" -c "SELECT 1;"`
- [ ] Run migrations: `alembic upgrade head`
- [ ] Start server: `uvicorn app.main:app --reload`
- [ ] Test health: `curl http://localhost:8000/health`

---

## Still Having Issues?

1. **Check logs:**
```bash
# Run with debug logging
uvicorn app.main:app --reload --log-level debug
```

2. **Verify installation:**
```bash
# Check all installed packages
pip list

# Verify required packages
pip install -r requirements.txt --dry-run
```

3. **Start fresh:**
```bash
# Remove venv and start over
deactivate
rm -rf venv
python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

4. **Check the README:**
- [README.md](README.md) - Full documentation
- [QUICKSTART.md](QUICKSTART.md) - Step-by-step guide
- [GETTING_STARTED.md](GETTING_STARTED.md) - Beginner guide

---

## Getting Help

If you're still stuck:

1. Check if it's a known issue in the GitHub issues
2. Review the full error message and stack trace
3. Verify all prerequisites are met
4. Try the "start fresh" steps above

## Common Error Messages Reference

| Error | Fix |
|-------|-----|
| `asyncpg` build fails | Use Python 3.9-3.12, not 3.13 |
| `.env.sample` not found | Use `env.example` instead |
| Database connection failed | Check PostgreSQL is running and credentials in .env |
| Module not found | Activate venv and install requirements |
| Port already in use | Use different port or kill existing process |
| Alembic errors | Run `alembic upgrade head` |
| Import takes too long | Reduce `SAMPLE_PRODUCT_LIMIT` in .env |

---

**Last Updated:** October 7, 2025

