/**
 * API client for interacting with the recipe backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ============================================================================
// Types
// ============================================================================

export interface User {
  id: number;
  supabase_uid: string;
  email: string;
  name?: string;
  created_at: string;
}

export interface Restaurant {
  id: number;
  name: string;
  description?: string;
  created_at: string;
}

export interface Menu {
  id: number;
  restaurant_id: number;
  name: string;
  description?: string;
  menu_active: number;
  created_at: string;
}

export interface RecipeIngredient {
  ingredient_id: number;
  ingredient_name: string;
  quantity?: number;
  unit?: string;
  notes?: string;
  allergens: Array<{
    code: string;
    name: string;
    certainty?: string;
  }>;
}

export interface Recipe {
  id: number;
  restaurant_id: number;
  name: string;
  description?: string;
  instructions?: string;
  menu_category?: string;
  serving_size?: string;
  price?: string;
  image?: string;
  created_at: string;
  ingredients: RecipeIngredient[];
}

export interface CreateRecipeIngredient {
  ingredient_id: number;
  quantity?: number;
  unit?: string;
  notes?: string;
}

export interface CreateRecipeRequest {
  restaurant_id: number;
  name: string;
  description?: string;
  instructions?: string;
  menu_category?: string;
  serving_size?: string;
  price?: string;
  image?: string;
  ingredients?: CreateRecipeIngredient[];
}

export interface UpdateRecipeRequest {
  name?: string;
  description?: string;
  instructions?: string;
  menu_category?: string;
  serving_size?: string;
  price?: string;
  image?: string;
}

// ============================================================================
// API Functions
// ============================================================================

async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    // Log the full error for debugging
    console.error('API Error Details:', {
      status: response.status,
      endpoint,
      error,
    });
    // Handle validation errors (422) specially
    if (response.status === 422 && error.detail) {
      const validationErrors = Array.isArray(error.detail) 
        ? error.detail.map((e: any) => `${e.loc?.join('.')}: ${e.msg}`).join(', ')
        : error.detail;
      throw new Error(`Validation error: ${validationErrors}`);
    }
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  return response.json();
}

// ============================================================================
// User API
// ============================================================================

export async function syncUser(supabaseUid: string, email: string, name?: string): Promise<User> {
  const payload = {
    supabase_uid: supabaseUid,
    email,
    name,
  };
  console.log('Syncing user with payload:', payload);
  return fetchAPI('/users/sync', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ============================================================================
// Restaurant API
// ============================================================================

export async function createRestaurant(
  name: string,
  userId: number,
  description?: string
): Promise<Restaurant> {
  return fetchAPI('/restaurants', {
    method: 'POST',
    body: JSON.stringify({
      name,
      user_id: userId,
      description,
    }),
  });
}

export async function getUserRestaurants(userId: number): Promise<Restaurant[]> {
  return fetchAPI(`/restaurants/user/${userId}`);
}

// ============================================================================
// Menu API
// ============================================================================

export async function createMenu(
  restaurantId: number,
  name: string,
  description?: string,
  menuActive: number = 1
): Promise<Menu> {
  return fetchAPI('/menus', {
    method: 'POST',
    body: JSON.stringify({
      restaurant_id: restaurantId,
      name,
      description,
      menu_active: menuActive,
    }),
  });
}

export async function getRestaurantMenus(restaurantId: number): Promise<Menu[]> {
  return fetchAPI(`/menus/restaurant/${restaurantId}`);
}

// ============================================================================
// Recipe API
// ============================================================================

export async function createRecipe(recipeData: CreateRecipeRequest): Promise<Recipe> {
  return fetchAPI('/recipes', {
    method: 'POST',
    body: JSON.stringify(recipeData),
  });
}

export async function getRecipe(recipeId: number): Promise<Recipe> {
  return fetchAPI(`/recipes/${recipeId}`);
}

export async function getRestaurantRecipes(restaurantId: number): Promise<Recipe[]> {
  return fetchAPI(`/recipes/restaurant/${restaurantId}`);
}

export async function updateRecipe(recipeId: number, updates: UpdateRecipeRequest): Promise<Recipe> {
  return fetchAPI(`/recipes/${recipeId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteRecipe(recipeId: number): Promise<void> {
  return fetchAPI(`/recipes/${recipeId}`, {
    method: 'DELETE',
  });
}

export async function addRecipeIngredient(
  recipeId: number,
  ingredient: CreateRecipeIngredient
): Promise<void> {
  return fetchAPI(`/recipes/${recipeId}/ingredients`, {
    method: 'POST',
    body: JSON.stringify(ingredient),
  });
}

