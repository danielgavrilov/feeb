import { type MouseEvent, useEffect, useMemo, useState } from "react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2, Edit, AlertTriangle, ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { loadSavedMenuSections, saveMenuSections } from "@/lib/menu-sections";

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

type SectionDefinition = {
  id: string;
  label: string;
};

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
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [recipeStatusFilter, setRecipeStatusFilter] =
    useState<"all" | "reviewed" | "needs_review" | "live">("all");
  const [showIngredients, setShowIngredients] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<RecipeBulkAction | null>(null);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [menuUpdatingIds, setMenuUpdatingIds] = useState<string[]>([]);
  const [showLiveOnly, setShowLiveOnly] = useState(false);
  const [removalDialogDishId, setRemovalDialogDishId] = useState<string | null>(null);
  const [unconfirmedDialogDishId, setUnconfirmedDialogDishId] = useState<string | null>(null);
  const [sections, setSections] = useState<SectionDefinition[]>(() => loadSavedMenuSections());
  const [isManageSectionsOpen, setIsManageSectionsOpen] = useState(false);
  const [editingSections, setEditingSections] = useState<SectionDefinition[]>([]);

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

  useEffect(() => {
    setSections((prev) => {
      if (categories.length === 0) {
        return [];
      }

      if (prev.length === 0) {
        return categories.map((category) => ({ id: category, label: category }));
      }

      const next: SectionDefinition[] = [];
      const seen = new Set<string>();

      prev.forEach((section) => {
        if (categories.includes(section.id)) {
          next.push(section);
          seen.add(section.id);
        }
      });

      categories.forEach((category) => {
        if (!seen.has(category)) {
          next.push({ id: category, label: category });
        }
      });

      if (next.length === prev.length && next.every((section, index) => section === prev[index])) {
        return prev;
      }

      return next;
    });
  }, [categories]);

  useEffect(() => {
    saveMenuSections(sections);
  }, [sections]);

  useEffect(() => {
    if (selectedCategory !== "all" && !categories.includes(selectedCategory)) {
      setSelectedCategory("all");
    }
  }, [categories, selectedCategory]);

  const sectionLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    sections.forEach((section) => {
      map.set(section.id, section.label);
    });
    return map;
  }, [sections]);

  const filteredDishes = useMemo(
    () =>
      dishes
        .filter((dish) => selectedCategory === "all" || dish.menuCategory === selectedCategory)
        .filter((dish) => {
          if (recipeStatusFilter === "live") {
            return Boolean(dish.isOnMenu);
          }

          if (recipeStatusFilter === "reviewed") {
            return dish.confirmed && !dish.isOnMenu;
          }

          if (recipeStatusFilter === "needs_review") {
            return !dish.confirmed;
          }

          return true;
        })
        .filter((dish) => (showLiveOnly ? Boolean(dish.isOnMenu) : true)),
    [dishes, selectedCategory, recipeStatusFilter, showLiveOnly],
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

  const handleManageSectionsOpenChange = (open: boolean) => {
    setIsManageSectionsOpen(open);
    if (open) {
      setEditingSections(sections.map((section) => ({ ...section })));
    } else {
      setEditingSections([]);
    }
  };

  const handleSectionLabelChange = (index: number, label: string) => {
    setEditingSections((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], label };
      return next;
    });
  };

  const moveEditingSection = (fromIndex: number, toIndex: number) => {
    setEditingSections((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const handleSaveSectionChanges = () => {
    setSections(
      editingSections.map((section) => ({
        ...section,
        label: section.label.trim() || section.id,
      })),
    );
    setIsManageSectionsOpen(false);
    setEditingSections([]);
  };

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

  if (dishes.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">No dishes added yet.</p>
        <p className="text-muted-foreground mt-2">Start by adding your first dish!</p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h2 className="text-2xl font-bold text-foreground">Recipe Book</h2>
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
            <Select
              value={recipeStatusFilter}
              onValueChange={(value: "all" | "reviewed" | "needs_review" | "live") => setRecipeStatusFilter(value)}
            >
              <SelectTrigger id="recipe-status-filter" className="w-[200px]" aria-label="Recipe status">
                <SelectValue>
                  {recipeStatusFilter === "all"
                    ? "Recipe status"
                    : recipeStatusFilter === "reviewed"
                      ? "Reviewed"
                      : recipeStatusFilter === "needs_review"
                        ? "Needs Review"
                        : "Live"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="needs_review">Needs Review</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="live">Live</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {sections.length > 0 && (
          <Card className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Sections</h3>
                <p className="text-xs text-muted-foreground">Choose which section of your recipe book to view.</p>
              </div>
              <Dialog open={isManageSectionsOpen} onOpenChange={handleManageSectionsOpenChange}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    Manage sections
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Manage sections</DialogTitle>
                    <DialogDescription>Rename or reorder how sections appear in your recipe book.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    {editingSections.length === 0 && (
                      <p className="text-sm text-muted-foreground">There are no sections to manage yet.</p>
                    )}
                    {editingSections.map((section, index) => (
                      <div key={section.id} className="flex flex-wrap items-center gap-2">
                        <span className="text-sm text-muted-foreground w-6 text-right">{index + 1}.</span>
                        <Input
                          value={section.label}
                          onChange={(event) => handleSectionLabelChange(index, event.target.value)}
                          aria-label={`Rename section ${section.label || section.id}`}
                          className="flex-1 min-w-[180px]"
                        />
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => moveEditingSection(index, index - 1)}
                            disabled={index === 0}
                            aria-label="Move section up"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => moveEditingSection(index, index + 1)}
                            disabled={index === editingSections.length - 1}
                            aria-label="Move section down"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <DialogFooter className="pt-2">
                    <Button variant="outline" onClick={() => handleManageSectionsOpenChange(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveSectionChanges} disabled={editingSections.length === 0}>
                      Save changes
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory("all")}
              >
                All sections
              </Button>
              {sections.map((section) => (
                <Button
                  key={section.id}
                  variant={selectedCategory === section.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(section.id)}
                >
                  {section.label}
                </Button>
              ))}
            </div>
          </Card>
        )}

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
            const statusKey: "live" | "reviewed" | "needs_review" = isOnMenu
              ? "live"
              : dish.confirmed
                ? "reviewed"
                : "needs_review";
            const displayCategory = dish.menuCategory
              ? sectionLabelMap.get(dish.menuCategory) ?? dish.menuCategory
              : undefined;

            const statusButtonBaseClass =
              "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

            const statusButtonProps = (() => {
              if (statusKey === "needs_review") {
                return {
                  label: "Review",
                  className: cn(
                    statusButtonBaseClass,
                    "border-amber-200 bg-amber-100 text-amber-900 hover:bg-amber-100/80 focus-visible:ring-amber-500",
                  ),
                  onClick: (event: MouseEvent<HTMLButtonElement>) => {
                    event.stopPropagation();
                    onEdit(dish.id);
                  },
                  ariaLabel: `Review ${dish.name}`,
                  disabled: false,
                };
              }

              if (statusKey === "reviewed") {
                return {
                  label: isMenuUpdating ? "Adding..." : "Add to menu",
                  className: cn(
                    statusButtonBaseClass,
                    "border-emerald-200 bg-emerald-100 text-emerald-800 hover:bg-emerald-100/80 focus-visible:ring-emerald-500",
                  ),
                  onClick: (event: MouseEvent<HTMLButtonElement>) => {
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
                      .finally(() => {
                        setMenuUpdatingIds((prev) => prev.filter((id) => id !== dish.id));
                      });
                  },
                  ariaLabel: `Add ${dish.name} to the menu`,
                  disabled: isMenuUpdating,
                };
              }

              return {
                label: isMenuUpdating ? "Updating..." : "Live",
                className: cn(
                  statusButtonBaseClass,
                  "border-transparent bg-[color:var(--color-primary)] text-white hover:bg-[color:var(--color-secondary)] focus-visible:ring-[color:var(--color-secondary)]",
                ),
                onClick: (event: MouseEvent<HTMLButtonElement>) => {
                  event.stopPropagation();

                  if (isMenuUpdating) {
                    return;
                  }

                  setRemovalDialogDishId(dish.id);
                },
                ariaLabel: `Remove ${dish.name} from the menu`,
                disabled: isMenuUpdating,
              };
            })();

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
                      {displayCategory && (
                        <Badge variant="outline">{displayCategory}</Badge>
                      )}
                      {dish.servingSize !== "1" && (
                        <Badge variant="outline">Serves {dish.servingSize}</Badge>
                      )}
                      {dish.price && (
                        <Badge variant="outline">${dish.price}</Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end">
                    <button
                      type="button"
                      aria-label={statusButtonProps.ariaLabel}
                      onClick={statusButtonProps.onClick}
                      disabled={statusButtonProps.disabled}
                      className={statusButtonProps.className}
                    >
                      {statusButtonProps.label}
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(event) => {
                        event.stopPropagation();
                        onEdit(dish.id);
                      }}
                      aria-label={`Edit ${dish.name}`}
                    >
                      <Edit className="w-5 h-5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(event) => event.stopPropagation()}
                          aria-label={`Delete ${dish.name}`}
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
