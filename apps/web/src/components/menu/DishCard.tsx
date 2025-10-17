import { Card } from "@/components/ui/card";
import { SavedDish } from "../RecipeBook";

interface DishCardProps {
  dish: SavedDish;
  showImage: boolean;
}

const formatPrice = (price: string) => {
  if (!price) return "";
  const trimmed = price.trim();
  if (!trimmed) return "";
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric)) {
    return trimmed;
  }
  return `$${numeric.toFixed(2)}`;
};

export const DishCard = ({ dish, showImage }: DishCardProps) => {
  const shouldShowImage = showImage && Boolean(dish.image);
  const priceLabel = formatPrice(dish.price);
  const servingLabel = dish.servingSize && dish.servingSize !== "1" ? dish.servingSize : "";

  return (
    <Card className="overflow-hidden">
      {shouldShowImage && (
        <div className="w-full aspect-video bg-muted overflow-hidden">
          <img src={dish.image} alt={dish.name} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="p-4 space-y-3">
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

        {dish.ingredients.length > 0 && (
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
    </Card>
  );
};
