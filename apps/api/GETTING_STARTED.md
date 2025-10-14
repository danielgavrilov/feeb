# Getting Started with Allergen-Aware Ingredient API

Welcome! This guide will help you understand what this API does and how to use it.

## What is This?

The Allergen-Aware Ingredient API is a microservice that helps identify allergens in food products. It uses data from OpenFoodFacts (the Wikipedia of food) to provide:

- 🔍 **Ingredient Information** - Look up any ingredient and see what allergens it contains
- 📦 **Product Details** - Scan a barcode and get full ingredient and allergen information
- 🥜 **Allergen Detection** - Automatically identify allergens based on ingredients

## Who Should Use This?

- **App Developers** - Building food allergy tracking apps
- **Backend Engineers** - Need ingredient/allergen data for your service
- **Data Scientists** - Analyzing food composition and allergens
- **Anyone** - Who needs programmatic access to food allergen data

## Quick Example

Once running, you can:

```bash
# Find out if wheat contains allergens
curl "http://localhost:8000/ingredients/wheat"

# Response:
{
  "ingredient": {
    "code": "en:wheat-flour",
    "name": "Wheat flour"
  },
  "allergens": [
    {
      "code": "en:gluten",
      "name": "Gluten",
      "certainty": "direct"
    }
  ]
}
```

```bash
# Get full product information by barcode
curl "http://localhost:8000/products/3017620422003"

# Response:
{
  "product": {
    "barcode": "3017620422003",
    "name": "Nutella",
    "brand": "Ferrero"
  },
  "ingredients": [
    {"name": "Sugar", "rank": 1},
    {"name": "Palm oil", "rank": 2}
  ],
  "allergens": [
    {"name": "Milk", "relation_type": "contains"},
    {"name": "Nuts", "relation_type": "contains"}
  ]
}
```

## Setup Time

- **Minimal setup** (without data import): 5 minutes
- **Full setup** (with OpenFoodFacts data): 30-45 minutes
- **Testing setup** (limited data): 10 minutes

## What You Need

### Required
- **Python 3.9-3.12** - Programming language runtime (⚠️ 3.13 not yet supported)
- **PostgreSQL 14+** - Database to store ingredient/allergen data
- **3GB disk space** - For OpenFoodFacts data files

### Optional
- **Docker** - For containerized deployment
- **Redis** - For caching (production optimization)

## Installation Paths

### Path 1: Quick Test (No Data)
Perfect for exploring the API structure without importing data.

```bash
cd ingredient-api
pip install -r requirements.txt
cp .env.sample .env
# Edit .env with your DATABASE_URL
alembic upgrade head
uvicorn app.main:app --reload
```

Visit http://localhost:8000/docs to see the API documentation.

### Path 2: Development Setup (Limited Data)
Good balance between speed and functionality.

```bash
cd ingredient-api
pip install -r requirements.txt
cp .env.sample .env
# Edit .env with your DATABASE_URL
# Set SAMPLE_PRODUCT_LIMIT=1000 for faster import
./scripts/setup_db.sh
./scripts/run_import.sh
uvicorn app.main:app --reload
```

### Path 3: Production Setup (Full Data)
Complete OpenFoodFacts dataset for production use.

```bash
cd ingredient-api
pip install -r requirements.txt
cp .env.sample .env
# Edit .env with production DATABASE_URL
./scripts/setup_db.sh
./scripts/run_import.sh  # Takes 30-45 minutes
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Understanding the Data

### Ingredients
- **Source:** OpenFoodFacts taxonomy
- **Count:** ~50,000 ingredients
- **Example:** "Wheat flour" → contains "Gluten"

### Allergens
- **Source:** OpenFoodFacts taxonomy
- **Count:** ~100 allergens
- **Examples:** Gluten, Milk, Nuts, Soy, etc.

### Products
- **Source:** OpenFoodFacts product database
- **Count:** Configurable (default 10,000)
- **Data:** Name, brand, ingredients, allergens

## Common Use Cases

### 1. Ingredient Allergen Lookup
```bash
GET /ingredients/almond?exact=false
```
Use this to find if an ingredient contains allergens.

### 2. Product Scanning
```bash
GET /products/{barcode}
```
Use this when a user scans a product barcode.

### 3. Health Check
```bash
GET /health
```
Use this to monitor if the API is running.

## Integration Examples

### JavaScript/TypeScript (Hono, Express, etc.)
```typescript
const API_URL = 'http://localhost:8000';

async function checkIngredient(name: string) {
  const response = await fetch(`${API_URL}/ingredients/${encodeURIComponent(name)}`);
  return response.json();
}

async function scanProduct(barcode: string) {
  const response = await fetch(`${API_URL}/products/${barcode}`);
  return response.json();
}
```

### Python (Django, Flask, etc.)
```python
import httpx

API_URL = "http://localhost:8000"

async def check_ingredient(name: str):
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{API_URL}/ingredients/{name}")
        return response.json()
```

### cURL (Testing)
```bash
# Fuzzy search
curl "http://localhost:8000/ingredients/wheat"

# Exact search
curl "http://localhost:8000/ingredients/Wheat%20flour?exact=true"

# Product lookup
curl "http://localhost:8000/products/737628064502"
```

## Next Steps

1. **Read QUICKSTART.md** - Step-by-step setup instructions
2. **Read README.md** - Complete documentation
3. **Explore `/docs`** - Interactive API documentation
4. **Run tests** - `pytest tests/ -v`
5. **Integrate** - Connect to your backend service

## Architecture Overview

```
┌─────────────────┐
│  Your App       │
│  (Hono/React)   │
└────────┬────────┘
         │ HTTP
         ↓
┌─────────────────┐      ┌──────────────┐
│  FastAPI        │ ←──→ │ PostgreSQL   │
│  (This Service) │      │ (Data Store) │
└────────┬────────┘      └──────────────┘
         │
         ↓
┌─────────────────┐
│ OpenFoodFacts   │
│ (Data Source)   │
└─────────────────┘
```

## Troubleshooting

**"Database connection failed"**
- Check your DATABASE_URL in `.env`
- Ensure PostgreSQL is running
- Verify database exists: `psql -l | grep feeb_db`

**"Import takes too long"**
- Reduce SAMPLE_PRODUCT_LIMIT in `.env` to 1000
- Restart import: `./scripts/run_import.sh`

**"Module not found"**
- Activate virtual environment: `source venv/bin/activate`
- Install dependencies: `pip install -r requirements.txt`

## Learn More

- **QUICKSTART.md** - Quick setup guide
- **README.md** - Full documentation
- **IMPLEMENTATION_SUMMARY.md** - Technical details
- **PROJECT_STRUCTURE.md** - File organization
- **/docs** - Interactive API docs (when running)

## Support

- 📖 Check documentation files
- 🐛 Report issues in GitHub
- 💬 Ask questions in discussions

---

**Ready to start?** → Read [QUICKSTART.md](QUICKSTART.md)

