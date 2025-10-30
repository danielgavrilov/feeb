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
  logoDataUrl?: string;
  primaryColor?: string;
  accentColor?: string;
}

export interface Menu {
  id: number;
  restaurant_id: number;
  name: string;
  description?: string;
  menu_active: number;
  created_at: string;
}

export interface MenuSection {
  id: number;
  menu_id: number;
  name: string;
  position?: number | null;
  is_archive?: boolean;
  is_base_prep?: boolean;
  created_at: string;
}

export interface RecipeSectionLink {
  menu_id: number;
  menu_name: string;
  section_id: number;
  section_name: string;
  section_position?: number | null;
  recipe_position?: number | null;
}

export interface RestaurantMenuSectionsResponse {
  menu: Menu;
  sections: MenuSection[];
}

export type AllergenConfidence = "confirmed" | "likely" | "possible" | "predicted";

export interface Ingredient {
  id: number;
  code: string;
  name: string;
  source: string;
  last_updated: string;
}

export interface CreateIngredientRequest {
  code: string;
  name: string;
  source?: string;
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
    canonical_code?: string | null;
    canonical_name?: string | null;
    family_code?: string | null;
    family_name?: string | null;
    marker_type?: string | null;
  }>;
  confirmed: boolean;
  substitution?: {
    alternative: string;
    surcharge?: string | null;
  };
}

export type RecipeStatus = "needs_review" | "confirmed" | "live";

export interface RecipeBasePrep {
  base_prep_id: number;
  base_prep_name: string;
  quantity?: number;
  unit?: string;
  notes?: string;
  ingredients: Array<{
    ingredient_id: number;
    ingredient_name: string;
    quantity?: number;
    unit?: string;
    notes?: string;
    allergens: Array<{
      code: string;
      name: string;
      certainty?: string;
      canonical_code?: string | null;
      canonical_name?: string | null;
      family_code?: string | null;
      family_name?: string | null;
      marker_type?: string | null;
    }>;
    confirmed: boolean;
  }>;
}

export interface Recipe {
  id: number;
  restaurant_id: number;
  name: string;
  description?: string;
  instructions?: string;
  serving_size?: string;
  price?: string;
  image?: string;
  options?: string | null;
  special_notes?: string | null;
  prominence_score?: number | null;
  status: RecipeStatus;
  created_at: string;
  sections: RecipeSectionLink[];
  ingredients: RecipeIngredient[];
  base_preps?: RecipeBasePrep[];
}

export interface CreateRecipeIngredient {
  ingredient_id: number;
  ingredient_name?: string;
  quantity?: number;
  unit?: string;
  notes?: string;
  confirmed?: boolean;
  allergens?: Array<{
    code: string;
    name: string;
    certainty?: string;
    canonical_code?: string | null;
    canonical_name?: string | null;
    family_code?: string | null;
    family_name?: string | null;
    marker_type?: string | null;
  }>;
  substitution?: {
    alternative: string;
    surcharge?: string | null;
  };
}

export interface UpdateRecipeIngredientRequest extends Partial<CreateRecipeIngredient> {
  ingredient_name?: string;
  substitution?: {
    alternative: string;
    surcharge?: string | null;
  } | null;
  allergens?: Array<{
    code: string;
    name: string;
    certainty?: string;
    canonical_code?: string | null;
    canonical_name?: string | null;
    family_code?: string | null;
    family_name?: string | null;
    marker_type?: string | null;
  }>;
}

export interface CreateRecipeRequest {
  restaurant_id: number;
  name: string;
  description?: string;
  instructions?: string;
  serving_size?: string;
  price?: string;
  image?: string;
  ingredients?: CreateRecipeIngredient[];
  options?: string;
  special_notes?: string;
  prominence_score?: number;
  status?: RecipeStatus;
  menu_section_ids?: number[];
}

