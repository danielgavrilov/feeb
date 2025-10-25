import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Check, Trash2, Plus, ChevronsUpDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { parsePriceInput } from "@/lib/price-format";
import type { AllergenConfidence } from "@/lib/api";


const ANIMAL_PRODUCT_ALLERGENS = new Set([
  "crustaceans",
  "eggs",
  "fish",
  "milk",
  "molluscs",
]);

const HIDDEN_DIET_BADGES = new Set(["vegan", "vegetarian"]);

export const getSortedAllergenCategories = () =>
  [...ALLERGEN_CATEGORIES].sort((a, b) => {
    const aDefinition = allergenFilterMap.get(a.id);
    const bDefinition = allergenFilterMap.get(b.id);
    const aLabel = (aDefinition?.name ?? a.label ?? a.id).toLowerCase();
    const bLabel = (bDefinition?.name ?? b.label ?? b.id).toLowerCase();
    const aHasChildren = Array.isArray(a.children) && a.children.length > 0;
    const bHasChildren = Array.isArray(b.children) && b.children.length > 0;

    if (aHasChildren !== bHasChildren) {
      return aHasChildren ? 1 : -1;
    }

    return aLabel.localeCompare(bLabel);
  });

export interface IngredientState {
  name: string;
  quantity: string;
  unit: string;
  confirmed: boolean;
  ingredientId?: number | null;
  originalName?: string;
  allergens?: Array<{
    code: string;
    name: string;
    certainty?: string;
    canonical_code?: string | null;
    canonical_name?: string | null;
    family_code?: string | null;
    family_name?: string | null;
    marker_type?: string | null;
  }>;
  dietaryInfo?: string[];
  substitution?: {
    alternative: string;
    surcharge?: string | null;
  };
}

interface IngredientsListProps {
  ingredients: IngredientState[];
  onUpdateIngredientName: (index: number, name: string) => void;
  onUpdateIngredient: (index: number, quantity: string) => void;
  onUpdateIngredientUnit: (index: number, unit: string) => void;
  onConfirmIngredient: (index: number) => Promise<void> | void;
  onDeleteIngredient: (index: number) => Promise<void> | void;
  onAddIngredient: (name: string, quantity: string, unit: string) => void;
  onUpdateIngredientAllergen: (
    index: number,
    allergens: Array<{
      code: string;
      name: string;
      certainty?: string;
      canonical_code?: string | null;
      canonical_name?: string | null;
      family_code?: string | null;
      family_name?: string | null;
      marker_type?: string | null;
    }>
  ) => Promise<void> | void;
  onUpdateIngredientSubstitution: (
    index: number,
    substitution?: IngredientState["substitution"],
  ) => void;
  onIngredientNameBlur: (index: number) => void;
  formatPrice: (value: string | number | null | undefined) => string;
}

