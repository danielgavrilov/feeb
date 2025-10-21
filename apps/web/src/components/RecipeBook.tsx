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
    substitution?: {
      alternative: string;
      surcharge?: string | null;
    };
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

export const ARCHIVE_SECTION_ID = "archive";
export const ARCHIVE_SECTION_LABEL = "Archive";

const isArchiveSection = (section: SectionDefinition) =>
  section.id.toLowerCase() === ARCHIVE_SECTION_ID || section.label.trim().toLowerCase() === ARCHIVE_SECTION_ID;

const normalizeSection = (section: SectionDefinition): SectionDefinition => {
  const trimmedLabel = section.label.trim();

  if (isArchiveSection(section)) {
    const normalizedLabel = trimmedLabel.length > 0 ? trimmedLabel : ARCHIVE_SECTION_LABEL;
    return {
      id: ARCHIVE_SECTION_ID,
      label: normalizedLabel,
    };
  }

  return {
    id: section.id,
    label: trimmedLabel.length > 0 ? trimmedLabel : section.id,
  };
};

const ensureArchiveSection = (sections: SectionDefinition[]): SectionDefinition[] => {
  let hasArchive = false;
  let changed = false;

  const normalized = sections.map((section) => {
    const result = normalizeSection(section);
    if (result.id === ARCHIVE_SECTION_ID) {
      hasArchive = true;
    }

    if (result.id !== section.id || result.label !== section.label) {
      changed = true;
    }

    return result;
  });

  if (!hasArchive) {
    changed = true;
    normalized.push({
      id: ARCHIVE_SECTION_ID,
      label: ARCHIVE_SECTION_LABEL,
    });
  }

  if (!changed && normalized.length === sections.length) {
    return sections;
  }

  return normalized;
};

const RECIPE_STATUS_OPTIONS: Array<{
  value: "all" | "reviewed" | "needs_review" | "live";
  label: string;
  pillClassName: string;
}> = [
  {
    value: "all",
    label: "All",
    pillClassName:
      "bg-muted text-foreground border-muted-foreground/30 dark:bg-muted dark:text-foreground dark:border-muted-foreground/30",
  },
  {
    value: "needs_review",
    label: "Needs Review",
    pillClassName:
      "bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-500/15 dark:text-amber-100 dark:border-amber-300/40",
  },
  {
    value: "reviewed",
    label: "Reviewed",
    pillClassName:
      "bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-100 dark:border-emerald-300/40",
  },
  {
    value: "live",
    label: "Live",
    pillClassName:
      "bg-sky-100 text-sky-900 border-sky-200 dark:bg-sky-500/15 dark:text-sky-100 dark:border-sky-300/40",
  },
];

interface RecipeBookProps {
  dishes: SavedDish[];
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  onBulkAction: (action: RecipeBulkAction, ids: string[]) => Promise<void> | void;
  onToggleMenuStatus: (id: string, nextStatus: boolean) => Promise<void> | void;
  onMoveDishesToArchive: (dishIds: string[]) => Promise<void> | void;
  formatPrice: (value: string | number | null | undefined) => string;
}

