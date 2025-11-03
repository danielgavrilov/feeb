import { useState, useEffect, useRef } from "react";
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
import { Check, Trash2, Plus, ChevronsUpDown, ChevronRight, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { parsePriceInput } from "@/lib/price-format";
import type { AllergenConfidence } from "@/lib/api";
import { getRestaurantBasePreps } from "@/lib/api";


const ANIMAL_PRODUCT_ALLERGENS = new Set([
  "crustaceans",
  "eggs",
  "fish",
  "milk",
  "molluscs",
]);

const HIDDEN_DIET_BADGES = new Set(["vegan", "vegetarian"]);

const DEFAULT_NEW_INGREDIENT_QUANTITY = "100";
const DEFAULT_NEW_INGREDIENT_UNIT = "g";

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
  basePrepId?: number;
  isBasePrep?: boolean;
  basePrepIngredients?: IngredientState[];
}

interface IngredientsListProps {
  ingredients: IngredientState[];
  onUpdateIngredientName: (index: number, name: string) => void;
  onUpdateIngredient: (index: number, quantity: string) => void;
  onUpdateIngredientUnit: (index: number, unit: string) => void;
  onConfirmIngredient: (index: number) => Promise<void> | void;
  onDeleteIngredient: (index: number) => Promise<void> | void;
  onAddIngredient: (
    name: string,
    quantity: string,
    unit: string,
    allergens: IngredientState["allergens"],
  ) => void;
  onAddBasePrep?: (basePrepId: number, quantity: string, unit: string) => void;
  onCreateNewBasePrep?: () => void;
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
  restaurantId?: number | null;
}

