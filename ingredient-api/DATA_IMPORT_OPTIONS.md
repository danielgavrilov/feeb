# OpenFoodFacts Data Import Options

Based on the [official data page](https://world.openfoodfacts.org/data), here are your options for importing data:

---

## Current Situation

✅ **Import script is working!** The download started successfully.

⚠️ **File is very large:** 10GB uncompressed (the full global product database)

---

## Option 1: Continue with Full Import (Recommended for Production)

**What you get:**
- ~3+ million products worldwide
- ~thousands of unique ingredients
- ~100+ allergens
- Complete, production-ready data

**Time required:**
- Download: ~1 hour (10GB)
- Import (with SAMPLE_PRODUCT_LIMIT=100): ~5 minutes after download
- **Total: ~65 minutes**

**How to run:**
```bash
cd /Users/alexanderkok/feeb/ingredient-api
source /Users/alexanderkok/feeb/.venv/bin/activate

# Let it run in the background
nohup python -m data_pipeline.import_off > import.log 2>&1 &

# Check progress
tail -f import.log
```

---

## Option 2: Use CSV Export (Faster Download)

The CSV export might be smaller and faster to work with.

**Steps:**
1. Download just the CSV: https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz (~900MB)
2. Write a simpler parser for CSV format
3. Import from CSV instead of JSONL

**Time:** ~15-20 minutes total

---

## Option 3: Manual Sample Data (Fastest - 2 minutes)

Create a small dataset manually for testing:

```bash
cd /Users/alexanderkok/feeb/ingredient-api
source /Users/alexanderkok/feeb/.venv/bin/activate
python3 << 'EOF'
import asyncio
from app.database import AsyncSessionLocal
from app import dal

async def create_sample_data():
    """Create sample allergens, ingredients, and a product"""
    async with AsyncSessionLocal() as session:
        # Create allergens
        gluten_id = await dal.insert_allergen(session, "en:gluten", "Gluten", "grain")
        milk_id = await dal.insert_allergen(session, "en:milk", "Milk", "dairy")
        nuts_id = await dal.insert_allergen(session, "en:nuts", "Nuts", "tree-nuts")
        
        # Create ingredients
        wheat_id = await dal.insert_ingredient(session, "en:wheat-flour", "Wheat Flour")
        sugar_id = await dal.insert_ingredient(session, "en:sugar", "Sugar")
        butter_id = await dal.insert_ingredient(session, "en:butter", "Butter")
        
        # Link ingredients to allergens
        await dal.link_ingredient_allergen(session, wheat_id, gluten_id, "direct")
        await dal.link_ingredient_allergen(session, butter_id, milk_id, "direct")
        
        # Create a product
        product_id = await dal.insert_product(session, "1234567890", "Sample Cookie", "BrandX")
        
        # Link product to ingredients
        await dal.link_product_ingredient(session, product_id, wheat_id, rank=1)
        await dal.link_product_ingredient(session, product_id, sugar_id, rank=2)
        await dal.link_product_ingredient(session, product_id, butter_id, rank=3)
        
        # Link product to allergens
        await dal.link_product_allergen(session, product_id, gluten_id, "contains")
        await dal.link_product_allergen(session, product_id, milk_id, "contains")
        await dal.link_product_allergen(session, product_id, nuts_id, "may_contain")
        
        await session.commit()
        print("✓ Sample data created!")
        print("\nTry these API calls:")
        print("  curl http://localhost:8000/ingredients/wheat")
        print("  curl http://localhost:8000/products/1234567890")

asyncio.run(create_sample_data())
EOF
```

---

## Recommendation

**For learning/testing NOW:** Use **Option 3** (manual sample data)  
**For production later:** Use **Option 1** (full import) overnight or during off-hours

---

## Current Import Status

The import script you started is still running. To check on it:

```bash
# See if it's still running
ps aux | grep import_off

# If you want to stop it
pkill -f import_off

# If you want to let it continue
# Just leave it running - it will complete in ~1 hour
```

---

## Next Steps

1. **If you want to test the API now:** Stop the current import and run Option 3
2. **If you can wait:** Let the import finish (check back in an hour)
3. **Alternatively:** Try Option 2 (CSV) for a middle ground

Let me know which option you'd like to pursue!

