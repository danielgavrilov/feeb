import { useEffect, useState, useRef } from "react";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { IngredientsList, IngredientState } from "@/components/IngredientsList";
import { BasePrep, BasePrepCreate, BasePrepUpdate } from "@/lib/api";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  createIngredient as createIngredientAPI,
  addBasePrepIngredient,
  updateBasePrepIngredient,
  deleteBasePrepIngredient,
  UpdateRecipeIngredientRequest,
} from "@/lib/api";

export interface BasePrepFormData extends BasePrepCreate {
  ingredients?: Array<{
    ingredient_id: number | null;
    ingredient_name: string;
    quantity?: number | null;
    unit?: string | null;
    confirmed?: boolean;
    allergens?: IngredientState["allergens"];
  }>;
}

interface BasePrepEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  basePrep: BasePrep | null;
  restaurantId?: number | null;
  onSave: (basePrepId: number, updates: BasePrepUpdate) => Promise<void>;
  isCreateMode?: boolean;
  onCreate?: (data: BasePrepFormData) => Promise<void>;
  formatPrice: (value: string | number | null | undefined) => string;
}

export const BasePrepEditSheet = ({
  open,
  onOpenChange,
  basePrep,
  restaurantId,
  onSave,
  isCreateMode = false,
  onCreate,
  formatPrice,
}: BasePrepEditSheetProps) => {
  const isMobile = useIsMobile();
  const instructionsInputRef = useRef<HTMLTextAreaElement | null>(null);

  // Local state for editing
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [yieldQuantity, setYieldQuantity] = useState("");
  const [yieldUnit, setYieldUnit] = useState("");
  const [ingredients, setIngredients] = useState<IngredientState[]>([]);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form when basePrep changes
  useEffect(() => {
    if (basePrep && open && !isCreateMode) {
      setName(basePrep.name);
      setDescription(basePrep.description || "");
      setInstructions(basePrep.instructions || "");
      setYieldQuantity(basePrep.yield_quantity?.toString() || "");
      setYieldUnit(basePrep.yield_unit || "");
      setIngredients(
        basePrep.ingredients.map((ing) => ({
          name: ing.ingredient_name,
          quantity: ing.quantity?.toString() || "",
          unit: ing.unit || "",
          confirmed: ing.confirmed ?? false,
          ingredientId: ing.ingredient_id ?? null,
          allergens: ing.allergens,
          dietaryInfo: [],
          substitution: ing.substitution,
        }))
      );
      setShowInstructions(Boolean(basePrep.instructions));
      setIsDirty(false);
    } else if (isCreateMode && open) {
      // Reset form for create mode
      setName("");
      setDescription("");
      setInstructions("");
      setYieldQuantity("");
      setYieldUnit("");
      setIngredients([]);
      setShowInstructions(false);
      setIsDirty(false);
    }
  }, [basePrep, open, isCreateMode]);

  // Mark as dirty when any field changes
  useEffect(() => {
    if (!open) return;

    if (isCreateMode) {
      // In create mode, mark dirty if any field has content
      const hasContent =
        name.trim() !== "" ||
        description.trim() !== "" ||
        instructions.trim() !== "" ||
        yieldQuantity.trim() !== "" ||
        yieldUnit.trim() !== "" ||
        ingredients.length > 0;
      setIsDirty(hasContent);
    } else if (basePrep) {
      // In edit mode, compare with original values
      const hasChanges =
        name !== basePrep.name ||
        description !== (basePrep.description || "") ||
        instructions !== (basePrep.instructions || "") ||
        yieldQuantity !== (basePrep.yield_quantity?.toString() || "") ||
        yieldUnit !== (basePrep.yield_unit || "") ||
        JSON.stringify(ingredients) !== JSON.stringify(basePrep.ingredients.map(ing => ({
          name: ing.ingredient_name,
          quantity: ing.quantity?.toString() || "",
          unit: ing.unit || "",
          confirmed: ing.confirmed ?? false,
          ingredientId: ing.ingredient_id ?? null,
          allergens: ing.allergens,
          dietaryInfo: [],
          substitution: ing.substitution,
        })));
      setIsDirty(hasChanges);
    }
  }, [name, description, instructions, yieldQuantity, yieldUnit, ingredients, basePrep, open, isCreateMode]);

  const handleClose = () => {
    if (isDirty) {
      setShowUnsavedWarning(true);
    } else {
      onOpenChange(false);
    }
  };

  const handleDiscardChanges = () => {
    setShowUnsavedWarning(false);
    setIsDirty(false);
    onOpenChange(false);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Please enter a name for the base prep");
      return;
    }

    if (!restaurantId) {
      toast.error("No restaurant selected");
      return;
    }

    setIsSaving(true);

    try {
      if (isCreateMode && onCreate) {
        // Create mode
        const createData: BasePrepFormData = {
          restaurant_id: restaurantId,
          name: name.trim(),
          description: description.trim() || undefined,
          instructions: instructions.trim() || undefined,
          yield_quantity: yieldQuantity ? parseFloat(yieldQuantity) : undefined,
          yield_unit: yieldUnit.trim() || undefined,
          ingredients: ingredients.map(ing => ({
            ingredient_id: ing.ingredientId,
            ingredient_name: ing.name,
            quantity: ing.quantity ? parseFloat(ing.quantity) : null,
            unit: ing.unit || null,
            confirmed: ing.confirmed,
            allergens: ing.allergens,
          })),
        };
        await onCreate(createData);
      } else if (basePrep) {
        // Edit mode
        const updates: BasePrepUpdate = {
          name: name.trim(),
          description: description.trim() || undefined,
          instructions: instructions.trim() || undefined,
        };
        await onSave(basePrep.id, updates);
      }

      setIsDirty(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Save failed in sheet", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddIngredient = async (
    name: string,
    quantity: string,
    unit: string,
    allergens: IngredientState["allergens"]
  ) => {
    const normalizedAllergens = (allergens ?? []).map((allergen) => ({
      ...allergen,
      certainty: allergen.certainty ?? "confirmed",
    }));

    const newIngredient: IngredientState = {
      name,
      quantity,
      unit,
      confirmed: true,
      ingredientId: null,
      originalName: name,
      allergens: normalizedAllergens,
      dietaryInfo: [],
      substitution: undefined,
    };

    // Immediately create and link the ingredient if editing existing base prep
    if (basePrep) {
      try {
        // Create a unique code for this user-added ingredient
        const ingredientCode = `user:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Create the ingredient in the database
        const createdIngredient = await createIngredientAPI({
          code: ingredientCode,
          name,
          source: "user",
        });

        // Link it to the base prep
        await addBasePrepIngredient(basePrep.id, {
          ingredient_id: createdIngredient.id,
          ingredient_name: name,
          quantity: parseFloat(quantity) || undefined,
          unit,
          confirmed: true,
          allergens: normalizedAllergens.map((a) => ({
            code: a.code,
            name: a.name,
            certainty: a.certainty,
            canonical_code: a.canonical_code ?? null,
            canonical_name: a.canonical_name ?? null,
            family_code: a.family_code ?? null,
            family_name: a.family_name ?? null,
            marker_type: a.marker_type ?? null,
          })),
        });

        // Add to local state with the ingredient ID
        newIngredient.ingredientId = createdIngredient.id;
        setIngredients((current) => [...current, newIngredient]);

        toast.success("Ingredient added successfully");
      } catch (error) {
        console.error("Failed to add ingredient to base prep", error);
        toast.error("Failed to add ingredient. Please try again.");
        return;
      }
    } else {
      // In create mode, just add to local state
      setIngredients((current) => [...current, newIngredient]);
    }
  };

  const handleUpdateIngredientName = (index: number, name: string) => {
    setIngredients((current) =>
      current.map((ingredient, i) => (i === index ? { ...ingredient, name } : ingredient))
    );
  };

  const handleUpdateIngredient = (index: number, quantity: string) => {
    setIngredients((current) =>
      current.map((ingredient, i) => (i === index ? { ...ingredient, quantity } : ingredient))
    );
  };

  const handleUpdateIngredientUnit = (index: number, unit: string) => {
    setIngredients((current) =>
      current.map((ingredient, i) => (i === index ? { ...ingredient, unit } : ingredient))
    );
  };

  const handleConfirmIngredient = async (index: number) => {
    const ingredient = ingredients[index];
    if (!ingredient) return;

    if (!ingredient.name.trim()) {
      toast.error("Ingredient name cannot be empty");
      return;
    }

    if (!ingredient.quantity || !ingredient.quantity.trim()) {
      toast.error("Please enter a quantity");
      return;
    }

    if (!ingredient.unit || !ingredient.unit.trim()) {
      toast.error("Please select a unit");
      return;
    }

    setIngredients((current) =>
      current.map((ing, i) => (i === index ? { ...ing, confirmed: true } : ing))
    );
    toast.success("Ingredient confirmed");
  };

  const handleDeleteIngredient = async (index: number) => {
    const ingredient = ingredients[index];

    // If the ingredient has an ID, delete it from the database
    if (basePrep && ingredient?.ingredientId) {
      try {
        await deleteBasePrepIngredient(basePrep.id, ingredient.ingredientId);
      } catch (error) {
        console.error("Failed to delete ingredient from base prep", error);
        toast.error("Failed to delete ingredient. Please try again.");
        return;
      }
    }

    setIngredients((current) => current.filter((_, i) => i !== index));
  };

  const handleUpdateIngredientAllergen = async (
    index: number,
    allergens: IngredientState["allergens"]
  ) => {
    const ingredient = ingredients[index];
    if (!ingredient) return;

    // Update in local state first
    setIngredients((current) =>
      current.map((ing, i) => (i === index ? { ...ing, allergens } : ing))
    );

    // If the ingredient has an ID, persist to database
    if (basePrep && ingredient.ingredientId) {
      try {
        const payload: UpdateRecipeIngredientRequest = {
          ingredient_id: ingredient.ingredientId,
          ingredient_name: ingredient.name,
          quantity: parseFloat(ingredient.quantity) || undefined,
          unit: ingredient.unit,
          confirmed: ingredient.confirmed,
          allergens: allergens.map((a) => ({
            code: a.code,
            name: a.name,
            certainty: a.certainty,
            canonical_code: a.canonical_code ?? null,
            canonical_name: a.canonical_name ?? null,
            family_code: a.family_code ?? null,
            family_name: a.family_name ?? null,
            marker_type: a.marker_type ?? null,
          })),
        };
        await updateBasePrepIngredient(basePrep.id, ingredient.ingredientId, payload);
      } catch (error) {
        console.error("Failed to update ingredient allergens", error);
        toast.error("Failed to update allergens. Please try again.");
      }
    }
  };

  const handleUpdateIngredientSubstitution = async (
    index: number,
    substitution?: IngredientState["substitution"]
  ) => {
    const ingredient = ingredients[index];
    if (!ingredient) return;

    // Update in local state first
    setIngredients((current) =>
      current.map((ing, i) =>
        i === index ? { ...ing, substitution } : ing
      )
    );

    // If the ingredient has an ID, persist to database
    if (basePrep && ingredient.ingredientId) {
      try {
        const payload: UpdateRecipeIngredientRequest = {
          ingredient_id: ingredient.ingredientId,
          ingredient_name: ingredient.name,
          quantity: parseFloat(ingredient.quantity) || undefined,
          unit: ingredient.unit,
          confirmed: ingredient.confirmed,
          allergens: ingredient.allergens?.map((a) => ({
            code: a.code,
            name: a.name,
            certainty: a.certainty,
            canonical_code: a.canonical_code ?? null,
            canonical_name: a.canonical_name ?? null,
            family_code: a.family_code ?? null,
            family_name: a.family_name ?? null,
            marker_type: a.marker_type ?? null,
          })),
          substitution: substitution ? {
            alternative: substitution.alternative,
            surcharge: substitution.surcharge ?? null,
          } : null,
        };
        await updateBasePrepIngredient(basePrep.id, ingredient.ingredientId, payload);
      } catch (error) {
        console.error("Failed to update ingredient substitution", error);
        toast.error("Failed to update substitution. Please try again.");
      }
    }
  };

  const handleIngredientNameBlur = (index: number) => {
    // No special handling needed for now
  };

  const handleToggleInstructions = () => {
    if (showInstructions) {
      setShowInstructions(false);
      return;
    }

    setShowInstructions(true);
    setTimeout(() => {
      instructionsInputRef.current?.focus();
    }, 100);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={cn(
            "w-full overflow-y-auto",
            isMobile
              ? "h-[90vh] rounded-t-[1.75rem]"
              : "sm:w-[750px] sm:max-w-[75vw]"
          )}
          onInteractOutside={(e) => {
            // Prevent closing when clicking outside if there are unsaved changes
            if (isDirty) {
              e.preventDefault();
              setShowUnsavedWarning(true);
            }
          }}
        >
          <SheetHeader>
            <SheetTitle>{isCreateMode ? "Create Base Prep" : "Edit Base Prep"}</SheetTitle>
            <SheetDescription>
              {isCreateMode
                ? "Create a reusable preparation or ingredient. Fill in the details below."
                : "Make changes to your base prep. Click save when you're done."}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 py-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="base-prep-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="base-prep-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. House-made Pasta Dough, Red Wine Reduction"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="base-prep-description">Description</Label>
              <Textarea
                id="base-prep-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this preparation"
                rows={2}
              />
            </div>

            {/* Yield */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="yield-quantity">Yield Quantity</Label>
                <Input
                  id="yield-quantity"
                  type="number"
                  step="0.01"
                  value={yieldQuantity}
                  onChange={(e) => setYieldQuantity(e.target.value)}
                  placeholder="e.g. 500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="yield-unit">Yield Unit</Label>
                <Select value={yieldUnit || undefined} onValueChange={setYieldUnit}>
                  <SelectTrigger id="yield-unit">
                    <SelectValue placeholder="Select unit" />
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
                    <SelectItem value="portions">portions</SelectItem>
                    <SelectItem value="batch">batch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Ingredients */}
            <IngredientsList
              ingredients={ingredients}
              onUpdateIngredientName={handleUpdateIngredientName}
              onUpdateIngredient={handleUpdateIngredient}
              onUpdateIngredientUnit={handleUpdateIngredientUnit}
              onConfirmIngredient={handleConfirmIngredient}
              onDeleteIngredient={handleDeleteIngredient}
              onAddIngredient={handleAddIngredient}
              onUpdateIngredientAllergen={handleUpdateIngredientAllergen}
              onUpdateIngredientSubstitution={handleUpdateIngredientSubstitution}
              onIngredientNameBlur={handleIngredientNameBlur}
              formatPrice={formatPrice}
              restaurantId={restaurantId}
            />

            {/* Instructions */}
            {showInstructions && (
              <div className="space-y-2">
                <Label htmlFor="base-prep-instructions">Instructions</Label>
                <Textarea
                  ref={instructionsInputRef}
                  id="base-prep-instructions"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Detailed preparation instructions..."
                  rows={6}
                />
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap pt-4 border-t">
              <Button
                onClick={handleToggleInstructions}
                variant="outline"
                className="w-full sm:w-auto"
              >
                {showInstructions ? "Hide Instructions" : "Add Instructions"}
              </Button>
            </div>
          </div>

          <SheetFooter className="gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : isCreateMode ? "Create" : "Save Changes"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showUnsavedWarning} onOpenChange={setShowUnsavedWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to close without saving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowUnsavedWarning(false)}>
              Keep Editing
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscardChanges}>
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