export const IngredientsList = ({
  ingredients,
  onUpdateIngredientName,
  onUpdateIngredient,
  onUpdateIngredientUnit,
  onConfirmIngredient,
  onDeleteIngredient,
  onAddIngredient,
  onAddBasePrep,
  onCreateNewBasePrep,
  onUpdateIngredientAllergen,
  onUpdateIngredientSubstitution,
  onIngredientNameBlur,
  formatPrice,
  restaurantId,
}: IngredientsListProps) => {
  const [newName, setNewName] = useState("");
  const [newQuantity, setNewQuantity] = useState(DEFAULT_NEW_INGREDIENT_QUANTITY);
  const [newQuantityPristine, setNewQuantityPristine] = useState(true);
  const [newUnit, setNewUnit] = useState(DEFAULT_NEW_INGREDIENT_UNIT);
  const [newAllergens, setNewAllergens] = useState<IngredientState["allergens"]>([]);
  const [activeSubstitutionIndex, setActiveSubstitutionIndex] = useState<number | null>(null);
  const [substitutionDraft, setSubstitutionDraft] = useState({ alternative: "", surcharge: "" });
  const [expandedAllergenCategory, setExpandedAllergenCategory] = useState<string | null>(null);
  const [showBasePrepDialog, setShowBasePrepDialog] = useState(false);
  const [basePreps, setBasePreps] = useState<Array<{ id: number; name: string; description?: string }>>([]);
  const [selectedBasePrep, setSelectedBasePrep] = useState<number | null>(null);
  const [basePrepQuantity, setBasePrepQuantity] = useState("1");
  const [basePrepUnit, setBasePrepUnit] = useState("batch");
  const [expandedBasePreps, setExpandedBasePreps] = useState<Set<number>>(new Set());
  
  // Refs for allergen scrollable containers - map of ingredient index to scrollable div
  const allergenScrollRefs = useRef<Map<number, HTMLDivElement | null>>(new Map()).current;

  const sortedAllergenCategories = getSortedAllergenCategories();

  // Fetch base preps when restaurant changes
  useEffect(() => {
    if (restaurantId) {
      getRestaurantBasePreps(restaurantId)
        .then((preps) => {
          setBasePreps(preps.map(prep => ({ id: prep.id, name: prep.name, description: prep.description })));
        })
        .catch((error) => {
          console.error("Failed to fetch base preps", error);
        });
    } else {
      setBasePreps([]);
    }
  }, [restaurantId]);

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

  const handleNewQuantityFocus = () => {
    if (newQuantityPristine) {
      setNewQuantity("");
    }
  };

  const handleNewQuantityBlur = () => {
    if (!newQuantity.trim()) {
      setNewQuantity(DEFAULT_NEW_INGREDIENT_QUANTITY);
      setNewQuantityPristine(true);
    }
  };

  const handleNewQuantityChange = (value: string) => {
    setNewQuantity(value);
    setNewQuantityPristine(false);
  };

  const handleAdd = () => {
    if (newName.trim() && newQuantity.trim()) {
      onAddIngredient(newName.trim(), newQuantity, newUnit, newAllergens);
      setNewName("");
      setNewQuantity(DEFAULT_NEW_INGREDIENT_QUANTITY);
      setNewQuantityPristine(true);
      setNewUnit(DEFAULT_NEW_INGREDIENT_UNIT);
      setNewAllergens([]);
      setExpandedAllergenCategory(null);
    }
  };

  const handleAddBasePrep = () => {
    if (selectedBasePrep && onAddBasePrep) {
      onAddBasePrep(selectedBasePrep, basePrepQuantity, basePrepUnit);
      setShowBasePrepDialog(false);
      setSelectedBasePrep(null);
      setBasePrepQuantity("1");
      setBasePrepUnit("batch");
    }
  };

  const toggleBasePrepExpanded = (index: number) => {
    setExpandedBasePreps((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const toggleNewAllergen = (allergenId: string, fallbackLabel?: string) => {
    const definition = allergenFilterMap.get(allergenId);
    const entryCode = definition?.id ?? allergenId;
    const entryName = definition?.name ?? fallbackLabel ?? allergenId;

    setNewAllergens((current = []) => {
      const selectionLabel = entryName;
      const alreadySelected = isAllergenSelected(current, allergenId, selectionLabel);

      if (alreadySelected) {
        return current.filter((existing) =>
          !matchesAllergenSelection(existing, allergenId, selectionLabel),
        );
      }

      return [
        ...current,
        {
          code: entryCode,
          name: entryName,
          certainty: "confirmed",
        },
      ];
    });
  };

  const newSelectedAllergens = newAllergens ?? [];
  const newVisibleAllergens = newSelectedAllergens.filter((allergen) => {
    const normalizedCode = allergen.code?.toLowerCase();
    const normalizedName = allergen.name?.toLowerCase();
    return (
      (normalizedCode ? !HIDDEN_DIET_BADGES.has(normalizedCode) : true) &&
      (normalizedName ? !HIDDEN_DIET_BADGES.has(normalizedName) : true)
    );
  });
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

            onUpdateIngredientAllergen(index, updatedAllergens);
            if (updatedAllergens.length === 0 && ingredient.substitution) {
              onUpdateIngredientSubstitution(index, undefined);
            }
          };

          const openSubstitutionDialogForIngredient = () => {
            initializeSubstitutionDraft(index, substitution);
          };

          // Special rendering for base prep ingredients
          if (ingredient.isBasePrep) {
            const isExpanded = expandedBasePreps.has(index);
            return (
              <div
                key={index}
                className="p-4 rounded-lg border-2 border-blue-300 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-700"
              >
                <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)_auto] md:items-start">
                  {/* Left column: title and quantity/unit */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleBasePrepExpanded(index)}
                        className="p-0 h-auto hover:bg-transparent"
                      >
                        {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                      </Button>
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100">{ingredient.name}</h4>
                      <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                        Base Prep
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 ml-7">
                      <Input
                        type="number"
                        value={ingredient.quantity}
                        onChange={(e) => onUpdateIngredient(index, e.target.value)}
                        className="h-9 w-24 text-sm bg-white dark:bg-slate-800"
                        aria-label="Quantity"
                      />
                      <Select
                        value={ingredient.unit || undefined}
                        onValueChange={(value) => onUpdateIngredientUnit(index, value)}
                      >
                        <SelectTrigger className="h-9 w-28 text-sm bg-white dark:bg-slate-800">
                          <SelectValue placeholder="Unit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="batch">batch</SelectItem>
                          <SelectItem value="portion">portion</SelectItem>
                          <SelectItem value="g">g</SelectItem>
                          <SelectItem value="kg">kg</SelectItem>
                          <SelectItem value="ml">ml</SelectItem>
                          <SelectItem value="l">l</SelectItem>
                          <SelectItem value="cup">cup</SelectItem>
                          <SelectItem value="tsp">tsp</SelectItem>
                          <SelectItem value="tbsp">tbsp</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {isExpanded && ingredient.basePrepIngredients && ingredient.basePrepIngredients.length > 0 && (
                      <div className="mt-2 ml-7 space-y-2 border-l-2 border-blue-200 pl-4 dark:border-blue-800">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Contains:
                        </p>
                        {ingredient.basePrepIngredients.map((subIng, subIdx) => (
                          <div key={subIdx} className="text-sm text-foreground">
                            {subIng.quantity} {subIng.unit} {subIng.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Middle column: compact allergen icons */}
                  <div className="ml-7 md:ml-0 flex flex-wrap items-start gap-1.5 md:justify-start">
                    {(() => {
                      const bpAllergens = ingredient.allergens ?? [];
                      const bpVisible = bpAllergens.filter((a) => {
                        const def = allergenFilterMap.get(a.code || "");
                        const defId = def?.id?.toLowerCase();
                        if (defId && HIDDEN_DIET_BADGES.has(defId)) return false;
                        const code = a.code?.toLowerCase();
                        const name = a.name?.toLowerCase();
                        return (code ? !HIDDEN_DIET_BADGES.has(code) : true) && (name ? !HIDDEN_DIET_BADGES.has(name) : true);
                      });
                      return bpVisible
                        .sort((a, b) => {
                          const ad = allergenFilterMap.get(a.code || "");
                          const bd = allergenFilterMap.get(b.code || "");
                          const al = (ad?.name ?? a.name ?? a.code ?? "").toLowerCase();
                          const bl = (bd?.name ?? b.name ?? b.code ?? "").toLowerCase();
                          return al.localeCompare(bl);
                        })
                        .map((a, i) => {
                          const def = allergenFilterMap.get(a.code || "");
                          const Icon = def?.Icon;
                          if (!Icon) return null;
                          return (
                            <span key={`${a.code ?? "unknown"}-${i}`} className="inline-flex rounded-md border border-blue-200 bg-blue-100/70 p-1.5 dark:border-blue-800 dark:bg-blue-900/40">
                              <Icon className="h-4 w-4 text-blue-700 dark:text-blue-200" />
                            </span>
                          );
                        });
                    })()}
                  </div>

                  {/* Right column: delete button */}
                  <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end md:flex-col md:items-end md:gap-3">
                    <Button
                      onClick={() => onDeleteIngredient(index)}
                      variant="outline"
                      size="icon"
                      className="border-2 hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          }

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
                {...(!ingredient.confirmed && index === 0 ? { "data-tour": "unconfirmed-ingredient" } : {})}
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
                                        allergen.certainty || "possible"
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
                                          className="inline-flex items-start gap-1.5 rounded-full border border-secondary/40 bg-secondary/15 px-2.5 py-1 text-xs max-w-full"
                                        >
                                          {Icon && <Icon className="h-3.5 w-3.5 text-secondary flex-shrink-0 self-center" />}
                                          <span className="text-xs font-semibold text-secondary break-words min-w-0 flex-1">
                                            {allergenDisplayName}
                                          </span>
                                          <span className={`text-[10px] uppercase tracking-wide ${statusClassName} flex-shrink-0 self-center`}>
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
                      <PopoverContent 
                        className="w-72" 
                        align="end"
                        onOpenAutoFocus={(e) => {
                          // Prevent default focus and allow mouse wheel scrolling
                          e.preventDefault();
                        }}
                      >
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">Select allergens</p>
                            <div 
                              ref={(el) => {
                                allergenScrollRefs.set(index, el);
                              }}
                              className="mt-2 max-h-56 space-y-2 overflow-y-auto pr-1"
                              onWheel={(e) => {
                                // Ensure the scrollable div receives wheel events
                                e.stopPropagation();
                              }}
                            >
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
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <Label className="text-lg font-semibold text-foreground">Add New Ingredient</Label>
          {onAddBasePrep && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBasePrepDialog(true)}
              className="text-blue-600 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-700 dark:hover:bg-blue-950/30"
              data-tour="add-base-prep-button"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Base Prep
            </Button>
          )}
        </div>
        <div className="rounded-lg border-2 border-border/70 border-dashed bg-muted/40 p-4">
          <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)_auto] md:items-start">
            <div className="space-y-4">
              <Input
                id="new-ingredient-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ingredient name"
                className="h-11 text-lg font-medium"
                aria-label="Ingredient name"
              />
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Input
                  id="new-ingredient-quantity"
                  type="number"
                  value={newQuantity}
                  onChange={(e) => handleNewQuantityChange(e.target.value)}
                  onFocus={handleNewQuantityFocus}
                  onBlur={handleNewQuantityBlur}
                  className="h-11 w-full text-lg font-medium sm:w-28"
                  aria-label="Quantity"
                />
                <Select value={newUnit} onValueChange={setNewUnit}>
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
                      newVisibleAllergens.length > 0
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
                          {newVisibleAllergens.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {[...newVisibleAllergens]
                                .sort((a, b) => {
                                  const aDefinition = allergenFilterMap.get(a.code || "");
                                  const bDefinition = allergenFilterMap.get(b.code || "");
                                  const aLabel = (
                                    aDefinition?.name ?? a.name ?? a.code ?? ""
                                  ).toLowerCase();
                                  const bLabel = (
                                    bDefinition?.name ?? b.name ?? b.code ?? ""
                                  ).toLowerCase();
                                  return aLabel.localeCompare(bLabel);
                                })
                                .map((allergen, allergenIndex) => {
                                  const definition = allergenFilterMap.get(allergen.code || "");
                                  const Icon = definition?.Icon;
                                  const allergenDisplayName =
                                    allergen.name ?? definition?.name ?? allergen.code ?? "Allergen";

                                  return (
                                    <span
                                      key={`${allergen.code ?? "unknown"}-${allergen.name ?? allergenIndex}`}
                                      className="inline-flex items-start gap-1.5 rounded-full border border-secondary/40 bg-secondary/15 px-2.5 py-1 text-xs max-w-full"
                                    >
                                      {Icon && <Icon className="h-3.5 w-3.5 text-secondary flex-shrink-0 self-center" />}
                                      <span className="text-xs font-semibold text-secondary break-words min-w-0 flex-1">
                                        {allergenDisplayName}
                                      </span>
                                    </span>
                                  );
                                })}
                            </div>
                          ) : (
                            <p className="mt-3 text-sm text-muted-foreground">Click to select allergens</p>
                          )}
                        </div>
                      </div>
                      <ChevronsUpDown className="mt-1 h-5 w-5 flex-shrink-0 text-muted-foreground" />
                    </div>
                  </button>
                </PopoverTrigger>
                <PopoverContent 
                  className="w-72" 
                  align="end"
                  onOpenAutoFocus={(e) => {
                    // Prevent default focus and allow mouse wheel scrolling
                    e.preventDefault();
                  }}
                >
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Select allergens</p>
                      <div 
                        ref={(el) => {
                          // Store ref for "new ingredient" allergen popover (index -1 or no index)
                          allergenScrollRefs.set(-1, el);
                        }}
                        className="mt-2 max-h-56 space-y-2 overflow-y-auto pr-1"
                        onWheel={(e) => {
                          // Ensure the scrollable div receives wheel events
                          e.stopPropagation();
                        }}
                      >
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
                                const childLabel = childDefinition?.name ?? child.label ?? child.id;
                                return isAllergenSelected(newSelectedAllergens, child.id, childLabel)
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
                                        const childLabel = childDefinition?.name ?? child.label ?? child.id;
                                        const childChecked = isAllergenSelected(
                                          newSelectedAllergens,
                                          child.id,
                                          childLabel,
                                        );
                                        const showAnimalBadge =
                                          isAnimalProductAllergen(child.id) && childChecked;
                                        const checkboxId = `new-ingredient-allergen-${toInputId(child.id)}`;
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
                                                onCheckedChange={() => toggleNewAllergen(child.id, childLabel)}
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

                          const isChecked = isAllergenSelected(newSelectedAllergens, category.id, label);
                          const checkboxId = `new-ingredient-allergen-${toInputId(category.id)}`;
                          const showAnimalBadge = isAnimalProductAllergen(category.id) && isChecked;

                          return (
                            <label
                              key={category.id}
                              htmlFor={checkboxId}
                              className="flex items-center justify-between gap-2 rounded-md px-2 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
                            >
                              <span className="flex items-center gap-2">
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={() => toggleNewAllergen(category.id, label)}
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
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end md:flex-col md:items-end md:gap-3">
              <Button
                onClick={handleAdd}
                className="h-11 w-full sm:w-12"
                size="icon"
                disabled={!newName.trim() || !newQuantity.trim()}
              >
                <Plus className="w-6 h-6" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Base Prep Selection Dialog */}
      <Dialog open={showBasePrepDialog} onOpenChange={setShowBasePrepDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Base Prep to Recipe</DialogTitle>
            <DialogDescription>
              Select a base prep and specify how much to use in this recipe.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="base-prep-select">Base Prep</Label>
              <Select
                value={selectedBasePrep?.toString() || ""}
                onValueChange={(value) => setSelectedBasePrep(Number(value))}
              >
                <SelectTrigger id="base-prep-select">
                  <SelectValue placeholder="Select a base prep..." />
                </SelectTrigger>
                <SelectContent>
                  {basePreps.map((prep) => (
                    <SelectItem key={prep.id} value={prep.id.toString()}>
                      {prep.name}
                      {prep.description && (
                        <span className="text-muted-foreground ml-2">
                          - {prep.description}
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3">
              <div className="flex-1 space-y-2">
                <Label htmlFor="base-prep-quantity">Quantity</Label>
                <Input
                  id="base-prep-quantity"
                  type="number"
                  value={basePrepQuantity}
                  onChange={(e) => setBasePrepQuantity(e.target.value)}
                  placeholder="1"
                />
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="base-prep-unit">Unit</Label>
                <Select value={basePrepUnit} onValueChange={setBasePrepUnit}>
                  <SelectTrigger id="base-prep-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="batch">batch</SelectItem>
                    <SelectItem value="portion">portion</SelectItem>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="ml">ml</SelectItem>
                    <SelectItem value="l">l</SelectItem>
                    <SelectItem value="cup">cup</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {onCreateNewBasePrep && (
              <div className="pt-2 border-t">
                <Button
                  variant="link"
                  onClick={onCreateNewBasePrep}
                  className="text-sm text-muted-foreground hover:text-primary p-0 h-auto"
                >
                  Don't see what you need? Create new base prep →
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowBasePrepDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddBasePrep} disabled={!selectedBasePrep}>
              Add Base Prep
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
