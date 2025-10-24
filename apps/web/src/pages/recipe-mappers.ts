import type { Recipe, RecipeIngredient } from "@/lib/api";
import type { SavedDish } from "@/components/RecipeBook";

export const mapIngredientAllergens = (
  allergens: RecipeIngredient["allergens"] | undefined,
) =>
  (allergens ?? []).map((allergen) => ({
    code: allergen.code,
    name: allergen.name,
    certainty: allergen.certainty,
    canonicalCode: allergen.canonical_code ?? null,
    canonicalName: allergen.canonical_name ?? null,
    familyCode: allergen.family_code ?? null,
    familyName: allergen.family_name ?? null,
    markerType: allergen.marker_type ?? null,
  }));

export const mapRecipeToSavedDish = (
  recipe: Recipe,
  deriveMenuSectionKey: (recipe: Recipe) => string,
): SavedDish => ({
  id: recipe.id.toString(),
  name: recipe.name,
  menuSectionId: deriveMenuSectionKey(recipe),
  description: recipe.description || "",
  servingSize: recipe.serving_size || "1",
  price: recipe.price || "",
  ingredients: recipe.ingredients.map((ingredient) => ({
    name: ingredient.ingredient_name,
    quantity: ingredient.quantity?.toString() || "",
    unit: ingredient.unit || "",
    confirmed: ingredient.confirmed,
    ingredientId: ingredient.ingredient_id,
    originalName: ingredient.ingredient_name,
    allergens: mapIngredientAllergens(ingredient.allergens),
    substitution: ingredient.substitution,
  })),
  prepMethod: recipe.instructions || "",
  compliance: {},
  image: recipe.image || "",
  confirmed: recipe.confirmed,
  isOnMenu: recipe.is_on_menu,
});

export const mapRecipesToSavedDishes = (
  recipes: Recipe[],
  deriveMenuSectionKey: (recipe: Recipe) => string,
): SavedDish[] => recipes.map((recipe) => mapRecipeToSavedDish(recipe, deriveMenuSectionKey));
