"""
Main import script for OpenFoodFacts data.
Downloads taxonomy files and product data, then imports into PostgreSQL.
"""

import asyncio
from pathlib import Path
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import AsyncSessionLocal
from app.config import settings
from app import dal
from .utils import download_file, decompress_gz, ensure_temp_dir, cleanup_temp_dir
from .parsers import (
    parse_taxonomy_file, 
    parse_product_jsonl, 
    extract_category_from_parents,
    normalize_ingredient_name
)


# OpenFoodFacts data URLs
# Updated URLs based on https://world.openfoodfacts.org/data
OFF_PRODUCTS_URL = "https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz"


async def load_off_data():
    """
    Downloads and imports OpenFoodFacts data into PostgreSQL.
    
    New approach (updated for 2025 OpenFoodFacts data structure):
    1. Download products JSONL file
    2. Extract and import unique allergens from product data
    3. Extract and import unique ingredients from product data
    4. Import products with their ingredients and allergens
    5. Log summary statistics
    
    Data source: https://world.openfoodfacts.org/data
    """
    print("=" * 80)
    print("OpenFoodFacts Data Import Starting")
    print("=" * 80)
    start_time = datetime.now()
    
    # Create temp directory
    temp_dir = ensure_temp_dir()
    
    try:
        # =====================================================================
        # Step 1: Download Products File
        # =====================================================================
        print("\n[1/4] Downloading products file...")
        print(f"  Source: {OFF_PRODUCTS_URL}")
        print(f"  This may take a while...")
        
        products_file = temp_dir / "products.jsonl.gz"
        
        await download_file(OFF_PRODUCTS_URL, products_file)
        
        # =====================================================================
        # Step 2: Extract and Import Allergens from Products
        # =====================================================================
        print("\n[2/4] Extracting allergens from products...")
        
        allergen_set = set()  # Collect unique allergen codes
        
        # First pass: collect all unique allergens
        for product_data in parse_product_jsonl(products_file, limit=settings.sample_product_limit * 2):
            # Collect allergens
            for allergen_code in product_data.get("allergens_tags", []):
                if allergen_code and allergen_code.startswith("en:"):
                    allergen_set.add(allergen_code)
        
        # Import allergens
        allergen_map = {}  # code -> allergen_id
        async with AsyncSessionLocal() as session:
            from app.dal import insert_allergen
            
            for allergen_code in sorted(allergen_set):
                # Convert code to human-readable name
                # e.g., "en:gluten" -> "Gluten"
                name = allergen_code.replace("en:", "").replace("-", " ").title()
                
                allergen_id = await insert_allergen(
                    session,
                    code=allergen_code,
                    name=name,
                    category=None
                )
                allergen_map[allergen_code] = allergen_id
            
            await session.commit()
        
        print(f"  Imported {len(allergen_map)} allergens")
        
        # =====================================================================
        # Step 3: Extract and Import Ingredients from Products
        # =====================================================================
        print("\n[3/4] Extracting ingredients from products...")
        
        ingredient_set = set()  # Collect unique ingredient codes
        
        # First pass: collect all unique ingredients  
        for product_data in parse_product_jsonl(products_file, limit=settings.sample_product_limit * 2):
            # Collect ingredients
            for ing_code in product_data.get("ingredients_tags", []):
                if ing_code and ing_code.startswith("en:"):
                    ingredient_set.add(ing_code)
        
        # Import ingredients
        ingredient_map = {}  # code -> ingredient_id
        async with AsyncSessionLocal() as session:
            from app.dal import insert_ingredient
            
            for ing_code in sorted(ingredient_set):
                # Convert code to human-readable name
                # e.g., "en:wheat-flour" -> "Wheat Flour"
                name = ing_code.replace("en:", "").replace("-", " ").title()
                
                ingredient_id = await insert_ingredient(
                    session,
                    code=ing_code,
                    name=name,
                    parent_code=None,
                    allergen_code=None,
                    source=settings.data_source
                )
                ingredient_map[ing_code] = ingredient_id
            
            await session.commit()
        
        print(f"  Imported {len(ingredient_map)} ingredients")
        
        # =====================================================================
        # Step 4: Parse and Import Products
        # =====================================================================
        print(f"\n[4/4] Importing products (limit: {settings.sample_product_limit})...")
        
        product_count = 0
        ingredient_link_count = 0
        allergen_link_count = 0
        
        async with AsyncSessionLocal() as session:
            for product_data in parse_product_jsonl(products_file, settings.sample_product_limit):
                try:
                    # Import product
                    from app.dal import insert_product
                    product_id = await insert_product(
                        session,
                        barcode=product_data["barcode"],
                        name=product_data["name"],
                        brand=product_data["brand"] or None,
                        lang=product_data["lang"]
                    )
                    
                    product_count += 1
                    
                    # Link ingredients
                    for rank, ing_code in enumerate(product_data["ingredients_tags"], start=1):
                        if ing_code in ingredient_map:
                            from app.dal import link_product_ingredient
                            await link_product_ingredient(
                                session,
                                product_id=product_id,
                                ingredient_id=ingredient_map[ing_code],
                                rank=rank
                            )
                            ingredient_link_count += 1
                    
                    # Link allergens (contains)
                    for allergen_code in product_data["allergens_tags"]:
                        if allergen_code in allergen_map:
                            from app.dal import link_product_allergen
                            await link_product_allergen(
                                session,
                                product_id=product_id,
                                allergen_id=allergen_map[allergen_code],
                                relation_type="contains",
                                source=settings.data_source
                            )
                            allergen_link_count += 1
                    
                    # Link allergens (traces/may contain)
                    for allergen_code in product_data["traces_tags"]:
                        if allergen_code in allergen_map:
                            from app.dal import link_product_allergen
                            await link_product_allergen(
                                session,
                                product_id=product_id,
                                allergen_id=allergen_map[allergen_code],
                                relation_type="may_contain",
                                source=settings.data_source
                            )
                            allergen_link_count += 1
                    
                    # Commit in batches
                    if product_count % 100 == 0:
                        await session.commit()
                        print(f"  Progress: {product_count} products imported...", end="\r")
                
                except Exception as e:
                    print(f"\n  Warning: Failed to import product {product_data['barcode']}: {e}")
                    continue
            
            # Final commit
            await session.commit()
        
        print(f"\n  Imported {product_count} products")
        print(f"  Created {ingredient_link_count} product-ingredient links")
        print(f"  Created {allergen_link_count} product-allergen links")
        
        # =====================================================================
        # Summary
        # =====================================================================
        elapsed = datetime.now() - start_time
        print("\n" + "=" * 80)
        print("Import Complete!")
        print("=" * 80)
        print(f"Total time: {elapsed}")
        print(f"\nSummary:")
        print(f"  - Allergens: {len(allergen_map)}")
        print(f"  - Ingredients: {len(ingredient_map)}")
        print(f"  - Products: {product_count}")
        print(f"  - Product-Ingredient links: {ingredient_link_count}")
        print(f"  - Product-Allergen links: {allergen_link_count}")
        print("=" * 80)
    
    finally:
        # Cleanup temp files
        cleanup_temp_dir(temp_dir)


if __name__ == "__main__":
    # Run import
    asyncio.run(load_off_data())

