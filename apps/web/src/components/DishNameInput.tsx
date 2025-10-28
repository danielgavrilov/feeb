import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  allocateTemporarySection,
  loadSavedMenuSections,
  MENU_SECTIONS_EVENT,
  refreshMenuSections,
  saveMenuSections,
  type MenuSectionsEventDetail,
  type StoredMenuSection,
} from "@/lib/menu-sections";
import { shouldOpenDishSuggestions } from "./dishSuggestionState.js";

const FALLBACK_MENU_SECTIONS: StoredMenuSection[] = [
  { id: -101, label: "Appetizer", isTemporary: true },
  { id: -102, label: "Main", isTemporary: true },
  { id: -103, label: "Side", isTemporary: true },
  { id: -104, label: "Dessert", isTemporary: true },
  { id: -105, label: "Beverage", isTemporary: true },
];

export interface DishSuggestion {
  id: string;
  name: string;
  status?: "needs_review" | "confirmed" | "live";
}

interface DishNameInputProps {
  value: string;
  onChange: (value: string) => void;
  onRecipeMatch: (recipeId: string) => void;
  menuSectionId: string;
  onMenuSectionChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  servingSize: string;
  onServingSizeChange: (value: string) => void;
  price: string;
  onPriceChange: (value: string) => void;
  formatPrice: (value: string | number | null | undefined) => string;
  existingDishes: DishSuggestion[];
  selectedDishId?: string | null;
  onClearSelectedDish?: () => void;
  restaurantId?: number | null;
}

