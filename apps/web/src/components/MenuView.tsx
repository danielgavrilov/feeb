import { useEffect, useMemo, useRef, useState } from "react";

import { Search, X } from "lucide-react";

import { SavedDish } from "./RecipeBook";
import { DishCard } from "./menu/DishCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ALLERGEN_FILTERS, allergenFilterMap } from "@/data/allergen-filters";
import { expandIngredientSearchTerms } from "@/data/ingredient-search";
import { loadSavedMenuSections, MENU_SECTIONS_EVENT, StoredMenuSection } from "@/lib/menu-sections";

const UNCATEGORIZED_ID = "__uncategorized__";

const normalizeCategoryId = (category?: string | null) => {
  const trimmed = category?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : UNCATEGORIZED_ID;
};

const getFallbackCategoryLabel = (categoryId: string) =>
  categoryId === UNCATEGORIZED_ID ? "Other" : categoryId;

const dishContainsAllergen = (dish: SavedDish, allergenId: string) => {
  const definition = allergenFilterMap.get(allergenId);
  if (!definition) {
    return false;
  }

  const { codes, keywords, category } = definition;
  const normalizedCodes = codes.map((code) => code.toLowerCase());
  const normalizedKeywords = keywords.map((keyword) => keyword.toLowerCase());

  return dish.ingredients.some((ingredient) =>
    (ingredient.allergens ?? []).some((allergen) => {
      const code = allergen.code?.toLowerCase() ?? "";
      const name = allergen.name?.toLowerCase() ?? "";

      if (normalizedCodes.some((candidate) => code.includes(candidate))) {
        return true;
      }

      if (normalizedKeywords.some((candidate) => code.includes(candidate) || name.includes(candidate))) {
        return true;
      }

      return false;
    }) ||
    (category === "diet" &&
      normalizedCodes.some((candidate) =>
        ingredient.name.toLowerCase().includes(candidate.replace("en:", "")),
      )),
  );
};

interface MenuViewProps {
  dishes: SavedDish[];
  restaurantName: string;
  showImages: boolean;
}

