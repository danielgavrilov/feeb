import { Heart, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MenuItem, BADGE_LABELS } from "@/data/menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

interface DishCardProps {
  dish: MenuItem;
  onViewDetails: (dish: MenuItem) => void;
  loading?: boolean;
}

export const DishCard = ({ dish, onViewDetails, loading }: DishCardProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <Skeleton className="w-full aspect-[4/3]" />
        <div className="p-4 space-y-3">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-8 w-20" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer">
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {!imageLoaded && <Skeleton className="absolute inset-0" />}
        <img
          src={dish.image}
          alt={dish.name}
          className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-110 ${
            imageLoaded ? "opacity-100" : "opacity-0"
          }`}
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
        />

        {/* Badges */}
        {dish.badges && dish.badges.length > 0 && (
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {dish.badges.slice(0, 2).map((badge) => (
              <Badge
                key={badge}
                className={`${BADGE_LABELS[badge].color} text-white border-0 text-xs font-semibold px-2 py-1`}
              >
                {BADGE_LABELS[badge].label}
              </Badge>
            ))}
          </div>
        )}

        {/* Favorite */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsFavorite(!isFavorite);
          }}
          className="absolute top-2 right-2 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors"
        >
          <Heart
            size={18}
            className={isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground"}
          />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3" onClick={() => onViewDetails(dish)}>
        <div className="space-y-1">
          <h3 className="font-semibold text-lg text-foreground line-clamp-1">{dish.name}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{dish.description}</p>
        </div>

        {/* Dietary Tags */}
        {dish.dietaryTags && dish.dietaryTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {dish.dietaryTags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs capitalize">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-foreground">${dish.price.toFixed(2)}</span>
            {dish.oldPrice && (
              <span className="text-sm text-muted-foreground line-through">
                ${dish.oldPrice.toFixed(2)}
              </span>
            )}
          </div>
          <Button
            size="sm"
            className="gap-1"
            onClick={(e) => {
              e.stopPropagation();
              // Add to cart logic here
            }}
          >
            <Plus size={16} />
            Add
          </Button>
        </div>
      </div>
    </Card>
  );
};
