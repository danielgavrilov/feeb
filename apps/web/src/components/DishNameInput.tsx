import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

export interface DishSuggestion {
  id: string;
  name: string;
  confirmed: boolean;
}

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
  existingDishes: DishSuggestion[];
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
  existingDishes,
}: DishNameInputProps) => {
  const [showOptional, setShowOptional] = useState(false);
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
  const blurTimeoutRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        window.clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  const suggestionOptions = useMemo(() => {
    const uniqueByName = new Map<string, DishSuggestion>();

    existingDishes.forEach((dish) => {
      const trimmedName = dish.name.trim();
      if (!trimmedName) {
        return;
      }

      const existing = uniqueByName.get(trimmedName);
      if (!existing) {
        uniqueByName.set(trimmedName, dish);
        return;
      }

      if (!dish.confirmed && existing.confirmed) {
        uniqueByName.set(trimmedName, dish);
      }
    });

    return Array.from(uniqueByName.values()).sort((a, b) => {
      if (a.confirmed === b.confirmed) {
        return a.name.localeCompare(b.name);
      }

      return a.confirmed ? 1 : -1;
    });
  }, [existingDishes]);

  useEffect(() => {
    if (suggestionOptions.length === 0) {
      setIsSuggestionOpen(false);
    }
  }, [suggestionOptions.length]);

  const filteredSuggestions = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) {
      return suggestionOptions;
    }

    return suggestionOptions.filter((option) => option.name.toLowerCase().includes(query));
  }, [suggestionOptions, value]);

  const handleOptionSelect = (option: DishSuggestion) => {
    onChange(option.name);
    onRecipeMatch(option.name);
    setIsSuggestionOpen(false);
    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleInputFocus = () => {
    if (blurTimeoutRef.current) {
      window.clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }

    if (suggestionOptions.length > 0) {
      setIsSuggestionOpen(true);
    }
  };

  const handleInputBlur = () => {
    blurTimeoutRef.current = window.setTimeout(() => {
      setIsSuggestionOpen(false);
    }, 120);
  };

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
        <Popover open={isSuggestionOpen && suggestionOptions.length > 0} onOpenChange={setIsSuggestionOpen}>
          <PopoverTrigger asChild>
            <Input
              ref={inputRef}
              id="dish-name"
              value={value}
              onChange={(e) => {
                onChange(e.target.value);
                if (suggestionOptions.length > 0) {
                  setIsSuggestionOpen(true);
                }
              }}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder="Enter dish name..."
              className="h-16 text-2xl font-medium border-2"
              autoComplete="off"
            />
          </PopoverTrigger>
          {suggestionOptions.length > 0 && (
            <PopoverContent
              align="start"
              className="w-[var(--radix-popover-trigger-width)] p-0"
              sideOffset={4}
            >
              <div className="max-h-60 overflow-y-auto py-2">
                {filteredSuggestions.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">No matching dishes found.</p>
                ) : (
                  filteredSuggestions.map((option) => (
                    <button
                      key={`${option.id}-${option.name}`}
                      type="button"
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-muted focus:bg-muted"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleOptionSelect(option)}
                    >
                      <span className="font-medium text-foreground">{option.name}</span>
                      <Badge
                        variant={option.confirmed ? "secondary" : "destructive"}
                        className="pointer-events-none"
                      >
                        {option.confirmed ? "Feeb Check" : "Review"}
                      </Badge>
                    </button>
                  ))
                )}
              </div>
            </PopoverContent>
          )}
        </Popover>
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
