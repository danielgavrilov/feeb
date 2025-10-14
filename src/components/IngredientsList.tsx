import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Trash2, Plus } from "lucide-react";

export interface IngredientState {
  name: string;
  quantity: string;
  unit: string;
  confirmed: boolean;
  allergens?: string[];
  dietaryInfo?: string[];
}

interface IngredientsListProps {
  ingredients: IngredientState[];
  onUpdateIngredient: (index: number, quantity: string) => void;
  onUpdateIngredientUnit: (index: number, unit: string) => void;
  onConfirmIngredient: (index: number) => void;
  onDeleteIngredient: (index: number) => void;
  onAddIngredient: (name: string, quantity: string, unit: string) => void;
}

export const IngredientsList = ({
  ingredients,
  onUpdateIngredient,
  onUpdateIngredientUnit,
  onConfirmIngredient,
  onDeleteIngredient,
  onAddIngredient,
}: IngredientsListProps) => {
  const [newName, setNewName] = useState("");
  const [newQuantity, setNewQuantity] = useState("");
  const [newUnit, setNewUnit] = useState("g");

  const handleAdd = () => {
    if (newName.trim() && newQuantity.trim()) {
      onAddIngredient(newName.trim(), newQuantity, newUnit);
      setNewName("");
      setNewQuantity("");
      setNewUnit("g");
    }
  };
  return (
    <div className="space-y-4">
      <Label className="text-xl font-semibold text-foreground">Ingredients</Label>
      <div className="space-y-3">
        {ingredients.map((ingredient, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border-2 transition-all ${
              ingredient.confirmed
                ? "bg-confirmed border-confirmed"
                : "bg-inferred border-inferred border-dashed"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`text-lg font-medium ${
                      ingredient.confirmed ? "text-confirmed-foreground" : "text-inferred-foreground"
                    }`}
                  >
                    {ingredient.name}
                  </span>
                  {ingredient.confirmed && (
                    <Check className="w-5 h-5 text-confirmed-foreground" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={ingredient.quantity}
                    onChange={(e) => onUpdateIngredient(index, e.target.value)}
                    className={`h-12 w-24 text-lg font-medium ${
                      ingredient.confirmed ? "bg-card" : "bg-card"
                    }`}
                  />
                  <Select
                    value={ingredient.unit}
                    onValueChange={(value) => onUpdateIngredientUnit(index, value)}
                  >
                    <SelectTrigger className="h-12 w-28 text-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="g">g</SelectItem>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="ml">ml</SelectItem>
                      <SelectItem value="l">l</SelectItem>
                      <SelectItem value="tsp">tsp</SelectItem>
                      <SelectItem value="tbsp">tbsp</SelectItem>
                      <SelectItem value="cup">cup</SelectItem>
                      <SelectItem value="pcs">pcs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!ingredient.confirmed && (
                  <button
                    onClick={() => onConfirmIngredient(index)}
                    className="h-12 px-6 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
                  >
                    Confirm
                  </button>
                )}
                <Button
                  onClick={() => onDeleteIngredient(index)}
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 border-2 hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t-2 border-border border-dashed">
        <Label className="text-lg font-semibold text-foreground mb-3 block">Add New Ingredient</Label>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <Label htmlFor="new-ingredient-name" className="text-sm text-muted-foreground mb-1 block">
              Name
            </Label>
            <Input
              id="new-ingredient-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ingredient name"
              className="h-12 text-lg"
            />
          </div>
          <div className="w-28">
            <Label htmlFor="new-ingredient-quantity" className="text-sm text-muted-foreground mb-1 block">
              Quantity
            </Label>
            <Input
              id="new-ingredient-quantity"
              type="number"
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              placeholder="100"
              className="h-12 text-lg"
            />
          </div>
          <div className="w-24">
            <Label htmlFor="new-ingredient-unit" className="text-sm text-muted-foreground mb-1 block">
              Unit
            </Label>
            <Input
              id="new-ingredient-unit"
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              placeholder="g"
              className="h-12 text-lg"
            />
          </div>
          <Button
            onClick={handleAdd}
            className="h-12 w-12"
            size="icon"
          >
            <Plus className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </div>
  );
};
