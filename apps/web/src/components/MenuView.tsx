import { useState } from "react";
import { SavedDish } from "./RecipeBook";
import { MenuItem, MENU_ITEMS, CATEGORIES } from "@/data/menu";
import { MenuSearch } from "./menu/MenuSearch";
import { CategoryTabs } from "./menu/CategoryTabs";
import { FeaturedSection } from "./menu/FeaturedSection";
import { DishCard } from "./menu/DishCard";
import { DishDetailModal } from "./menu/DishDetailModal";

interface MenuViewProps {
  dishes: SavedDish[];
  restaurantName: string;
}

// Helper function to convert SavedDish to MenuItem format
const convertSavedDishToMenuItem = (dish: SavedDish): MenuItem => {
  // Map category names to match MenuItem format
  const categoryMap: Record<string, MenuItem["category"]> = {
    "starter": "starter",
    "main": "main", 
    "side": "side",
    "dessert": "dessert",
    "beverage": "beverage",
    "other": "main" // Default to main for unmapped categories
  };
  
  const mappedCategory = dish.menuCategory 
    ? categoryMap[dish.menuCategory.toLowerCase()] || "main"
    : "main";

  return {
    id: dish.id,
    name: dish.name,
    description: dish.description || "",
    price: parseFloat(dish.price) || 0,
    image: dish.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop",
    category: mappedCategory,
    badges: [],
    allergens: [], // TODO: Extract from ingredients
    dietaryTags: Object.keys(dish.compliance || {}).filter(key => dish.compliance[key]),
    prepTime: undefined,
    servings: parseInt(dish.servingSize) || 1,
  };
};

export const MenuView = ({ dishes, restaurantName }: MenuViewProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDiets, setSelectedDiets] = useState<string[]>([]);
  const [selectedDish, setSelectedDish] = useState<MenuItem | null>(null);

  const toggleDiet = (dietId: string) => {
    setSelectedDiets((prev) =>
      prev.includes(dietId) ? prev.filter((d) => d !== dietId) : [...prev, dietId]
    );
  };

  // Combine saved dishes and menu items
  const savedDishItems = dishes.map(convertSavedDishToMenuItem);
  const allMenuItems = [...MENU_ITEMS, ...savedDishItems];

  // Filter dishes
  const filteredDishes = allMenuItems.filter((dish) => {
    // Category filter
    if (selectedCategory !== "all" && dish.category !== selectedCategory) {
      return false;
    }

    // Search filter (name, description, or excluded ingredients)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesName = dish.name.toLowerCase().includes(query);
      const matchesDescription = dish.description.toLowerCase().includes(query);
      
      // Check if searching to exclude ingredients
      if (dish.recipe) {
        const hasExcludedIngredient = dish.recipe.ingredients.some((ing) =>
          ing.name.toLowerCase().includes(query)
        );
        // If it's an exclusion search (e.g., "no chicken"), filter out dishes with that ingredient
        if (hasExcludedIngredient && !matchesName && !matchesDescription) {
          return false;
        }
      }
      
      if (!matchesName && !matchesDescription) {
        return false;
      }
    }

    // Dietary filters
    if (selectedDiets.length > 0) {
      // Check if dish meets all selected dietary requirements
      const meetsDietary = selectedDiets.every((diet) => {
        return dish.dietaryTags?.includes(diet);
      });
      if (!meetsDietary) return false;
    }

    return true;
  });

  // Featured dishes
  const featuredDishes = filteredDishes.filter((dish) =>
    dish.badges?.some((badge) => ["popular", "chef-pick", "bestseller"].includes(badge))
  );

  // Group by category
  const categorizedDishes = CATEGORIES.filter((cat) => cat.id !== "all").reduce(
    (acc, category) => {
      acc[category.id] = filteredDishes.filter((dish) => dish.category === category.id);
      return acc;
    },
    {} as Record<string, MenuItem[]>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{restaurantName}</h1>
              <p className="text-sm text-muted-foreground">Discover our delicious menu</p>
            </div>
          </div>
          
          <MenuSearch
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedDiets={selectedDiets}
            onToggleDiet={toggleDiet}
          />
          <CategoryTabs
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 space-y-12">
        {/* Featured Section */}
        {featuredDishes.length > 0 && selectedCategory === "all" && !searchQuery && (
          <FeaturedSection
            title="✨ Featured Dishes"
            dishes={featuredDishes}
            onViewDetails={setSelectedDish}
          />
        )}

        {/* Category Sections */}
        {selectedCategory === "all" ? (
          <>
            {CATEGORIES.filter((cat) => cat.id !== "all").map((category) => {
              const dishes = categorizedDishes[category.id];
              if (dishes.length === 0) return null;

              return (
                <section key={category.id} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{category.icon}</span>
                    <h2 className="text-2xl font-bold text-foreground">{category.label}</h2>
                    <span className="text-sm text-muted-foreground">({dishes.length})</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {dishes.map((dish) => (
                      <DishCard key={dish.id} dish={dish} onViewDetails={setSelectedDish} />
                    ))}
                  </div>
                </section>
              );
            })}
          </>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredDishes.map((dish) => (
              <DishCard key={dish.id} dish={dish} onViewDetails={setSelectedDish} />
            ))}
          </div>
        )}

        {/* No Results */}
        {filteredDishes.length === 0 && (
          <div className="text-center py-16">
            <p className="text-xl text-muted-foreground">No dishes found matching your criteria</p>
            <p className="text-sm text-muted-foreground mt-2">
              Try adjusting your filters or search terms
            </p>
          </div>
        )}
      </main>

      {/* Dish Detail Modal */}
      <DishDetailModal
        dish={selectedDish}
        open={!!selectedDish}
        onClose={() => setSelectedDish(null)}
      />
    </div>
  );
};
