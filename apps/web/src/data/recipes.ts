export interface Ingredient {
  name: string;
  quantity: string;
  unit: string;
  allergens?: string[];
  dietaryInfo?: string[];
}

export interface Recipe {
  name: string;
  ingredients: Ingredient[];
  prepMethod?: string;
}

// Hard-coded recipes have been migrated to the database
// This file now only contains type definitions and constants for the UI

export const DIETARY_CATEGORIES = [
  { id: "vegan", label: "Vegan", icon: "🌱" },
  { id: "vegetarian", label: "Vegetarian", icon: "🥗" },
  { id: "gluten-free", label: "Gluten-Free", icon: "🌾" },
  { id: "nut-free", label: "Nut-Free", icon: "🥜" },
  { id: "dairy-free", label: "Dairy-Free", icon: "🥛" },
  { id: "halal", label: "Halal", icon: "☪️" },
  { id: "kosher", label: "Kosher", icon: "✡️" },
  { id: "low-fodmap", label: "Low FODMAP", icon: "🍽️" },
];

export const ALLERGEN_CATEGORIES = [
  { id: "gluten", label: "Gluten" },
  { id: "dairy", label: "Dairy" },
  { id: "eggs", label: "Eggs" },
  { id: "nuts", label: "Nuts" },
  { id: "peanuts", label: "Peanuts" },
  { id: "soy", label: "Soy" },
  { id: "fish", label: "Fish" },
  { id: "shellfish", label: "Shellfish" },
  { id: "sesame", label: "Sesame" },
];
