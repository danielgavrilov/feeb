import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { loadSavedMenuSections, MENU_SECTIONS_EVENT, saveMenuSections, StoredMenuSection } from "@/lib/menu-sections";

const FALLBACK_MENU_SECTIONS: StoredMenuSection[] = [
  { id: "appetizer", label: "Appetizer" },
  { id: "main", label: "Main" },
  { id: "side", label: "Side" },
  { id: "dessert", label: "Dessert" },
  { id: "beverage", label: "Beverage" },
];

export interface DishSuggestion {
  id: string;
  name: string;
  confirmed: boolean;
}

interface DishNameInputProps {
  value: string;
  onChange: (value: string) => void;
  onRecipeMatch: (recipeId: string) => void;
  menuCategory: string;
  onMenuCategoryChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  servingSize: string;
  onServingSizeChange: (value: string) => void;
  price: string;
  onPriceChange: (value: string) => void;
  existingDishes: DishSuggestion[];
  selectedDishId?: string | null;
  onClearSelectedDish?: () => void;
}

export const DishNameInput = ({
  value,
  onChange,
  onRecipeMatch,
  menuCategory,
  onMenuCategoryChange,
  description,
  onDescriptionChange,
  servingSize,
  onServingSizeChange,
  price,
  onPriceChange,
  existingDishes,
  selectedDishId,
  onClearSelectedDish,
}: DishNameInputProps) => {
  const [showOptional, setShowOptional] = useState(false);
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
  const blurTimeoutRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isMouseOverPopover = useRef(false);
  const hasSelectedDish = Boolean(selectedDishId);
  const [menuSections, setMenuSections] = useState<StoredMenuSection[]>(() => {
    const savedSections = loadSavedMenuSections();
    return savedSections.length > 0 ? savedSections : [...FALLBACK_MENU_SECTIONS];
  });
  const [newSectionLabel, setNewSectionLabel] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleSectionsUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<StoredMenuSection[]>;
      const updatedSections =
        Array.isArray(customEvent.detail) && customEvent.detail.length > 0
          ? customEvent.detail
          : loadSavedMenuSections();
      setMenuSections(updatedSections.length > 0 ? updatedSections : [...FALLBACK_MENU_SECTIONS]);
    };

    window.addEventListener(MENU_SECTIONS_EVENT, handleSectionsUpdated);
    return () => {
      window.removeEventListener(MENU_SECTIONS_EVENT, handleSectionsUpdated);
    };
  }, []);

  const sectionLabelMap = useMemo(() => {
    const entries = new Map<string, string>();
    FALLBACK_MENU_SECTIONS.forEach((section) => {
      entries.set(section.id, section.label);
    });
    menuSections.forEach((section) => {
      entries.set(section.id, section.label);
    });
    return entries;
  }, [menuSections]);

  const sectionOptions = menuSections.length > 0 ? menuSections : FALLBACK_MENU_SECTIONS;

  const handleAddSection = () => {
    const trimmedLabel = newSectionLabel.trim();
    if (!trimmedLabel) {
      return;
    }

    const baseId = trimmedLabel
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const existingIds = new Set(sectionOptions.map((section) => section.id));
    let candidateId = baseId.length > 0 ? baseId : `section-${Date.now()}`;
    let suffix = 1;
    while (existingIds.has(candidateId)) {
      candidateId = baseId.length > 0 ? `${baseId}-${suffix}` : `section-${Date.now()}-${suffix}`;
      suffix += 1;
    }

    const nextSections = [...sectionOptions, { id: candidateId, label: trimmedLabel }];
    setMenuSections(nextSections);
    saveMenuSections(nextSections);
    onMenuCategoryChange(candidateId);
    setNewSectionLabel("");
  };

  const canAddSection = newSectionLabel.trim().length > 0;

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        window.clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  const suggestionOptions = useMemo(() => {
    const uniqueByName = new Map<string, DishSuggestion>();

    existingDishes.forEach((dish) => {
      const trimmedName = dish.name.trim();
      if (!trimmedName) {
        return;
      }

      const existing = uniqueByName.get(trimmedName);
      if (!existing) {
        uniqueByName.set(trimmedName, dish);
        return;
      }

      if (!dish.confirmed && existing.confirmed) {
        uniqueByName.set(trimmedName, dish);
      }
    });

    return Array.from(uniqueByName.values()).sort((a, b) => {
      if (a.confirmed === b.confirmed) {
        return a.name.localeCompare(b.name);
      }

      return a.confirmed ? 1 : -1;
    });
  }, [existingDishes]);

  useEffect(() => {
    if (suggestionOptions.length === 0) {
      setIsSuggestionOpen(false);
    }
  }, [suggestionOptions.length]);

  useEffect(() => {
    if (hasSelectedDish) {
      setIsSuggestionOpen(false);
    }
  }, [hasSelectedDish]);

  const filteredSuggestions = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) {
      return suggestionOptions;
    }

    return suggestionOptions.filter((option) => option.name.toLowerCase().includes(query));
  }, [suggestionOptions, value]);

  const handleOptionSelect = (option: DishSuggestion) => {
    onChange(option.name);
    onRecipeMatch(option.id);
    setIsSuggestionOpen(false);
    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleInputFocus = () => {
    if (blurTimeoutRef.current) {
      window.clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }

    if (!hasSelectedDish && suggestionOptions.length > 0) {
      setIsSuggestionOpen(true);
    }
  };

  const handleInputBlur = () => {
    blurTimeoutRef.current = window.setTimeout(() => {
      if (!isMouseOverPopover.current) {
        setIsSuggestionOpen(false);
      }
    }, 150);
  };

  const handlePopoverMouseEnter = () => {
    isMouseOverPopover.current = true;
    if (blurTimeoutRef.current) {
      window.clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
  };

  const handlePopoverMouseLeave = () => {
    isMouseOverPopover.current = false;
    if (typeof document !== "undefined" && inputRef.current === document.activeElement) {
      return;
    }
    setIsSuggestionOpen(false);
  };

  const optionalSummaryItems: string[] = [];
  if (menuCategory) {
    optionalSummaryItems.push(sectionLabelMap.get(menuCategory) ?? menuCategory);
  }
  if (servingSize && servingSize !== "1") {
    optionalSummaryItems.push(`Serves ${servingSize}`);
  }
  if (price.trim()) {
    optionalSummaryItems.push(`Price: ${price}`);
  }
  const hasDescription = description.trim().length > 0;
  const hasOptionalSummary = optionalSummaryItems.length > 0 || hasDescription;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Label htmlFor="dish-name" className="text-xl font-semibold text-foreground">
          Dish Name
        </Label>
        <Popover
          open={!hasSelectedDish && isSuggestionOpen && suggestionOptions.length > 0}
          onOpenChange={setIsSuggestionOpen}
        >
          <PopoverTrigger asChild>
            <div className="relative">
              <Input
                ref={inputRef}
                id="dish-name"
                value={value}
                onChange={(e) => {
                  onChange(e.target.value);
                  if (!hasSelectedDish && suggestionOptions.length > 0) {
                    setIsSuggestionOpen(true);
                  }
                }}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                onClick={() => {
                  if (!hasSelectedDish && suggestionOptions.length > 0) {
                    setIsSuggestionOpen(true);
                  }
                }}
                placeholder="Enter dish name..."
                className="h-16 text-2xl font-medium border-2 pr-14"
                autoComplete="off"
              />
              {hasSelectedDish && onClearSelectedDish && (
                <button
                  type="button"
                  onClick={() => {
                    setIsSuggestionOpen(false);
                    onClearSelectedDish();
                    inputRef.current?.focus();
                  }}
                  className="absolute inset-y-0 right-4 flex items-center text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Clear selected dish"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </PopoverTrigger>
          {!hasSelectedDish && suggestionOptions.length > 0 && (
            <PopoverContent
              align="start"
              className="w-[var(--radix-popover-trigger-width)] p-0"
              sideOffset={4}
              onMouseEnter={handlePopoverMouseEnter}
              onMouseLeave={handlePopoverMouseLeave}
            >
              <div className="max-h-60 overflow-y-auto py-2">
                {filteredSuggestions.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">No matching dishes found.</p>
                ) : (
                  filteredSuggestions.map((option) => (
                    <button
                      key={`${option.id}-${option.name}`}
                      type="button"
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-muted focus:bg-muted"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleOptionSelect(option)}
                    >
                      <span className="font-medium text-foreground">{option.name}</span>
                      <Badge
                        variant={option.confirmed ? "secondary" : "destructive"}
                        className="pointer-events-none"
                      >
                        {option.confirmed ? "Ingredients confirmed" : "Review"}
                      </Badge>
                    </button>
                  ))
                )}
              </div>
            </PopoverContent>
          )}
        </Popover>
      </div>

      {hasOptionalSummary && (
        <div className="rounded-lg border border-border/60 bg-muted/40 px-4 py-3 text-sm">
          {optionalSummaryItems.length > 0 && (
            <p className="text-foreground/80">
              {optionalSummaryItems.join(" • ")}
            </p>
          )}
          {hasDescription && (
            <p className="mt-1 text-muted-foreground line-clamp-2">{description}</p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowOptional(!showOptional)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {showOptional ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        <span>Optional details (can be added later)</span>
      </button>

      {showOptional && (
        <div className="space-y-3 pt-2 pb-4 border-t border-border/50">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="menu-category" className="text-sm text-muted-foreground">
                Menu Category
              </Label>
              <Select value={menuCategory} onValueChange={onMenuCategoryChange}>
                <SelectTrigger id="menu-category" className="h-12">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {sectionOptions.map((section) => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.label}
                    </SelectItem>
                  ))}
                  <div className="border-t border-border/60 px-3 py-2">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Add section</p>
                    <div className="flex items-center gap-2">
                      <Input
                        value={newSectionLabel}
                        onChange={(event) => setNewSectionLabel(event.target.value)}
                        placeholder="e.g. Brunch"
                        className="h-9"
                        onPointerDown={(event) => event.stopPropagation()}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            handleAddSection();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddSection}
                        disabled={!canAddSection}
                        onPointerDown={(event) => event.stopPropagation()}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="serving-size" className="text-sm text-muted-foreground">
                Serving Size
              </Label>
              <Select value={servingSize} onValueChange={onServingSizeChange}>
                <SelectTrigger id="serving-size" className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 person</SelectItem>
                  <SelectItem value="2">2 people</SelectItem>
                  <SelectItem value="4">4 people</SelectItem>
                  <SelectItem value="6">6 people</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price" className="text-sm text-muted-foreground">
              Price (optional)
            </Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => onPriceChange(e.target.value)}
              placeholder="0.00"
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm text-muted-foreground">
              Description (optional)
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Brief description of the dish..."
              className="min-h-[80px] resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
};
