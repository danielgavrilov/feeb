import { useState, useEffect } from 'react';
import {
  Recipe,
  CreateRecipeRequest,
  UpdateRecipeRequest,
  getRestaurantRecipes,
  createRecipe as apiCreateRecipe,
  updateRecipe as apiUpdateRecipe,
  deleteRecipe as apiDeleteRecipe,
} from '@/lib/api';

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
      const data = await getRestaurantRecipes(restaurantId);
      setRecipes(data);
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
      setRecipes([...recipes, newRecipe]);
      return newRecipe;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create recipe');
      throw err;
    }
  };

  const updateRecipe = async (recipeId: number, updates: UpdateRecipeRequest): Promise<Recipe> => {
    try {
      const updatedRecipe = await apiUpdateRecipe(recipeId, updates);
      setRecipes(recipes.map(r => r.id === recipeId ? updatedRecipe : r));
      return updatedRecipe;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update recipe');
      throw err;
    }
  };

  const deleteRecipe = async (recipeId: number): Promise<void> => {
    try {
      await apiDeleteRecipe(recipeId);
      setRecipes(recipes.filter(r => r.id !== recipeId));
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

