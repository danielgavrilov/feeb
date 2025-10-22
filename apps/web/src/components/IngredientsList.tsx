import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ALLERGEN_CATEGORIES } from "@/data/recipes";
import { allergenFilterMap } from "@/data/allergen-filters";
import type { AllergenFilterDefinition } from "@/data/allergen-filters";
import { Check, Trash2, Plus, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { parsePriceInput } from "@/lib/price-format";
import type { AllergenConfidence } from "@/lib/api";

const LEGACY_ALLERGEN_ALIASES: Record<string, string[]> = {
  cereals_gluten: ["gluten"],
  crustaceans: ["shellfish"],
  eggs: ["eggs"],
  fish: ["fish"],
  peanuts: ["peanuts"],
  soybeans: ["soy"],
  milk: ["dairy"],
  tree_nuts: ["nuts"],
  celery: ["celery"],
  mustard: ["mustard"],
  sesame: ["sesame"],
  sulphites: ["sulphites", "sulfites"],
  lupin: ["lupin"],
  molluscs: ["shellfish"],
  vegan: ["vegan", "not vegan", "not plant-based"],
  vegetarian: ["vegetarian", "not vegetarian", "not plant-based"],
};

export interface IngredientState {
  name: string;
  quantity: string;
  unit: string;
  confirmed: boolean;
  allergens?: Array<{
    code: string;
    name: string;
    certainty?: AllergenConfidence;
  }>;
  dietaryInfo?: string[];
  substitution?: {
    alternative: string;
    surcharge?: string | null;
  };
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
      certainty?: AllergenConfidence;
    }>
  ) => void;
  onUpdateIngredientSubstitution: (
    index: number,
    substitution?: IngredientState["substitution"],
  ) => void;
  formatPrice: (value: string | number | null | undefined) => string;
}

