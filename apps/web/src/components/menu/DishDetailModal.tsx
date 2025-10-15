import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MenuItem, BADGE_LABELS } from "@/data/menu";
import { Clock, Users, Minus, Plus, AlertCircle } from "lucide-react";
import { useState } from "react";
import { Separator } from "@/components/ui/separator";

interface DishDetailModalProps {
  dish: MenuItem | null;
  open: boolean;
  onClose: () => void;
}

export const DishDetailModal = ({ dish, open, onClose }: DishDetailModalProps) => {
  const [quantity, setQuantity] = useState(1);

  if (!dish) return null;

  const total = dish.price * quantity;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Image */}
        <div className="relative -mx-6 -mt-6 mb-4">
          <img
            src={dish.image}
            alt={dish.name}
            className="w-full aspect-[16/9] object-cover"
          />
          {dish.badges && dish.badges.length > 0 && (
            <div className="absolute top-4 left-4 flex gap-2">
              {dish.badges.map((badge) => (
                <Badge
                  key={badge}
                  className={`${BADGE_LABELS[badge].color} text-white border-0 font-semibold`}
                >
                  {BADGE_LABELS[badge].label}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{dish.name}</DialogTitle>
        </DialogHeader>

        {/* Meta Info */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {dish.prepTime && (
            <div className="flex items-center gap-1">
              <Clock size={16} />
              <span>{dish.prepTime}</span>
            </div>
          )}
          {dish.servings && (
            <div className="flex items-center gap-1">
              <Users size={16} />
              <span>Serves {dish.servings}</span>
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-muted-foreground">{dish.description}</p>

        {/* Dietary Tags */}
        {dish.dietaryTags && dish.dietaryTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {dish.dietaryTags.map((tag) => (
              <Badge key={tag} variant="secondary" className="capitalize">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <Separator />

        {/* Ingredients */}
        {dish.recipe && (
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Ingredients</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {dish.recipe.ingredients.map((ing, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm">
                  <span className="text-muted-foreground">•</span>
                  <div className="flex-1">
                    <span className="font-medium">{ing.name}</span>
                    <span className="text-muted-foreground ml-2">
                      ({ing.quantity} {ing.unit})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Allergens */}
        {dish.allergens && dish.allergens.length > 0 && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg">
            <AlertCircle size={18} className="text-destructive mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">Allergen Warning</p>
              <p className="text-sm text-muted-foreground">
                Contains: {dish.allergens.join(", ")}
              </p>
            </div>
          </div>
        )}

        <Separator />

        {/* Quantity & Price */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Quantity</span>
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="outline"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus size={16} />
              </Button>
              <span className="w-8 text-center font-medium">{quantity}</span>
              <Button
                size="icon"
                variant="outline"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus size={16} />
              </Button>
            </div>
          </div>

          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">${total.toFixed(2)}</p>
          </div>
        </div>

        {/* Add to Cart */}
        <Button size="lg" className="w-full">
          Add to Cart - ${total.toFixed(2)}
        </Button>
      </DialogContent>
    </Dialog>
  );
};
