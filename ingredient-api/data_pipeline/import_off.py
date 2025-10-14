"""
Main import script for OpenFoodFacts data.
Downloads taxonomy files and product data, then imports into PostgreSQL.
"""

import asyncio
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional

from app import dal
from app.config import settings
from app.database import AsyncSessionLocal
from .utils import download_file, ensure_temp_dir, cleanup_temp_dir
from .parsers import parse_product_jsonl
import sys


# OpenFoodFacts data URLs
# Updated URLs based on https://world.openfoodfacts.org/data
OFF_PRODUCTS_URL = "https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz"


def log(msg):
    """Log with timestamp and immediate flush."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {msg}")
    sys.stdout.flush()


async def load_off_data(product_limit: Optional[int] = None):
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
    log("=" * 80)
    log("OpenFoodFacts Data Import Starting")
    log("=" * 80)
    start_time = datetime.now()

    # Resolve desired product limit: explicit argument beats config, <=0 disables limit
    resolved_limit = product_limit
    if resolved_limit is None:
        resolved_limit = settings.sample_product_limit

    if resolved_limit is not None and resolved_limit <= 0:
        resolved_limit = None

    # Create temp directory
    temp_dir = ensure_temp_dir()

    try:
        # =====================================================================
        # Step 1: Download Products File
        # =====================================================================
        log("")
        log("[STEP 1/4] Downloading products file")
        log(f"  Source: {OFF_PRODUCTS_URL}")
        
        products_file = temp_dir / "products.jsonl.gz"
        log(f"  Target: {products_file}")
        
        # Skip download if file exists and is non-empty
        if products_file.exists() and products_file.stat().st_size > 0:
            size_mb = products_file.stat().st_size / (1024 * 1024)
            log(f"  File already present ({size_mb:.1f} MB). Skipping download.")
        else:
            log("  Starting download (typical: ~10GB, 5-10 minutes)...")
            await download_file(OFF_PRODUCTS_URL, products_file)
            size_mb = products_file.stat().st_size / (1024 * 1024)
            log(f"  Download complete ({size_mb:.1f} MB)")
        
        # =====================================================================
        # Step 2: Extract and Import Allergens from Products
        # =====================================================================
        log("")
        log("[STEP 2/4] Extracting unique allergens from products")
        limit_desc = 'unlimited' if settings.sample_product_limit <= 0 else f'{settings.sample_product_limit:,}'
        log(f"  Product scan limit: {limit_desc}")
        
        allergen_set = set()  # Collect unique allergen codes
        
        # First pass: collect all unique allergens
        iter_count = 0
        step2_start = datetime.now()
        for product_data in parse_product_jsonl(products_file, limit=settings.sample_product_limit * 2):
            # Collect allergens
            for allergen_code in product_data.get("allergens_tags", []):
                if allergen_code and allergen_code.startswith("en:"):
                    allergen_set.add(allergen_code)
            iter_count += 1
            if iter_count % 50000 == 0:
                elapsed = (datetime.now() - step2_start).total_seconds()
                rate = iter_count / elapsed if elapsed > 0 else 0
                log(f"  Scanned {iter_count:,} products ({rate:.0f}/sec) → {len(allergen_set):,} unique allergens")
        
        log(f"  Total scanned: {iter_count:,} products")
        log(f"  Found {len(allergen_set):,} unique allergens. Importing...")
        
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
        
        log(f"  Imported {len(allergen_map):,} allergens to database")
        
        # =====================================================================
        # Step 3: Extract and Import Ingredients from Products
        # =====================================================================
        log("")
        log("[STEP 3/4] Extracting unique ingredients from products")
        log(f"  Product scan limit: {limit_desc}")
        
        ingredient_set = set()  # Collect unique ingredient codes
        
        # First pass: collect all unique ingredients  
        iter_count = 0
        step3_start = datetime.now()
        for product_data in parse_product_jsonl(products_file, limit=settings.sample_product_limit * 2):
            # Collect ingredients
            for ing_code in product_data.get("ingredients_tags", []):
                if ing_code and ing_code.startswith("en:"):
                    ingredient_set.add(ing_code)
            iter_count += 1
            if iter_count % 50000 == 0:
                elapsed = (datetime.now() - step3_start).total_seconds()
                rate = iter_count / elapsed if elapsed > 0 else 0
                log(f"  Scanned {iter_count:,} products ({rate:.0f}/sec) → {len(ingredient_set):,} unique ingredients")
        
        log(f"  Total scanned: {iter_count:,} products")
        log(f"  Found {len(ingredient_set):,} unique ingredients. Importing...")
        
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
        
        log(f"  Imported {len(ingredient_map):,} ingredients to database")
        
        # =====================================================================
        # Step 3: Parse and Import Data in a Single Pass
        # =====================================================================
        limit_text = (
            f"{resolved_limit} products" if resolved_limit is not None else "all products"
        )
        print(f"\n[3/4] Importing {limit_text} in a single streaming pass...")

        product_count = 0
        ingredient_link_count = 0
        allergen_link_count = 0

        allergen_map: Dict[str, int] = {}
        ingredient_map: Dict[str, int] = {}

        log("")
        log("[STEP 4/4] Importing products with ingredients, allergens, and nutrition")
        final_limit_desc = 'unlimited (FULL dataset)' if settings.sample_product_limit <= 0 else f'{settings.sample_product_limit:,}'
        log(f"  Product import limit: {final_limit_desc}")
        
        product_count = 0
        ingredient_link_count = 0
        allergen_link_count = 0
        step4_start = datetime.now()
        
        async with AsyncSessionLocal() as session:
            for product_data in parse_product_jsonl(products_file, resolved_limit):
                try:
                    # Import product
                    from app.dal import insert_product, upsert_product_nutrition
                    
                    # Prepare completeness flags
                    has_allergens = bool(product_data.get("allergens_tags"))
                    has_traces = bool(product_data.get("traces_tags"))
                    has_ingredients = bool(product_data.get("ingredients_tags")) or bool(product_data.get("ingredients_full"))
                    has_nutrition = any(v is not None for v in product_data.get("nutrition", {}).values())
                    is_complete = "en:complete" in (product_data.get("states_tags") or [])
                    allergen_data_incomplete = has_allergens and (not has_ingredients or not has_nutrition or not is_complete)
                    
                    # Parse quantity into amount/unit when possible
                    qty_raw = product_data.get("quantity")
                    qty_amount = None
                    qty_unit = None
                    if isinstance(qty_raw, str):
                        import re
                        m = re.search(r"(\d+[\.,]?\d*)\s*([a-zA-Z]+)", qty_raw)
                        if m:
                            try:
                                qty_amount = float(m.group(1).replace(",", "."))
                                qty_unit = m.group(2).lower()
                            except ValueError:
                                pass
                    product_id = await insert_product(
                        session,
                        barcode=product_data["barcode"],
                        name=product_data["name"],
                        brand=product_data["brand"] or None,
                        lang=product_data["lang"],
                        last_modified=product_data["last_modified"],
                    )

                    # Upsert nutrition
                    if has_nutrition:
                        await upsert_product_nutrition(session, product_id, product_data.get("nutrition", {}))
                    
                    product_count += 1
                    
                    # Link ingredients
                    # Build a mapping from tag to ingredient details (to get percent_estimate)
                    ing_details_map = {}
                    for ing in product_data.get("ingredients_full", []) or []:
                        tag = ing.get("id") or ing.get("id_tag") or ing.get("text")
                        if tag:
                            ing_details_map[tag] = ing
                    for rank, ing_code in enumerate(product_data["ingredients_tags"], start=1):
                        if ing_code in ingredient_map:
                            from app.dal import link_product_ingredient
                            percent_estimate = None
                            ing_detail = ing_details_map.get(ing_code)
                            if ing_detail:
                                percent_estimate = (
                                    ing_detail.get("percent_estimate")
                                    or ing_detail.get("percent")
                                )
                                if (percent_estimate is None) and (ing_detail.get("percent_min") is not None or ing_detail.get("percent_max") is not None):
                                    try:
                                        lo = float(ing_detail.get("percent_min")) if ing_detail.get("percent_min") is not None else None
                                        hi = float(ing_detail.get("percent_max")) if ing_detail.get("percent_max") is not None else None
                                        if lo is not None and hi is not None:
                                            percent_estimate = (lo + hi) / 2.0
                                        else:
                                            percent_estimate = lo or hi
                                    except Exception:
                                        percent_estimate = None
                            await link_product_ingredient(
                                session,
                                product_id=product_id,
                                ingredient_id=ingredient_map[ing_code],
                                rank=rank,
                                percent_estimate=percent_estimate
                            )
                            ingredient_link_count += 1
                    
                    # Link allergens (contains)
                    from app.dal import link_product_allergen
                    for allergen_code in product_data.get("allergens_tags", []):
                        if allergen_code in allergen_map:
                            await link_product_allergen(
                                session,
                                product_id=product_id,
                                allergen_id=allergen_map[allergen_code],
                                relation_type="contains",
                                source=settings.data_source,
                            )
                            allergen_link_count += 1
                    
                    # Link allergens (may_contain/traces)
                    for allergen_code in product_data.get("traces_tags", []):
                        if allergen_code in allergen_map:
                            await link_product_allergen(
                                session,
                                product_id=product_id,
                                allergen_id=allergen_map[allergen_code],
                                relation_type="may_contain",
                                source=settings.data_source,
                            )
                            allergen_link_count += 1

                    # Progress updates
                    if product_count % 100 == 0:
                        await session.commit()
                    
                    if product_count % 10000 == 0 and product_count > 0:
                        elapsed = (datetime.now() - step4_start).total_seconds()
                        rate = product_count / elapsed if elapsed > 0 else 0
                        log(f"  Imported {product_count:,} products ({rate:.1f}/sec) | "
                            f"ingredient links: {ingredient_link_count:,}, allergen links: {allergen_link_count:,}")

                except Exception as e:
                    log(f"  WARNING: Failed to import product {product_data.get('barcode', 'unknown')}: {e}")
                    continue

            await session.commit()

        
        log(f"  Final count: {product_count:,} products imported")
        log(f"  Created {ingredient_link_count:,} product-ingredient links")
        log(f"  Created {allergen_link_count:,} product-allergen links")
        
        # =====================================================================
        # Step 4: Summary
        # =====================================================================
        elapsed = datetime.now() - start_time
        print("\n" + "=" * 80)
        print("Import Complete!")
        print("=" * 80)
        print(f"Total time: {elapsed}")
        print("\nSummary:")
        print(f"  - Allergens: {len(allergen_map)}")
        print(f"  - Ingredients: {len(ingredient_map)}")
        print(f"  - Products: {product_count}")
        print(f"  - Product-Ingredient links: {ingredient_link_count}")
        print(f"  - Product-Allergen links: {allergen_link_count}")
        print("=" * 80)

        hours = int(elapsed.total_seconds() // 3600)
        minutes = int((elapsed.total_seconds() % 3600) // 60)
        seconds = int(elapsed.total_seconds() % 60)
        
        log("")
        log("=" * 80)
        log("Import Complete!")
        log("=" * 80)
        log(f"Total time: {hours}h {minutes}m {seconds}s")
        log("")
        log("Summary:")
        log(f"  - Allergens: {len(allergen_map):,}")
        log(f"  - Ingredients: {len(ingredient_map):,}")
        log(f"  - Products: {product_count:,}")
        log(f"  - Product-Ingredient links: {ingredient_link_count:,}")
        log(f"  - Product-Allergen links: {allergen_link_count:,}")
        log("=" * 80)
    
    finally:
        # Cleanup temp files
        cleanup_temp_dir(temp_dir)


if __name__ == "__main__":
    # Run import
    asyncio.run(load_off_data())
