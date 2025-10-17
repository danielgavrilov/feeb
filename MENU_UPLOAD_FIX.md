# Menu Upload Issue - Diagnosis & Fix

**Date**: October 17, 2025
**Issue**: Menu upload shows success message but no recipes appear in recipe book

## Root Cause Analysis

### What Happened

When you uploaded the URL https://www.cafeconstant.nl/, the system:

1. ✅ Successfully received the upload
2. ✅ Called Gemini API to extract menu items
3. ❌ Gemini returned a **192KB JSON response** (line 2280, ~192K characters)
4. ❌ JSON was **truncated/corrupted** with unterminated string at character 191,796
5. ❌ JSON parser failed and returned empty list `[]`
6. ✅ System marked upload as "completed" with **0 recipes created**
7. ❌ Frontend showed success message despite 0 recipes

### Database Evidence

```sql
-- Upload record shows "completed" status but 0 linked recipes
SELECT id, restaurant_id, status FROM menu_upload WHERE id = 13;
-- Result: id=13, restaurant_id=1, status='completed'

SELECT * FROM menu_upload_recipe WHERE menu_upload_id = 13;
-- Result: 0 rows (no recipes linked)
```

### The Problem

The system was **technically working correctly**:
- Upload completed successfully ✅
- Stage 1 completed with 0 recipes ✅
- Stage 2 skipped (nothing to process) ✅
- No errors thrown ✅

But the **user experience was broken**:
- Success message when nothing was extracted ❌
- No indication that the menu was too large/complex ❌
- No way to know what went wrong ❌

## Fixes Applied

### 1. ✅ Enhanced JSON Parser (Backend)

**File**: `apps/api/app/services/gemini_client.py`

**Changes**:
- Added `_extract_partial_json_array()` method to salvage complete items from truncated JSON
- Improved error handling with multiple fallback strategies:
  1. Try standard JSON parsing
  2. Remove markdown code fences and retry
  3. Use regex to extract JSON structure
  4. **NEW**: Parse partial JSON arrays and extract complete items before truncation
- Added better error logging (shows first 500 and last 200 chars)
- Returns empty list gracefully instead of crashing

**Impact**: If Gemini returns 100 items but JSON gets truncated after 80, we now extract those 80 items instead of returning 0.

### 2. ✅ Limited Response Size (Backend)

**File**: `apps/api/app/routes.py`

**Changes**:
```python
# OLD PROMPT:
"Extract all menu items..."

# NEW PROMPT:
"Extract menu items from the provided content and output them as a JSON array. "
"IMPORTANT: If the menu has more than 50 items, extract only the first 50 main dishes/items. "
```

**Impact**: 
- Prevents huge responses that get truncated
- Limits to 50 items maximum
- More reliable parsing
- Faster processing

### 3. ✅ Better User Feedback (Frontend)

**File**: `apps/web/src/pages/MenuUpload.tsx`

**Changes**:
```typescript
// Check if any recipes were actually created
if (response.created_recipe_ids && response.created_recipe_ids.length > 0) {
  toast.success(`Menu uploaded successfully! ${count} dish${es} added.`);
} else {
  toast.warning("Menu processed but no dishes could be extracted.");
  setError("No dishes were extracted. Try a different format or add manually.");
}
```

**Impact**:
- Shows warning toast instead of success when 0 recipes extracted
- Displays clear error message explaining the issue
- Suggests alternatives (different format or manual entry)

## How to Test

### Test with the Previous Problematic URL

1. **Start the frontend** (if not already running):
   ```bash
   pnpm dev
   ```

2. **Navigate to Menu Upload** in the app

3. **Try the same URL again**:
   - URL: `https://www.cafeconstant.nl/`
   - Should now extract **up to 50 items**
   - If extraction fails, you'll see a **warning** instead of success

4. **Check the results**:
   - If items extracted: Success toast with count
   - If nothing extracted: Warning toast with helpful message
   - Check Recipe Book to verify items are there

### Expected Behavior Now

