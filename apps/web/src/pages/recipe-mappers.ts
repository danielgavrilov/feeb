import type { Recipe, RecipeIngredient } from "@/lib/api";
import type { SavedDish } from "@/components/RecipeBook";
import { normalizeBoolean } from "@/lib/normalizeBoolean";

export const mapIngredientAllergens = (
  allergens: RecipeIngredient["allergens"] | undefined,
) => allergens ?? [];

export const mapRecipeToSavedDish = (
  recipe: Recipe,
  deriveMenuSectionKey: (recipe: Recipe) => string,
): SavedDish => {
  // Map regular ingredients
  const regularIngredients = recipe.ingredients.map((ingredient) => ({
    name: ingredient.ingredient_name,
    quantity: ingredient.quantity?.toString() || "",
    unit: ingredient.unit || "",
    confirmed: normalizeBoolean(ingredient.confirmed),
    ingredientId: ingredient.ingredient_id,
    originalName: ingredient.ingredient_name,
    allergens: mapIngredientAllergens(ingredient.allergens),
    substitution: ingredient.substitution,
  }));

  // Map base preps as special ingredient entries
  const basePrepIngredients = (recipe.base_preps || []).map((basePrep) => {
    // Aggregate allergens from all base prep ingredients
    const allAllergens = basePrep.ingredients.flatMap((ing) => ing.allergens || []);
    // Deduplicate by code
    const uniqueAllergens = Array.from(
      new Map(allAllergens.map(a => [a.code, a])).values()
    );

    return {
      name: basePrep.base_prep_name,
      quantity: basePrep.quantity?.toString() || "1",
      unit: basePrep.unit || "batch",
      confirmed: true,
      ingredientId: null,
      basePrepId: basePrep.base_prep_id,
      isBasePrep: true,
      allergens: uniqueAllergens,
      basePrepIngredients: basePrep.ingredients.map((ing) => ({
        name: ing.ingredient_name,
        quantity: ing.quantity?.toString() || "",
        unit: ing.unit || "",
        confirmed: normalizeBoolean(ing.confirmed),
        ingredientId: ing.ingredient_id,
        allergens: mapIngredientAllergens(ing.allergens),
      })),
    };
  });

  return {
    id: recipe.id.toString(),
    name: recipe.name,
    menuSectionId: deriveMenuSectionKey(recipe),
    description: recipe.description || "",
    servingSize: recipe.serving_size || "1",
    price: recipe.price || "",
    ingredients: [...regularIngredients, ...basePrepIngredients],
    prepMethod: recipe.instructions || "",
    compliance: {},
    image: recipe.image || "",
    status: recipe.status,
  };
};

export const mapRecipesToSavedDishes = (
  recipes: Recipe[],
  deriveMenuSectionKey: (recipe: Recipe) => string,
): SavedDish[] => recipes.map((recipe) => mapRecipeToSavedDish(recipe, deriveMenuSectionKey));
