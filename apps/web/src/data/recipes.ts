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
  { id: "gluten_wheat", label: "Gluten (wheat)" },
  { id: "gluten_barley", label: "Gluten (barley)" },
  { id: "gluten_rye", label: "Gluten (rye)" },
  { id: "gluten_oats", label: "Gluten (oats)" },
  { id: "gluten_spelt", label: "Gluten (spelt)" },
  { id: "gluten_triticale", label: "Gluten (triticale)" },
  { id: "crustaceans", label: "Crustaceans" },
  { id: "eggs", label: "Eggs" },
  { id: "fish", label: "Fish" },
  { id: "peanuts", label: "Peanuts" },
  { id: "soybeans", label: "Soybeans" },
  { id: "milk", label: "Milk" },
  { id: "nuts_almond", label: "Nuts (almond)" },
  { id: "nuts_hazelnut", label: "Nuts (hazelnut)" },
  { id: "nuts_walnut", label: "Nuts (walnut)" },
  { id: "nuts_cashew", label: "Nuts (cashew)" },
  { id: "nuts_pecan", label: "Nuts (pecan)" },
  { id: "nuts_brazil_nut", label: "Nuts (brazil nut)" },
  { id: "nuts_pistachio", label: "Nuts (pistachio)" },
  { id: "nuts_macadamia", label: "Nuts (macadamia)" },
  { id: "celery", label: "Celery" },
  { id: "mustard", label: "Mustard" },
  { id: "sesame", label: "Sesame seeds" },
  { id: "sulphites", label: "Sulphur dioxide & sulphites" },
  { id: "lupin", label: "Lupin" },
  { id: "molluscs", label: "Molluscs" },
  { id: "meat", label: "Meat" },
  { id: "animal_product", label: "Animal product (honey, fat, gelatin)" },
  { id: "vegan", label: "Not plant-based (vegan)" },
  { id: "vegetarian", label: "Not plant-based (vegetarian)" },
];