export const MenuView = ({ dishes, restaurantName, showImages }: MenuViewProps) => {
  const [allergenQuery, setAllergenQuery] = useState("");
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [ingredientQuery, setIngredientQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const filterContainerRef = useRef<HTMLDivElement | null>(null);
  const [savedSections, setSavedSections] = useState<StoredMenuSection[]>(() => loadSavedMenuSections());
  const sectionLabelMap = useMemo(() => {
    const entries = new Map<string, string>();
    savedSections.forEach((section) => {
      entries.set(section.id, section.label);
    });
    return entries;
  }, [savedSections]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterContainerRef.current && !filterContainerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleSectionsUpdated: EventListener = (event) => {
      const customEvent = event as CustomEvent<StoredMenuSection[]>;
      if (Array.isArray(customEvent.detail)) {
        setSavedSections(customEvent.detail);
      } else {
        setSavedSections(loadSavedMenuSections());
      }
    };

    window.addEventListener(MENU_SECTIONS_EVENT, handleSectionsUpdated);
    return () => {
      window.removeEventListener(MENU_SECTIONS_EVENT, handleSectionsUpdated);
    };
  }, []);

  const menuDishes = useMemo(() => dishes.filter((dish) => dish.isOnMenu), [dishes]);

  const normalizedIngredientMap = useMemo(() => {
    const entries = new Map<string, string[]>();
    menuDishes.forEach((dish) => {
      const ingredients = dish.ingredients
        .map((ingredient) => ingredient.name?.toLowerCase().trim())
        .filter((name): name is string => Boolean(name && name.length > 0));
      entries.set(dish.id, ingredients);
    });
    return entries;
  }, [menuDishes]);

  const allergenFilteredMenuDishes = useMemo(
    () =>
      menuDishes.filter((dish) =>
        selectedAllergens.every((allergenId) => !dishContainsAllergen(dish, allergenId)),
      ),
    [menuDishes, selectedAllergens],
  );

  const allergenQueryValue = allergenQuery.trim().toLowerCase();
  const ingredientQueryValue = ingredientQuery.trim().toLowerCase();

  const allergenSuggestions = useMemo(() => {
    const available = ALLERGEN_FILTERS.filter((definition) => !selectedAllergens.includes(definition.id));

    if (!allergenQueryValue) {
      return available.slice(0, 6);
    }

    return available.filter(
      (definition) =>
        definition.name.toLowerCase().includes(allergenQueryValue) ||
        definition.keywords.some((keyword) => keyword.toLowerCase().includes(allergenQueryValue)),
    );
  }, [allergenQueryValue, selectedAllergens]);

  const handleSelectAllergen = (allergenId: string) => {
    setSelectedAllergens((prev) => (prev.includes(allergenId) ? prev : [...prev, allergenId]));
    setAllergenQuery("");
    setIsDropdownOpen(false);
  };

  const handleRemoveAllergen = (allergenId: string) => {
    setSelectedAllergens((prev) => prev.filter((id) => id !== allergenId));
  };

  const expandedIngredientQuery = useMemo(
    () => expandIngredientSearchTerms(ingredientQueryValue),
    [ingredientQueryValue],
  );

  const ingredientMatchScore = useMemo(() => {
    // Lightweight scoring keeps the search client-side. When we outgrow this,
    // consider wiring up the API-backed trigram/taxonomy approaches captured in
    // the ingredient-search data helpers.
    const computeDiceCoefficient = (a: string, b: string) => {
      if (a === b) {
        return 1;
      }
      if (a.length < 2 || b.length < 2) {
        return a[0] === b[0] ? 0.5 : 0;
      }

      const bigrams = (value: string) => {
        const grams: string[] = [];
        for (let index = 0; index < value.length - 1; index += 1) {
          grams.push(value.slice(index, index + 2));
        }
        return grams;
      };

      const aBigrams = bigrams(a);
      const bBigrams = bigrams(b);
      const bGramCounts = new Map<string, number>();

      bBigrams.forEach((gram) => {
        bGramCounts.set(gram, (bGramCounts.get(gram) ?? 0) + 1);
      });

      let overlap = 0;
      aBigrams.forEach((gram) => {
        const count = bGramCounts.get(gram) ?? 0;
        if (count > 0) {
          overlap += 1;
          bGramCounts.set(gram, count - 1);
        }
      });

      return (2 * overlap) / (aBigrams.length + bBigrams.length);
    };

    const computeTermScore = (ingredientName: string, term: string) => {
      if (!ingredientName || !term) {
        return 0;
      }

      if (ingredientName === term) {
        return 1.25;
      }

      if (ingredientName.includes(term)) {
        const positionBoost = 1 - ingredientName.indexOf(term) / (ingredientName.length + 1);
        return 1 + positionBoost * 0.25 + (term.length / ingredientName.length) * 0.25;
      }

      const parts = ingredientName.split(/[\s-]+/);
      let best = 0;

      parts.forEach((part) => {
        if (!part) {
          return;
        }

        if (part.includes(term)) {
          const coverage = term.length / part.length;
          best = Math.max(best, 0.6 + coverage * 0.4);
          return;
        }

        if (term.includes(part)) {
          best = Math.max(best, (part.length / term.length) * 0.5);
          return;
        }

        best = Math.max(best, computeDiceCoefficient(part, term) * 0.5);
      });

      return best;
    };

    const computeScore = (dishId: string) => {
      const ingredients = normalizedIngredientMap.get(dishId) ?? [];

      if (!expandedIngredientQuery.terms.length && !expandedIngredientQuery.phrase) {
        return 1;
      }

      if (!ingredients.length) {
        return 0;
      }

      let bestScore = 0;

      if (expandedIngredientQuery.phrase) {
        ingredients.forEach((ingredient) => {
          if (ingredient.includes(expandedIngredientQuery.phrase!)) {
            const coverage = expandedIngredientQuery.phrase!.length / ingredient.length;
            bestScore = Math.max(bestScore, 1 + coverage * 0.3);
          }
        });
      }

      expandedIngredientQuery.terms.forEach((term) => {
        ingredients.forEach((ingredient) => {
          const score = computeTermScore(ingredient, term);
          if (score > bestScore) {
            bestScore = score;
          }
        });
      });

      return bestScore;
    };

    return computeScore;
  }, [expandedIngredientQuery, normalizedIngredientMap]);

  const visibleMenuDishes = useMemo(() => {
    if (!ingredientQueryValue) {
      return allergenFilteredMenuDishes;
    }

    return allergenFilteredMenuDishes
      .map((dish) => ({ dish, score: ingredientMatchScore(dish.id) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.dish);
  }, [allergenFilteredMenuDishes, ingredientMatchScore, ingredientQueryValue]);

  const categoryOrder = useMemo(() => {
    const uniqueCategories = new Set<string>();

    visibleMenuDishes.forEach((dish) => {
      uniqueCategories.add(normalizeCategoryId(dish.menuCategory));
    });

    const sectionOrder = savedSections
      .map((section) => section.id)
      .filter((sectionId) => uniqueCategories.has(sectionId));

    const remaining = Array.from(uniqueCategories).filter(
      (categoryId) => !sectionOrder.includes(categoryId),
    );

    const ordered = [...sectionOrder, ...remaining.filter((id) => id !== UNCATEGORIZED_ID)];

    if (uniqueCategories.has(UNCATEGORIZED_ID)) {
      ordered.push(UNCATEGORIZED_ID);
    }

    return ordered;
  }, [savedSections, visibleMenuDishes]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-foreground">{restaurantName}</h1>
          <p className="text-sm text-muted-foreground">
            These dishes are currently available on your menu.
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-10">
        <section className="bg-card border border-border/60 rounded-xl p-6 shadow-sm" ref={filterContainerRef}>
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Allergen filters</h2>
              <p className="text-sm text-muted-foreground">
                Search for allergens or dietary preferences to hide dishes that contain them.
              </p>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                value={allergenQuery}
                onChange={(event) => {
                  setAllergenQuery(event.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => {
                  setIsDropdownOpen(true);
                }}
                placeholder="Filter allergens, e.g. gluten, milk, vegan..."
                className="pl-10 pr-10"
              />
              {allergenQuery && (
                <button
                  type="button"
                  aria-label="Clear allergen search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setAllergenQuery("")}
                >
                  <X size={16} />
                </button>
              )}

              {isDropdownOpen && allergenSuggestions.length > 0 && (
                <div className="absolute z-20 mt-2 w-full rounded-lg border border-border bg-popover shadow-lg">
                  <ul className="max-h-80 overflow-y-auto py-2">
                    {allergenSuggestions.map((definition) => (
                      <li key={definition.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectAllergen(definition.id)}
                          className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
                        >
                          <definition.Icon className="h-10 w-10" />
                          <div>
                            <div className="text-sm font-medium text-foreground">{definition.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {definition.category === "diet" ? "Diet" : "Allergen"}
                            </div>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {selectedAllergens.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {selectedAllergens.map((allergenId) => {
                  const definition = allergenFilterMap.get(allergenId);
                  if (!definition) {
                    return null;
                  }

                  const Icon = definition.Icon;
                  return (
                    <Badge key={allergenId} variant="secondary" className="flex items-center gap-2 pr-2">
                      <Icon className="h-6 w-6" />
                      <span>{definition.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAllergen(allergenId)}
                        className="text-muted-foreground transition hover:text-foreground"
                        aria-label={`Remove ${definition.name} filter`}
                      >
                        <X size={14} />
                      </button>
                    </Badge>
                  );
                })}

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setSelectedAllergens([])}
                >
                  Clear filters
                </Button>
              </div>
            )}

            <div className="pt-6 border-t border-border/60">
              <h2 className="text-lg font-semibold text-foreground">Ingredient search</h2>
              <p className="text-sm text-muted-foreground">
                Highlight dishes whose ingredient lists match your query or common synonyms.
              </p>

              <div className="relative mt-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  value={ingredientQuery}
                  onChange={(event) => setIngredientQuery(event.target.value)}
                  placeholder="Search ingredients, e.g. mushroom, shiitake, cilantro..."
                  className="pl-10 pr-10"
                />
                {ingredientQuery && (
                  <button
                    type="button"
                    aria-label="Clear ingredient search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setIngredientQuery("")}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {visibleMenuDishes.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-xl text-muted-foreground">
              {menuDishes.length === 0
                ? "No dishes have been added to the menu yet."
                : "No dishes match your current filters."}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {menuDishes.length === 0
                ? 'Mark dishes as "Added to menu" in the Recipe Book to see them here.'
                : "Try adjusting your allergen or ingredient filters to bring dishes back."}
            </p>
          </div>
        ) : (
          categoryOrder.map((categoryId) => {
            const dishesInCategory = visibleMenuDishes.filter(
              (dish) => normalizeCategoryId(dish.menuCategory) === categoryId,
            );

            if (dishesInCategory.length === 0) {
              return null;
            }

            return (
              <section key={categoryId} className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-2xl font-semibold text-foreground">
                    {sectionLabelMap.get(categoryId) ?? getFallbackCategoryLabel(categoryId)}
                  </h2>
                  <span className="text-sm text-muted-foreground">
                    {dishesInCategory.length} {dishesInCategory.length === 1 ? "item" : "items"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dishesInCategory.map((dish) => (
                    <DishCard key={dish.id} dish={dish} showImage={showImages} />
                  ))}
                </div>
              </section>
            );
          })
        )}
      </main>
    </div>
  );
};