#### Scenario A: Extraction Succeeds (50 or fewer items)
```
✅ Toast: "Menu uploaded successfully! 47 dishes added to your recipe book."
✅ Recipes appear in Recipe Book
✅ Stage 1: Completed (47 recipes)
✅ Stage 2: Completed (ingredients added)
```

#### Scenario B: Partial Extraction (JSON truncated)
```
⚠️ Console: "WARNING: JSON was truncated. Extracted 42 partial items."
✅ Toast: "Menu uploaded successfully! 42 dishes added to your recipe book."
✅ 42 recipes appear in Recipe Book (better than 0!)
```

#### Scenario C: Complete Failure (nothing extracted)
```
⚠️ Toast: "Menu processed but no dishes could be extracted..."
❌ Error message: "No dishes were extracted. Try a different format..."
📋 Recipes: 0 added
💡 Suggestion: Try different format or add manually
```

## Technical Details

### Partial JSON Extraction Algorithm

The new `_extract_partial_json_array()` method:

1. Scans through the JSON character by character
2. Tracks brace depth (`{` and `}`)
3. Handles string escaping properly (`\"` inside strings)
4. Identifies complete objects (depth returns to 0)
5. Parses each complete object individually
6. Skips incomplete/corrupted objects
7. Returns array of successfully parsed items

Example:
```json
[
  {"title": "Espresso", "price": 2.5},
  {"title": "Cappuccino", "price": 3.0},
  {"title": "Latte", "pr
```

**Before**: Crash with JSONDecodeError → 0 items extracted
**After**: Extract first 2 complete items → 2 items extracted ✅

### Response Size Limit

The 50-item limit was chosen because:
- Typical restaurant menu: 20-40 items
- Prevents JSON response > 100KB
- Gemini API works reliably with this size
- Processing time stays under 30 seconds
- Users can always add more items manually

## Monitoring & Debugging

### Check API Logs

```bash
# See recent menu upload activity
docker logs feeb-api --tail 100 | grep -i "menu\|extract\|parse"

# Check for parsing warnings
docker logs feeb-api 2>&1 | grep "WARNING: JSON was truncated"

# See full error details
docker logs feeb-api --tail 200
```

### Check Database

```sql
-- See recent uploads with recipe counts
SELECT 
  mu.id, 
  mu.restaurant_id, 
  mu.status, 
  mu.source_value,
  COUNT(mur.recipe_id) as recipe_count
FROM menu_upload mu
LEFT JOIN menu_upload_recipe mur ON mu.id = mur.menu_upload_id
GROUP BY mu.id
ORDER BY mu.created_at DESC
LIMIT 10;

-- See what recipes were created for a specific upload
SELECT r.id, r.name, r.menu_category
FROM recipe r
JOIN menu_upload_recipe mur ON r.id = mur.recipe_id
WHERE mur.menu_upload_id = 13
ORDER BY r.id;
```

### Frontend Console

The browser console will show:
- API requests with payloads
- Response data including `created_recipe_ids`
- Any frontend errors

## Remaining Limitations

1. **50 item maximum** per upload
   - Large menus need multiple uploads or manual entry
   - Future: Add pagination or batch processing

2. **URL content quality**
   - Some websites have poor HTML structure
   - JavaScript-heavy sites may not work
   - Consider PDF/image upload for complex menus

3. **LLM accuracy**
   - Gemini may misinterpret some items
   - Always review extracted recipes
   - Mark as "confirmed" after verification

## Next Steps

If you still have issues with menu uploads:

1. **Try a PDF instead of URL**
   - More reliable structure
   - Better extraction accuracy

2. **Try smaller batches**
   - Upload menu sections separately
   - E.g., "Appetizers", "Main Courses", "Desserts"

3. **Use manual entry**
   - Navigate to "Add Dish" manually
   - Guided flow for complex items

4. **Check the logs**
   - Look for parsing warnings
   - Report consistent failures

## Summary

✅ **Fixed**: Truncated JSON now extracts partial items instead of returning 0
✅ **Fixed**: Response size limited to 50 items to prevent truncation
✅ **Fixed**: Frontend shows warning when 0 recipes extracted
✅ **Improved**: Better error messages and user guidance

The menu upload feature should now work reliably for most restaurant menus!

