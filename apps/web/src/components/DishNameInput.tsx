import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  existingDishNames: string[];
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
  onPriceChange,
  existingDishNames,
}: DishNameInputProps) => {
  const [showOptional, setShowOptional] = useState(false);
  const suggestionOptions = useMemo(
    () => Array.from(new Set(existingDishNames.filter((name) => name.trim().length > 0))).sort(),
    [existingDishNames]
  );

  const menuCategoryLabelMap: Record<string, string> = {
    appetizer: "Appetizer",
    main: "Main",
    side: "Side",
    dessert: "Dessert",
    beverage: "Beverage",
  };

  const optionalSummaryItems: string[] = [];
  if (menuCategory) {
    optionalSummaryItems.push(menuCategoryLabelMap[menuCategory] ?? menuCategory);
  }
  if (servingSize && servingSize !== "1") {
    optionalSummaryItems.push(`Serves ${servingSize}`);
  }
  if (price.trim()) {
    optionalSummaryItems.push(`Price: ${price}`);
  }
  const hasDescription = description.trim().length > 0;
  const hasOptionalSummary = optionalSummaryItems.length > 0 || hasDescription;

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
          list={suggestionOptions.length > 0 ? "dish-name-suggestions" : undefined}
        />
        {suggestionOptions.length > 0 && (
          <datalist id="dish-name-suggestions">
            {suggestionOptions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        )}
      </div>

      {hasOptionalSummary && (
        <div className="rounded-lg border border-border/60 bg-muted/40 px-4 py-3 text-sm">
          {optionalSummaryItems.length > 0 && (
            <p className="text-foreground/80">
              {optionalSummaryItems.join(" • ")}
            </p>
          )}
          {hasDescription && (
            <p className="mt-1 text-muted-foreground line-clamp-2">{description}</p>
          )}
        </div>
      )}

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
