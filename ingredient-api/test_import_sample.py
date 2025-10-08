"""
Test import script with a small sample of OpenFoodFacts data.
Downloads only the first 10MB for quick testing.
"""

import asyncio
from pathlib import Path
import httpx
from data_pipeline.utils import ensure_temp_dir, cleanup_temp_dir
from data_pipeline.parsers import parse_product_jsonl
from app.database import AsyncSessionLocal
from app.config import settings
from app import dal

# URL from OpenFoodFacts
OFF_PRODUCTS_URL = "https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz"

# Download only first 10MB for testing
SAMPLE_SIZE_MB = 10
SAMPLE_SIZE_BYTES = SAMPLE_SIZE_MB * 1024 * 1024


async def download_sample(url: str, destination: Path, max_bytes: int):
    """Download only the first max_bytes of a file."""
    print(f"Downloading first {max_bytes / 1024 / 1024:.1f}MB of {url}...")
    
    async with httpx.AsyncClient(timeout=300.0, follow_redirects=True) as client:
        async with client.stream("GET", url) as response:
            response.raise_for_status()
            
            downloaded = 0
            with open(destination, "wb") as f:
                async for chunk in response.aiter_bytes(chunk_size=8192):
                    f.write(chunk)
                    downloaded += len(chunk)
                    
                    if downloaded % (1024 * 1024) == 0:  # Every MB
                        print(f"  Downloaded: {downloaded / 1024 / 1024:.1f}MB")
                    
                    if downloaded >= max_bytes:
                        print(f"  Reached {max_bytes / 1024 / 1024:.1f}MB limit, stopping download")
                        break
    
    print(f"Sample downloaded: {downloaded / 1024 / 1024:.1f}MB")


async def test_import_sample():
    """Test import with a small sample of data."""
    print("=" * 80)
    print("OpenFoodFacts Sample Data Import Test")
    print("=" * 80)
    
    temp_dir = ensure_temp_dir()
    
    try:
        # Download sample
        products_file = temp_dir / "products_sample.jsonl.gz"
        await download_sample(OFF_PRODUCTS_URL, products_file, SAMPLE_SIZE_BYTES)
        
        # Extract allergens and ingredients from sample
        print("\n[1/3] Extracting allergens and ingredients from sample...")
        
        allergen_set = set()
        ingredient_set = set()
        product_count = 0
        
        for product_data in parse_product_jsonl(products_file, limit=1000):
            product_count += 1
            
            # Collect allergens
            for allergen_code in product_data.get("allergens_tags", []):
                if allergen_code and allergen_code.startswith("en:"):
                    allergen_set.add(allergen_code)
            
            # Collect ingredients
            for ing_code in product_data.get("ingredients_tags", []):
                if ing_code and ing_code.startswith("en:"):
                    ingredient_set.add(ing_code)
        
        print(f"  Found {len(allergen_set)} unique allergens")
        print(f"  Found {len(ingredient_set)} unique ingredients")
        print(f"  From {product_count} products in sample")
        
        # Import ALL allergens we found
        print("\n[2/3] Importing all allergens...")
        allergen_map = {}
        
        async with AsyncSessionLocal() as session:
            for allergen_code in sorted(allergen_set):  # Import ALL allergens
                name = allergen_code.replace("en:", "").replace("-", " ").title()
                allergen_id = await dal.insert_allergen(session, allergen_code, name, None)
                allergen_map[allergen_code] = allergen_id
            
            await session.commit()
        
        print(f"  Imported {len(allergen_map)} allergens")
        
        # Import ALL ingredients we found
        print("\n[3/3] Importing all ingredients and products...")
        ingredient_map = {}
        
        async with AsyncSessionLocal() as session:
            # Import ALL ingredients
            for ing_code in sorted(ingredient_set):  # Import ALL ingredients
                name = ing_code.replace("en:", "").replace("-", " ").title()
                ing_id = await dal.insert_ingredient(session, ing_code, name)
                ingredient_map[ing_code] = ing_id
            
            # Batch commit every 500 for performance
            if len(ingredient_map) % 500 == 0:
                await session.commit()
            
            await session.commit()
        
        print(f"  Imported {len(ingredient_map)} ingredients")
        
        # Import ALL products from the download (up to parse limit)
        product_import_count = 0
        async with AsyncSessionLocal() as session:
            for product_data in parse_product_jsonl(products_file, limit=1000):  # Use all parsed products
                if not product_data.get("barcode") or not product_data.get("name"):
                    continue
                
                try:
                    product_id = await dal.insert_product(
                        session,
                        barcode=product_data["barcode"],
                        name=product_data["name"],
                        brand=product_data.get("brand")
                    )
                    
                    # Link ingredients
                    for rank, ing_code in enumerate(product_data.get("ingredients_tags", [])[:10], 1):
                        if ing_code in ingredient_map:
                            await dal.link_product_ingredient(
                                session, product_id, ingredient_map[ing_code], rank
                            )
                    
                    # Link allergens
                    for allergen_code in product_data.get("allergens_tags", []):
                        if allergen_code in allergen_map:
                            await dal.link_product_allergen(
                                session, product_id, allergen_map[allergen_code], "contains"
                            )
                    
                    product_import_count += 1
                    
                    # Batch commit every 100 products
                    if product_import_count % 100 == 0:
                        await session.commit()
                        print(f"  Imported {product_import_count} products so far...")
                
                except Exception as e:
                    # Skip products with errors (duplicate barcodes, etc)
                    continue
            
            await session.commit()
        
        print(f"  Imported {product_import_count} products")
        
        print("\n" + "=" * 80)
        print("✓ Sample Import Complete!")
        print("=" * 80)
        print(f"\nImported:")
        print(f"  - {len(allergen_map)} allergens")
        print(f"  - {len(ingredient_map)} ingredients")
        print(f"  - {product_import_count} products")
        print("\nTest the API:")
        print("  curl http://localhost:8000/health")
        print("  curl http://localhost:8000/ingredients/sugar")
        
    finally:
        cleanup_temp_dir(temp_dir)


if __name__ == "__main__":
    asyncio.run(test_import_sample())

