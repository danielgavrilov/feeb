"""
Main import script for OpenFoodFacts data.
Downloads taxonomy files and product data, then imports into PostgreSQL.
"""

import asyncio
from datetime import datetime
from pathlib import Path
from typing import Dict

from app import dal
from app.config import settings
from app.database import AsyncSessionLocal
from .utils import download_file, ensure_temp_dir, cleanup_temp_dir
from .parsers import (
    parse_taxonomy_file,
    parse_product_jsonl,
    extract_category_from_parents,
    normalize_ingredient_name,
)


# OpenFoodFacts data URLs
# Updated URLs based on https://world.openfoodfacts.org/data
OFF_PRODUCTS_URL = "https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz"
OFF_TAXONOMY_BASE_URL = "https://static.openfoodfacts.org/data/taxonomies"
OFF_INGREDIENT_TAXONOMY_URL = f"{OFF_TAXONOMY_BASE_URL}/ingredients.txt"
OFF_ALLERGEN_TAXONOMY_URL = f"{OFF_TAXONOMY_BASE_URL}/allergens.txt"


def _fallback_name_from_code(code: str) -> str:
    """Return a human readable name from a taxonomy code."""

    if ":" in code:
        _, value = code.split(":", 1)
    else:
        value = code

    return value.replace("-", " ").replace("_", " ").strip().title()


async def load_off_data(product_limit: int | None = None):
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
        # Step 1: Download taxonomy files
        # =====================================================================
        print("\n[1/4] Downloading taxonomy files...")
        ingredient_taxonomy_file = temp_dir / "ingredients.txt"
        allergen_taxonomy_file = temp_dir / "allergens.txt"

        await download_file(OFF_INGREDIENT_TAXONOMY_URL, ingredient_taxonomy_file)
        await download_file(OFF_ALLERGEN_TAXONOMY_URL, allergen_taxonomy_file)

        ingredient_taxonomy_entries = parse_taxonomy_file(ingredient_taxonomy_file)
        allergen_taxonomy_entries = parse_taxonomy_file(allergen_taxonomy_file)

        ingredient_taxonomy = {
            entry["code"]: entry for entry in ingredient_taxonomy_entries if entry.get("code")
        }
        allergen_taxonomy = {
            entry["code"]: entry for entry in allergen_taxonomy_entries if entry.get("code")
        }

        print(
            f"  Loaded {len(ingredient_taxonomy)} ingredient taxonomy entries and "
            f"{len(allergen_taxonomy)} allergen taxonomy entries"
        )

        # =====================================================================
        # Step 2: Download Products File
        # =====================================================================
        print("\n[2/4] Downloading products file...")
        print(f"  Source: {OFF_PRODUCTS_URL}")
        print("  This may take a while...")

        products_file = temp_dir / "products.jsonl.gz"

        await download_file(OFF_PRODUCTS_URL, products_file)

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

        async with AsyncSessionLocal() as session:
            for product_data in parse_product_jsonl(products_file, resolved_limit):
                try:
                    product_id = await dal.insert_product(
                        session,
                        barcode=product_data["barcode"],
                        name=product_data["name"],
                        brand=product_data["brand"] or None,
                        lang=product_data["lang"],
                        last_modified=product_data["last_modified"],
                    )

                    product_count += 1

                    # Ensure allergens exist and link them
                    allergen_codes = set(product_data["allergens_tags"]) | set(
                        product_data["traces_tags"]
                    )
                    for allergen_code in allergen_codes:
                        if not allergen_code:
                            continue

                        if allergen_code not in allergen_map:
                            taxonomy_entry = allergen_taxonomy.get(allergen_code)
                            name = _fallback_name_from_code(allergen_code)
                            category = None

                            if taxonomy_entry:
                                if taxonomy_entry.get("name"):
                                    name = taxonomy_entry["name"]
                                category = extract_category_from_parents(
                                    taxonomy_entry.get("parent_codes", [])
                                )

                            allergen_map[allergen_code] = await dal.insert_allergen(
                                session,
                                code=allergen_code,
                                name=name,
                                category=category,
                            )

                        await dal.link_product_allergen(
                            session,
                            product_id=product_id,
                            allergen_id=allergen_map[allergen_code],
                            relation_type=(
                                "contains"
                                if allergen_code in product_data["allergens_tags"]
                                else "may_contain"
                            ),
                            source=settings.data_source,
                        )
                        allergen_link_count += 1

                    # Ensure ingredients exist and link them
                    for rank, ing_code in enumerate(
                        product_data["ingredients_tags"], start=1
                    ):
                        if not ing_code:
                            continue

                        if ing_code not in ingredient_map:
                            taxonomy_entry = ingredient_taxonomy.get(ing_code)
                            name = _fallback_name_from_code(ing_code)
                            parent_code = None
                            allergen_code = None

                            if taxonomy_entry:
                                if taxonomy_entry.get("name"):
                                    name = taxonomy_entry["name"]
                                parents = taxonomy_entry.get("parent_codes", [])
                                parent_code = parents[0] if parents else None
                                allergen_code = taxonomy_entry.get("allergen_code")

                            ingredient_map[ing_code] = await dal.insert_ingredient(
                                session,
                                code=ing_code,
                                name=normalize_ingredient_name(name),
                                parent_code=parent_code,
                                allergen_code=allergen_code,
                                source=settings.data_source,
                            )

                        await dal.link_product_ingredient(
                            session,
                            product_id=product_id,
                            ingredient_id=ingredient_map[ing_code],
                            rank=rank,
                        )
                        ingredient_link_count += 1

                    if product_count % 100 == 0:
                        await session.commit()
                        print(
                            f"  Progress: {product_count} products imported...",
                            end="\r",
                        )

                except Exception as exc:  # pragma: no cover - logged and skipped
                    print(
                        f"\n  Warning: Failed to import product {product_data['barcode']}: {exc}"
                    )
                    continue

            await session.commit()

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

    finally:
        # Cleanup temp files
        cleanup_temp_dir(temp_dir)


if __name__ == "__main__":
    # Run import
    asyncio.run(load_off_data())

