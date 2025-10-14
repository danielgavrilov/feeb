# Import Scripts

This directory contains helper scripts for managing OpenFoodFacts data imports.

## Full Import

### Quick Start

```bash
./scripts/run_full_import.sh
```

This script:
- Downloads the full OpenFoodFacts dataset (~10GB)
- Extracts and imports all allergens and ingredients
- Imports all products with nutrition, categories, and completeness flags
- Logs detailed progress with timestamps
- Manages log file rotation (keeps last 3 verbose logs)
- Creates a summary log for tracking import history

### Log Files

**Verbose logs**: `logs/import_verbose_YYYYMMDD_HHMMSS.log`
- Detailed timestamped progress for each step
- Shows scan rates (products/sec)
- Tracks ingredient/allergen link counts
- Automatically rotated (keeps last 3)

**Summary log**: `logs/import_summary.log`
- Persistent history of all import runs
- Start/end times and success/failure status
- Quick reference for import tracking

### Manual Import (Advanced)

If you need more control:

```bash
# Activate virtualenv
source ../.venv/bin/activate

# Run with custom limit (e.g., 100k products)
SAMPLE_PRODUCT_LIMIT=100000 python -m data_pipeline.import_off

# Run full import (unlimited)
SAMPLE_PRODUCT_LIMIT=0 python -m data_pipeline.import_off

# With custom logging
SAMPLE_PRODUCT_LIMIT=0 python -m data_pipeline.import_off 2>&1 | tee my_import.log
```

### Import Process

The import runs in 4 steps:

1. **Download** (~5-10 min): Downloads products.jsonl.gz (~10GB)
   - Skips if file already exists
   
2. **Extract Allergens** (~5 min): Scans products for unique allergens
   - Progress updates every 50k products
   
3. **Extract Ingredients** (~5 min): Scans products for unique ingredients
   - Progress updates every 50k products
   
4. **Import Products** (~30-60 min for full dataset): Imports products with:
   - Nutrition facts (per 100g/ml)
   - Nutri-score grade and score
   - Quantity (raw, amount, unit)
   - Categories (hierarchy)
   - Completeness flags
   - Ingredient percent estimates
   - Allergen links (contains, may_contain)
   - Progress updates every 10k products

### Troubleshooting

**Import stuck/crashed?**
- Check `logs/import_verbose_*.log` for last progress message
- Check `ps aux | grep import_off` to see if process is running
- Resume by re-running the script (it will skip download if file exists)

**Log file too large?**
- Verbose logs auto-rotate (keeps last 3)
- Old logs are automatically deleted
- Manual cleanup: `rm logs/import_verbose_*.log`

**Database issues?**
- Check `logs/import_summary.log` for error messages
- Verify DB connection: `sqlite3 ../ingredient_api.db "SELECT COUNT(*) FROM product;"`
- Run migration if needed: `alembic upgrade head`

### Performance

**Expected timing (full dataset ~3.5M products):**
- Download: 5-10 minutes
- Allergen extraction: ~5 minutes
- Ingredient extraction: ~5 minutes  
- Product import: 30-60 minutes
- **Total: ~45-80 minutes**

**Rates:**
- Scanning: ~50,000-100,000 products/sec
- Importing: ~1,000-2,000 products/sec (with nutrition & links)

