# Stage 2 Implementation Handover: Ingredient Deduction

## Current Status ✅

**Stage 1 is COMPLETE and working:**
- ✅ Gemini Flash Lite integration for menu extraction
- ✅ Database migrations applied (menu_upload tables exist)
- ✅ Full upload pipeline: URL/PDF/Image → Gemini → Recipe storage
- ✅ API endpoints responding correctly
- ✅ Recipes saved and accessible via API
- ✅ Stage 2 is currently SKIPPED in the pipeline

## What Stage 2 Should Do

**Goal:** For each recipe created in Stage 1, use Gemini to infer ingredients, quantities, units, and allergens.

**Input:** List of recipe names from Stage 1
**Output:** Ingredients for each recipe saved to `recipe_ingredient` table

## Implementation Plan

### 1. Create Stage 2 Gemini Endpoint

**File:** `apps/api/app/routes.py`
**Add:** New endpoint `POST /llm/deduce-ingredients`

```python
@router.post("/llm/deduce-ingredients")
async def deduce_recipe_ingredients(request: dict):
    """Call Gemini to infer ingredients for each recipe.
    
    Request: { "recipes": [{"name": "Pizza Margherita", "recipe_id": 123}, ...] }
    Response: { "recipes": [{"name": "Pizza Margherita", "ingredients": [...]}, ...] }
    """
```

### 2. Gemini Prompt for Stage 2

**Use this exact prompt:**

```
For each recipe name provided, infer the ingredients needed to make it for 1 person. 
Return a JSON object with this structure:

{
  "recipes": [
    {
      "name": "Recipe Name",
      "ingredients": [
        {
          "name": "ingredient name",
          "quantity": 0.0,
          "unit": "g/ml/piece/etc",
          "notes": "optional preparation notes",
          "allergens": ["gluten", "dairy", "nuts", etc]
        }
      ]
    }
  ]
}

Rules:
- Quantities should be metric (grams, milliliters, pieces)
- Base quantities on 1 person serving
- Include common allergens when obvious
- Don't infer missing information
- Return only valid JSON, no prose
```

### 3. Update Menu Upload Service

**File:** `apps/api/app/services/menu_upload.py`

**Replace the skipped Stage 2 section with:**

```python
# Stage 2 - ingredient deduction
if created_recipes:
    self._update_stage_record(stage2, MenuUploadStageStatus.RUNNING)
    await session.flush()

    try:
        # Call Stage 2 endpoint
        recipes_for_deduction = [
            {"name": name, "recipe_id": recipe_id}
            for recipe_id, name in created_recipes
        ]
        
        ingredient_payload = await self._call_recipe_deduction(recipes_for_deduction)
    except Exception as exc:
        self._update_stage_record(stage2, MenuUploadStageStatus.FAILED, error=str(exc))
        upload.status = MenuUploadStatus.FAILED.value
        upload.error_message = f"Stage 2 failed: {exc}"
        await session.flush()
        raise

    # Save ingredients to database
    added_count = await self._store_deduced_ingredients(
        session,
        created_recipes,
        ingredient_payload,
    )

    upload.stage2_completed_at = datetime.utcnow()
    self._update_stage_record(
        stage2,
        MenuUploadStageStatus.COMPLETED,
        details={"ingredients_added": added_count},
    )
    await session.flush()
```

### 4. Update Configuration

**File:** `apps/api/app/config.py`
**Add:** 
```python
llm_recipe_deduction_url: Optional[str] = None
```

**File:** `apps/api/.env`
**Add:**
```
LLM_RECIPE_DEDUCTION_URL=http://localhost:8000/llm/deduce-ingredients
```

**File:** `apps/api/docker-compose.yml`
**Add to environment section:**
```yaml
LLM_RECIPE_DEDUCTION_URL: ${LLM_RECIPE_DEDUCTION_URL:-http://localhost:8000/llm/deduce-ingredients}
```

### 5. Update Menu Upload Service Method

**File:** `apps/api/app/services/menu_upload.py`

**Update `_call_recipe_deduction` method:**

```python
async def _call_recipe_deduction(self, recipes: Sequence[Dict]) -> Dict:
    if not self.recipe_deduction_url:
        raise HTTPException(status_code=503, detail="LLM recipe deduction service not configured")

    payload = {"recipes": recipes}
    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(self.recipe_deduction_url, json=payload, headers=self._auth_headers())
        response.raise_for_status()
        data = response.json()
    if not isinstance(data, dict):
        raise HTTPException(status_code=502, detail="Unexpected response from recipe deduction service")
    return data
```

### 6. Update `_store_deduced_ingredients` Method

**File:** `apps/api/app/services/menu_upload.py`

**Update the method to handle the new response format:**

