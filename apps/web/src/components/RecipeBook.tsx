import { useEffect, useMemo, useState } from "react";

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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Trash2, Edit, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export type RecipeBulkAction =
  | "delete"
  | "markForReview"
  | "markAsReviewed"
  | "addToMenu"
  | "removeFromMenu";

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
  isOnMenu?: boolean;
}

interface RecipeBookProps {
  dishes: SavedDish[];
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  onBulkAction: (action: RecipeBulkAction, ids: string[]) => Promise<void> | void;
  onToggleMenuStatus: (id: string, nextStatus: boolean) => Promise<void> | void;
}

export const RecipeBook = ({
  dishes,
  onDelete,
  onEdit,
  onBulkAction,
  onToggleMenuStatus,
}: RecipeBookProps) => {
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<RecipeBulkAction | null>(null);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [menuUpdatingIds, setMenuUpdatingIds] = useState<string[]>([]);
  const [showLiveOnly, setShowLiveOnly] = useState(false);
  const [removalDialogDishId, setRemovalDialogDishId] = useState<string | null>(null);
  const [unconfirmedDialogDishId, setUnconfirmedDialogDishId] = useState<string | null>(null);

  const isRemovalUpdating = removalDialogDishId
    ? menuUpdatingIds.includes(removalDialogDishId)
    : false;

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

  const filteredDishes = useMemo(
    () =>
      dishes
        .filter((dish) => selectedCategory === "all" || dish.menuCategory === selectedCategory)
        .filter((dish) => {
          if (reviewFilter === "reviewed") {
            return dish.confirmed;
          }

          if (reviewFilter === "needs_review") {
            return !dish.confirmed;
          }

          return true;
        })
        .filter((dish) => (showLiveOnly ? Boolean(dish.isOnMenu) : true)),
    [dishes, selectedCategory, reviewFilter, showLiveOnly],
  );

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => filteredDishes.some((dish) => dish.id === id)));
  }, [filteredDishes]);

  const setSelectionState = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      if (checked) {
        return prev.includes(id) ? prev : [...prev, id];
      }

      return prev.filter((selectedId) => selectedId !== id);
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredDishes.length) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(filteredDishes.map((dish) => dish.id));
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const selectedCount = selectedIds.length;

  const actionLabels: Record<RecipeBulkAction, string> = {
    delete: "Delete",
    markForReview: "Mark for review",
    markAsReviewed: "Mark as reviewed",
    addToMenu: "Add to menu",
    removeFromMenu: "Remove from menu",
  };

  const actionDetails: Partial<Record<RecipeBulkAction, string>> = {
    delete: "This means these dishes will be permanently deleted from the recipe book and your menu. This action cannot be undone.",
    addToMenu:
      "This means customers in your restaurant will be able to view and order this dish",
    removeFromMenu:
      "This means customers in your restaurant will no longer be able to view and order this dish",
    markForReview:
      "This means you will need to re-confirm the ingredients and allergens for this dish.",
  };

  const openBulkDialog = (action: RecipeBulkAction) => {
    setBulkAction(action);
    setIsBulkDialogOpen(true);
  };

  const handleConfirmBulkAction = async () => {
    if (!bulkAction || selectedIds.length === 0) {
      return;
    }

    try {
      setIsProcessingBulk(true);
      await onBulkAction(bulkAction, selectedIds);
      setSelectedIds([]);
      setIsBulkDialogOpen(false);
      setBulkAction(null);
    } catch (error) {
      console.error("Bulk action failed", error);
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const closeBulkDialog = (open: boolean) => {
    setIsBulkDialogOpen(open);
    if (!open) {
      setBulkAction(null);
    }
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="space-y-4">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-foreground">Recipe Book</h2>
            <Select
              value={reviewFilter}
              onValueChange={(value: "all" | "reviewed" | "needs_review") => setReviewFilter(value)}
            >
              <SelectTrigger id="review-filter" className="w-[180px]" aria-label="Review status">
                <SelectValue>
                  {reviewFilter === "all"
                    ? "Review status"
                    : reviewFilter === "reviewed"
                      ? "Reviewed"
                      : "Needs review"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="needs_review">Needs review</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch id="show-ingredients" checked={showIngredients} onCheckedChange={setShowIngredients} />
              <Label htmlFor="show-ingredients" className="text-sm font-medium text-foreground">
                Show ingredients
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="show-live-only" checked={showLiveOnly} onCheckedChange={setShowLiveOnly} />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Label htmlFor="show-live-only" className="text-sm font-medium text-foreground cursor-help">
                    Only show live menu items
                  </Label>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-sm">
                  Live menu items are items that customers can see and order on your menu.
                </TooltipContent>
              </Tooltip>
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

        {selectedCount > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 p-4">
            <div className="text-sm font-medium text-foreground">
              {selectedCount} {selectedCount === 1 ? "recipe" : "recipes"} selected
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                Select all
              </Button>
              <Button variant="outline" size="sm" onClick={handleClearSelection}>
                Clear selection
              </Button>
              <Button variant="outline" size="sm" onClick={() => openBulkDialog("markForReview")}>
                Mark for review
              </Button>
              <Button variant="outline" size="sm" onClick={() => openBulkDialog("markAsReviewed")}>
                Mark as reviewed
              </Button>
              <Button variant="outline" size="sm" onClick={() => openBulkDialog("addToMenu")}>
                Add to menu
              </Button>
              <Button variant="outline" size="sm" onClick={() => openBulkDialog("removeFromMenu")}>
                Remove from menu
              </Button>
              <Button variant="destructive" size="sm" onClick={() => openBulkDialog("delete")}>
                Delete
              </Button>
            </div>
          </div>
        )}

        <div className="grid gap-4">
          {filteredDishes.length === 0 && (
            <div className="text-center py-10">
              <p className="text-muted-foreground">No dishes match the selected filters.</p>
            </div>
          )}
          {filteredDishes.map((dish) => {
            const isSelected = selectedIds.includes(dish.id);
            const isOnMenu = Boolean(dish.isOnMenu);
            const isMenuUpdating = menuUpdatingIds.includes(dish.id);

            return (
              <Card
                key={dish.id}
                role="checkbox"
                aria-checked={isSelected}
                aria-label={`Select ${dish.name}`}
                tabIndex={0}
                onClick={() => setSelectionState(dish.id, !isSelected)}
                onKeyDown={(event) => {
                  if (event.key === " " || event.key === "Enter") {
                    event.preventDefault();
                    setSelectionState(dish.id, !isSelected);
                  }
                }}
                className={cn(
                  "p-6 relative border-2 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  isSelected
                    ? "border-[3px] border-orange-500 bg-amber-50 shadow-sm"
                    : "border-border hover:border-primary/50",
                )}
              >
                {dish.image && (
                  <div className="w-full aspect-video rounded-lg overflow-hidden mb-4">
                    <img src={dish.image} alt={dish.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex flex-col gap-2">
                      <h3 className="text-lg font-semibold text-foreground break-words md:max-w-[66%]">
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

                  <div className="flex flex-col items-end gap-3">
                    <div className="flex items-center gap-2">
                      {dish.confirmed ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <img
                              src="/logo_with_tick.svg"
                              alt="Recipe approved"
                              className="h-6 w-6"
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            Ingredients have been manually confirmed.
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            onEdit(dish.id);
                          }}
                        >
                          Review
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(event) => {
                          event.stopPropagation();
                          onEdit(dish.id);
                        }}
                      >
                        <Edit className="w-5 h-5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(event) => event.stopPropagation()}
                          >
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
                            <AlertDialogAction
                              onClick={() => onDelete(dish.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    {isOnMenu ? (
                      <button
                        type="button"
                        aria-label={`Remove ${dish.name} from the menu`}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (isMenuUpdating) {
                            return;
                          }

                          setRemovalDialogDishId(dish.id);
                        }}
                        disabled={isMenuUpdating}
                        className="inline-flex items-center rounded-full border border-transparent bg-[color:var(--color-primary)] px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-[color:var(--color-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--color-secondary)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isMenuUpdating ? "Updating..." : "Live"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        aria-label={`Add ${dish.name} to the menu`}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (isMenuUpdating) {
                            return;
                          }

                          if (!dish.confirmed) {
                            setUnconfirmedDialogDishId(dish.id);
                            return;
                          }

                          setMenuUpdatingIds((prev) => [...prev, dish.id]);

                          Promise.resolve(onToggleMenuStatus(dish.id, true))
                            .catch(() => null)
                            .finally(() =>
                              setMenuUpdatingIds((prev) => prev.filter((id) => id !== dish.id))
                            );
                        }}
                        disabled={isMenuUpdating}
                        className="inline-flex items-center rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/80 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isMenuUpdating ? "Adding..." : "Add to menu"}
                      </button>
                    )}
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

                {showIngredients && (
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
                )}
              </Card>
            );
          })}
      </div>
      </div>

      <AlertDialog open={Boolean(unconfirmedDialogDishId)} onOpenChange={(open) => !open && setUnconfirmedDialogDishId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Review required</AlertDialogTitle>
            <AlertDialogDescription>
              Please confirm the ingredients before adding dishes to your live menu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setUnconfirmedDialogDishId(null)}>Got it</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(removalDialogDishId)}
        onOpenChange={(open) => {
          if (!open && !isRemovalUpdating) {
            setRemovalDialogDishId(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from live menu</AlertDialogTitle>
            <AlertDialogDescription>
              Do you want to remove this dish from the menu? Customers will no longer be able to order it but you can still put it
              back at a later stage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRemovalDialogDishId(null)} disabled={isRemovalUpdating}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!removalDialogDishId) {
                  return;
                }

                setMenuUpdatingIds((prev) => [...prev, removalDialogDishId]);

                Promise.resolve(onToggleMenuStatus(removalDialogDishId, false))
                  .catch(() => null)
                  .finally(() => {
                    setMenuUpdatingIds((prev) => prev.filter((id) => id !== removalDialogDishId));
                    setRemovalDialogDishId(null);
                  });
              }}
              disabled={isRemovalUpdating}
            >
              {isRemovalUpdating ? "Removing..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isBulkDialogOpen} onOpenChange={closeBulkDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm bulk action</AlertDialogTitle>
            <AlertDialogDescription>
              {bulkAction ? (
                <>
                  {bulkAction === "delete" && (
                    <>
                      Are you sure you want to delete{" "}
                      <strong>
                        {selectedCount} {selectedCount === 1 ? "recipe" : "recipes"}
                      </strong>
                      ?
                    </>
                  )}
                  {bulkAction === "markForReview" && (
                    <>
                      Are you sure you want to mark{" "}
                      <strong>
                        {selectedCount} {selectedCount === 1 ? "recipe" : "recipes"}
                      </strong>{" "}
                      for review?
                    </>
                  )}
                  {bulkAction === "markAsReviewed" && (
                    <>
                      Are you sure you want to mark{" "}
                      <strong>
                        {selectedCount} {selectedCount === 1 ? "recipe" : "recipes"}
                      </strong>{" "}
                      as reviewed?
                    </>
                  )}
                  {bulkAction === "addToMenu" && (
                    <>
                      Are you sure you want to add{" "}
                      <strong>
                        {selectedCount} {selectedCount === 1 ? "recipe" : "recipes"}
                      </strong>{" "}
                      to menu?
                    </>
                  )}
                  {bulkAction === "removeFromMenu" && (
                    <>
                      Are you sure you want to remove{" "}
                      <strong>
                        {selectedCount} {selectedCount === 1 ? "recipe" : "recipes"}
                      </strong>{" "}
                      from menu?
                    </>
                  )}
                  {!bulkAction && "Select an action to continue."}
                </>
              ) : (
                "Select an action to continue."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {bulkAction && actionDetails[bulkAction] && (
            <p className="text-sm text-muted-foreground">{actionDetails[bulkAction]}</p>
          )}
          {bulkAction === "markAsReviewed" && (
            <Alert variant="destructive" className="mt-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> This means you will mark the ingredients and allergens for {selectedCount === 1 ? "this dish" : "these dishes"} as reviewed without checking them. We do not recommend this, as ingredient lists can contain errors and you may wrongly inform your customers about allergens.
              </AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessingBulk}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmBulkAction} disabled={isProcessingBulk}>
              {isProcessingBulk && "Processing..."}
              {!isProcessingBulk && bulkAction ? actionLabels[bulkAction] : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
};
