import { AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { AllergenFilterDefinition } from "@/data/allergen-filters";
import { SavedDish } from "../RecipeBook";

interface DishCardProps {
  dish: SavedDish;
  showImage: boolean;
  showIngredients: boolean;
  highlightedAllergens?: AllergenFilterDefinition[];
  highlightedIngredientTerms?: string[];
  formatPrice: (value: string | number | null | undefined) => string;
}

export const DishCard = ({
  dish,
  showImage,
  showIngredients,
  highlightedAllergens = [],
  highlightedIngredientTerms = [],
  formatPrice,
}: DishCardProps) => {
  const shouldShowImage = showImage && Boolean(dish.image);
  const priceLabel = formatPrice(dish.price);
  const servingLabel = dish.servingSize && dish.servingSize !== "1" ? dish.servingSize : "";
  const allergenHighlights = highlightedAllergens.reduce<AllergenFilterDefinition[]>((acc, definition) => {
    if (acc.some((existing) => existing.id === definition.id)) {
      return acc;
    }
    return [...acc, definition];
  }, []);
  const ingredientHighlights = Array.from(new Set(highlightedIngredientTerms));
  const hasHighlights = allergenHighlights.length > 0 || ingredientHighlights.length > 0;

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      {shouldShowImage && (
        <div className="w-full aspect-video bg-muted overflow-hidden">
          <img src={dish.image} alt={dish.name} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="flex-1 space-y-3 p-4">
        <div>
          <h3 className="font-semibold text-lg text-foreground break-words">{dish.name}</h3>
          {dish.description && (
            <p className="text-sm text-muted-foreground mt-1">{dish.description}</p>
          )}
        </div>

        {(priceLabel || servingLabel) && (
          <div className="text-sm text-muted-foreground flex flex-wrap gap-3">
            {priceLabel && <span className="font-medium text-foreground">{priceLabel}</span>}
            {servingLabel && <span>Serves {servingLabel}</span>}
          </div>
        )}

        {showIngredients && dish.ingredients.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Key ingredients
            </p>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {dish.ingredients
                .map((ingredient) => ingredient.name)
                .filter(Boolean)
                .join(", ")}
            </p>
          </div>
        )}
      </div>

      {hasHighlights && (
        <div className="border-t border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
          <div className="flex items-start gap-2">
            <AlertTriangle
              className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-700"
              aria-hidden="true"
            />
            <div className="flex flex-col gap-2">
              {allergenHighlights.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {allergenHighlights.map((definition) => {
                    const Icon = definition.Icon;
                    return (
                      <Badge
                        key={`allergen-${definition.id}`}
                        className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-sm font-medium text-amber-900"
                      >
                        <Icon className="h-4 w-4" />
                        <span className="leading-none">{definition.name}</span>
                      </Badge>
                    );
                  })}
                </div>
              )}
              {ingredientHighlights.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {ingredientHighlights.map((term) => (
                    <Badge
                      key={`ingredient-${term}`}
                      className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-sm font-medium text-amber-900"
                    >
                      <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                      <span className="leading-none">{term}</span>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