```python
async def _store_deduced_ingredients(
    self,
    session: AsyncSession,
    recipes: Sequence[Tuple[int, str]],
    deduction_payload: Dict,
) -> int:
    """Persist ingredient predictions into recipe_ingredient records."""

    recipe_lookup = {name.lower(): recipe_id for recipe_id, name in recipes}
    added = 0

    recipes_data = deduction_payload.get("recipes") if isinstance(deduction_payload, dict) else None
    if not recipes_data:
        return added

    for recipe_entry in recipes_data:
        recipe_name = self._safe_string(recipe_entry.get("name"))
        if not recipe_name:
            continue
        recipe_id = recipe_lookup.get(recipe_name.lower())
        if recipe_id is None:
            continue

        ingredients = recipe_entry.get("ingredients") or []
        for ingredient in ingredients:
            name = self._safe_string(ingredient.get("name") or ingredient.get("ingredient"))
            if not name:
                continue
            quantity = self._parse_float(ingredient.get("quantity"))
            unit = self._safe_string(ingredient.get("unit"))
            notes = self._safe_string(ingredient.get("notes"))
            allergens = ingredient.get("allergens")
            allergen_serialized: Optional[str]
            if allergens is None:
                allergen_serialized = None
            elif isinstance(allergens, (list, dict)):
                allergen_serialized = json.dumps(allergens)
            else:
                allergen_serialized = json.dumps([allergens])

            # Create ingredient record
            ingredient_code = f"llm:{uuid4().hex}"
            ingredient_id = await dal.insert_ingredient(
                session,
                code=ingredient_code,
                name=name,
                source="llm",
            )

            # Link to recipe
            await dal.add_recipe_ingredient(
                session,
                recipe_id=recipe_id,
                ingredient_id=ingredient_id,
                quantity=quantity,
                unit=unit,
                notes=notes,
                allergens=allergen_serialized,
                confirmed=False,
            )
            added += 1

    return added
```

## Testing Steps

### 1. Test Stage 2 Endpoint Directly

```bash
curl -X POST http://localhost:8000/llm/deduce-ingredients \
  -H "Content-Type: application/json" \
  -d '{"recipes": [{"name": "Pizza Margherita", "recipe_id": 1}]}'
```

**Expected response:**
```json
{
  "recipes": [
    {
      "name": "Pizza Margherita",
      "ingredients": [
        {
          "name": "pizza dough",
          "quantity": 200,
          "unit": "g",
          "notes": "fresh or store-bought",
          "allergens": ["gluten"]
        },
        {
          "name": "tomato sauce",
          "quantity": 100,
          "unit": "ml",
          "notes": "passata or crushed tomatoes",
          "allergens": []
        }
      ]
    }
  ]
}
```

### 2. Test Full Pipeline

```bash
# Create test script
cat > test_stage2.py << 'EOF'
import asyncio
import httpx

async def test_stage2():
    async with httpx.AsyncClient() as client:
        # Upload menu
        response = await client.post("http://localhost:8000/menu-uploads", 
            data={
                "restaurant_id": 1,
                "source_type": "url", 
                "url": "https://example.com"
            }
        )
        result = response.json()
        print(f"Upload result: {result['status']}")
        print(f"Recipes created: {len(result['created_recipe_ids'])}")
        
        # Check if ingredients were added
        for recipe_id in result['created_recipe_ids']:
            recipe_response = await client.get(f"http://localhost:8000/recipes/{recipe_id}")
            recipe = recipe_response.json()
            print(f"Recipe {recipe_id} ({recipe['name']}): {len(recipe['ingredients'])} ingredients")

asyncio.run(test_stage2())
EOF

python3 test_stage2.py
```

## Database Schema Reference

**Tables involved:**
- `recipe` - stores the dishes from Stage 1
- `recipe_ingredient` - links recipes to ingredients (Stage 2 output)
- `ingredient` - stores ingredient names and metadata
- `menu_upload_stage` - tracks Stage 2 completion

**Key fields:**
- `recipe_ingredient.quantity` - DECIMAL(10,3)
- `recipe_ingredient.unit` - TEXT
- `recipe_ingredient.notes` - TEXT  
- `recipe_ingredient.allergens` - JSON string
- `recipe_ingredient.confirmed` - BOOLEAN (default FALSE)

## Environment Variables

**Required in `apps/api/.env`:**
```
GEMINI_API_KEY=your_key_here
LLM_EXTRACTION_URL=http://localhost:8000/llm/extract-menu
LLM_RECIPE_DEDUCTION_URL=http://localhost:8000/llm/deduce-ingredients
```

## Current Working State

- ✅ Stage 1: Menu extraction working
- ✅ Database: All tables exist and migrated
- ✅ API: Running on http://localhost:8000
- ✅ Docker: Containers running with proper env vars
- ⏳ Stage 2: Currently skipped, needs implementation

## Success Criteria

After implementation:
1. Full menu upload creates recipes AND ingredients
2. Stage 2 shows "completed" status in upload response
3. Recipe detail API returns ingredients with quantities/units
4. Ingredients are marked as `confirmed=false` for manual review

## Files to Modify

1. `apps/api/app/routes.py` - Add Stage 2 endpoint
2. `apps/api/app/services/menu_upload.py` - Enable Stage 2 processing
3. `apps/api/app/config.py` - Add deduction URL config
4. `apps/api/.env` - Add environment variable
5. `apps/api/docker-compose.yml` - Pass env var to container

## Notes

- Stage 2 uses the same Gemini client as Stage 1
- Ingredients are created with `source="llm"` and `confirmed=false`
- The pipeline expects the same JSON structure as Stage 1
- All error handling patterns from Stage 1 apply to Stage 2
- Test with simple recipes first (pizza, pasta, salad) before complex dishes

---

**Ready to implement!** The foundation is solid, just need to add the Stage 2 endpoint and wire it into the existing pipeline.
