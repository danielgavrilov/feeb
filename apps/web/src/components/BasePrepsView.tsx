import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Edit, Trash2, Plus, Copy } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BasePrep, BasePrepUpdate } from "@/lib/api";
import { createIngredient as createIngredientAPI, addBasePrepIngredient, createBasePrep as createBasePrepAPI } from "@/lib/api";
import { BasePrepEditSheet, BasePrepFormData } from "@/components/BasePrepEditSheet";
import { getDishAllergenDefinitions } from "@/components/RecipeBook";
import type { SavedDish } from "@/components/RecipeBook";

interface BasePrepsViewProps {
  basePreps: BasePrep[];
  onEdit: (basePrepId: number, updates: BasePrepUpdate) => Promise<void>;
  onDelete: (basePrepId: number) => Promise<void>;
  onCreate: (data: BasePrepFormData) => Promise<void>;
  loading?: boolean;
  restaurantId?: number | null;
  formatPrice: (value: string | number | null | undefined) => string;
  onChanged?: () => void | Promise<void>;
  usageCountByBasePrepId?: Record<number, number>;
  shouldOpenCreate?: boolean;
  onCreateComplete?: () => void;
}

export const BasePrepsView = ({
  basePreps,
  onEdit,
  onDelete,
  onCreate,
  loading = false,
  restaurantId,
  formatPrice,
  onChanged,
  usageCountByBasePrepId,
  shouldOpenCreate = false,
  onCreateComplete,
}: BasePrepsViewProps) => {
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingBasePrepId, setEditingBasePrepId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showIngredients, setShowIngredients] = useState(false);
  const [copySource, setCopySource] = useState<BasePrep | null>(null);
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  // Open create sheet when triggered externally
  useEffect(() => {
    if (shouldOpenCreate) {
      setIsCreating(true);
    }
  }, [shouldOpenCreate]);

  const handleDelete = async (id: number) => {
    try {
      setDeletingId(id);
      await onDelete(id);
      toast.success("Base prep deleted successfully");
      if (onChanged) await onChanged();
    } catch (error) {
      console.error("Failed to delete base prep", error);
      toast.error("Failed to delete base prep");
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopy = (basePrep: BasePrep) => {
    // Store the source base prep and open create mode with pre-filled data
    setCopySource(basePrep);
  };

  const handleCreateFromCopy = async (data: BasePrepFormData) => {
    // Create the new base prep first, then add ingredients one by one
    const { ingredients = [], ...createData } = data;
    try {
      // Create the base prep directly so we have the new id
      const created = await createBasePrepAPI(createData);
      const newBasePrepId = created.id;

      for (const ing of ingredients) {
        let ingredientId = ing.ingredient_id ?? null;
        // If no ingredient_id, create a user ingredient first
        if (!ingredientId) {
          const ingredientCode = `user:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const createdIngredient = await createIngredientAPI({
            code: ingredientCode,
            name: ing.ingredient_name,
            source: "user",
          });
          ingredientId = createdIngredient.id;
        }

        await addBasePrepIngredient(newBasePrepId, {
          ingredient_id: ingredientId,
          ingredient_name: ing.ingredient_name,
          quantity: ing.quantity ?? undefined,
          unit: ing.unit ?? undefined,
          confirmed: ing.confirmed ?? false,
          allergens: (ing.allergens ?? []).map((a) => ({
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
      }

      setCopySource(null);
      toast.success("Base prep copied successfully");
      if (onChanged) await onChanged();
    } catch (error) {
      console.error("Failed to copy base prep", error);
      toast.error("Failed to copy base prep. Please try again.");
    }
  };

  return (
    <>
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">Loading base preps...</p>
        </div>
      ) : basePreps.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <p className="text-muted-foreground text-lg">No base preps yet.</p>
          <p className="text-muted-foreground">
            Base preps are ingredients or preparations that you reuse across multiple dishes.
          </p>
          <Button onClick={() => setIsCreating(true)} className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Base Prep
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Base Preps</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Manage home-made preparations and sauces.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <Switch id="show-ingredients" checked={showIngredients} onCheckedChange={setShowIngredients} />
                <Label htmlFor="show-ingredients" className="text-sm font-medium text-foreground">
                  Show ingredients
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="show-active-only" checked={showActiveOnly} onCheckedChange={setShowActiveOnly} />
                <Label htmlFor="show-active-only" className="text-sm font-medium text-foreground">
                  Show active only
                </Label>
              </div>
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Base Prep
              </Button>
            </div>
          </div>

          <div className="grid gap-4">
            {(showActiveOnly
              ? basePreps.filter((bp) => (usageCountByBasePrepId?.[bp.id] ?? 0) > 0)
              : basePreps
            ).map((basePrep) => {
              // Convert base prep to SavedDish format for allergen calculation
              const basePrepAsDish: SavedDish = {
                id: basePrep.id.toString(),
                name: basePrep.name,
                menuSectionId: "",
                description: basePrep.description || "",
                servingSize: "1",
                price: "",
                ingredients: basePrep.ingredients.map(ing => ({
                  name: ing.ingredient_name,
                  quantity: ing.quantity?.toString() || "",
                  unit: ing.unit || "",
                  confirmed: ing.confirmed ?? false,
                  ingredientId: ing.ingredient_id,
                  allergens: ing.allergens,
                })),
                prepMethod: "",
                compliance: {},
              };
              
              const allergenDefinitions = getDishAllergenDefinitions(basePrepAsDish);
              
              return (
          <Card key={basePrep.id} className="p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-semibold text-foreground break-words">
                      {basePrep.name}
                    </h3>
                    {typeof usageCountByBasePrepId?.[basePrep.id] === "number" && (
                      <span className="text-xs rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                        Used in {usageCountByBasePrepId[basePrep.id]} {usageCountByBasePrepId[basePrep.id] === 1 ? "dish" : "dishes"}
                      </span>
                    )}
                  </div>
                  {basePrep.description && (
                    <p className="text-sm text-muted-foreground">
                      {basePrep.description}
                    </p>
                  )}
                </div>

                {/* Allergen badges */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {allergenDefinitions.length > 0 && (
                    <TooltipProvider delayDuration={150}>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {allergenDefinitions.map((definition) => {
                          const Icon = definition.Icon;
                          return (
                            <Tooltip key={definition.id}>
                              <TooltipTrigger asChild>
                                <span className="inline-flex rounded-md border border-border/50 bg-background/80 p-1.5 shadow-sm">
                                  <Icon className="h-8 w-8" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" align="center">
                                {definition.name}
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>
                    </TooltipProvider>
                  )}
                  {(basePrep.yield_quantity || basePrep.yield_unit) && (
                    <p className="text-sm text-muted-foreground">
                      Yield: {basePrep.yield_quantity} {basePrep.yield_unit}
                    </p>
                  )}
                </div>
                
                {showIngredients && basePrep.ingredients && basePrep.ingredients.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-foreground mb-2">
                      Ingredients ({basePrep.ingredients.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {basePrep.ingredients.map((ing, idx) => (
                        <div key={idx} className="text-sm text-muted-foreground">
                          {ing.quantity && ing.unit ? (
                            <>
                              {ing.quantity} {ing.unit} {ing.ingredient_name}
                            </>
                          ) : (
                            ing.ingredient_name
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {showIngredients && basePrep.instructions && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-foreground mb-2">
                      Instructions
                    </h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {basePrep.instructions}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 ml-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCopy(basePrep)}
                  aria-label={`Copy ${basePrep.name}`}
                >
                  <Copy className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingBasePrepId(basePrep.id)}
                  aria-label={`Edit ${basePrep.name}`}
                >
                  <Edit className="w-5 h-5" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={deletingId === basePrep.id}
                      aria-label={`Delete ${basePrep.name}`}
                    >
                      <Trash2 className="w-5 h-5 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete base prep</AlertDialogTitle>
                    </AlertDialogHeader>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{basePrep.name}"? This action cannot be
                      undone. Recipes using this base prep will not be affected, but the link will
                      be removed.
                    </AlertDialogDescription>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(basePrep.id)}
                        className="bg-destructive hover:bg-destructive/90"
                        disabled={deletingId === basePrep.id}
                      >
                        {deletingId === basePrep.id ? "Deleting..." : "Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </Card>
              );
            })}
          </div>
        </div>
      )}

      <BasePrepEditSheet
        open={isCreating}
        onOpenChange={setIsCreating}
        basePrep={null}
        restaurantId={restaurantId}
        onSave={async () => {}}
        isCreateMode={true}
        onCreate={async (data) => {
          await onCreate(data);
          setIsCreating(false);
          if (onChanged) await onChanged();
          if (onCreateComplete) onCreateComplete();
        }}
        onChanged={onChanged}
        formatPrice={formatPrice}
      />

      <BasePrepEditSheet
        open={copySource !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCopySource(null);
          }
        }}
        basePrep={copySource ? {
          ...copySource,
          name: `Copy of ${copySource.name}`,
        } : null}
        restaurantId={restaurantId}
        onSave={async () => {}}
        isCreateMode={true}
        onCreate={handleCreateFromCopy}
        onChanged={onChanged}
        formatPrice={formatPrice}
      />

      <BasePrepEditSheet
        open={editingBasePrepId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingBasePrepId(null);
          }
        }}
        basePrep={editingBasePrepId ? basePreps.find(bp => bp.id === editingBasePrepId) ?? null : null}
        restaurantId={restaurantId}
        onSave={async (basePrepId, updates) => {
          await onEdit(basePrepId, updates);
          setEditingBasePrepId(null);
          if (onChanged) await onChanged();
        }}
        onChanged={onChanged}
        formatPrice={formatPrice}
      />
    </>
  );
};

