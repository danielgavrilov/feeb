import { Recipe } from "./recipes";
import type { CanonicalAllergen } from "@/lib/allergen-utils";

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  oldPrice?: number;
  image: string;
  category: "starter" | "main" | "side" | "dessert" | "beverage";
  recipe?: Recipe;
  badges?: ("popular" | "bestseller" | "chef-pick" | "new" | "limited")[];
  allergens?: string[];
  allergenDetails?: CanonicalAllergen[];
  dietaryTags?: string[];
  prepTime?: string;
  servings?: number;
}

export const MENU_ITEMS: MenuItem[] = [
  {
    id: "hummus-classic",
    name: "Classic Hummus",
    description: "Smooth and creamy chickpea dip with tahini, perfect with warm pita",
    price: 8.50,
    image: "https://images.unsplash.com/photo-1639744091080-4f99e6b1c3b9?w=400&h=300&fit=crop",
    category: "starter",
    // recipe: RECIPES["hummus"], // TODO: Link with actual recipe data
    badges: ["popular", "bestseller"],
    allergens: ["sesame"],
    dietaryTags: ["vegan", "vegetarian", "gluten-free"],
    prepTime: "15 min",
    servings: 2,
  },
  {
    id: "baba-ganoush",
    name: "Baba Ganoush",
    description: "Smoky roasted eggplant dip with tahini and garlic",
    price: 9.00,
    image: "https://images.unsplash.com/photo-1628521563667-b9a03f77b395?w=400&h=300&fit=crop",
    category: "starter",
    // recipe: RECIPES["baba ganoush"], // TODO: Link with actual recipe data
    badges: ["chef-pick"],
    allergens: ["sesame"],
    dietaryTags: ["vegan", "vegetarian", "gluten-free"],
    prepTime: "25 min",
    servings: 2,
  },
  {
    id: "falafel-platter",
    name: "Falafel Platter",
    description: "Crispy golden falafel balls served with tahini sauce and fresh vegetables",
    price: 12.50,
    oldPrice: 14.00,
    image: "https://images.unsplash.com/photo-1593001874117-4b1c3553e19a?w=400&h=300&fit=crop",
    category: "starter",
    // recipe: RECIPES["falafel"], // TODO: Link with actual recipe data
    badges: ["popular", "limited"],
    allergens: [],
    dietaryTags: ["vegan", "vegetarian", "gluten-free"],
    prepTime: "20 min",
    servings: 1,
  },
  {
    id: "grilled-salmon",
    name: "Grilled Salmon",
    description: "Fresh Atlantic salmon with herbs, served with roasted vegetables",
    price: 24.50,
    image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop",
    category: "main",
    badges: ["chef-pick", "popular"],
    allergens: ["fish"],
    dietaryTags: ["gluten-free", "dairy-free"],
    prepTime: "30 min",
    servings: 1,
  },
  {
    id: "veggie-buddha-bowl",
    name: "Buddha Bowl",
    description: "Nourishing bowl with quinoa, roasted vegetables, and tahini dressing",
    price: 16.00,
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop",
    category: "main",
    badges: ["bestseller"],
    allergens: ["sesame"],
    dietaryTags: ["vegan", "vegetarian", "gluten-free"],
    prepTime: "25 min",
    servings: 1,
  },
  {
    id: "lamb-kebab",
    name: "Lamb Kebab",
    description: "Tender marinated lamb skewers with aromatic spices",
    price: 22.00,
    image: "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400&h=300&fit=crop",
    category: "main",
    badges: ["popular"],
    allergens: [],
    dietaryTags: ["gluten-free", "dairy-free", "halal"],
    prepTime: "35 min",
    servings: 1,
  },
  {
    id: "mediterranean-salad",
    name: "Mediterranean Salad",
    description: "Fresh mixed greens with feta, olives, and lemon vinaigrette",
    price: 11.00,
    image: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&h=300&fit=crop",
    category: "side",
    badges: ["new"],
    allergens: ["dairy"],
    dietaryTags: ["vegetarian", "gluten-free"],
    prepTime: "10 min",
    servings: 1,
  },
  {
    id: "garlic-bread",
    name: "Garlic Bread",
    description: "Toasted sourdough with garlic butter and herbs",
    price: 6.50,
    image: "https://images.unsplash.com/photo-1573140401552-3fab0b24f731?w=400&h=300&fit=crop",
    category: "side",
    badges: ["popular"],
    allergens: ["gluten", "dairy"],
    dietaryTags: ["vegetarian"],
    prepTime: "8 min",
    servings: 2,
  },
  {
    id: "baklava",
    name: "Baklava",
    description: "Layers of phyllo pastry with honey and nuts",
    price: 7.50,
    image: "https://images.unsplash.com/photo-1519676867240-f03562e64548?w=400&h=300&fit=crop",
    category: "dessert",
    badges: ["chef-pick"],
    allergens: ["gluten", "nuts"],
    allergenDetails: [
      {
        code: "en:wheat",
        name: "Wheat",
        familyCode: "cereals_gluten",
        familyName: "Cereals containing gluten",
      },
      {
        code: "en:spelt",
        name: "Spelt",
        familyCode: "cereals_gluten",
        familyName: "Cereals containing gluten",
      },
      {
        code: "en:walnuts",
        name: "Walnuts",
        familyCode: "tree_nuts",
        familyName: "Tree nuts",
      },
    ],
    dietaryTags: ["vegetarian"],
    prepTime: "45 min",
    servings: 1,
  },
  {
    id: "chocolate-mousse",
    name: "Chocolate Mousse",
    description: "Rich dark chocolate mousse with fresh berries",
    price: 8.00,
    image: "https://images.unsplash.com/photo-1541599468348-e96984315921?w=400&h=300&fit=crop",
    category: "dessert",
    badges: ["bestseller"],
    allergens: ["dairy", "eggs"],
    dietaryTags: ["vegetarian", "gluten-free"],
    prepTime: "20 min",
    servings: 1,
  },
  {
    id: "mint-lemonade",
    name: "Fresh Mint Lemonade",
    description: "Refreshing lemonade with fresh mint and ice",
    price: 5.50,
    image: "https://images.unsplash.com/photo-1523677011781-c91d1bbe2f9d?w=400&h=300&fit=crop",
    category: "beverage",
    badges: ["popular"],
    allergens: [],
    dietaryTags: ["vegan", "vegetarian", "gluten-free"],
    prepTime: "5 min",
    servings: 1,
  },
  {
    id: "turkish-coffee",
    name: "Turkish Coffee",
    description: "Traditional strong coffee served in authentic copper pot",
    price: 4.50,
    image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&h=300&fit=crop",
    category: "beverage",
    badges: ["chef-pick"],
    allergens: [],
    dietaryTags: ["vegan", "vegetarian", "gluten-free"],
    prepTime: "8 min",
    servings: 1,
  },
];

export const CATEGORIES = [
  { id: "all", label: "All", icon: "🍽️" },
  { id: "starter", label: "Starters", icon: "🥗" },
  { id: "main", label: "Mains", icon: "🍖" },
  { id: "side", label: "Sides", icon: "🥖" },
  { id: "dessert", label: "Desserts", icon: "🍰" },
  { id: "beverage", label: "Beverages", icon: "☕" },
];

export const BADGE_LABELS = {
  popular: { label: "Popular", color: "bg-orange-500" },
  bestseller: { label: "Bestseller", color: "bg-yellow-500" },
  "chef-pick": { label: "Chef's Pick", color: "bg-purple-500" },
  new: { label: "New", color: "bg-green-500" },
  limited: { label: "Limited Time", color: "bg-red-500" },
};
