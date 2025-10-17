import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ALLERGEN_CATEGORIES } from "@/data/recipes";
import { Check, Trash2, Plus, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";

export interface IngredientState {
  name: string;
  quantity: string;
  unit: string;
  confirmed: boolean;
  allergens?: Array<{
    code: string;
    name: string;
    certainty?: string;
  }>;
  dietaryInfo?: string[];
}

interface IngredientsListProps {
  ingredients: IngredientState[];
  onUpdateIngredient: (index: number, quantity: string) => void;
  onUpdateIngredientUnit: (index: number, unit: string) => void;
  onConfirmIngredient: (index: number) => void;
  onDeleteIngredient: (index: number) => void;
  onAddIngredient: (name: string, quantity: string, unit: string) => void;
  onUpdateIngredientAllergens: (
    index: number,
    allergens: Array<{
      code: string;
      name: string;
      certainty?: string;
    }>
  ) => void;
}

export const IngredientsList = ({
  ingredients,
  onUpdateIngredient,
  onUpdateIngredientUnit,
  onConfirmIngredient,
  onDeleteIngredient,
  onAddIngredient,
  onUpdateIngredientAllergens,
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
        {ingredients.map((ingredient, index) => {
          const selectedAllergens = ingredient.allergens ?? [];
          const handleConfirmClick = () => {
            if (!ingredient.quantity.trim() || !ingredient.unit.trim()) {
              toast.error("Please confirm quantity");
              return;
            }
            onConfirmIngredient(index);
          };

          const toggleAllergen = (allergenId: string, allergenLabel: string) => {
            const normalizedId = allergenId.toLowerCase();
            const updatedAllergens = selectedAllergens.some((existing) => {
              const codeMatch = existing.code?.toLowerCase() === normalizedId;
              const nameMatch = existing.name?.toLowerCase() === normalizedId;
              return codeMatch || nameMatch;
            })
              ? selectedAllergens.filter((existing) => {
                  const codeMatch = existing.code?.toLowerCase() === normalizedId;
                  const nameMatch = existing.name?.toLowerCase() === normalizedId;
                  return !(codeMatch || nameMatch);
                })
              : [
                  ...selectedAllergens,
                  {
                    code: allergenId,
                    name: allergenLabel,
                    certainty: ingredient.confirmed ? "confirmed" : "predicted",
                  },
                ];

            onUpdateIngredientAllergens(index, updatedAllergens);
          };

          return (
            <div
              key={index}
              className={`p-4 rounded-lg border-2 transition-all ${
                ingredient.confirmed
                  ? "bg-confirmed border-confirmed"
                  : "bg-inferred border-inferred border-dashed"
              }`}
            >
              <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)_auto] md:items-start">
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
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
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Input
                      type="number"
                      value={ingredient.quantity}
                      onChange={(e) => onUpdateIngredient(index, e.target.value)}
                      className="h-11 w-28 text-lg font-medium"
                    />
                    <Select
                      value={ingredient.unit || undefined}
                      onValueChange={(value) => onUpdateIngredientUnit(index, value)}
                    >
                      <SelectTrigger className="h-11 w-32 text-lg">
                        <SelectValue placeholder="Unit" />
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

                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={`rounded-lg border text-left transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${
                        selectedAllergens.length > 0 ? "border-border bg-background" : "border-border/60 bg-background/60"
                      } p-4 w-full`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Allergens</p>
                          {selectedAllergens.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {selectedAllergens.map((allergen, allergenIndex) => {
                                const certaintyLabel = (allergen.certainty || (ingredient.confirmed ? "confirmed" : "predicted"))
                                  .toLowerCase();
                                const displayLabel = `${certaintyLabel.charAt(0).toUpperCase()}${certaintyLabel.slice(1)}`;
                                return (
                                  <span
                                    key={`${allergen.code ?? "unknown"}-${allergen.name ?? allergenIndex}`}
                                    className="inline-flex items-center gap-2 rounded-full border border-orange-300 bg-orange-100 px-3 py-1 text-xs"
                                  >
                                    <span className="text-sm font-semibold text-purple-700">
                                      {allergen.name || allergen.code}
                                    </span>
                                    <span className="text-[10px] uppercase tracking-wide text-purple-500">
                                      {displayLabel}
                                    </span>
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="mt-3 text-sm text-muted-foreground">Click to select allergens</p>
                          )}
                        </div>
                        <ChevronsUpDown className="mt-1 h-5 w-5 flex-shrink-0 text-muted-foreground" />
                      </div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64" align="end">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-foreground">Select allergens</p>
                      <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                        {ALLERGEN_CATEGORIES.map((category) => {
                          const normalizedId = category.id.toLowerCase();
                          const isChecked = selectedAllergens.some((existing) => {
                            const codeMatch = existing.code?.toLowerCase() === normalizedId;
                            const nameMatch = existing.name?.toLowerCase() === normalizedId;
                            return codeMatch || nameMatch;
                          });
                          return (
                            <label
                              key={category.id}
                              className="flex items-center gap-2 text-sm font-medium text-foreground"
                            >
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() => toggleAllergen(category.id, category.label)}
                                id={`ingredient-${index}-allergen-${category.id}`}
                              />
                              <span>{category.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-start md:flex-col md:items-end">
                  {!ingredient.confirmed && (
                    <button
                      onClick={handleConfirmClick}
                      className="h-11 px-5 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
                    >
                      Confirm
                    </button>
                  )}
                  <Button
                    onClick={() => onDeleteIngredient(index)}
                    variant="outline"
                    size="icon"
                    className="h-11 w-11 border-2 hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
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
