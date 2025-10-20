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
  confirmed: boolean;
  substitution?: {
    alternative: string;
    surcharge?: string;
  };
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
  options?: string | null;
  special_notes?: string | null;
  prominence_score?: number | null;
  confirmed: boolean;
  is_on_menu: boolean;
  created_at: string;
  ingredients: RecipeIngredient[];
}

export interface CreateRecipeIngredient {
  ingredient_id: number;
  quantity?: number;
  unit?: string;
  notes?: string;
  confirmed?: boolean;
  substitution?: {
    alternative: string;
    surcharge?: string;
  };
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
  options?: string;
  special_notes?: string;
  prominence_score?: number;
  confirmed?: boolean;
  is_on_menu?: boolean;
}

export interface UpdateRecipeRequest {
  name?: string;
  description?: string;
  instructions?: string;
  menu_category?: string;
  serving_size?: string;
  price?: string;
  image?: string;
  options?: string;
  special_notes?: string;
  prominence_score?: number;
  confirmed?: boolean;
  is_on_menu?: boolean;
}

export type MenuUploadSourceType = 'pdf' | 'image' | 'url';

export interface MenuUploadStageStatus {
  stage: string;
  status: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  details?: string;
}

export interface MenuUploadRecipeLink {
  recipe_id: number;
  stage: string;
}

export interface MenuUpload {
  id: number;
  restaurant_id?: number;
  user_id?: number;
  source_type: MenuUploadSourceType;
  source_value: string;
  status: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
  stage0_completed_at?: string;
  stage1_completed_at?: string;
  stage2_completed_at?: string;
  stages: MenuUploadStageStatus[];
  recipes: MenuUploadRecipeLink[];
}

export interface MenuUploadCreateResponse extends MenuUpload {
  created_recipe_ids: number[];
}

export interface CreateMenuUploadParams {
  restaurantId: number;
  sourceType: MenuUploadSourceType;
  userId?: number;
  url?: string;
  file?: File;
}

// ============================================================================
// API Functions
// ============================================================================

async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const isFormData = options.body instanceof FormData;
  const providedHeaders = options.headers;
  let headers: HeadersInit | undefined = providedHeaders;

  if (!isFormData) {
    if (!headers) {
      headers = { 'Content-Type': 'application/json' };
    } else if (headers instanceof Headers) {
      headers.set('Content-Type', 'application/json');
    } else if (Array.isArray(headers)) {
      headers = [...headers, ['Content-Type', 'application/json']];
    } else {
      headers = { 'Content-Type': 'application/json', ...headers };
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
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

export async function updateRecipeIngredient(
  recipeId: number,
  ingredientId: number,
  updates: Partial<CreateRecipeIngredient>
): Promise<void> {
  return fetchAPI(`/recipes/${recipeId}/ingredients/${ingredientId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

// ============================================================================
// Menu upload API
// ============================================================================

export async function createMenuUpload(params: CreateMenuUploadParams): Promise<MenuUploadCreateResponse> {
  const formData = new FormData();
  formData.append('restaurant_id', params.restaurantId.toString());
  formData.append('source_type', params.sourceType);

  if (params.userId) {
    formData.append('user_id', params.userId.toString());
  }

  if (params.sourceType === 'url') {
    if (!params.url) {
      throw new Error('URL is required for URL uploads');
    }
    formData.append('url', params.url);
  } else {
    if (!params.file) {
      throw new Error('File is required for this upload type');
    }
    formData.append('file', params.file);
  }

  return fetchAPI('/menu-uploads', {
    method: 'POST',
    body: formData,
  });
}

export async function getMenuUpload(uploadId: number): Promise<MenuUpload> {
  return fetchAPI(`/menu-uploads/${uploadId}`);
}

export async function listMenuUploads(restaurantId: number): Promise<MenuUpload[]> {
  return fetchAPI(`/menu-uploads/restaurant/${restaurantId}`);
}

