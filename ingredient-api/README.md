# Allergen-Aware Ingredient API

A standalone Python + FastAPI microservice that provides ingredient and allergen lookup capabilities using OpenFoodFacts data. This service acts as the data layer for Feeb's allergen detection system.

## Features

- 🔍 **Ingredient Search**: Lookup ingredients by name with exact or fuzzy matching
- 🥜 **Allergen Detection**: Automatic allergen mapping based on OpenFoodFacts taxonomy
- 📦 **Product Information**: Retrieve product details including ingredients and allergens
- 🌍 **OpenFoodFacts Integration**: Import and sync data from the world's largest open food database
- 🚀 **High Performance**: Async SQLAlchemy + FastAPI for optimal throughput
- 📊 **Extensible Schema**: Designed to support custom data sources in the future

## Architecture

### Tech Stack

- **FastAPI** - Modern async web framework
- **SQLAlchemy 2.0** - Async ORM with PostgreSQL
- **Alembic** - Database migrations
- **Pydantic** - Data validation and settings management
- **httpx** - Async HTTP client for data downloads

### Database Schema

The service uses 6 main tables:

1. **`ingredient`** - Ingredient taxonomy from OpenFoodFacts
2. **`allergen`** - Allergen taxonomy
3. **`ingredient_allergen`** - Many-to-many ingredient-allergen relationships
4. **`product`** - Product catalog
5. **`product_ingredient`** - Product ingredients with ranking
6. **`product_allergen`** - Denormalized product allergen links for fast lookups

See the [schema diagram](docs/schema.png) for detailed relationships.

## Quick Start

### Prerequisites

- Python 3.9-3.12 (⚠️ Python 3.13 not yet supported due to asyncpg compatibility)
- PostgreSQL 14+
- pip or uv package manager

### Installation

1. **Clone and navigate to the directory:**

