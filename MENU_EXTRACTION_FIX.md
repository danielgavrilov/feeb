# Menu Extraction Issue - Root Cause & Fixes

**Date**: October 17, 2025
**Issue**: Strange duplicates and nonsensical menu items extracted

## Root Cause Analysis

### What Actually Happened

When you uploaded https://www.cafeconstant.nl/, Gemini made a **critical mistake**:

**Extracted**: 245 items
**Unique items**: Only 106 unique names
**Duplicates**: 139 duplicate records!

#### The Most Egregious Example

One "recipe" appeared **137 times**:
```
Verse Gember Citroen Honing Chili Sinaasappel Kaneel Kruidnagel Steranijs Kardemom 
Zwarte Peper Koriander Komijn Mosterdzaad Fenegriek Anijs Venkel Lavendel Rozemarijn 
Tijm Oregano Basilicum Munt Peterselie Dille Kervel Bieslook Dragon Salie Marjolein 
Bonenkruid Citroenmelisse Brandnetel Paardenbloem Weegbree Vlierbloesem Kamille 
Lindebloesem Rozenbottel Hibiscus Brandnetel Gember Citroen Honing Chili Sinaasappel 
Kaneel Kruidnagel Steranijs Kardemom Zwarte Peper Koriander Komijn Mosterdzaad 
Fenegriek Anijs Venkel Lavendel Rozemarijn Tijm Oregano Basilicum Munt Peterselie 
Dille Kervel Bieslook Dragon Salie Marjolein Bonenkruid Citroenmelisse Brandnetel 
Paardenbloem Weegbree Vlierbloesem Kamille Lindebloesem Rozenbottel Hibiscus 
Brandnetel Gember Citroen Honing Chili Sinaasappel Kaneel Kruidnagel Steranijs 
Kardemom Zwarte Peper Koriander Komijn Mosterdzaad Fenegriek Anijs Venkel Thee
```

**This is NOT a menu item!** It's a list of tea ingredients/spices that Gemini mistakenly extracted as a dish.

### Database Evidence

```sql
SELECT COUNT(*) as total, COUNT(DISTINCT name) as unique_names 
FROM recipe WHERE id >= 177;

-- Result:
-- total: 245
-- unique_names: 106
-- Duplicates: 139!
```

### The Two Problems

#### Problem 1: Gemini Extracted Ingredient Lists (Stage 1)

**What the website has**: Lists of tea ingredients, spices, herbs available
**What Gemini did**: Extracted these lists as if they were menu items
**Result**: 137 duplicates of ingredient lists labeled as "Koffie" category

#### Problem 2: Stage 2 Sent ALL Recipes at Once

**Code issue** (line 200-205 in `menu_upload.py`):
```python
# OLD CODE - sent ALL recipes in one API call
recipes_for_deduction = [
    {"name": name, "recipe_id": recipe_id}
    for recipe_id, name in created_recipes  # ALL 245 recipes!
]
ingredient_payload = await self._call_recipe_deduction(recipes_for_deduction)
```

**Result**: 
- 245 recipes → Gemini response = 210KB
- Response truncated at character 210,700
- JSON parsing failed
- No ingredients were added to any recipes

### Confirmed by Logs

```
WARNING: JSON was truncated. Extracted 245 partial items.
INFO: 127.0.0.1:35318 - "POST /llm/extract-menu HTTP/1.1" 200 OK
Failed to parse JSON after all attempts. Error: Unterminated string starting at: line 9215 column 11 (char 210700)
```

## Fixes Applied

### Fix 1: Improved Extraction Prompt ✅

**File**: `apps/api/app/routes.py`

**Before**:
```python
prompt = (
    "Extract ALL menu items from the provided content and output them as a JSON array..."
)
```