export const IngredientsList = ({
  ingredients,
  onUpdateIngredientName,
  onUpdateIngredient,
  onUpdateIngredientUnit,
  onConfirmIngredient,
  onDeleteIngredient,
  onAddIngredient,
  onUpdateIngredientAllergens,
  onUpdateIngredientSubstitution,
  onIngredientNameBlur,
  formatPrice,
}: IngredientsListProps) => {
  const [newName, setNewName] = useState("");
  const [newQuantity, setNewQuantity] = useState("");
  const [newUnit, setNewUnit] = useState("g");
  const [activeSubstitutionIndex, setActiveSubstitutionIndex] = useState<number | null>(null);
  const [substitutionDraft, setSubstitutionDraft] = useState({ alternative: "", surcharge: "" });
  const [expandedAllergenCategory, setExpandedAllergenCategory] = useState<string | null>(null);

  const sortedAllergenCategories = getSortedAllergenCategories();


  const matchesAllergenSelection = (
    allergen: { code?: string; name?: string },
    allergenId: string,
    fallbackLabel?: string,
  ) => {
    const normalizedId = allergenId.toLowerCase();
    const normalizedFallback = fallbackLabel?.toLowerCase();
    const normalizedCode = allergen.code?.toLowerCase();
    const normalizedName = allergen.name?.toLowerCase();

    // Direct ID match
    if (normalizedCode === normalizedId || normalizedName === normalizedId) {
      return true;
    }

    // Direct label match
    if (normalizedFallback && 
        (normalizedCode === normalizedFallback || normalizedName === normalizedFallback)) {
      return true;
    }

    return false;
  };

  const isAllergenSelected = (
    allergens: Array<{ code?: string; name?: string }>,
    allergenId: string,
    fallbackLabel?: string,
  ) =>
    allergens.some((existing) =>
      matchesAllergenSelection(existing, allergenId, fallbackLabel),
    );

  const isAnimalProductAllergen = (allergenId: string) => {
    const baseId = allergenId.split(":")[0];
    return ANIMAL_PRODUCT_ALLERGENS.has(allergenId) || ANIMAL_PRODUCT_ALLERGENS.has(baseId);
  };

  const toInputId = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, "-");

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
          const visibleAllergens = selectedAllergens.filter((allergen) => {
            const definition = allergenFilterMap.get(allergen.code || '');
            const definitionId = definition?.id?.toLowerCase();

            if (definitionId && HIDDEN_DIET_BADGES.has(definitionId)) {
              return false;
            }

            const normalizedCode = allergen.code?.toLowerCase();
            const normalizedName = allergen.name?.toLowerCase();
            return (
              (normalizedCode ? !HIDDEN_DIET_BADGES.has(normalizedCode) : true) &&
              (normalizedName ? !HIDDEN_DIET_BADGES.has(normalizedName) : true)
            );
          });
          const substitution = ingredient.substitution;
          const isSubstitutionDialogOpen = activeSubstitutionIndex === index;
          const substitutionSurchargeLabel = formatSurchargeLabel(substitution?.surcharge);
          const handleConfirmClick = async () => {
            if (!ingredient.quantity.trim() || !ingredient.unit.trim()) {
              toast.error("Please specify the quantity and unit for this ingredient");
              return;
            }
            await onConfirmIngredient(index);
          };

          const toggleAllergen = (allergenId: string, fallbackLabel?: string) => {
            const definition = allergenFilterMap.get(allergenId);
            
            let entryCode = allergenId;
            let entryName = fallbackLabel ?? allergenId;

            if (definition) {
              entryCode = definition.id;
              entryName = definition.name;
            }

            const selectionLabel = entryName;
            const alreadySelected = isAllergenSelected(
              selectedAllergens,
              allergenId,
              selectionLabel,
            );
            const updatedAllergens = alreadySelected
              ? selectedAllergens.filter(
                  (existing) =>
                    !matchesAllergenSelection(existing, allergenId, selectionLabel),
                )
              : [
                  ...selectedAllergens,
                  {
                    code: entryCode,
                    name: entryName,
                    certainty: "confirmed",
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
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <Input
                            value={ingredient.name}
                            onChange={(event) => onUpdateIngredientName(index, event.target.value)}
                            onBlur={() => onIngredientNameBlur(index)}
                            placeholder="Ingredient name"
                            className="h-11 text-lg font-medium"
                            aria-label="Ingredient name"
                          />
                          {ingredient.confirmed && (
                            <Check className="w-5 h-5 text-confirmed-foreground" />
                          )}
                        </div>
                      </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                      <Input
                        type="number"
                        value={ingredient.quantity}
                        onChange={(e) => onUpdateIngredient(index, e.target.value)}
                        className="h-11 w-full text-lg font-medium sm:w-28"
                      />
                      <Select
                        value={ingredient.unit || undefined}
                        onValueChange={(value) => onUpdateIngredientUnit(index, value)}
                      >
                        <SelectTrigger className="h-11 w-full text-lg sm:w-32">
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
                    <Popover
                      onOpenChange={(open) => {
                        if (!open) {
                          setExpandedAllergenCategory(null);
                        }
                      }}
                    >
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={`rounded-lg border text-left transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${
                            visibleAllergens.length > 0
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
                                {visibleAllergens.length > 0 ? (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {[...visibleAllergens]
                                      .sort((a, b) => {
                                        const aDefinition = allergenFilterMap.get(a.code || '');
                                        const bDefinition = allergenFilterMap.get(b.code || '');
                                        const aLabel = (
                                          aDefinition?.name ?? a.name ?? a.code ?? ""
                                        ).toLowerCase();
                                        const bLabel = (
                                          bDefinition?.name ?? b.name ?? b.code ?? ""
                                        ).toLowerCase();
                                        return aLabel.localeCompare(bLabel);
                                      })
                                      .map((allergen, allergenIndex) => {
                                        const definition = allergenFilterMap.get(allergen.code || '');
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
                                        allergen.name ?? definition?.name ?? allergen.code ?? "Allergen";

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
                              {sortedAllergenCategories.map((category) => {
                                const definition = allergenFilterMap.get(category.id);
                                const label = definition?.name ?? category.label ?? category.id;
                                const Icon = definition?.Icon;
                                const hasChildren =
                                  Array.isArray(category.children) && category.children.length > 0;
                                const isExpanded = expandedAllergenCategory === category.id;
                                const selectedChildCount = hasChildren
                                  ? category.children?.reduce((count, child) => {
                                      const childDefinition = allergenFilterMap.get(child.id);
                                      const childLabel =
                                        childDefinition?.name ?? child.label ?? child.id;
                                      return isAllergenSelected(
                                        selectedAllergens,
                                        child.id,
                                        childLabel,
                                      )
                                        ? count + 1
                                        : count;
                                    }, 0) ?? 0
                                  : 0;

                                if (hasChildren) {
                                  return (
                                    <div key={category.id} className="rounded-md">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setExpandedAllergenCategory((current) =>
                                            current === category.id ? null : category.id,
                                          )
                                        }
                                        className="flex w-full items-center justify-between rounded-md px-2 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted/40"
                                      >
                                        <span className="flex items-center gap-2">
                                          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                                          <span>{label}</span>
                                        </span>
                                        <span className="flex items-center gap-2">
                                          {selectedChildCount > 0 && (
                                            <Badge
                                              variant="outline"
                                              className="text-[10px] font-semibold uppercase tracking-wide"
                                            >
                                              {selectedChildCount} selected
                                            </Badge>
                                          )}
                                          <ChevronRight
                                            className={`h-4 w-4 transition-transform ${
                                              isExpanded ? "rotate-90" : ""
                                            }`}
                                          />
                                        </span>
                                      </button>
                                      {isExpanded && (
                                        <div className="mt-2 space-y-2 pl-6">
                                          {[...(category.children ?? [])]
                                            .sort((aChild, bChild) => {
                                              const aDefinition = allergenFilterMap.get(aChild.id);
                                              const bDefinition = allergenFilterMap.get(bChild.id);
                                              const aLabel = (
                                                aDefinition?.name ?? aChild.label ?? aChild.id
                                              ).toLowerCase();
                                              const bLabel = (
                                                bDefinition?.name ?? bChild.label ?? bChild.id
                                              ).toLowerCase();
                                              return aLabel.localeCompare(bLabel);
                                            })
                                            .map((child) => {
                                              const childDefinition = allergenFilterMap.get(child.id);
                                              const childLabel =
                                                childDefinition?.name ?? child.label ?? child.id;
                                            const childChecked = isAllergenSelected(
                                              selectedAllergens,
                                              child.id,
                                              childLabel,
                                            );
                                            const showAnimalBadge =
                                              isAnimalProductAllergen(child.id) && childChecked;
                                            const checkboxId = `ingredient-${index}-allergen-${toInputId(
                                              child.id,
                                            )}`;
                                            return (
                                              <label
                                                key={child.id}
                                                htmlFor={checkboxId}
                                                className="flex items-center justify-between gap-2 rounded-md px-2 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
                                              >
                                                <span className="flex items-center gap-2">
                                                  <Checkbox
                                                    id={checkboxId}
                                                    checked={childChecked}
                                                    onCheckedChange={() =>
                                                      toggleAllergen(child.id, childLabel)
                                                    }
                                                  />
                                                  <span>{childLabel}</span>
                                                </span>
                                                {showAnimalBadge && (
                                                  <Badge
                                                    variant="destructive"
                                                    className="text-[10px] font-semibold uppercase tracking-wide"
                                                  >
                                                    Animal product
                                                  </Badge>
                                                )}
                                              </label>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                }

                                const isChecked = isAllergenSelected(
                                  selectedAllergens,
                                  category.id,
                                  label,
                                );
                                const checkboxId = `ingredient-${index}-allergen-${toInputId(
                                  category.id,
                                )}`;
                                const showAnimalBadge =
                                  isAnimalProductAllergen(category.id) && isChecked;

                                return (
                                  <label
                                    key={category.id}
                                    htmlFor={checkboxId}
                                    className="flex items-center justify-between gap-2 rounded-md px-2 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
                                  >
                                    <span className="flex items-center gap-2">
                                      <Checkbox
                                        checked={isChecked}
                                        onCheckedChange={() => toggleAllergen(category.id, label)}
                                        id={checkboxId}
                                      />
                                      {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                                      <span>{label}</span>
                                    </span>
                                    {showAnimalBadge && (
                                      <Badge
                                        variant="destructive"
                                        className="text-[10px] font-semibold uppercase tracking-wide"
                                      >
                                        Animal product
                                      </Badge>
                                    )}
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                          {visibleAllergens.length > 0 && (
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

                  <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end md:flex-col md:items-end md:gap-3">
                    {!ingredient.confirmed && (
                      <button
                        onClick={handleConfirmClick}
                        className="h-11 w-full rounded-lg bg-primary px-5 font-medium text-primary-foreground transition-opacity hover:opacity-90 sm:w-auto"
                      >
                        Confirm
                      </button>
                    )}
                    <Button
                      onClick={() => onDeleteIngredient(index)}
                      variant="outline"
                      size="icon"
                      className="h-11 w-full border-2 hover:bg-destructive hover:text-destructive-foreground sm:w-11"
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

      <div className="border-t-2 border-border border-dashed pt-4">
        <Label className="mb-3 block text-lg font-semibold text-foreground">Add New Ingredient</Label>
        <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-end">
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
          <div className="sm:w-28">
            <Label htmlFor="new-ingredient-quantity" className="mb-1 block text-sm text-muted-foreground">
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
          <div className="sm:w-24">
            <Label htmlFor="new-ingredient-unit" className="mb-1 block text-sm text-muted-foreground">
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
            className="h-12 w-full sm:w-12"
            size="icon"
          >
            <Plus className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </div>
  );
};