export const RecipeBook = ({
  dishes,
  onDelete,
  onEdit,
  onBulkAction,
  onToggleMenuStatus,
  onMoveDishesToArchive,
  formatPrice,
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
  const [removalDialogDishId, setRemovalDialogDishId] = useState<string | null>(null);
  const [unconfirmedDialogDishId, setUnconfirmedDialogDishId] = useState<string | null>(null);
  const [sections, setSections] = useState<SectionDefinition[]>(() => ensureArchiveSection(loadSavedMenuSections()));
  const [isManageSectionsOpen, setIsManageSectionsOpen] = useState(false);
  const [editingSections, setEditingSections] = useState<SectionDefinition[]>([]);
  const [newSectionLabel, setNewSectionLabel] = useState("");
  const [sectionOrders, setSectionOrders] = useState<Record<string, string[]>>({});
  const [sectionOrderEditing, setSectionOrderEditing] = useState<{
    sectionId: string;
    order: string[];
  } | null>(null);
  const [bulkActionError, setBulkActionError] = useState<string | null>(null);
  const [sectionPendingDeletionIndex, setSectionPendingDeletionIndex] = useState<number | null>(null);
  const [isSavingSections, setIsSavingSections] = useState(false);
  const [sectionManageError, setSectionManageError] = useState<string | null>(null);

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
      const normalizedPrev = ensureArchiveSection(prev);

      if (categories.length === 0) {
        return normalizedPrev;
      }

      const next = [...normalizedPrev];
      const existingIds = new Set(next.map((section) => section.id));
      let changed = normalizedPrev !== prev;

      categories.forEach((category) => {
        if (!existingIds.has(category)) {
          next.push({ id: category, label: category });
          existingIds.add(category);
          changed = true;
        }
      });

      return changed ? next : normalizedPrev;
    });
  }, [categories]);

  useEffect(() => {
    saveMenuSections(ensureArchiveSection(sections));
  }, [sections]);

  useEffect(() => {
    if (
      selectedCategory !== "all" &&
      selectedCategory !== ARCHIVE_SECTION_ID &&
      !categories.includes(selectedCategory)
    ) {
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

  const dishMap = useMemo(() => {
    const map = new Map<string, SavedDish>();
    dishes.forEach((dish) => {
      map.set(dish.id, dish);
    });
    return map;
  }, [dishes]);

  const statusFilteredDishes = useMemo(
    () =>
      dishes.filter((dish) => {
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
      }),
    [dishes, recipeStatusFilter],
  );

  const selectedStatusOption = useMemo(
    () =>
      RECIPE_STATUS_OPTIONS.find((option) => option.value === recipeStatusFilter) ??
      RECIPE_STATUS_OPTIONS[0],
    [recipeStatusFilter],
  );

  const activeStatusOption = recipeStatusFilter === "all" ? null : selectedStatusOption;

  const liveSelectedCount = useMemo(
    () =>
      selectedIds.reduce((count, id) => {
        const dish = dishMap.get(id);
        return dish?.isOnMenu ? count + 1 : count;
      }, 0),
    [selectedIds, dishMap],
  );

  const hasLiveSelected = liveSelectedCount > 0;

  useEffect(() => {
    setSectionOrders((prev) => {
      if (sections.length === 0) {
        return Object.keys(prev).length === 0 ? prev : {};
      }

      const next: Record<string, string[]> = {};
      let changed = false;

      sections.forEach((section) => {
        const dishIds = dishes
          .filter((dish) => dish.menuCategory === section.id)
          .map((dish) => dish.id);

        if (dishIds.length === 0) {
          if (prev[section.id]) {
            changed = true;
          }
          return;
        }

        const existingOrder = prev[section.id] ?? [];
        const updatedOrder = [
          ...existingOrder.filter((id) => dishIds.includes(id)),
          ...dishIds.filter((id) => !existingOrder.includes(id)),
        ];

        next[section.id] = updatedOrder;

        if (
          existingOrder.length !== updatedOrder.length ||
          updatedOrder.some((id, index) => existingOrder[index] !== id)
        ) {
          changed = true;
        }
      });

      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      if (
        prevKeys.length !== nextKeys.length ||
        prevKeys.some((key) => !nextKeys.includes(key))
      ) {
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [dishes, sections]);

  const filteredSections = useMemo(() => {
    const archiveSection = sections.find((section) => section.id === ARCHIVE_SECTION_ID);
    const nonArchiveSections = sections.filter((section) => section.id !== ARCHIVE_SECTION_ID);

    if (nonArchiveSections.length === 0) {
      if (selectedCategory === ARCHIVE_SECTION_ID) {
        if (!archiveSection) {
          return [];
        }

        const archivedDishes = statusFilteredDishes.filter(
          (dish) => dish.menuCategory === ARCHIVE_SECTION_ID,
        );

        return archivedDishes.length > 0
          ? [
              {
                sectionId: archiveSection.id,
                sectionLabel: archiveSection.label,
                dishes: archivedDishes,
              },
            ]
          : [];
      }

      if (selectedCategory !== "all") {
        return [];
      }

      const nonArchivedDishes = statusFilteredDishes.filter(
        (dish) => dish.menuCategory !== ARCHIVE_SECTION_ID,
      );
      const archivedDishes = statusFilteredDishes.filter(
        (dish) => dish.menuCategory === ARCHIVE_SECTION_ID,
      );

      const groups: Array<{ sectionId: string; sectionLabel: string; dishes: SavedDish[] }> = [];

      if (nonArchivedDishes.length > 0) {
        groups.push({
          sectionId: "__all__",
          sectionLabel: "Dishes",
          dishes: nonArchivedDishes,
        });
      }

      if (archiveSection && archivedDishes.length > 0) {
        groups.push({
          sectionId: archiveSection.id,
          sectionLabel: archiveSection.label,
          dishes: archivedDishes,
        });
      }

      return groups;
    }

    const orderedSectionIds =
      selectedCategory === "all"
        ? sections.map((section) => section.id)
        : sections
            .filter((section) => section.id === selectedCategory)
            .map((section) => section.id);

    return orderedSectionIds
      .map((sectionId) => {
        const dishesInSection = statusFilteredDishes.filter(
          (dish) => dish.menuCategory === sectionId,
        );

        if (dishesInSection.length === 0) {
          return null;
        }

        const order = sectionOrders[sectionId] ?? [];
        const orderedDishes: SavedDish[] = [];
        const seen = new Set<string>();

        order.forEach((dishId) => {
          const dish = dishMap.get(dishId);
          if (dish && dish.menuCategory === sectionId && !seen.has(dish.id)) {
            orderedDishes.push(dish);
            seen.add(dish.id);
          }
        });

        dishesInSection.forEach((dish) => {
          if (!seen.has(dish.id)) {
            orderedDishes.push(dish);
            seen.add(dish.id);
          }
        });

        return {
          sectionId,
          sectionLabel: sectionLabelMap.get(sectionId) ?? sectionId,
          dishes: orderedDishes,
        };
      })
      .filter((value): value is { sectionId: string; sectionLabel: string; dishes: SavedDish[] } =>
        value !== null,
      );
  }, [
    sections,
    selectedCategory,
    sectionOrders,
    statusFilteredDishes,
    sectionLabelMap,
    dishMap,
  ]);

  const visibleDishes = useMemo(
    () => filteredSections.flatMap((section) => section.dishes),
    [filteredSections],
  );

  useEffect(() => {
    if (visibleDishes.length === 0) {
      setSelectedIds([]);
      return;
    }

    const visibleIds = new Set(visibleDishes.map((dish) => dish.id));
    setSelectedIds((prev) => prev.filter((id) => visibleIds.has(id)));
  }, [visibleDishes]);

  useEffect(() => {
    if (!bulkActionError) {
      return;
    }

    const hasUnconfirmedSelected = selectedIds.some((id) => {
      const dish = dishMap.get(id);
      return dish ? !dish.confirmed : false;
    });

    if (!hasUnconfirmedSelected) {
      setBulkActionError(null);
    }
  }, [bulkActionError, selectedIds, dishMap]);

  const setSelectionState = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      if (checked) {
        return prev.includes(id) ? prev : [...prev, id];
      }

      return prev.filter((selectedId) => selectedId !== id);
    });
  };

  const handleSelectAll = () => {
    if (visibleDishes.length === 0) {
      return;
    }

    if (selectedIds.length === visibleDishes.length) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(visibleDishes.map((dish) => dish.id));
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const selectedCount = selectedIds.length;

  const generateSectionId = (
    label: string,
    existingSections: SectionDefinition[],
  ): string => {
    const normalized = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const fallbackBase = `section-${Date.now()}`;
    const baseId = normalized.length > 0 ? normalized : fallbackBase;
    const usedIds = new Set(existingSections.map((section) => section.id));

    if (!usedIds.has(baseId)) {
      return baseId;
    }

    let suffix = 2;
    let candidate = `${baseId}-${suffix}`;
    while (usedIds.has(candidate)) {
      suffix += 1;
      candidate = `${baseId}-${suffix}`;
    }

    return candidate;
  };

  const handleManageSectionsOpenChange = (open: boolean) => {
    setIsManageSectionsOpen(open);
    setSectionManageError(null);
    if (open) {
      setEditingSections(ensureArchiveSection(sections).map((section) => ({ ...section })));
      setNewSectionLabel("");
    } else {
      setEditingSections([]);
      setNewSectionLabel("");
      setSectionPendingDeletionIndex(null);
    }
  };

  const handleSectionLabelChange = (index: number, label: string) => {
    setEditingSections((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], label };
      return next;
    });
  };

  const handleAddNewSection = () => {
    const trimmedLabel = newSectionLabel.trim();
    if (!trimmedLabel) {
      return;
    }

    setEditingSections((prev) => {
      const id = generateSectionId(trimmedLabel, prev);
      return [...prev, { id, label: trimmedLabel }];
    });
    setNewSectionLabel("");
  };

  const moveEditingSection = (fromIndex: number, toIndex: number) => {
    setEditingSections((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const handleConfirmDeleteSection = () => {
    if (sectionPendingDeletionIndex === null) {
      return;
    }

    setEditingSections((prev) => prev.filter((_, index) => index !== sectionPendingDeletionIndex));
    setSectionPendingDeletionIndex(null);
  };

  const handleSaveSectionChanges = async () => {
    if (isSavingSections) {
      return;
    }

    const normalizedSections = ensureArchiveSection(
      editingSections.map((section) => ({
        ...section,
        label: section.label.trim() || section.id,
      })),
    );

    const removedSectionIds = sections
      .filter((section) => section.id !== ARCHIVE_SECTION_ID)
      .filter((section) => !normalizedSections.some((item) => item.id === section.id))
      .map((section) => section.id);

    const dishesToArchive =
      removedSectionIds.length > 0
        ? dishes.filter((dish) => removedSectionIds.includes(dish.menuCategory))
        : [];

    const dishIdsToArchive = dishesToArchive.map((dish) => dish.id);

    setSectionManageError(null);
    setIsSavingSections(true);

    try {
      if (dishIdsToArchive.length > 0) {
        await onMoveDishesToArchive(dishIdsToArchive);
      }

      setSections(normalizedSections);
      handleManageSectionsOpenChange(false);
    } catch (error) {
      console.error("Failed to move dishes to Archive", error);
      setSectionManageError("Unable to move dishes to the Archive section. Please try again.");
    } finally {
      setIsSavingSections(false);
    }
  };

  const sectionPendingDeletion =
    sectionPendingDeletionIndex !== null ? editingSections[sectionPendingDeletionIndex] : null;

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
    setBulkActionError(null);
    setBulkAction(action);
    setIsBulkDialogOpen(true);
  };

  const handleConfirmBulkAction = async () => {
    if (!bulkAction || selectedIds.length === 0) {
      return;
    }

    if (bulkAction === "addToMenu") {
      const unconfirmedCount = selectedIds.reduce((count, id) => {
        const dish = dishMap.get(id);
        return !dish?.confirmed ? count + 1 : count;
      }, 0);

      if (unconfirmedCount > 0) {
        setBulkActionError(
          `You have tried to add ${unconfirmedCount} item(s) that has unconfirmed ingredients. Please check the ingredient list before adding this to your guest-facing menu.`,
        );
        setIsBulkDialogOpen(false);
        setBulkAction(null);
        return;
      }
    }

    try {
      setIsProcessingBulk(true);
      await onBulkAction(bulkAction, selectedIds);
      setSelectedIds([]);
      setIsBulkDialogOpen(false);
      setBulkAction(null);
      setBulkActionError(null);
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
      setIsProcessingBulk(false);
    }
  };

  const handleSectionOrderDialogOpenChange = (sectionId: string, open: boolean) => {
    if (!open) {
      setSectionOrderEditing(null);
      return;
    }

    const dishesInSection = dishes
      .filter((dish) => dish.menuCategory === sectionId)
      .map((dish) => dish.id);

    const existingOrder = sectionOrders[sectionId] ?? [];
    const combinedOrder = [
      ...existingOrder.filter((id) => dishesInSection.includes(id)),
      ...dishesInSection.filter((id) => !existingOrder.includes(id)),
    ];

    setSectionOrderEditing({
      sectionId,
      order: combinedOrder,
    });
  };

  const moveEditingDish = (fromIndex: number, toIndex: number) => {
    setSectionOrderEditing((current) => {
      if (!current) {
        return current;
      }

      if (toIndex < 0 || toIndex >= current.order.length) {
        return current;
      }

      const nextOrder = [...current.order];
      const [moved] = nextOrder.splice(fromIndex, 1);
      nextOrder.splice(toIndex, 0, moved);

      return {
        ...current,
        order: nextOrder,
      };
    });
  };

  const handleSaveSectionOrder = () => {
    if (!sectionOrderEditing) {
      return;
    }

    setSectionOrders((prev) => ({
      ...prev,
      [sectionOrderEditing.sectionId]: sectionOrderEditing.order,
    }));
    setSectionOrderEditing(null);
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
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-foreground">Recipe Book</h2>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch id="show-ingredients" checked={showIngredients} onCheckedChange={setShowIngredients} />
              <Label htmlFor="show-ingredients" className="text-sm font-medium text-foreground">
                Show ingredients
              </Label>
            </div>
            <Select
              value={recipeStatusFilter}
              onValueChange={(value: "all" | "reviewed" | "needs_review" | "live") => setRecipeStatusFilter(value)}
            >
              <SelectTrigger
                id="recipe-status-filter"
                className={cn(
                  "w-[220px] justify-between gap-2 rounded-full px-3",
                  activeStatusOption ? "border-transparent bg-transparent px-1" : "",
                )}
                aria-label="Recipe status"
              >
                <SelectValue
                  placeholder="Recipe status"
                  className={cn(
                    "text-sm font-medium",
                    activeStatusOption
                      ? cn(
                          "inline-flex min-h-[1.75rem] items-center rounded-full border px-3 py-1 text-xs",
                          activeStatusOption.pillClassName,
                        )
                      : "text-muted-foreground",
                  )}
                />
              </SelectTrigger>
              <SelectContent>
                {RECIPE_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

        {sections.length > 0 && (
          <Card className="p-4 mt-6">
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
                    <DialogDescription>
                      Rename, reorder, or add sections to organize your recipe book.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    {sectionManageError && (
                      <Alert variant="destructive" className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 mt-0.5" />
                        <AlertDescription>{sectionManageError}</AlertDescription>
                      </Alert>
                    )}
                    {editingSections.length === 0 && (
                      <p className="text-sm text-muted-foreground">There are no sections to manage yet.</p>
                    )}
                    {editingSections.map((section, index) => {
                      const isArchive = isArchiveSection(section);

                      return (
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
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              onClick={() => setSectionPendingDeletionIndex(index)}
                              disabled={isArchive}
                              aria-label={`Delete section ${section.label || section.id}`}
                              title={isArchive ? "The Archive section cannot be deleted" : undefined}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    <div className="space-y-2 pt-3 border-t">
                      <Label htmlFor="new-section-label" className="text-sm font-medium">
                        Add a section
                      </Label>
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          id="new-section-label"
                          value={newSectionLabel}
                          onChange={(event) => setNewSectionLabel(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              handleAddNewSection();
                            }
                          }}
                          placeholder="e.g. Seasonal Specials"
                          aria-label="New section name"
                          className="flex-1 min-w-[180px]"
                        />
                        <Button
                          type="button"
                          onClick={handleAddNewSection}
                          disabled={!newSectionLabel.trim()}
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="pt-2">
                    <Button variant="outline" onClick={() => handleManageSectionsOpenChange(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveSectionChanges}
                      disabled={editingSections.length === 0 || isSavingSections}
                    >
                      {isSavingSections ? "Saving..." : "Save changes"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
                {sectionPendingDeletion && (
                  <AlertDialog
                    open={sectionPendingDeletionIndex !== null}
                    onOpenChange={(open) => {
                      if (!open) {
                        setSectionPendingDeletionIndex(null);
                      }
                    }}
                  >
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete section</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure that you want to delete this section? Recipes in this sections will automatically be
                          saved under "Archive".
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setSectionPendingDeletionIndex(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDeleteSection} disabled={isSavingSections}>
                          Delete section
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
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

        {bulkActionError && (
          <Alert variant="destructive" className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{bulkActionError}</AlertDescription>
          </Alert>
        )}

        {selectedCount > 0 && visibleDishes.length > 0 && (
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

        <div className="grid gap-6 mt-6">
          {visibleDishes.length === 0 && (
            <div className="text-center py-10">
              <p className="text-muted-foreground">No dishes match the selected filters.</p>
            </div>
          )}
          {filteredSections.map(({ sectionId, sectionLabel, dishes: sectionDishes }) => (
            <div key={sectionId} className="space-y-4">
              {sections.length > 0 && (
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xl font-semibold text-foreground">{sectionLabel}</h3>
                  <Dialog
                    open={sectionOrderEditing?.sectionId === sectionId}
                    onOpenChange={(open) => handleSectionOrderDialogOpenChange(sectionId, open)}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Arrange dishes in {sectionLabel}</DialogTitle>
                        <DialogDescription>
                          Reorder how dishes appear within this section.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3">
                        {sectionOrderEditing?.order.length === 0 && (
                          <p className="text-sm text-muted-foreground">
                            There are no dishes in this section yet.
                          </p>
                        )}
                        {sectionOrderEditing?.order.map((dishId, index) => {
                          const dish = dishMap.get(dishId);
                          if (!dish) {
                            return null;
                          }

                          return (
                            <div key={dishId} className="flex flex-wrap items-center gap-2">
                              <span className="text-sm text-muted-foreground w-6 text-right">
                                {index + 1}.
                              </span>
                              <span className="flex-1 min-w-[180px] text-sm font-medium text-foreground">
                                {dish.name}
                              </span>
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => moveEditingDish(index, index - 1)}
                                  disabled={index === 0}
                                  aria-label={`Move ${dish.name} up`}
                                >
                                  <ArrowUp className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => moveEditingDish(index, index + 1)}
                                  disabled={
                                    sectionOrderEditing?.order.length
                                      ? index === sectionOrderEditing.order.length - 1
                                      : false
                                  }
                                  aria-label={`Move ${dish.name} down`}
                                >
                                  <ArrowDown className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <DialogFooter className="pt-2">
                        <Button variant="outline" onClick={() => setSectionOrderEditing(null)}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveSectionOrder} disabled={!sectionOrderEditing?.order.length}>
                          Save changes
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              )}

              <div className="grid gap-4">
                {sectionDishes.map((dish) => {
                  const isSelected = selectedIds.includes(dish.id);
                  const isOnMenu = Boolean(dish.isOnMenu);
                  const isMenuUpdating = menuUpdatingIds.includes(dish.id);
                  const statusKey: "live" | "reviewed" | "needs_review" = isOnMenu
                    ? "live"
                    : dish.confirmed
                      ? "reviewed"
                      : "needs_review";

                  const statusButtonBaseClass =
                    "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

                  const statusButtonProps = (() => {
                    if (statusKey === "needs_review") {
                      return {
                        label: "Review",
                        className: cn(
                          statusButtonBaseClass,
                          "border-[color:var(--color-secondary)] bg-[rgba(254,127,45,0.12)] text-[color:var(--color-secondary)] hover:bg-[rgba(254,127,45,0.2)] focus-visible:ring-[color:var(--color-secondary)]",
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

                  const priceLabel = dish.price ? formatPrice(dish.price) : "";

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
                            {dish.servingSize !== "1" && (
                              <Badge variant="outline">Serves {dish.servingSize}</Badge>
                            )}
                            {priceLabel && <Badge variant="outline">{priceLabel}</Badge>}
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
                          <div className="grid grid-cols-2 gap-3">
                            {dish.ingredients.map((ing, idx) => {
                              const substitution = ing.substitution;
                              const formattedSurcharge = substitution?.surcharge
                                ? formatPrice(substitution.surcharge)
                                : "";

                              return (
                                <div key={idx} className="space-y-1 text-sm text-muted-foreground">
                                  <p>
                                    {ing.quantity} {ing.unit} {ing.name}
                                  </p>
                                  {substitution && (
                                    <p className="text-xs text-muted-foreground/80">
                                      <span className="font-medium text-foreground">Substitution:</span>{" "}
                                      {substitution.alternative}
                                      {formattedSurcharge && ` (${formattedSurcharge})`}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {showIngredients && dish.prepMethod && (
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
          ))}
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
          {bulkAction === "markForReview" && hasLiveSelected && (
            <Alert className="mt-3 border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {liveSelectedCount === 1
                  ? "If you mark this live item for review, it will be removed from your guest-facing menu until you have updated the ingredients. If you do not want this to happen, you can also choose to edit the dish directly in the Ingredients tab."
                  : "If you mark these live items for review, they will be removed from your guest-facing menu until you have updated the ingredients. If you do not want this to happen, you can also choose to edit the dishes directly in the Ingredients tab."}
              </AlertDescription>
            </Alert>
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
    </>
  );
};
