import { useEffect, useState, useRef } from "react";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DishNameInput } from "@/components/DishNameInput";
import { IngredientsList, IngredientState } from "@/components/IngredientsList";
import { PrepMethodInput } from "@/components/PrepMethodInput";
import { SavedDish } from "@/components/RecipeBook";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  createIngredient as createIngredientAPI,
  addRecipeIngredient as addRecipeIngredientAPI,
  updateRecipeIngredient as updateRecipeIngredientAPI,
  deleteRecipeIngredient as deleteRecipeIngredientAPI,
  UpdateRecipeIngredientRequest,
  linkRecipeToBasePrep,
  unlinkRecipeFromBasePrep,
  getBasePrep,
} from "@/lib/api";
import {
  loadSavedMenuSections,
  ARCHIVE_SECTION_LABEL,
} from "@/lib/menu-sections";

export interface RecipeUpdatePayload {
  name?: string;
  description?: string;
  price?: string;
  serving_size?: string;
  instructions?: string;
  image?: string;
  menu_section_ids?: number[];
  ingredients?: Array<{
    ingredient_id: number | null;
    ingredient_name: string;
    quantity?: number | null;
    unit?: string | null;
    confirmed?: boolean;
    allergens?: IngredientState["allergens"];
    substitution?: IngredientState["substitution"];
  }>;
  base_preps?: Array<{
    base_prep_id: number;
    quantity?: number | null;
    unit?: string | null;
  }>;
}

interface RecipeEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dish: SavedDish | null;
  formatPrice: (value: string | number | null | undefined) => string;
  restaurantId?: number | null;
  onSave: (dishId: string, updates: RecipeUpdatePayload) => Promise<void>;
  isCreateMode?: boolean;
  onCreate?: (data: RecipeUpdatePayload) => Promise<void>;
}

