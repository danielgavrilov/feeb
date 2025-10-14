import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RECIPES } from "@/data/recipes";
import { ChevronDown, ChevronUp } from "lucide-react";

interface DishNameInputProps {
  value: string;
  onChange: (value: string) => void;
  onRecipeMatch: (recipeName: string) => void;
  menuCategory: string;
  onMenuCategoryChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  servingSize: string;
  onServingSizeChange: (value: string) => void;
  price: string;
  onPriceChange: (value: string) => void;
}

export const DishNameInput = ({ 
  value, 
  onChange, 
  onRecipeMatch,
  menuCategory,
  onMenuCategoryChange,
  description,
  onDescriptionChange,
  servingSize,
  onServingSizeChange,
  price,
  onPriceChange
}: DishNameInputProps) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showOptional, setShowOptional] = useState(false);

  useEffect(() => {
    if (value.length > 1) {
      const matches = Object.keys(RECIPES).filter((recipe) =>
        recipe.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(matches);
    } else {
      setSuggestions([]);
    }
  }, [value]);

  const handleSuggestionClick = (suggestion: string) => {
    onChange(RECIPES[suggestion].name);
    onRecipeMatch(suggestion);
    setSuggestions([]);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Label htmlFor="dish-name" className="text-xl font-semibold text-foreground">
          Dish Name
        </Label>
        <Input
          id="dish-name"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter dish name..."
          className="h-16 text-2xl font-medium border-2"
        />
        {suggestions.length > 0 && (
          <div className="bg-card border-2 border-border rounded-lg shadow-lg z-10 relative">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full px-6 py-4 text-left text-lg hover:bg-secondary transition-colors first:rounded-t-lg last:rounded-b-lg"
              >
                {RECIPES[suggestion].name}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowOptional(!showOptional)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {showOptional ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        <span>Optional details (can be added later)</span>
      </button>

      {showOptional && (
        <div className="space-y-3 pt-2 pb-4 border-t border-border/50">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="menu-category" className="text-sm text-muted-foreground">
                Menu Category
              </Label>
              <Select value={menuCategory} onValueChange={onMenuCategoryChange}>
                <SelectTrigger id="menu-category" className="h-12">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="appetizer">Appetizer</SelectItem>
                  <SelectItem value="main">Main</SelectItem>
                  <SelectItem value="side">Side</SelectItem>
                  <SelectItem value="dessert">Dessert</SelectItem>
                  <SelectItem value="beverage">Beverage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="serving-size" className="text-sm text-muted-foreground">
                Serving Size
              </Label>
              <Select value={servingSize} onValueChange={onServingSizeChange}>
                <SelectTrigger id="serving-size" className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 person</SelectItem>
                  <SelectItem value="2">2 people</SelectItem>
                  <SelectItem value="4">4 people</SelectItem>
                  <SelectItem value="6">6 people</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price" className="text-sm text-muted-foreground">
              Price (optional)
            </Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => onPriceChange(e.target.value)}
              placeholder="0.00"
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm text-muted-foreground">
              Description (optional)
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Brief description of the dish..."
              className="min-h-[80px] resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
};
