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

export const RECIPES: Record<string, Recipe> = {
  "baba ganoush": {
    name: "Baba Ganoush",
    ingredients: [
      { name: "Eggplant", quantity: "300", unit: "g", dietaryInfo: ["vegan", "vegetarian", "gluten-free", "nut-free", "dairy-free", "halal", "kosher", "low-fodmap"] },
      { name: "Tahini", quantity: "30", unit: "g", allergens: ["sesame"], dietaryInfo: ["vegan", "vegetarian", "gluten-free", "dairy-free", "halal", "kosher"] },
      { name: "Olive Oil", quantity: "20", unit: "ml", dietaryInfo: ["vegan", "vegetarian", "gluten-free", "nut-free", "dairy-free", "halal", "kosher", "low-fodmap"] },
      { name: "Lemon Juice", quantity: "15", unit: "ml", dietaryInfo: ["vegan", "vegetarian", "gluten-free", "nut-free", "dairy-free", "halal", "kosher", "low-fodmap"] },
      { name: "Garlic", quantity: "5", unit: "g", dietaryInfo: ["vegan", "vegetarian", "gluten-free", "nut-free", "dairy-free", "halal", "kosher"] },
      { name: "Salt", quantity: "2", unit: "g", dietaryInfo: ["vegan", "vegetarian", "gluten-free", "nut-free", "dairy-free", "halal", "kosher", "low-fodmap"] },
    ],
  },
  "hummus": {
    name: "Hummus",
    ingredients: [
      { name: "Chickpeas", quantity: "200", unit: "g", dietaryInfo: ["vegan", "vegetarian", "gluten-free", "nut-free", "dairy-free", "halal", "kosher"] },
      { name: "Tahini", quantity: "40", unit: "g", allergens: ["sesame"], dietaryInfo: ["vegan", "vegetarian", "gluten-free", "dairy-free", "halal", "kosher"] },
      { name: "Olive Oil", quantity: "30", unit: "ml", dietaryInfo: ["vegan", "vegetarian", "gluten-free", "nut-free", "dairy-free", "halal", "kosher", "low-fodmap"] },
      { name: "Lemon Juice", quantity: "20", unit: "ml", dietaryInfo: ["vegan", "vegetarian", "gluten-free", "nut-free", "dairy-free", "halal", "kosher", "low-fodmap"] },
      { name: "Garlic", quantity: "10", unit: "g", dietaryInfo: ["vegan", "vegetarian", "gluten-free", "nut-free", "dairy-free", "halal", "kosher"] },
      { name: "Cumin", quantity: "2", unit: "g", dietaryInfo: ["vegan", "vegetarian", "gluten-free", "nut-free", "dairy-free", "halal", "kosher", "low-fodmap"] },
      { name: "Salt", quantity: "3", unit: "g", dietaryInfo: ["vegan", "vegetarian", "gluten-free", "nut-free", "dairy-free", "halal", "kosher", "low-fodmap"] },
    ],
  },
  "falafel": {
    name: "Falafel",
    ingredients: [
      { name: "Dried Chickpeas", quantity: "200", unit: "g", dietaryInfo: ["vegan", "vegetarian", "gluten-free", "nut-free", "dairy-free", "halal", "kosher"] },
      { name: "Onion", quantity: "50", unit: "g", dietaryInfo: ["vegan", "vegetarian", "gluten-free", "nut-free", "dairy-free", "halal", "kosher"] },
      { name: "Garlic", quantity: "10", unit: "g", dietaryInfo: ["vegan", "vegetarian", "gluten-free", "nut-free", "dairy-free", "halal", "kosher"] },
      { name: "Parsley", quantity: "30", unit: "g", dietaryInfo: ["vegan", "vegetarian", "gluten-free", "nut-free", "dairy-free", "halal", "kosher", "low-fodmap"] },
      { name: "Cilantro", quantity: "30", unit: "g", dietaryInfo: ["vegan", "vegetarian", "gluten-free", "nut-free", "dairy-free", "halal", "kosher", "low-fodmap"] },
      { name: "Cumin", quantity: "5", unit: "g", dietaryInfo: ["vegan", "vegetarian", "gluten-free", "nut-free", "dairy-free", "halal", "kosher", "low-fodmap"] },
      { name: "Coriander", quantity: "3", unit: "g", dietaryInfo: ["vegan", "vegetarian", "gluten-free", "nut-free", "dairy-free", "halal", "kosher", "low-fodmap"] },
      { name: "Baking Powder", quantity: "3", unit: "g", dietaryInfo: ["vegan", "vegetarian", "gluten-free", "nut-free", "dairy-free", "halal", "kosher", "low-fodmap"] },
      { name: "Salt", quantity: "5", unit: "g", dietaryInfo: ["vegan", "vegetarian", "gluten-free", "nut-free", "dairy-free", "halal", "kosher", "low-fodmap"] },
    ],
  },
};

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