export const IngredientsList = ({
  ingredients,
  onUpdateIngredient,
  onUpdateIngredientUnit,
  onConfirmIngredient,
  onDeleteIngredient,
  onAddIngredient,
  onUpdateIngredientAllergens,
  onUpdateIngredientSubstitution,
  formatPrice,
}: IngredientsListProps) => {
  const [newName, setNewName] = useState("");
  const [newQuantity, setNewQuantity] = useState("");
  const [newUnit, setNewUnit] = useState("g");
  const [activeSubstitutionIndex, setActiveSubstitutionIndex] = useState<number | null>(null);
  const [substitutionDraft, setSubstitutionDraft] = useState({ alternative: "", surcharge: "" });

  const matchesDefinitionValue = (definition: AllergenFilterDefinition, value?: string) => {
    if (!value) {
      return false;
    }
    const normalizedId = definition.id.toLowerCase();
    const normalizedValue = value.toLowerCase();

    if (normalizedId === normalizedValue) {
      return true;
    }

    if (definition.name.toLowerCase() === normalizedValue) {
      return true;
    }

    const aliases = LEGACY_ALLERGEN_ALIASES[normalizedId] ?? [];
    return aliases.includes(normalizedValue);
  };

  const findDefinitionForAllergen = (code?: string, name?: string) => {
    if (!code && !name) {
      return undefined;
    }

    for (const definition of allergenFilterMap.values()) {
      if (matchesDefinitionValue(definition, code) || matchesDefinitionValue(definition, name)) {
        return definition;
      }
    }

    return undefined;
  };

  const matchesAllergenSelection = (
    allergen: { code?: string; name?: string },
    allergenId: string,
    fallbackLabel?: string,
  ) => {
    const definition =
      allergenFilterMap.get(allergenId) ??
      allergenFilterMap.get(allergenId.toLowerCase()) ??
      findDefinitionForAllergen(allergenId, fallbackLabel);

    if (definition) {
      return (
        matchesDefinitionValue(definition, allergen.code) ||
        matchesDefinitionValue(definition, allergen.name)
      );
    }

    const normalizedId = allergenId.toLowerCase();
    const normalizedFallback = fallbackLabel?.toLowerCase();

    return (
      allergen.code?.toLowerCase() === normalizedId ||
      allergen.name?.toLowerCase() === normalizedId ||
      (normalizedFallback
        ? allergen.code?.toLowerCase() === normalizedFallback ||
          allergen.name?.toLowerCase() === normalizedFallback
        : false)
    );
  };

  const initializeSubstitutionDraft = (
    ingredientIndex: number,
    substitution?: IngredientState["substitution"],
  ) => {
    setActiveSubstitutionIndex(ingredientIndex);
    setSubstitutionDraft({
      alternative: substitution?.alternative ?? "",
      surcharge: substitution?.surcharge ?? "",
    });
  };

  const handleCloseSubstitutionDialog = () => {
    setActiveSubstitutionIndex(null);
    setSubstitutionDraft({ alternative: "", surcharge: "" });
  };

  const handleSaveSubstitution = () => {
    if (activeSubstitutionIndex === null) {
      return;
    }

    const alternative = substitutionDraft.alternative.trim();
    const surcharge = substitutionDraft.surcharge.trim();

    if (!alternative) {
      toast.error("Please provide an alternative ingredient");
      return;
    }

    onUpdateIngredientSubstitution(activeSubstitutionIndex, {
      alternative,
      surcharge: surcharge || undefined,
    });
    handleCloseSubstitutionDialog();
  };

  const handleRemoveSubstitution = () => {
    if (activeSubstitutionIndex === null) {
      return;
    }
    onUpdateIngredientSubstitution(activeSubstitutionIndex, undefined);
    handleCloseSubstitutionDialog();
  };

  const formatSurchargeLabel = (value?: string) => {
    if (!value) {
      return "";
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return "";
    }

    const formatted = formatPrice(trimmed);
    if (!formatted) {
      return "";
    }

    const numeric = parsePriceInput(trimmed);
    if (numeric !== null && numeric > 0) {
      return `+${formatted}`;
    }

    return formatted;
  };

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
          const substitution = ingredient.substitution;
          const isSubstitutionDialogOpen = activeSubstitutionIndex === index;
          const substitutionSurchargeLabel = formatSurchargeLabel(substitution?.surcharge);
          const handleConfirmClick = () => {
            if (!ingredient.quantity.trim() || !ingredient.unit.trim()) {
              toast.error("Please specify the quantity and unit for this ingredient");
              return;
            }
            onConfirmIngredient(index);
          };

          const toggleAllergen = (allergenId: string, fallbackLabel?: string) => {
            const definition = allergenFilterMap.get(allergenId);
            const label = definition?.name ?? fallbackLabel ?? allergenId;
            const updatedAllergens = selectedAllergens.some((existing) =>
              matchesAllergenSelection(existing, allergenId, label),
            )
              ? selectedAllergens.filter(
                  (existing) => !matchesAllergenSelection(existing, allergenId, label),
                )
              : [
                  ...selectedAllergens,
                  {
                    code: allergenId,
                    name: label,
                    certainty: ingredient.confirmed ? "confirmed" : "predicted",
                  },
                ];

            onUpdateIngredientAllergens(index, updatedAllergens);
            if (updatedAllergens.length === 0 && ingredient.substitution) {
              onUpdateIngredientSubstitution(index, undefined);
            }
          };

          const openSubstitutionDialogForIngredient = () => {
            initializeSubstitutionDraft(index, substitution);
          };

          return (
            <Dialog
              key={index}
              open={isSubstitutionDialogOpen}
              onOpenChange={(open) => {
                if (open) {
                  initializeSubstitutionDraft(index, substitution);
                } else if (isSubstitutionDialogOpen) {
                  handleCloseSubstitutionDialog();
                }
              }}
            >
              <div
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

                  <div className="space-y-4">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={`rounded-lg border text-left transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${
                            selectedAllergens.length > 0
                              ? "border-border bg-background"
                              : "border-border/60 bg-background/60"
                          } p-4 w-full`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-3">
                              <div>
                                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                  Allergens
                                </p>
                                {selectedAllergens.length > 0 ? (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {selectedAllergens.map((allergen, allergenIndex) => {
                                      const definition = findDefinitionForAllergen(
                                        allergen.code,
                                        allergen.name,
                                      );
                                      const certaintyLabel = (
                                        allergen.certainty || (ingredient.confirmed ? "confirmed" : "predicted")
                                      ).toLowerCase();
                                      const displayLabel = `${certaintyLabel.charAt(0).toUpperCase()}${certaintyLabel.slice(1)}`;
                                      const statusClassName =
                                        certaintyLabel === "confirmed"
                                          ? "text-primary"
                                          : certaintyLabel === "likely"
                                          ? "text-amber-600 dark:text-amber-300"
                                          : "text-muted-foreground";
                                      const Icon = definition?.Icon;
                                      const allergenDisplayName =
                                        definition?.name ?? allergen.name ?? allergen.code ?? "Allergen";

                                      return (
                                        <span
                                          key={`${allergen.code ?? "unknown"}-${allergen.name ?? allergenIndex}`}
                                          className="inline-flex items-center gap-2 rounded-full border border-secondary/40 bg-secondary/15 px-3 py-1 text-xs"
                                        >
                                          {Icon && <Icon className="h-4 w-4 text-secondary" />}
                                          <span className="text-sm font-semibold text-secondary">
                                            {allergenDisplayName}
                                          </span>
                                          <span className={`text-[10px] uppercase tracking-wide ${statusClassName}`}>
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
                              <p className="text-sm font-semibold text-primary">Add substitution</p>
                            </div>
                            <ChevronsUpDown className="mt-1 h-5 w-5 flex-shrink-0 text-muted-foreground" />
                          </div>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72" align="end">
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">Select allergens</p>
                            <div className="mt-2 max-h-56 space-y-2 overflow-y-auto pr-1">
                              {ALLERGEN_CATEGORIES.map((category) => {
                                const definition = allergenFilterMap.get(category.id);
                                const label = definition?.name ?? category.label ?? category.id;
                                const Icon = definition?.Icon;
                                const isChecked = selectedAllergens.some((existing) =>
                                  matchesAllergenSelection(existing, category.id, label),
                                );
                                return (
                                  <label
                                    key={category.id}
                                    className="flex items-center gap-2 text-sm font-medium text-foreground"
                                  >
                                    <Checkbox
                                      checked={isChecked}
                                      onCheckedChange={() => toggleAllergen(category.id, label)}
                                      id={`ingredient-${index}-allergen-${category.id}`}
                                    />
                                    {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                                    <span>{label}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                          {selectedAllergens.length > 0 && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                openSubstitutionDialogForIngredient();
                              }}
                              className="flex items-center gap-2 rounded-md bg-secondary/15 px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-secondary/25"
                            >
                              <span className="text-base leading-none">&gt;</span>
                              <span>add substitution</span>
                            </button>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>

                    {substitution && (
                      <div className="space-y-2">
                        <div className="rounded-lg border border-secondary/40 bg-secondary/10 p-3 text-sm">
                          <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                            Listed substitution
                          </p>
                          <p className="mt-1 font-medium text-foreground">{substitution.alternative}</p>
                          {substitutionSurchargeLabel && (
                            <p className="text-xs text-muted-foreground">
                              Surcharge: {substitutionSurchargeLabel}
                            </p>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="link"
                          className="h-auto px-0 text-sm font-semibold text-primary"
                          onClick={() => {
                            openSubstitutionDialogForIngredient();
                          }}
                        >
                          Edit substitution
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-nowrap items-center justify-end gap-2 md:flex-col md:items-end md:justify-start md:gap-3">
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

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>List substitution</DialogTitle>
                  <DialogDescription>
                    Replacing <span className="font-semibold text-foreground">{ingredient.name}</span>
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor={`ingredient-${index}-substitution-name`}>
                      Alternative ingredient
                    </Label>
                    <Input
                      id={`ingredient-${index}-substitution-name`}
                      value={substitutionDraft.alternative}
                      onChange={(event) =>
                        setSubstitutionDraft((current) => ({
                          ...current,
                          alternative: event.target.value,
                        }))
                      }
                      placeholder="e.g. Gluten-free bun"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`ingredient-${index}-substitution-surcharge`}>
                      Optional surcharge
                    </Label>
                    <Input
                      id={`ingredient-${index}-substitution-surcharge`}
                      value={substitutionDraft.surcharge}
                      onChange={(event) =>
                        setSubstitutionDraft((current) => ({
                          ...current,
                          surcharge: event.target.value,
                        }))
                      }
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.50"
                    />
                  </div>
                </div>
                <DialogFooter className="gap-2 pt-2">
                  <Button variant="ghost" onClick={handleCloseSubstitutionDialog}>
                    Cancel
                  </Button>
                  {substitution && (
                    <Button variant="secondary" onClick={handleRemoveSubstitution}>
                      Remove substitution
                    </Button>
                  )}
                  <Button onClick={handleSaveSubstitution}>Save substitution</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
