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

export interface AllergenCategoryOption {
  id: string;
  label: string;
}

export interface AllergenCategoryDefinition extends AllergenCategoryOption {
  children?: AllergenCategoryOption[];
}

export const ALLERGEN_CATEGORIES: AllergenCategoryDefinition[] = [
  {
    id: "cereals_gluten",
    label: "Cereals containing gluten",
    children: [
      { id: "cereals_gluten:wheat", label: "Wheat" },
      { id: "cereals_gluten:rye", label: "Rye" },
      { id: "cereals_gluten:barley", label: "Barley" },
      { id: "cereals_gluten:oats", label: "Oats" },
      { id: "cereals_gluten:spelt", label: "Spelt" },
      { id: "cereals_gluten:triticale", label: "Triticale" },
    ],
  },
  { id: "crustaceans", label: "Crustaceans" },
  { id: "eggs", label: "Eggs" },
  { id: "fish", label: "Fish" },
  { id: "peanuts", label: "Peanuts" },
  { id: "soybeans", label: "Soybeans" },
  { id: "milk", label: "Milk" },
  { id: "meat", label: "Meat" },
  {
    id: "tree_nuts",
    label: "Tree nuts",
    children: [
      { id: "tree_nuts:almonds", label: "Almonds" },
      { id: "tree_nuts:hazelnuts", label: "Hazelnuts" },
      { id: "tree_nuts:walnuts", label: "Walnuts" },
      { id: "tree_nuts:cashews", label: "Cashews" },
      { id: "tree_nuts:pecans", label: "Pecans" },
      { id: "tree_nuts:brazil_nuts", label: "Brazil nuts" },
      { id: "tree_nuts:pistachios", label: "Pistachios" },
      { id: "tree_nuts:macadamia", label: "Macadamia nuts" },
    ],
  },
  { id: "celery", label: "Celery" },
  { id: "mustard", label: "Mustard" },
  { id: "sesame", label: "Sesame seeds" },
  { id: "sulphites", label: "Sulphur dioxide & sulphites" },
  { id: "lupin", label: "Lupin" },
  { id: "molluscs", label: "Molluscs" },
];