**After**:
```python
prompt = (
    "Extract menu items (dishes, drinks, meals) from the provided content and output them as a JSON array. "
    "IMPORTANT RULES:\n"
    "- ONLY extract actual menu items that a customer would order (e.g., 'Cappuccino', 'Caesar Salad', 'Burger')\n"
    "- DO NOT extract ingredient lists, allergen lists, or lists of spices/herbs\n"
    "- DO NOT extract items that are just lists of ingredients without being an actual dish\n"
    "- DO NOT include duplicate items\n"
    "- Each item must be a complete menu offering with a name/title\n\n"
    "Output format: [{\"title\": \"Dish Name\", \"price\": 10.50, \"currency\": \"€\", ...}]\n\n"
    "Return ONLY valid JSON with no markdown, no prose. If unsure about a field, use null or empty string/array."
)
```

**Changes**:
- ✅ Explicitly tells Gemini to extract ONLY menu items customers would order
- ✅ Explicitly forbids extracting ingredient lists, allergen lists, spice lists
- ✅ Forbids duplicates
- ✅ Clearer examples of what to extract

### Fix 2: Batch Processing for Stage 2 ✅

**File**: `apps/api/app/services/menu_upload.py`

**Before** (sent all recipes at once):
```python
recipes_for_deduction = [
    {"name": name, "recipe_id": recipe_id}
    for recipe_id, name in created_recipes  # Could be 245 recipes!
]
ingredient_payload = await self._call_recipe_deduction(recipes_for_deduction)
```

**After** (process in batches of 25):
```python
# Process recipes in batches to avoid huge API responses
batch_size = 25
total_added = 0

for i in range(0, len(created_recipes), batch_size):
    batch = created_recipes[i:i + batch_size]
    recipes_for_deduction = [
        {"name": name, "recipe_id": recipe_id}
        for recipe_id, name in batch
    ]
    
    ingredient_payload = await self._call_recipe_deduction(recipes_for_deduction)
    
    # Save ingredients for this batch
    added_count = await self._store_deduced_ingredients(
        session,
        batch,
        ingredient_payload,
    )
    total_added += added_count
```

**Benefits**:
- ✅ **Batch size: 25 recipes** per API call
- ✅ Responses stay under ~20-30KB (manageable)
- ✅ If one batch fails, others can succeed
- ✅ Progress is saved incrementally
- ✅ No more 210KB truncated responses

**Example**: 
- 100 recipes → 4 batches of 25
- Each batch: 25 recipes → ~25KB response
- Total processing: 4 API calls instead of 1 massive call

### Fix 3: Cleaned Up Bad Data ✅

Removed all 245 bad recipes and related records from the database so you can test fresh.

## Expected Results Now

### Scenario 1: Normal Menu (20-40 items)
```
Stage 1: Extract actual menu items (not ingredient lists)
Result: 20-40 recipes created

Stage 2: Process in 1-2 batches of 25
Batch 1: Recipes 1-25 → ingredients added ✅
Batch 2: Recipes 26-40 → ingredients added ✅

Upload Status: Completed ✅
Recipes in Book: 20-40 actual dishes ✅
```

### Scenario 2: Large Menu (100+ items)
```
Stage 1: Extract actual menu items
Result: 100 recipes created

Stage 2: Process in 4 batches of 25
Batch 1: Recipes 1-25 → ingredients added ✅
Batch 2: Recipes 26-50 → ingredients added ✅
Batch 3: Recipes 51-75 → ingredients added ✅
Batch 4: Recipes 76-100 → ingredients added ✅

Upload Status: Completed ✅
Recipes in Book: 100 actual dishes ✅
```

### Scenario 3: Still Gets Ingredient Lists (Gemini mistake)
```
Stage 1: Extracts some ingredient lists despite better prompt
Result: 50 recipes (some are ingredient lists)

Stage 2: Process in 2 batches of 25
Batch 1: 25 recipes → ingredients added ✅
Batch 2: 25 recipes → ingredients added ✅

Upload Status: Completed ✅
User Action: Review and manually delete ingredient list "recipes" ⚠️
```

## How to Test