export interface UpdateRecipeRequest {
  name?: string;
  description?: string;
  instructions?: string;
  serving_size?: string;
  price?: string;
  image?: string;
  options?: string;
  special_notes?: string;
  prominence_score?: number;
  status?: RecipeStatus;
  menu_section_ids?: number[];
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

export interface BasePrep {
  id: number;
  restaurant_id: number;
  menu_section_id?: number | null;
  name: string;
  description?: string;
  instructions?: string;
  yield_quantity?: number | null;
  yield_unit?: string | null;
  created_at: string;
  ingredients: RecipeIngredient[];
}

export interface BasePrepCreate {
  restaurant_id: number;
  name: string;
  description?: string;
  instructions?: string;
  yield_quantity?: number;
  yield_unit?: string;
}

export interface BasePrepUpdate {
  name?: string;
  description?: string;
  instructions?: string;
}

export interface RecipeBasePrepLink {
  base_prep_id: number;
  quantity?: number;
  unit?: string;
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

export async function updateRestaurant(
  restaurantId: number,
  updates: {
    name?: string;
    description?: string;
    logoDataUrl?: string | null;
    primaryColor?: string | null;
    accentColor?: string | null;
  }
): Promise<Restaurant> {
  return fetchAPI(`/restaurants/${restaurantId}`, {
    method: 'PUT',
    body: JSON.stringify({
      name: updates.name,
      description: updates.description,
      logo_data_url: updates.logoDataUrl,
      primary_color: updates.primaryColor,
      accent_color: updates.accentColor,
    }),
  });
}

export async function deleteRestaurant(restaurantId: number) {
  return fetchAPI(`/restaurants/${restaurantId}`, {
    method: 'DELETE',
  });
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

export async function getRestaurantMenuSections(
  restaurantId: number,
): Promise<RestaurantMenuSectionsResponse> {
  return fetchAPI(`/restaurants/${restaurantId}/menu-sections`);
}

export async function updateRestaurantMenuSections(
  restaurantId: number,
  sections: Array<{ id?: number; name: string; position?: number | null }>,
): Promise<RestaurantMenuSectionsResponse> {
  return fetchAPI(`/restaurants/${restaurantId}/menu-sections`, {
    method: 'PUT',
    body: JSON.stringify({ sections }),
  });
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

export async function createIngredient(ingredient: CreateIngredientRequest): Promise<Ingredient> {
  return fetchAPI('/ingredients', {
    method: 'POST',
    body: JSON.stringify(ingredient),
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
  updates: UpdateRecipeIngredientRequest
): Promise<void> {
  return fetchAPI(`/recipes/${recipeId}/ingredients/${ingredientId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteRecipeIngredient(
  recipeId: number,
  ingredientId: number,
): Promise<void> {
  return fetchAPI(`/recipes/${recipeId}/ingredients/${ingredientId}`, {
    method: 'DELETE',
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

// ============================================================================
// Base Prep API
// ============================================================================

export async function getRestaurantBasePreps(restaurantId: number): Promise<BasePrep[]> {
  return fetchAPI(`/restaurants/${restaurantId}/base-preps`);
}

export async function getBasePrep(id: number): Promise<BasePrep> {
  return fetchAPI(`/base-preps/${id}`);
}

export async function createBasePrep(data: BasePrepCreate): Promise<BasePrep> {
  // Backend expects: POST /restaurants/{restaurant_id}/base-preps
  return fetchAPI(`/restaurants/${data.restaurant_id}/base-preps`, {
    method: 'POST',
    body: JSON.stringify({
      restaurant_id: data.restaurant_id,
      name: data.name,
      description: data.description,
      instructions: data.instructions,
      yield_quantity: data.yield_quantity,
      yield_unit: data.yield_unit,
    }),
  });
}

export async function updateBasePrep(id: number, data: BasePrepUpdate): Promise<BasePrep> {
  // Backend uses PATCH /base-preps/{id}
  return fetchAPI(`/base-preps/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteBasePrep(id: number): Promise<void> {
  return fetchAPI(`/base-preps/${id}`, {
    method: 'DELETE',
  });
}

export async function addBasePrepIngredient(
  basePrepId: number,
  data: { 
    ingredient_id: number;
    ingredient_name?: string;
    quantity?: number; 
    unit?: string; 
    notes?: string;
    allergens?: Array<{
      code: string;
      name: string;
      certainty?: string;
      canonical_code?: string | null;
      canonical_name?: string | null;
      family_code?: string | null;
      family_name?: string | null;
      marker_type?: string | null;
    }>;
    confirmed?: boolean;
  }
): Promise<void> {
  return fetchAPI(`/base-preps/${basePrepId}/ingredients/${data.ingredient_id}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateBasePrepIngredient(
  basePrepId: number,
  ingredientId: number,
  data: UpdateRecipeIngredientRequest
): Promise<void> {
  // Backend POST endpoint handles both add and update
  return fetchAPI(`/base-preps/${basePrepId}/ingredients/${ingredientId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteBasePrepIngredient(
  basePrepId: number,
  ingredientId: number
): Promise<void> {
  return fetchAPI(`/base-preps/${basePrepId}/ingredients/${ingredientId}`, {
    method: 'DELETE',
  });
}

export async function linkRecipeToBasePrep(
  recipeId: number,
  basePrepId: number,
  data: { quantity?: number; unit?: string }
): Promise<void> {
  return fetchAPI(`/recipes/${recipeId}/base-preps/${basePrepId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function unlinkRecipeFromBasePrep(
  recipeId: number,
  basePrepId: number
): Promise<void> {
  return fetchAPI(`/recipes/${recipeId}/base-preps/${basePrepId}`, {
    method: 'DELETE',
  });
}