export const DishNameInput = ({
  value,
  onChange,
  onRecipeMatch,
  menuSectionId,
  onMenuSectionChange,
  description,
  onDescriptionChange,
  servingSize,
  onServingSizeChange,
  price,
  onPriceChange,
  formatPrice,
  existingDishes,
  selectedDishId,
  onClearSelectedDish,
  restaurantId,
}: DishNameInputProps) => {
  const [showOptional, setShowOptional] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isPopoverHovered, setIsPopoverHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const hasSelectedDish = Boolean(selectedDishId);
  const [menuSections, setMenuSections] = useState<StoredMenuSection[]>([...FALLBACK_MENU_SECTIONS]);
  const [isSectionsLoading, setIsSectionsLoading] = useState(false);
  const [sectionsError, setSectionsError] = useState<string | null>(null);
  const [newSectionLabel, setNewSectionLabel] = useState("");

  useEffect(() => {
    if (!restaurantId) {
      setMenuSections([...FALLBACK_MENU_SECTIONS]);
      return;
    }

    const cached = loadSavedMenuSections(restaurantId);
    setMenuSections(cached.sections.length > 0 ? cached.sections : [...FALLBACK_MENU_SECTIONS]);
    setSectionsError(null);
    setIsSectionsLoading(true);

    refreshMenuSections(restaurantId)
      .then(({ sections }) => {
        setMenuSections(sections.length > 0 ? sections : [...FALLBACK_MENU_SECTIONS]);
      })
      .catch((error) => {
        console.error("Failed to refresh dish sections", error);
        setSectionsError("Unable to refresh menu sections.");
      })
      .finally(() => {
        setIsSectionsLoading(false);
      });
  }, [restaurantId]);

  useEffect(() => {
    if (typeof window === "undefined" || !restaurantId) {
      return;
    }

    const handleSectionsUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<MenuSectionsEventDetail>;
      if (!customEvent.detail || customEvent.detail.restaurantId !== restaurantId) {
        return;
      }

      setMenuSections(
        customEvent.detail.sections.length > 0
          ? customEvent.detail.sections
          : [...FALLBACK_MENU_SECTIONS],
      );
    };

    window.addEventListener(MENU_SECTIONS_EVENT, handleSectionsUpdated);
    return () => {
      window.removeEventListener(MENU_SECTIONS_EVENT, handleSectionsUpdated);
    };
  }, [restaurantId]);

  const sectionLabelMap = useMemo(() => {
    const entries = new Map<string, string>();
    FALLBACK_MENU_SECTIONS.forEach((section) => {
      entries.set(section.id.toString(), section.label);
    });
    menuSections.forEach((section) => {
      entries.set(section.id.toString(), section.label);
    });
    return entries;
  }, [menuSections]);

  const sectionOptions = menuSections.length > 0 ? menuSections : FALLBACK_MENU_SECTIONS;

  const handleAddSection = async () => {
    const trimmedLabel = newSectionLabel.trim();
    if (!trimmedLabel) {
      return;
    }

    if (!restaurantId) {
      const temp = allocateTemporarySection(trimmedLabel);
      setMenuSections((prev) => [...prev, temp]);
      onMenuSectionChange(temp.id.toString());
      setNewSectionLabel("");
      return;
    }

    try {
      const temp = allocateTemporarySection(trimmedLabel);
      const { sections } = await saveMenuSections(restaurantId, [...sectionOptions, temp]);
      setMenuSections(sections.length > 0 ? sections : [...FALLBACK_MENU_SECTIONS]);
      const created = sections.find((section) => section.label === trimmedLabel) ?? sections[sections.length - 1];
      if (created) {
        onMenuSectionChange(created.id.toString());
      }
      setNewSectionLabel("");
    } catch (error) {
      console.error("Failed to create menu section", error);
      setSectionsError("Unable to create menu section. Please try again.");
    }
  };

  const canAddSection = newSectionLabel.trim().length > 0;

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

      const isDishNeedsReview = dish.status === "needs_review";
      const isExistingNeedsReview = existing.status === "needs_review";
      
      if (isDishNeedsReview && !isExistingNeedsReview) {
        uniqueByName.set(trimmedName, dish);
      }
    });

    return Array.from(uniqueByName.values()).sort((a, b) => {
      const aIsNeedsReview = a.status === "needs_review";
      const bIsNeedsReview = b.status === "needs_review";
      
      if (aIsNeedsReview === bIsNeedsReview) {
        return a.name.localeCompare(b.name);
      }

      return aIsNeedsReview ? -1 : 1;
    });
  }, [existingDishes]);

  const filteredSuggestions = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) {
      return suggestionOptions;
    }

    return suggestionOptions.filter((option) => option.name.toLowerCase().includes(query));
  }, [suggestionOptions, value]);

  useEffect(() => {
    if (hasSelectedDish) {
      setIsInputFocused(false);
      setIsPopoverHovered(false);
    }
  }, [hasSelectedDish]);

  useEffect(() => {
    if (suggestionOptions.length === 0) {
      setIsPopoverHovered(false);
    }
  }, [suggestionOptions.length]);

  const handleOptionSelect = (option: DishSuggestion) => {
    onChange(option.name);
    setIsInputFocused(false);
    setIsPopoverHovered(false);
    onRecipeMatch(option.id);
    // Keep focus on input after selection
    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleInputFocus = () => {
    setIsInputFocused(true);
  };

  const handleInputBlur = () => {
    // Delay to allow clicking on suggestions
    setTimeout(() => {
      if (!isPopoverHovered && document.activeElement !== inputRef.current) {
        setIsInputFocused(false);
      }
    }, 150);
  };

  const handlePopoverMouseEnter = () => {
    setIsPopoverHovered(true);
  };

  const handlePopoverMouseLeave = () => {
    setIsPopoverHovered(false);
    // Close the suggestions when mouse leaves and input isn't focused
    if (!inputRef.current || document.activeElement !== inputRef.current) {
      setIsInputFocused(false);
    }
  };

  const shouldShowSuggestions = shouldOpenDishSuggestions({
    hasSelectedDish,
    suggestionCount: suggestionOptions.length,
    isInputFocused,
    isPopoverHovered,
  });

  const optionalSummaryItems: string[] = [];
  if (menuSectionId) {
    optionalSummaryItems.push(sectionLabelMap.get(menuSectionId) ?? menuSectionId);
  }
  if (servingSize && servingSize !== "1") {
    optionalSummaryItems.push(`Serves ${servingSize}`);
  }
  if (price.trim()) {
    const formattedPrice = formatPrice(price);
    if (formattedPrice) {
      optionalSummaryItems.push(`Price: ${formattedPrice}`);
    }
  }
  const hasDescription = description.trim().length > 0;
  const hasOptionalSummary = optionalSummaryItems.length > 0 || hasDescription;

  return (
    <div className="space-y-4">
      {sectionsError && (
        <Alert variant="destructive" className="flex items-start gap-2">
          <AlertDescription>{sectionsError}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-3">
        <Label htmlFor="dish-name" className="text-lg font-semibold text-foreground sm:text-xl">
          Dish Name
        </Label>
        <div className="relative">
          <Input
            ref={inputRef}
            id="dish-name"
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
            }}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder="Enter dish name..."
            className="h-14 border-2 pr-14 text-xl font-medium sm:h-16 sm:text-2xl"
            autoComplete="off"
          />
          {hasSelectedDish && onClearSelectedDish && (
            <button
              type="button"
              onClick={() => {
                setIsInputFocused(false);
                setIsPopoverHovered(false);
                onClearSelectedDish();
                inputRef.current?.focus();
              }}
              className="absolute inset-y-0 right-4 flex items-center text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Clear selected dish"
            >
              <X className="h-5 w-5" />
            </button>
          )}
          
          {/* Suggestions dropdown - conditionally rendered */}
          {shouldShowSuggestions && !hasSelectedDish && suggestionOptions.length > 0 && (
            <div
              className="absolute top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-md border border-border bg-popover py-2 shadow-md z-50"
              onMouseEnter={handlePopoverMouseEnter}
              onMouseLeave={handlePopoverMouseLeave}
            >
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
                      variant={option.status === "confirmed" || option.status === "live" ? "secondary" : "destructive"}
                      className="pointer-events-none"
                    >
                      {option.status === "needs_review" ? "Review" : "Ingredients confirmed"}
                    </Badge>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
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
        className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        {showOptional ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        <span>Optional details (can be added later)</span>
      </button>

      {showOptional && (
        <div className="space-y-3 border-t border-border/50 pt-2 pb-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="menu-category" className="text-sm text-muted-foreground">
                Menu Category
              </Label>
              <Select value={menuSectionId} onValueChange={onMenuSectionChange}>
                <SelectTrigger id="menu-category" className="h-12">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {sectionOptions.map((section) => (
                    <SelectItem key={section.id} value={section.id.toString()}>
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
              {sectionsError && (
                <p className="text-xs text-destructive mt-1">{sectionsError}</p>
              )}
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