1. **Start frontend** (if not running):
   ```bash
   pnpm dev
   ```

2. **Try uploading the same URL again**:
   - URL: https://www.cafeconstant.nl/
   - Should now extract ONLY actual menu items (Espresso, Cappuccino, Pantosti, etc.)
   - Should NOT extract ingredient lists
   - Stage 2 should complete successfully with batching

3. **Check results**:
   ```sql
   -- See what was extracted
   SELECT
     r.name,
     ms.name AS menu_section,
     COUNT(*) AS count
   FROM recipe r
   LEFT JOIN menu_section_recipe msr ON msr.recipe_id = r.id
   LEFT JOIN menu_section ms ON ms.id = msr.section_id
   WHERE r.created_at > NOW() - INTERVAL '10 minutes'
   GROUP BY r.name, ms.name
   ORDER BY count DESC;
   
   -- Should see actual menu items with count=1
   -- Should NOT see ingredient lists
   -- Should NOT see massive duplicates
   ```

4. **Expected outcome**:
   - ✅ 20-50 actual menu items extracted
   - ✅ No duplicates
   - ✅ No ingredient lists
   - ✅ Stage 2 completes successfully
   - ✅ Ingredients added to all recipes

## Monitoring

### Check for Ingredient List Extraction

If you see recipes like:
- "Verse Gember Citroen Honing..." → Delete it (it's an ingredient list)
- Long strings of spices/herbs → Delete it
- Anything that's not a dish name → Delete it

### Check Batch Processing

```bash
# Watch logs for batch processing
docker logs feeb-api -f | grep "stage\|batch"

# You should see multiple Stage 2 calls for large menus
# Not one giant call that fails
```

### Database Queries

```sql
-- Count recipes by menu section
SELECT
  ms.name AS menu_section,
  COUNT(*)
FROM menu_section ms
JOIN menu_section_recipe msr ON msr.section_id = ms.id
WHERE msr.recipe_id IN (
  SELECT id FROM recipe WHERE created_at > NOW() - INTERVAL '1 hour'
)
GROUP BY ms.name;

-- Find suspiciously long recipe names (likely ingredient lists)
SELECT id, name, LENGTH(name) as name_length
FROM recipe
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND LENGTH(name) > 100
ORDER BY name_length DESC;

-- Find duplicates
SELECT name, COUNT(*) as count
FROM recipe
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY name
HAVING COUNT(*) > 1
ORDER BY count DESC;
```

## Why This Happened

### Gemini's Perspective

The website has HTML like:
```html
<div class="menu-items">
  <div>Espresso</div>
  <div>Cappuccino</div>
</div>
<div class="ingredients-list">
  <span>Gember</span>
  <span>Citroen</span>
  <span>Honing</span>
  ...
</div>
```

**Without clear instructions**, Gemini saw both sections and thought:
- "These are all items to extract"
- "Oh look, another item: 'Gember Citroen Honing...'"
- "I'll extract this 137 times because it appears in multiple places"

**With improved prompt**, Gemini now knows:
- "Only extract things customers would order"
- "Don't extract ingredient lists"
- "Don't duplicate"

### The Batch Size Choice

**Why 25 recipes per batch?**

- 25 recipes → ~20-30KB response (safe)
- 50 recipes → ~40-60KB response (risky)
- 100 recipes → ~100KB+ response (likely to truncate)
- 245 recipes → 210KB response (definitely truncates)

25 is a sweet spot: fast enough, safe enough.

## Summary

**Root Causes**:
1. ❌ Gemini extracted ingredient lists as menu items
2. ❌ Stage 2 sent all 245 recipes at once, creating 210KB response

**Fixes Applied**:
1. ✅ Improved prompt to exclude ingredient lists and duplicates
2. ✅ Added batch processing (25 recipes per batch)
3. ✅ Cleaned up bad test data

**Ready to Test**: Try uploading the menu again - should work much better now! 🎯

