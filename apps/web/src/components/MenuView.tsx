import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SavedDish } from "./RecipeBook";
import { DIETARY_CATEGORIES, Ingredient } from "@/data/recipes";
import { ChevronDown, ChevronUp } from "lucide-react";

interface MenuViewProps {
  dishes: SavedDish[];
  restaurantName: string;
}

export const MenuView = ({ dishes, restaurantName }: MenuViewProps) => {
  const [selectedDiets, setSelectedDiets] = useState<string[]>([]);
  const [excludedIngredients, setExcludedIngredients] = useState("");
  const [showIngredients, setShowIngredients] = useState(false);
  const [showAmounts, setShowAmounts] = useState(false);
  const [showAllergens, setShowAllergens] = useState(false);
  const [expandedDishes, setExpandedDishes] = useState<Set<string>>(new Set());

  // Filter dishes based on dietary requirements and excluded ingredients
  const filteredDishes = dishes.filter(dish => {
    // Check dietary filters - for now, we can't filter by dietary info without ingredient data
    // TODO: Implement once ingredients are linked to the ingredient database
    
    // Check excluded ingredients
    if (excludedIngredients.trim() && dish.ingredients) {
      const excluded = excludedIngredients.toLowerCase().split(',').map(s => s.trim());
      const hasExcluded = dish.ingredients.some(ing => 
        excluded.some(ex => ing.name.toLowerCase().includes(ex))
      );
      if (hasExcluded) return false;
    }

    return true;
  });

  // Group dishes by category
  const categories = ["Starter", "Main", "Side", "Dessert", "Beverage", "Other"];
  const groupedDishes = categories.reduce((acc, category) => {
    acc[category] = filteredDishes.filter(
      (d) => d.menuCategory === category || (!d.menuCategory && category === "Other")
    );
    return acc;
  }, {} as Record<string, any[]>);

  const toggleDiet = (dietId: string) => {
    setSelectedDiets(prev => 
      prev.includes(dietId) 
        ? prev.filter(d => d !== dietId)
        : [...prev, dietId]
    );
  };

  const toggleDishExpanded = (dishId: string) => {
    setExpandedDishes(prev => {
      const next = new Set(prev);
      if (next.has(dishId)) {
        next.delete(dishId);
      } else {
        next.add(dishId);
      }
      return next;
    });
  };

  const getAllergens = (ingredients: Ingredient[]) => {
    const allergens = new Set<string>();
    ingredients.forEach(ing => {
      ing.allergens?.forEach(a => allergens.add(a));
    });
    return Array.from(allergens);
  };

  return (
    <div className="space-y-8">
      <div className="text-center border-b-2 border-border pb-6">
        <h1 className="text-4xl font-bold text-foreground mb-2">{restaurantName}</h1>
        <p className="text-muted-foreground">Menu</p>
      </div>

      {/* Filters Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium mb-2">Dietary Filters</h3>
          <div className="flex flex-wrap gap-2">
            {DIETARY_CATEGORIES.map(diet => (
              <Button
                key={diet.id}
                variant={selectedDiets.includes(diet.id) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleDiet(diet.id)}
              >
                {diet.icon} {diet.label}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-2">Exclude Ingredients</h3>
          <Input
            placeholder="Enter ingredients to exclude (comma-separated)"
            value={excludedIngredients}
            onChange={(e) => setExcludedIngredients(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant={showIngredients ? "default" : "outline"}
            size="sm"
            onClick={() => setShowIngredients(!showIngredients)}
          >
            Show Ingredients
          </Button>
          <Button
            variant={showAmounts ? "default" : "outline"}
            size="sm"
            onClick={() => setShowAmounts(!showAmounts)}
          >
            Show Amounts
          </Button>
          <Button
            variant={showAllergens ? "default" : "outline"}
            size="sm"
            onClick={() => setShowAllergens(!showAllergens)}
          >
            Show Allergens
          </Button>
        </div>
      </div>

      {categories.map((category) => {
        const categoryDishes = groupedDishes[category];
        if (categoryDishes.length === 0) return null;

        return (
          <div key={category}>
            <h2 className="text-2xl font-bold text-foreground mb-4 border-b border-border pb-2">
              {category}
            </h2>
            <div className="space-y-4">
              {categoryDishes.map((dish) => {
                const isExpanded = expandedDishes.has(dish.id);
                const hasIngredients = dish.ingredients && dish.ingredients.length > 0;

                return (
                  <Card key={dish.id} className="p-6">
                    {dish.image && (
                      <div className="w-full aspect-video rounded-lg overflow-hidden mb-4">
                        <img src={dish.image} alt={dish.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-baseline">
                        <h3 className="text-xl font-bold text-foreground">{dish.name}</h3>
                        {dish.price && (
                          <span className="text-lg font-semibold text-primary">${dish.price}</span>
                        )}
                      </div>
                      
                      {dish.description && (
                        <p className="text-muted-foreground">{dish.description}</p>
                      )}

                      {hasIngredients && showIngredients && (
                        <div className="pt-2">
                          <button
                            onClick={() => toggleDishExpanded(dish.id)}
                            className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            {isExpanded ? "Hide" : "Show"} Full Ingredients
                          </button>
                          
                          {isExpanded && (
                            <div className="mt-3 space-y-2">
                              {dish.ingredients.map((ing, idx: number) => (
                                <div key={idx} className="text-sm">
                                  <span className="font-medium">{ing.name}</span>
                                  {showAmounts && (
                                    <span className="text-muted-foreground ml-2">
                                      ({ing.quantity} {ing.unit})
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {dish.compliance && (
                        <div className="flex gap-2 flex-wrap pt-2">
                          {Object.entries(dish.compliance)
                            .filter(([_, value]) => value)
                            .map(([key]) => (
                              <Badge key={key} variant="outline" className="text-xs">
                                {key.replace("-", " ").toUpperCase()}
                              </Badge>
                            ))}
                        </div>
                      )}

                      {dish.servingSize && dish.servingSize !== "1" && (
                        <p className="text-sm text-muted-foreground italic">
                          Serves {dish.servingSize}
                        </p>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
