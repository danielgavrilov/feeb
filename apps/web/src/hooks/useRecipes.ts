import { useState, useEffect } from "react";
import {
  Recipe,
  CreateRecipeRequest,
  UpdateRecipeRequest,
  getRestaurantRecipes,
  createRecipe as apiCreateRecipe,
  updateRecipe as apiUpdateRecipe,
  deleteRecipe as apiDeleteRecipe,
} from "@/lib/api";
import { normalizeBoolean } from "@/lib/normalizeBoolean";

const normalizeRecipe = (recipe: Recipe): Recipe => ({
  ...recipe,
  confirmed: normalizeBoolean(recipe.confirmed),
  is_on_menu: normalizeBoolean(recipe.is_on_menu),
});

export function useRecipes(restaurantId: number | null) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load recipes when restaurant changes
  useEffect(() => {
    if (restaurantId) {
      loadRecipes();
    } else {
      setRecipes([]);
      setLoading(false);
    }
  }, [restaurantId]);

  const loadRecipes = async () => {
    if (!restaurantId) return;

    try {
      setLoading(true);
      // Load only recipes (base preps are handled separately now)
      const recipesData = await getRestaurantRecipes(restaurantId);
      setRecipes(recipesData.map(normalizeRecipe));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recipes');
      console.error('Failed to load recipes:', err);
    } finally {
      setLoading(false);
    }
  };

  const createRecipe = async (recipeData: CreateRecipeRequest): Promise<Recipe> => {
    try {
      const newRecipe = await apiCreateRecipe(recipeData);
      const normalized = normalizeRecipe(newRecipe);
      setRecipes((prevRecipes) => [...prevRecipes, normalized]);
      return normalized;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create recipe');
      throw err;
    }
  };

  const updateRecipe = async (recipeId: number, updates: UpdateRecipeRequest): Promise<Recipe> => {
    try {
      const updatedRecipe = await apiUpdateRecipe(recipeId, updates);
      const normalized = normalizeRecipe(updatedRecipe);
      setRecipes((prevRecipes) => prevRecipes.map((r) => (r.id === recipeId ? normalized : r)));
      return normalized;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update recipe');
      throw err;
    }
  };

  const deleteRecipe = async (recipeId: number): Promise<void> => {
    try {
      await apiDeleteRecipe(recipeId);
      setRecipes((prevRecipes) => prevRecipes.filter((r) => r.id !== recipeId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete recipe');
      throw err;
    }
  };

  return {
    recipes,
    loading,
    error,
    createRecipe,
    updateRecipe,
    deleteRecipe,
    refreshRecipes: loadRecipes,
  };
}

