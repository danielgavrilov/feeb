# Project Structure

Complete file tree for the Allergen-Aware Ingredient API.

```
ingredient-api/
│
├── 📄 README.md                      # Comprehensive documentation
├── 📄 QUICKSTART.md                  # 5-minute setup guide
├── 📄 IMPLEMENTATION_SUMMARY.md      # Implementation overview
├── 📄 PROJECT_STRUCTURE.md           # This file
│
├── 📦 requirements.txt               # Python dependencies
├── 🔧 pytest.ini                     # Test configuration
├── 🔧 alembic.ini                    # Migration configuration
├── 📄 .env.sample                    # Environment template
├── 📄 .gitignore                     # Git ignore rules
│
├── 📁 app/                           # FastAPI application
│   ├── __init__.py                   # Package initialization
│   ├── main.py                       # FastAPI entry point & CORS
│   ├── config.py                     # Pydantic settings (env vars)
│   ├── database.py                   # SQLAlchemy async engine & sessions
│   ├── models.py                     # ORM models + Pydantic schemas
│   ├── dal.py                        # Data Access Layer (10 functions)
│   └── routes.py                     # API endpoints (/ingredients, /products, /health)
│
├── 📁 data_pipeline/                 # OpenFoodFacts import pipeline
│   ├── __init__.py
│   ├── import_off.py                 # Main import script (4-step process)
│   ├── parsers.py                    # Taxonomy & JSONL parsers
│   └── utils.py                      # Download/decompress utilities
│
├── 📁 alembic/                       # Database migrations
│   ├── env.py                        # Alembic async environment
│   ├── script.py.mako                # Migration template
│   ├── README                        # Migration commands reference
│   └── versions/                     # Auto-generated migrations (created on first run)
│
├── 📁 tests/                         # Test suite
│   ├── __init__.py
│   ├── test_dal.py                   # DAL unit tests (SQLite in-memory)
│   └── test_routes.py                # API integration tests
│
└── 📁 scripts/                       # Helper scripts
    ├── setup_db.sh                   # Initialize database
    ├── run_import.sh                 # Run data import
    └── init_migration.sh             # Create first migration

```

## File Breakdown

### Core Application (7 files)
- **main.py** - FastAPI app with lifespan management
- **config.py** - Environment variable loading & validation
- **database.py** - Async SQLAlchemy setup
- **models.py** - 6 ORM models + 8 Pydantic response schemas
- **dal.py** - 10 async data access functions
- **routes.py** - 3 API endpoints
- **__init__.py** - Package metadata

### Data Pipeline (4 files)
- **import_off.py** - 4-step import algorithm (~300 lines)
- **parsers.py** - Taxonomy & JSONL parsing logic
- **utils.py** - HTTP download & gzip utilities
- **__init__.py** - Package metadata

### Testing (3 files)
- **test_dal.py** - 6 DAL function tests
- **test_routes.py** - 5 API endpoint tests
- **__init__.py** - Test package init

### Configuration (5 files)
- **alembic.ini** - Alembic settings
- **pytest.ini** - Pytest async configuration
- **requirements.txt** - 8 Python packages
- **.env.sample** - Environment template
- **.gitignore** - Python/IDE ignore rules

### Documentation (4 files)
- **README.md** - Full documentation (~500 lines)
- **QUICKSTART.md** - Quick setup guide
- **IMPLEMENTATION_SUMMARY.md** - Implementation overview
- **PROJECT_STRUCTURE.md** - This file

### Scripts (3 files)
- **setup_db.sh** - Database initialization
- **run_import.sh** - Data import wrapper
- **init_migration.sh** - Migration creation helper

### Migrations (3 files + directory)
- **env.py** - Async migration environment
- **script.py.mako** - Migration template
- **README** - Command reference
- **versions/** - Auto-generated migration files

## Statistics

- **Total Files Created:** 29
- **Python Modules:** 15
- **Documentation:** 4
- **Scripts:** 3
- **Configuration:** 5
- **Lines of Code:** ~2,100

## Dependencies

### Production
```
fastapi==0.110.0              # Web framework
uvicorn[standard]==0.27.0     # ASGI server
sqlalchemy[asyncio]==2.0.28   # ORM
asyncpg==0.29.0               # PostgreSQL driver
alembic==1.13.1               # Migrations
pydantic-settings==2.2.0      # Config management
httpx==0.27.0                 # HTTP client
python-dotenv==1.0.1          # Environment variables
```

### Development (optional)
```
pytest                        # Testing
pytest-asyncio                # Async test support
aiosqlite                     # SQLite async driver (for tests)
black                         # Code formatting
ruff                          # Linting
mypy                          # Type checking
```

## Entry Points

| Purpose | Command |
|---------|---------|
| Start API server | `uvicorn app.main:app --reload` |
| Run data import | `python -m data_pipeline.import_off` |
| Create migration | `alembic revision --autogenerate -m "message"` |
| Apply migrations | `alembic upgrade head` |
| Run tests | `pytest tests/ -v` |

## Database Schema

6 tables with relationships:

```
ingredient ──┬─── ingredient_allergen ──── allergen
             │
             └─── product_ingredient ──── product ──── product_allergen ──── allergen
```

**Total Columns:** 41  
**Indexes:** 8  
**Unique Constraints:** 5  
**Foreign Keys:** 8

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/` | GET | API info |
| `/health` | GET | Health check |
| `/ingredients/{name}` | GET | Ingredient lookup |
| `/products/{barcode}` | GET | Product lookup |
| `/docs` | GET | Swagger UI |
| `/redoc` | GET | ReDoc UI |

## Data Flow

```
OpenFoodFacts
     ↓
[Download] (utils.py)
     ↓
[Parse] (parsers.py)
     ↓
[Import] (import_off.py)
     ↓
PostgreSQL
     ↓
[Query] (dal.py)
     ↓
[API] (routes.py)
     ↓
Client (Hono/Browser)
```

---

**Generated:** 2025-10-07  
**Version:** 0.1.0

