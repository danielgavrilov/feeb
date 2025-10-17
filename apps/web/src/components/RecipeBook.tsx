import { useMemo, useState } from "react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
    allergens?: Array<{
      code: string;
      name: string;
      certainty?: string;
    }>;
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

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [reviewFilter, setReviewFilter] = useState<"all" | "reviewed" | "needs_review">("all");
  const [showIngredients, setShowIngredients] = useState(false);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          dishes
            .map((dish) => dish.menuCategory)
            .filter((category): category is string => Boolean(category && category.trim())),
        ),
      ),
    [dishes],
  );

  const filteredDishes = dishes
    .filter((dish) => selectedCategory === "all" || dish.menuCategory === selectedCategory)
    .filter((dish) => {
      if (reviewFilter === "reviewed") {
        return dish.confirmed;
      }

      if (reviewFilter === "needs_review") {
        return !dish.confirmed;
      }

      return true;
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-foreground">Recipe Book</h2>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="show-ingredients"
                checked={showIngredients}
                onCheckedChange={setShowIngredients}
              />
              <Label htmlFor="show-ingredients" className="text-sm font-medium text-foreground">
                Show ingredients
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="review-filter" className="text-sm font-medium text-foreground">
                Review status
              </Label>
              <Select
                value={reviewFilter}
                onValueChange={(value: "all" | "reviewed" | "needs_review") => setReviewFilter(value)}
              >
                <SelectTrigger id="review-filter" className="w-[180px]">
                  <SelectValue placeholder="Filter by review" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="needs_review">Needs review</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("all")}
            >
              All sections
            </Button>
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4">
        {filteredDishes.length === 0 && (
          <div className="text-center py-10">
            <p className="text-muted-foreground">No dishes match the selected filters.</p>
          </div>
        )}
        {filteredDishes.map((dish) => (
          <Card key={dish.id} className="p-6">
            {dish.image && (
              <div className="w-full aspect-video rounded-lg overflow-hidden mb-4">
                <img src={dish.image} alt={dish.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex flex-col gap-2">
                  <h3 className="text-xl font-bold text-foreground break-words md:max-w-[66%]">
                    {dish.name}
                  </h3>
                  {dish.description && (
                    <p className="text-sm text-muted-foreground md:max-w-[66%]">{dish.description}</p>
                  )}
                </div>
                <div className="mt-3 flex gap-2 flex-wrap">
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
              
              <div className="flex items-center gap-2">
                {dish.confirmed ? (
                  <img
                    src="/logo_with_tick.svg"
                    alt="Recipe approved"
                    className="h-6 w-6"
                  />
                ) : (
                  <Button variant="secondary" size="sm" onClick={() => onEdit(dish.id)}>
                    Review
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => onEdit(dish.id)}>
                  <Edit className="w-5 h-5" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="w-5 h-5 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete recipe</AlertDialogTitle>
                    </AlertDialogHeader>
                    <AlertDialogDescription>
                      Are you sure you want to delete this item?
                    </AlertDialogDescription>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDelete(dish.id)} className="bg-destructive hover:bg-destructive/90">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            {showIngredients && (
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
            )}

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
