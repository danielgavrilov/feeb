# Recipe Review Status Fix

## Problem Description

The recipe book section was showing the "Review" indicator on all recipes, regardless of whether they had been reviewed and confirmed. The issue was that:

1. When clicking "confirm" on ingredients during review, the confirmation status was only updated locally in the UI state
2. When saving a dish, the recipe's `confirmed` field was not being set in the database
3. There was no visual feedback indicating whether ingredients had been confirmed or not

## Solution Implemented

### Frontend Changes

#### 1. Updated `Index.tsx` (`apps/web/src/pages/Index.tsx`)

- **Modified `handleSaveDish` function**: Now checks if all ingredients are confirmed before saving
  - Calculates `allIngredientsConfirmed` by checking if every ingredient has `confirmed: true`
  - Sets `confirmed: allIngredientsConfirmed` when creating or updating recipes
  - Shows appropriate success message based on confirmation status
  
```typescript
const allIngredientsConfirmed = ingredients.length > 0 && ingredients.every(ing => ing.confirmed);

await updateRecipeAPI(editingDishId, {
  // ... other fields
  confirmed: allIngredientsConfirmed,
});
```

- **Pass confirmation status to ComplianceOverview**: The compliance step now receives the `allIngredientsConfirmed` prop

#### 2. Updated `ComplianceOverview.tsx` (`apps/web/src/components/ComplianceOverview.tsx`)

- Added new prop `allIngredientsConfirmed?: boolean`
- Added visual alerts to inform users about ingredient confirmation status:
  - **Amber alert**: Shows when some ingredients are not confirmed, prompting user to go back and confirm all ingredients
  - **Green alert**: Shows when all ingredients are confirmed, indicating the recipe will be marked as reviewed

#### 3. Updated API Client (`apps/web/src/lib/api.ts`)

- Added new function `updateRecipeIngredient()` to support updating individual recipe ingredients
- This enables future enhancement where ingredient confirmation can be persisted individually

### Backend Changes

#### 4. Updated Routes (`apps/api/app/routes.py`)

- Added new endpoint `PUT /recipes/{recipe_id}/ingredients/{ingredient_id}` to update recipe ingredients
- This endpoint supports updating the `confirmed` field for individual ingredients
- Uses the existing `add_recipe_ingredient` DAL function which has upsert behavior

## How the Flow Works Now

### Creating a New Recipe

1. User enters dish details
2. User adds ingredients (automatically marked as confirmed when added manually)
3. User proceeds through prep method and compliance overview
4. If all ingredients are confirmed, recipe is saved with `confirmed: true` and displays the tick icon in recipe book
5. If not all ingredients are confirmed, recipe is saved with `confirmed: false` and displays the "Review" button

### Reviewing an Existing Recipe

1. User clicks "Review" button on a recipe in the recipe book
2. Recipe loads in the "Add/Edit Dish" tab
3. User can modify ingredients and click "Confirm" on each one
4. When user reaches the compliance step:
   - Amber alert shows if some ingredients aren't confirmed
   - Green alert shows if all ingredients are confirmed
5. When user clicks "Save Dish":
   - If all ingredients are confirmed, recipe is marked as reviewed (`confirmed: true`)
   - Recipe book now shows the tick icon instead of "Review" button

## Testing the Fix

### Test Case 1: New Recipe with All Ingredients Confirmed

1. Navigate to "Add/Edit Dish" tab
2. Enter dish name and details
3. Add ingredients (they are auto-confirmed when manually added)
4. Proceed to compliance overview
5. Verify green alert appears: "All ingredients confirmed!"
6. Save the dish
7. Go to "Recipe Book" tab
8. Verify the recipe shows the tick icon (✓) instead of "Review"

### Test Case 2: Recipe with Unconfirmed Ingredients

1. Create a recipe but manually mark an ingredient as unconfirmed (by editing the code or import)
2. Edit the recipe
3. Proceed to compliance overview
4. Verify amber alert appears: "Some ingredients are not yet confirmed..."
5. Go back and confirm all ingredients
6. Return to compliance overview
7. Verify alert changes to green
8. Save the dish
9. Verify tick icon appears in recipe book

### Test Case 3: Editing an Already Confirmed Recipe

1. Click the edit button (pencil icon) on a confirmed recipe (one with tick)
2. Make changes without unconfirming ingredients
3. Save the dish
4. Verify it still shows the tick icon

## Database Schema

The solution leverages existing database fields:

- `recipe.confirmed` (Boolean): Indicates whether the recipe has been reviewed and all ingredients confirmed
- `recipe_ingredient.confirmed` (Boolean): Indicates whether each individual ingredient has been confirmed

## Future Enhancements

1. **Ingredient Database Integration**: Currently ingredients are stored as plain text. Future work could:
   - Search and link to ingredients in the `ingredient` table
   - Show allergen information from the database
   - Use the `/recipes/{recipe_id}/ingredients/{ingredient_id}` endpoint to persist individual confirmations

2. **Bulk Confirmation**: Add a "Confirm All Ingredients" button on the ingredients step

3. **Review History**: Track when recipes were last reviewed and by whom

4. **Expiry Warnings**: Show warnings for recipes that haven't been reviewed in X days

## Files Modified

### Frontend
- `/apps/web/src/pages/Index.tsx`
- `/apps/web/src/components/ComplianceOverview.tsx`
- `/apps/web/src/lib/api.ts`

### Backend
- `/apps/api/app/routes.py`

## API Endpoints Used

- `PUT /recipes/{recipe_id}` - Updates recipe including `confirmed` field
- `POST /recipes/{recipe_id}/ingredients` - Adds or updates recipe ingredients (upsert)
- `PUT /recipes/{recipe_id}/ingredients/{ingredient_id}` - Updates specific recipe ingredient (new endpoint)

## No Breaking Changes

All changes are backward compatible:
- Existing recipes without `confirmed` field will default to `false`
- The `confirmed` field is optional in API requests
- No database migrations needed (fields already exist)

---

**Date**: October 17, 2025  
**Issue**: Recipe review status not persisting  
**Status**: ✅ Fixed

