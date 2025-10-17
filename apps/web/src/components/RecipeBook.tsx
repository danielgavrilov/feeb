import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Edit } from "lucide-react";

export interface SavedDish {
  id: string;
  name: string;
  menuCategory: string;
  description: string;
  servingSize: string;
  price: string;
  ingredients: Array<{
    name: string;
    quantity: string;
    unit: string;
    confirmed?: boolean;
  }>;
  prepMethod: string;
  compliance: Record<string, boolean>;
  image?: string;
  confirmed: boolean;
}

interface RecipeBookProps {
  dishes: SavedDish[];
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

export const RecipeBook = ({ dishes, onDelete, onEdit }: RecipeBookProps) => {
  if (dishes.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">No dishes added yet.</p>
        <p className="text-muted-foreground mt-2">Start by adding your first dish!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-foreground mb-6">Recipe Book</h2>
      
      <div className="grid gap-4">
        {dishes.map((dish) => (
          <Card key={dish.id} className="p-6">
            {dish.image && (
              <div className="w-full aspect-video rounded-lg overflow-hidden mb-4">
                <img src={dish.image} alt={dish.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold text-foreground">{dish.name}</h3>
                  {dish.confirmed ? (
                    <img
                      src="/logo_with_tick.svg"
                      alt="Recipe approved"
                      className="h-6 w-6"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => onEdit(dish.id)}
                      className="text-sm font-semibold bg-gradient-to-r from-[#23001E] to-[#FE7F2D] bg-clip-text text-transparent hover:opacity-80 transition-opacity"
                    >
                      Review
                    </button>
                  )}
                </div>
                {dish.description && (
                  <p className="text-muted-foreground mb-2">{dish.description}</p>
                )}
                <div className="flex gap-2 flex-wrap">
                  {dish.menuCategory && (
                    <Badge variant="outline">{dish.menuCategory}</Badge>
                  )}
                  {dish.servingSize !== "1" && (
                    <Badge variant="outline">Serves {dish.servingSize}</Badge>
                  )}
                  {dish.price && (
                    <Badge variant="outline">${dish.price}</Badge>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(dish.id)}
                >
                  <Edit className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(dish.id)}
                >
                  <Trash2 className="w-5 h-5 text-destructive" />
                </Button>
              </div>
            </div>

            <div className="mb-4">
              <h4 className="font-semibold text-sm text-foreground mb-2">Ingredients:</h4>
              <div className="grid grid-cols-2 gap-2">
                {dish.ingredients.map((ing, idx) => (
                  <p key={idx} className="text-sm text-muted-foreground">
                    {ing.quantity} {ing.unit} {ing.name}
                  </p>
                ))}
              </div>
            </div>

            {dish.prepMethod && (
              <div className="mb-4">
                <h4 className="font-semibold text-sm text-foreground mb-2">Preparation:</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{dish.prepMethod}</p>
              </div>
            )}

            <div>
              <h4 className="font-semibold text-sm text-foreground mb-2">Dietary Compliance:</h4>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(dish.compliance).map(([key, value]) => (
                  <Badge
                    key={key}
                    variant={value ? "default" : "secondary"}
                    className={value ? "bg-primary" : "bg-muted"}
                  >
                    {key.replace("-", " ").toUpperCase()}
                  </Badge>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
