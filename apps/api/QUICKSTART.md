# Quick Start Guide

Get the Allergen-Aware Ingredient API running in 5 minutes!

## Prerequisites

✓ Python 3.9, 3.10, 3.11, or 3.12 (⚠️ Python 3.13 not yet supported)  
✓ PostgreSQL 14 or higher  
✓ 3GB free disk space (for OpenFoodFacts data)

## Step-by-Step Setup

### 1. Install Dependencies

```bash
cd ingredient-api

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install packages
pip install -r requirements.txt
```

### 2. Configure Database

Create a `.env` file:

```bash
cp env.example .env
```

Edit `.env` and set your PostgreSQL connection:

```env
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/feeb_db
```

**Important:** Make sure the database exists:

```bash
# If database doesn't exist, create it
psql -U postgres -c "CREATE DATABASE feeb_db;"
```

### 3. Run Database Migrations

```bash
# Option A: Use the setup script
./scripts/setup_db.sh

# Option B: Run manually
alembic upgrade head
```

You should see:
```
INFO  [alembic.runtime.migration] Running upgrade -> xxxxx, Create ingredient allergen tables
```

### 4. Import OpenFoodFacts Data

**Note:** This downloads ~2GB and takes 15-30 minutes.

```bash
# Option A: Use the import script
./scripts/run_import.sh

# Option B: Run manually
python -m data_pipeline.import_off
```

**Want to test faster?** Limit products in `.env`:

```env
SAMPLE_PRODUCT_LIMIT=1000  # Import only 1,000 products (takes ~2 minutes)
```

### 5. Start the API Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

### 6. Test the API

Open your browser to: **http://localhost:8000/docs**

Or test with curl:

```bash
# Health check
curl http://localhost:8000/health

# Search for wheat
curl http://localhost:8000/ingredients/wheat

# Get product by barcode (if imported)
curl http://localhost:8000/products/3017620422003
```

## Verification Checklist

After setup, verify everything works:

- [ ] API responds at http://localhost:8000
- [ ] `/health` endpoint returns `{"status": "ok", "db_connected": true}`
- [ ] `/docs` shows interactive Swagger UI
- [ ] Database contains ingredients: 
  ```sql
  SELECT COUNT(*) FROM ingredient;  -- Should show ~50,000
  ```
- [ ] Database contains allergens:
  ```sql
  SELECT COUNT(*) FROM allergen;  -- Should show ~100
  ```
- [ ] Database contains products:
  ```sql
  SELECT COUNT(*) FROM product;  -- Should show 10,000 (or your SAMPLE_PRODUCT_LIMIT)
  ```

## Common Issues

### "Database connection failed"

**Solution:** Check your `DATABASE_URL` in `.env`

```bash
# Test connection manually
psql "postgresql://postgres:password@localhost:5432/feeb_db" -c "SELECT 1;"
```

### "ModuleNotFoundError: No module named 'app'"

**Solution:** Run commands from the `ingredient-api` directory and ensure venv is activated

```bash
cd ingredient-api
source venv/bin/activate
```

### "Import takes too long"

**Solution:** Reduce product limit

```env
# In .env
SAMPLE_PRODUCT_LIMIT=1000
```

### "Port 8000 already in use"

**Solution:** Use a different port

```bash
uvicorn app.main:app --reload --port 8001
```

## Next Steps

- **Run Tests:** `pytest tests/ -v`
- **View Docs:** http://localhost:8000/docs
- **Integrate with Hono:** See README.md section "Integration with Hono Backend"
- **Production Deploy:** See README.md section "Deployment"

## Development Workflow

```bash
# Activate environment
source venv/bin/activate

# Start API with auto-reload
uvicorn app.main:app --reload

# In another terminal, run tests
pytest tests/ -v --cov=app

# Create new migration after model changes
alembic revision --autogenerate -m "Your change description"
alembic upgrade head
```

---

**Need Help?** Check the full [README.md](README.md) or open an issue.

