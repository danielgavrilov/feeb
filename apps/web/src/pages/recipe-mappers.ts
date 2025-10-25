import type { Recipe, RecipeIngredient } from "@/lib/api";
import type { SavedDish } from "@/components/RecipeBook";
import { normalizeBoolean } from "@/lib/normalizeBoolean";

export const mapIngredientAllergens = (
  allergens: RecipeIngredient["allergens"] | undefined,
) => allergens ?? [];

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
    confirmed: normalizeBoolean(ingredient.confirmed),
    ingredientId: ingredient.ingredient_id,
    originalName: ingredient.ingredient_name,
    allergens: mapIngredientAllergens(ingredient.allergens),
    substitution: ingredient.substitution,
  })),
  prepMethod: recipe.instructions || "",
  compliance: {},
  image: recipe.image || "",
  confirmed: normalizeBoolean(recipe.confirmed),
  isOnMenu: normalizeBoolean(recipe.is_on_menu),
});

export const mapRecipesToSavedDishes = (
  recipes: Recipe[],
  deriveMenuSectionKey: (recipe: Recipe) => string,
): SavedDish[] => recipes.map((recipe) => mapRecipeToSavedDish(recipe, deriveMenuSectionKey));