export const RecipeEditSheet = ({
  open,
  onOpenChange,
  dish,
  formatPrice,
  restaurantId,
  onSave,
  isCreateMode = false,
  onCreate,
}: RecipeEditSheetProps) => {
  const isMobile = useIsMobile();
  const prepInputRef = useRef<HTMLTextAreaElement | null>(null);

  // Local state for editing
  const [dishName, setDishName] = useState("");
  const [menuSectionId, setMenuSectionId] = useState("");
  const [description, setDescription] = useState("");
  const [servingSize, setServingSize] = useState("1");
  const [price, setPrice] = useState("");
  const [ingredients, setIngredients] = useState<IngredientState[]>([]);
  const [prepMethod, setPrepMethod] = useState("");
  const [dishImage, setDishImage] = useState("");
  const [showPrepMethod, setShowPrepMethod] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form when dish changes or when opening in create mode
  useEffect(() => {
    if (!open) return;

    if (dish) {
      // Edit mode: populate form with dish data
      setDishName(dish.name);
      setMenuSectionId(dish.menuSectionId);
      setDescription(dish.description || "");
      setServingSize(dish.servingSize || "1");
      setPrice(dish.price || "");
      setIngredients(
        dish.ingredients.map((ing) => ({
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          confirmed: ing.confirmed ?? false,
          ingredientId: ing.ingredientId ?? null,
          originalName: ing.originalName,
          allergens: ing.allergens,
          dietaryInfo: [],
          substitution: ing.substitution,
          // Preserve base prep fields
          isBasePrep: ing.isBasePrep,
          basePrepId: ing.basePrepId,
          basePrepIngredients: ing.basePrepIngredients?.map(subIng => ({
            ...subIng,
            confirmed: subIng.confirmed ?? true,
            dietaryInfo: [],
          })),
        }))
      );
      setPrepMethod(dish.prepMethod || "");
      setDishImage(dish.image || "");
      setShowPrepMethod(Boolean(dish.prepMethod));
      setIsDirty(false);
    } else {
      // Create mode: reset form to blank values
      setDishName("");
      setMenuSectionId("");
      setDescription("");
      setServingSize("1");
      setPrice("");
      setIngredients([]);
      setPrepMethod("");
      setDishImage("");
      setShowPrepMethod(false);
      setIsDirty(false);
    }
  }, [dish, open]);

  // Mark as dirty when any field changes
  useEffect(() => {
    if (!dish || !open) return;

    const hasChanges =
      dishName !== dish.name ||
      menuSectionId !== dish.menuSectionId ||
      description !== (dish.description || "") ||
      servingSize !== (dish.servingSize || "1") ||
      price !== (dish.price || "") ||
      prepMethod !== (dish.prepMethod || "") ||
      dishImage !== (dish.image || "") ||
      JSON.stringify(ingredients) !== JSON.stringify(dish.ingredients.map(ing => ({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        confirmed: ing.confirmed ?? false,
        ingredientId: ing.ingredientId ?? null,
        originalName: ing.originalName,
        allergens: ing.allergens,
        dietaryInfo: [],
        substitution: ing.substitution,
        // Include base prep fields in comparison
        isBasePrep: ing.isBasePrep,
        basePrepId: ing.basePrepId,
        basePrepIngredients: ing.basePrepIngredients?.map(subIng => ({
          ...subIng,
          confirmed: subIng.confirmed ?? true,
          dietaryInfo: [],
        })),
      })));

    setIsDirty(hasChanges);
  }, [dishName, menuSectionId, description, servingSize, price, prepMethod, dishImage, ingredients, dish, open]);

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
    if (!dishName.trim()) {
      toast.error("Please enter a dish name");
      return;
    }

    if (!menuSectionId) {
      toast.error("Please select a menu section");
      return;
    }

    setIsSaving(true);

    try {
      // Resolve real section ID from cache to avoid sending temporary negative IDs
      const resolvedSectionId = (() => {
        if (!restaurantId || !menuSectionId) return null;
        
        const numeric = Number(menuSectionId);
        // If it's a positive number, use it directly
        if (!Number.isNaN(numeric) && numeric > 0) {
          return numeric;
        }
        
        // Otherwise, resolve from cached sections
        const cached = loadSavedMenuSections(restaurantId);
        const key = menuSectionId.trim().toLowerCase();
        
        // Try exact label match first
        const byLabel = cached.sections.find(s => s.label.trim().toLowerCase() === key);
        if (byLabel) return byLabel.id;
        
        // Try special section labels
        if (key === ARCHIVE_SECTION_LABEL.toLowerCase()) {
          const arch = cached.sections.find(
            s => s.isArchive || s.label.trim().toLowerCase() === ARCHIVE_SECTION_LABEL.toLowerCase()
          );
          return arch ? arch.id : null;
        }
        
        return null;
      })();
      
      const updates: RecipeUpdatePayload = {
        name: dishName.trim(),
        description: description.trim() || undefined,
        price: price.trim() || undefined,
        serving_size: servingSize,
        instructions: prepMethod.trim() || undefined,
        image: dishImage.trim() || undefined,
        menu_section_ids: resolvedSectionId !== null ? [resolvedSectionId] : [],
        // Separate regular ingredients from base preps
        ingredients: ingredients
          .filter(ing => !ing.isBasePrep)
          .map(ing => ({
            ingredient_id: ing.ingredientId,
            ingredient_name: ing.name,
            quantity: parseFloat(ing.quantity) || null,
            unit: ing.unit || null,
            confirmed: ing.confirmed,
            allergens: ing.allergens,
            substitution: ing.substitution,
          })),
        // Base preps are managed separately via linkRecipeToBasePrep API
        base_preps: ingredients
          .filter(ing => ing.isBasePrep && ing.basePrepId)
          .map(ing => ({
            base_prep_id: ing.basePrepId!,
            quantity: parseFloat(ing.quantity) || null,
            unit: ing.unit || null,
          })),
      };

      if (isCreateMode && onCreate) {
        await onCreate(updates);
      } else if (dish) {
        // Note: Individual ingredient updates are already handled through the 
        // onUpdateIngredientAllergens and onUpdateIngredientSubstitution handlers.
        // This save call handles recipe-level updates.
        await onSave(dish.id, updates);
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

    // Immediately create and link the ingredient
    if (dish) {
      try {
        // Create a unique code for this user-added ingredient
        const ingredientCode = `user:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Create the ingredient in the database
        const createdIngredient = await createIngredientAPI({
          code: ingredientCode,
          name,
          source: "user",
        });

        // Link it to the recipe
        const recipeId = parseInt(dish.id);
        await addRecipeIngredientAPI(recipeId, {
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
        console.error("Failed to add ingredient to recipe", error);
        toast.error("Failed to add ingredient. Please try again.");
        return;
      }
    } else {
      // Fallback: just add to local state
      setIngredients((current) => [...current, newIngredient]);
    }
  };

  const handleAddBasePrep = async (basePrepId: number, quantity: string, unit: string) => {
    try {
      // Fetch the base prep details to get its ingredients
      const basePrep = await getBasePrep(basePrepId);

      // Aggregate allergens from all base prep ingredients
      const allAllergens = basePrep.ingredients.flatMap((ing) => ing.allergens || []);
      // Deduplicate by code
      const uniqueAllergens = Array.from(
        new Map(allAllergens.map(a => [a.code, a])).values()
      );

      // Create a special ingredient entry for the base prep
      const basePrepIngredient: IngredientState = {
        name: basePrep.name,
        quantity,
        unit,
        confirmed: true,
        ingredientId: null,
        basePrepId: basePrepId,
        isBasePrep: true,
        allergens: uniqueAllergens,
        dietaryInfo: [],
        // Convert base prep ingredients to IngredientState format
        basePrepIngredients: basePrep.ingredients.map((ing) => ({
          name: ing.ingredient_name,
          quantity: ing.quantity?.toString() || "",
          unit: ing.unit || "",
          confirmed: true,
          allergens: ing.allergens,
          ingredientId: ing.ingredient_id,
        })),
      };

      // If editing an existing dish, link the base prep
      if (dish) {
        const recipeId = parseInt(dish.id);
        await linkRecipeToBasePrep(recipeId, basePrepId, {
          quantity: parseFloat(quantity) || undefined,
          unit,
        });
        toast.success("Base prep added to recipe");
      }

      // Add to local state
      setIngredients((current) => [...current, basePrepIngredient]);
    } catch (error) {
      console.error("Failed to add base prep", error);
      toast.error("Failed to add base prep. Please try again.");
    }
  };

  const handleUpdateIngredientName = (index: number, name: string) => {
    setIngredients((current) =>
      current.map((ingredient, i) => (i === index ? { ...ingredient, name } : ingredient))
    );
  };

  const handleUpdateIngredient = async (index: number, quantity: string) => {
    const ingredient = ingredients[index];
    
    // Update local state immediately
    setIngredients((current) =>
      current.map((ingredient, i) => (i === index ? { ...ingredient, quantity } : ingredient))
    );

    // If it's a base prep and we have a dish, persist to API
    if (ingredient?.isBasePrep && ingredient.basePrepId && dish) {
      try {
        const recipeId = parseInt(dish.id);
        await linkRecipeToBasePrep(recipeId, ingredient.basePrepId, {
          quantity: parseFloat(quantity) || undefined,
          unit: ingredient.unit,
        });
      } catch (error) {
        console.error("Failed to update base prep quantity", error);
        toast.error("Failed to update quantity. Please try again.");
      }
    }
  };

  const handleUpdateIngredientUnit = async (index: number, unit: string) => {
    const ingredient = ingredients[index];
    
    // Update local state immediately
    setIngredients((current) =>
      current.map((ingredient, i) => (i === index ? { ...ingredient, unit } : ingredient))
    );

    // If it's a base prep and we have a dish, persist to API
    if (ingredient?.isBasePrep && ingredient.basePrepId && dish) {
      try {
        const recipeId = parseInt(dish.id);
        await linkRecipeToBasePrep(recipeId, ingredient.basePrepId, {
          quantity: parseFloat(ingredient.quantity) || undefined,
          unit,
        });
      } catch (error) {
        console.error("Failed to update base prep unit", error);
        toast.error("Failed to update unit. Please try again.");
      }
    }
  };

  const handleConfirmIngredient = async (index: number) => {
    const ingredient = ingredients[index];
    if (!ingredient) return;

    // Validate ingredient has required fields
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
    
    if (dish) {
      try {
        const recipeId = parseInt(dish.id);
        
        // If it's a base prep, unlink it
        if (ingredient?.isBasePrep && ingredient.basePrepId) {
          await unlinkRecipeFromBasePrep(recipeId, ingredient.basePrepId);
        } 
        // If it's a regular ingredient with an ID, delete it
        else if (ingredient?.ingredientId) {
          await deleteRecipeIngredientAPI(recipeId, ingredient.ingredientId);
        }
      } catch (error) {
        console.error("Failed to delete ingredient from recipe", error);
        toast.error("Failed to delete ingredient. Please try again.");
        return;
      }
    }
    
    setIngredients((current) => current.filter((_, i) => i !== index));
  };

  const handleUpdateIngredientAllergens = async (
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
    if (dish && ingredient.ingredientId) {
      try {
        const recipeId = parseInt(dish.id);
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
        await updateRecipeIngredientAPI(recipeId, ingredient.ingredientId, payload);
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
    if (dish && ingredient.ingredientId) {
      try {
        const recipeId = parseInt(dish.id);
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
        await updateRecipeIngredientAPI(recipeId, ingredient.ingredientId, payload);
      } catch (error) {
        console.error("Failed to update ingredient substitution", error);
        toast.error("Failed to update substitution. Please try again.");
      }
    }
  };

  const handleIngredientNameBlur = (index: number) => {
    // No special handling needed for now
  };

  const handleAddPhoto = () => {
    toast.info("Photo uploads coming soon");
  };

  const handleAddPreparation = () => {
    if (showPrepMethod) {
      setShowPrepMethod(false);
      return;
    }

    setShowPrepMethod(true);
    setTimeout(() => {
      prepInputRef.current?.focus();
    }, 100);
  };

  if (!dish && !isCreateMode) return null;

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
            <SheetTitle>{isCreateMode ? "Create Recipe" : "Edit Recipe"}</SheetTitle>
            <SheetDescription>
              {isCreateMode
                ? "Add a new recipe to your menu. Fill in the details below."
                : "Make changes to your recipe. Click save when you're done."}
            </SheetDescription>
          </SheetHeader>

          {dish?.image && (
            <div className="mt-4 w-full h-32 rounded-lg overflow-hidden">
              <img
                src={dish.image}
                alt={dish.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="space-y-6 py-6">
            <DishNameInput
              value={dishName}
              onChange={setDishName}
              onRecipeMatch={() => {}} // No-op in edit mode
              menuSectionId={menuSectionId}
              onMenuSectionChange={setMenuSectionId}
              description={description}
              onDescriptionChange={setDescription}
              servingSize={servingSize}
              onServingSizeChange={setServingSize}
              price={price}
              onPriceChange={setPrice}
              formatPrice={formatPrice}
              existingDishes={[]}
              selectedDishId={dish?.id ?? null}
              onClearSelectedDish={() => {}}
              restaurantId={restaurantId}
            />

            <IngredientsList
              ingredients={ingredients}
              onUpdateIngredientName={handleUpdateIngredientName}
              onUpdateIngredient={handleUpdateIngredient}
              onUpdateIngredientUnit={handleUpdateIngredientUnit}
              onConfirmIngredient={handleConfirmIngredient}
              onDeleteIngredient={handleDeleteIngredient}
              onAddIngredient={handleAddIngredient}
              onAddBasePrep={handleAddBasePrep}
              onUpdateIngredientAllergen={handleUpdateIngredientAllergens}
              onUpdateIngredientSubstitution={handleUpdateIngredientSubstitution}
              onIngredientNameBlur={handleIngredientNameBlur}
              formatPrice={formatPrice}
              restaurantId={restaurantId}
            />

            {showPrepMethod && (
              <PrepMethodInput
                ref={prepInputRef}
                value={prepMethod}
                onChange={setPrepMethod}
              />
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap pt-4 border-t">
              <Button
                onClick={handleAddPhoto}
                variant="outline"
                className="w-full sm:w-auto"
              >
                Add Photo
              </Button>
              <Button
                onClick={handleAddPreparation}
                variant="outline"
                className="w-full sm:w-auto"
              >
                {showPrepMethod ? "Hide Preparation" : "Add Preparation"}
              </Button>
            </div>
          </div>

          <SheetFooter className="gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
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

