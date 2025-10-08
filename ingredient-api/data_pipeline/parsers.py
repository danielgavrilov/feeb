"""
Parsers for OpenFoodFacts taxonomy and product data.
"""

import json
import gzip
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Iterator, List, Optional
from typing import Dict, List, Iterator, Optional
import re


def parse_taxonomy_file(filepath: Path) -> List[Dict]:
    """
    Parse OpenFoodFacts taxonomy file (ingredients.txt or allergens.txt).
    
    OFF taxonomy files use indented key-value pairs:
    - Lines starting with "id:" begin a new entry
    - Other fields like "name:", "parents:", "allergen:" follow
    - Entries are grouped by consecutive lines
    
    Args:
        filepath: Path to taxonomy .txt file
    
    Returns:
        List of dictionaries with keys: code, name, parent_codes, allergen_code
    """
    entries = []
    current_entry = {}
    
    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            line = line.rstrip("\n")
            
            # Skip empty lines and comments
            if not line or line.startswith("#"):
                continue
            
            # Check if this is a key-value pair
            if ":" in line:
                # Split only on first colon
                key, _, value = line.partition(":")
                key = key.strip()
                value = value.strip()
                
                # New entry starts with "id:"
                if key == "id":
                    # Save previous entry if exists
                    if current_entry:
                        entries.append(current_entry)
                    
                    # Start new entry
                    current_entry = {
                        "code": value,
                        "name": "",
                        "parent_codes": [],
                        "allergen_code": None
                    }
                
                # Process other fields
                elif current_entry:
                    if key.startswith("name"):
                        # name:en or just name
                        if not current_entry["name"]:  # Take first name found
                            current_entry["name"] = value
                    
                    elif key == "parents":
                        # Parents are comma-separated
                        if value:
                            current_entry["parent_codes"] = [p.strip() for p in value.split(",")]
                    
                    elif key == "allergen":
                        current_entry["allergen_code"] = value
        
        # Don't forget last entry
        if current_entry:
            entries.append(current_entry)
    
    return entries


def parse_product_jsonl(filepath: Path, limit: Optional[int] = 10000) -> Iterator[Dict]:
    """
    Stream-read OpenFoodFacts product JSONL file (compressed or uncompressed).
    
    Args:
        filepath: Path to .jsonl or .jsonl.gz file
        limit: Maximum number of products to yield
    
    Yields:
        Product dictionaries with relevant fields extracted
    """
    count = 0
    effective_limit = limit if (isinstance(limit, int) and limit > 0) else float("inf")
    
    # Determine if file is compressed
    if filepath.suffix == ".gz":
        f = gzip.open(filepath, "rt", encoding="utf-8")
    else:
        f = open(filepath, "r", encoding="utf-8")
    
    try:
        for line in f:
            if limit is not None and count >= limit:
            if count >= effective_limit:
                break

            try:
                product = json.loads(line)

                last_modified_raw = product.get("last_modified_t")
                last_modified = None

                if last_modified_raw:
                    try:
                        last_modified = datetime.fromtimestamp(
                            int(last_modified_raw), tz=timezone.utc
                        ).replace(tzinfo=None)
                    except (TypeError, ValueError, OSError):
                        last_modified = None

                # Extract relevant fields
                nutriments = product.get("nutriments", {}) or {}
                # Prefer new 2023 nutriscore if present, else legacy
                nutri_grade = product.get("nutriscore_2023_grade") or product.get("nutriscore_grade")
                nutri_score = product.get("nutriscore_2023_score") or product.get("nutriscore_score")
                categories_hierarchy = product.get("categories_hierarchy") or product.get("categories_tags") or []

                extracted = {
                    "barcode": product.get("code", ""),
                    "name": product.get("product_name", ""),
                    "brand": product.get("brands", ""),
                    "lang": product.get("lang", "en"),
                    "ingredients_tags": product.get("ingredients_tags", []),
                    "allergens_tags": product.get("allergens_tags", []),
                    "traces_tags": product.get("traces_tags", []),
                    "last_modified": last_modified,
                    "ingredients_full": product.get("ingredients", []) or [],
                    "states_tags": product.get("states_tags", []) or [],
                    # Nutrition (per 100g/ml)
                    "nutrition": {
                        "fat_100g": nutriments.get("fat_100g"),
                        "saturated_fat_100g": nutriments.get("saturated-fat_100g"),
                        "carbohydrates_100g": nutriments.get("carbohydrates_100g"),
                        "sugars_100g": nutriments.get("sugars_100g"),
                        "fiber_100g": nutriments.get("fiber_100g"),
                        "proteins_100g": nutriments.get("proteins_100g"),
                        "salt_100g": nutriments.get("salt_100g"),
                    },
                    # Nutri-score
                    "nutriscore_grade": nutri_grade,
                    "nutriscore_score": nutri_score,
                    # Quantity
                    "quantity": product.get("quantity"),
                    # Categories hierarchy
                    "categories_hierarchy": categories_hierarchy,
                }
                
                # Only yield if barcode and name exist
                if extracted["barcode"] and extracted["name"]:
                    yield extracted
                    count += 1
            
            except json.JSONDecodeError:
                # Skip malformed JSON lines
                continue
    
    finally:
        f.close()


def extract_category_from_parents(parent_codes: List[str]) -> Optional[str]:
    """
    Extract category from parent codes.
    
    For allergens, parent codes often indicate category (e.g., "en:grain", "en:nuts").
    
    Args:
        parent_codes: List of parent codes
    
    Returns:
        Category string or None
    """
    if not parent_codes:
        return None
    
    # Use first parent as category (simplified approach)
    first_parent = parent_codes[0]
    
    # Remove language prefix if present
    if ":" in first_parent:
        _, category = first_parent.split(":", 1)
        return category.replace("-", " ").title()
    
    return first_parent


def normalize_ingredient_name(name: str) -> str:
    """
    Normalize ingredient name for consistency.
    
    Args:
        name: Raw ingredient name
    
    Returns:
        Normalized name
    """
    # Basic normalization
    name = name.strip()
    
    # Capitalize first letter if all lowercase
    if name and name[0].islower():
        name = name[0].upper() + name[1:]
    
    return name