```bash
cd ingredient-api
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

4. **Configure environment variables:**

```bash
cp env.example .env
# Edit .env with your PostgreSQL connection string
```

Example `.env`:
```env
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/feeb_db
```

5. **Initialize database:**

```bash
# Run migrations
alembic upgrade head
```

6. **Import OpenFoodFacts data:**

```bash
# This will download ~2GB of data and import into PostgreSQL
# Import is limited to 10,000 products by default (configurable via SAMPLE_PRODUCT_LIMIT)
python -m data_pipeline.import_off
```

**Expected import time:** 15-30 minutes depending on network speed and hardware.

7. **Start the API server:**

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

## API Documentation

### Interactive Docs

Once the server is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Endpoints

#### `GET /ingredients/{name}`

Search for an ingredient by name and retrieve associated allergens.

**Query Parameters:**
- `exact` (boolean, default: false) - Use exact match instead of fuzzy search

**Example Request:**
```bash
curl "http://localhost:8000/ingredients/wheat?exact=false"
```

**Example Response:**
```json
{
  "ingredient": {
    "code": "en:wheat-flour",
    "name": "Wheat flour",
    "source": "off",
    "last_updated": "2025-10-07T12:00:00Z"
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

#### `GET /products/{barcode}`

Retrieve product information including ingredients and allergens.

**Example Request:**
```bash
curl "http://localhost:8000/products/3017620422003"
```

**Example Response:**
```json
{
  "product": {
    "barcode": "3017620422003",
    "name": "Nutella",
    "brand": "Ferrero"
  },
  "ingredients": [
    {"name": "Sugar", "rank": 1},
    {"name": "Palm oil", "rank": 2},
    {"name": "Hazelnuts", "rank": 3}
  ],
  "allergens": [
    {
      "name": "Milk",
      "relation_type": "contains"
    },
    {
      "name": "Nuts",
      "relation_type": "contains"
    },
    {
      "name": "Soybeans",
      "relation_type": "may_contain"
    }
  ]
}
```

#### `GET /health`

Health check endpoint.

**Example Response:**
```json
{
  "status": "ok",
  "db_connected": true
}
```

## Development

### Running Tests

```bash
# Install test dependencies
pip install pytest pytest-asyncio aiosqlite

# Run tests
pytest tests/ -v
```

### Database Migrations

**Create a new migration:**
```bash
alembic revision --autogenerate -m "Description of changes"
```

**Apply migrations:**
```bash
alembic upgrade head
```

**Rollback migration:**
```bash
alembic downgrade -1
```

### Code Quality

```bash
# Format code
black app/ data_pipeline/ tests/

# Lint
ruff check app/ data_pipeline/ tests/

# Type checking
mypy app/ data_pipeline/
```

## Integration with Hono Backend

The Hono backend (TypeScript) can call this API via HTTP. Example integration:

**Create `/server/src/services/ingredientApi.ts`:**

```typescript
const INGREDIENT_API_URL = process.env.INGREDIENT_API_URL || 'http://localhost:8000';

export async function getIngredientByName(name: string) {
  const response = await fetch(`${INGREDIENT_API_URL}/ingredients/${encodeURIComponent(name)}`);
  if (!response.ok) {
    throw new Error(`Ingredient not found: ${name}`);
  }
  return response.json();
}

export async function getProductByBarcode(barcode: string) {
  const response = await fetch(`${INGREDIENT_API_URL}/products/${barcode}`);
  if (!response.ok) {
    throw new Error(`Product not found: ${barcode}`);
  }
  return response.json();
}
```

Add to Hono's `.env`:
```env
INGREDIENT_API_URL=http://localhost:8000
```

## Data Sources

### OpenFoodFacts

The service imports data from:

1. **Ingredients Taxonomy** (~2MB)
   - URL: https://static.openfoodfacts.org/data/taxonomies/ingredients.txt
   - Format: Indented key-value pairs
   - Contains: ~50,000 ingredients with hierarchical relationships

2. **Allergens Taxonomy** (~100KB)
   - URL: https://static.openfoodfacts.org/data/taxonomies/allergens.txt
   - Format: Indented key-value pairs
   - Contains: ~100 allergens with categories

3. **Products Database** (~2GB compressed)
   - URL: https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.jsonl.gz
   - Format: JSONL (one JSON object per line)
   - Contains: ~2 million products (configurable import limit)

### Adding Custom Data Sources

Future versions will support custom ingredient databases. To prepare:

1. All entries use `source` field (currently "off")
2. Custom sources can be added with `source="custom"`
3. Implement `data_pipeline/import_custom.py` following the same pattern

## Performance Considerations

### Database Indexing

The schema includes indexes on:
- `ingredient.code`, `ingredient.name`, `ingredient.source`
- `allergen.code`, `allergen.name`
- `product.barcode`

### Caching

For production deployments, consider:
- Redis caching layer for frequently accessed ingredients
- CDN for static API responses
- Database read replicas for scaling

### Rate Limiting

Add rate limiting in production:

```python
# app/main.py
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
```

## Deployment

### Docker

**Dockerfile:**

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Build and run:**

```bash
docker build -t ingredient-api .
docker run -p 8000:8000 --env-file .env ingredient-api
```

### Production Checklist

- [ ] Set `CORS` allowed origins to specific domains
- [ ] Use connection pooling (already configured in `database.py`)
- [ ] Enable HTTPS/TLS
- [ ] Set up monitoring (Sentry, DataDog, etc.)
- [ ] Configure log aggregation
- [ ] Set up automated backups for PostgreSQL
- [ ] Use environment-specific `.env` files
- [ ] Enable database query logging in staging

## Troubleshooting

### Import fails with memory error

Reduce `SAMPLE_PRODUCT_LIMIT` in `.env`:
```env
SAMPLE_PRODUCT_LIMIT=1000
```

### Database connection timeout

Increase PostgreSQL max connections:
```sql
ALTER SYSTEM SET max_connections = 200;
```

### Slow ingredient searches

Add full-text search index:
```sql
CREATE INDEX idx_ingredient_name_fts ON ingredient USING gin(to_tsvector('english', name));
```

## Future Roadmap

- [ ] **Automated Data Refresh**: Weekly cron job to sync with OpenFoodFacts
- [ ] **Hierarchical Allergen Inference**: Traverse ingredient parent trees
- [ ] **Multilingual Support**: Store ingredient names in multiple languages
- [ ] **Nutritional Data**: Expand to include macros and micronutrients
- [ ] **Machine Learning**: Allergen prediction for unlabeled ingredients
- [ ] **GraphQL API**: Alternative to REST for complex queries
- [ ] **Real-time Updates**: WebSocket support for live data changes

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- [OpenFoodFacts](https://world.openfoodfacts.org) - Open food database
- [FastAPI](https://fastapi.tiangolo.com/) - Web framework
- [SQLAlchemy](https://www.sqlalchemy.org/) - ORM library

## Contact

For questions or support, please open an issue in the repository.

---

**Built with ❤️ for the Feeb project**

