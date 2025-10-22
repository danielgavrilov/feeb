import { FormEvent, useEffect, useMemo, useState } from "react";

import { Search, X } from "lucide-react";

import { SavedDish, getDishAllergenDefinitions } from "./RecipeBook";
import { DishCard } from "./menu/DishCard";
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
import { ALLERGEN_FILTERS, allergenFilterMap } from "@/data/allergen-filters";
import type { AllergenFilterDefinition } from "@/data/allergen-filters";
import { expandIngredientSearchTerms } from "@/data/ingredient-search";
import {
  loadSavedMenuSections,
  refreshMenuSections,
  MENU_SECTIONS_EVENT,
  type MenuSectionsEventDetail,
  type StoredMenuSection,
} from "@/lib/menu-sections";
import {
  summarizeDishAllergens,
  isVeganFriendly,
  isVegetarianFriendly,
} from "@/lib/allergen-utils";

const UNCATEGORIZED_ID = "__uncategorized__";

const normalizeCategoryId = (category?: string | null) => {
  const trimmed = category?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : UNCATEGORIZED_ID;
};

const getFallbackCategoryLabel = (categoryId: string) =>
  categoryId === UNCATEGORIZED_ID ? "Other" : categoryId;

const allergenSummaryCache = new WeakMap<SavedDish, ReturnType<typeof summarizeDishAllergens>>();

type DishAllergenSummary = ReturnType<typeof summarizeDishAllergens>;

const buildNormalizedCodeSet = (definition: AllergenFilterDefinition) => {
  const normalizedCodes = new Set<string>();
  const addCode = (value?: string) => {
    if (!value) {
      return;
    }
    const normalized = value.toLowerCase();
    normalizedCodes.add(normalized);
    if (normalized.includes(":")) {
      const unprefixed = normalized.split(":").pop();
      if (unprefixed) {
        normalizedCodes.add(unprefixed);
      }
    }
  };

  addCode(definition.id);
  definition.codes.forEach(addCode);
  return normalizedCodes;
};

const buildNormalizedKeywordSet = (definition: AllergenFilterDefinition) => {
  const keywords = new Set<string>();
  [definition.name, ...definition.keywords].forEach((keyword) => {
    const normalized = keyword.trim().toLowerCase();
    if (normalized) {
      keywords.add(normalized);
    }
  });
  return keywords;
};

const getDefinitionMemberNames = (
  summary: DishAllergenSummary,
  definition: AllergenFilterDefinition,
) => {
  const normalizedCodes = buildNormalizedCodeSet(definition);
  const normalizedKeywords = buildNormalizedKeywordSet(definition);
  const members = new Set<string>();

  summary.canonicalAllergens.forEach((allergen) => {
    const code = allergen.code?.toLowerCase() ?? "";
    const shortCode = code.includes(":") ? code.split(":").pop() ?? "" : code;
    const familyCode = allergen.familyCode?.toLowerCase() ?? "";
    const familyShortCode = familyCode.includes(":") ? familyCode.split(":").pop() ?? "" : familyCode;
    const canonicalName = allergen.name?.trim();
    const canonicalNameLower = canonicalName?.toLowerCase() ?? "";
    const familyNameLower = allergen.familyName?.toLowerCase() ?? "";

    if (
      (code && normalizedCodes.has(code)) ||
      (shortCode && normalizedCodes.has(shortCode)) ||
      (familyCode && normalizedCodes.has(familyCode)) ||
      (familyShortCode && normalizedCodes.has(familyShortCode))
    ) {
      if (canonicalName) {
        members.add(canonicalName);
      }
      return;
    }

    if (
      (canonicalNameLower && normalizedKeywords.has(canonicalNameLower)) ||
      (familyNameLower && normalizedKeywords.has(familyNameLower))
    ) {
      if (canonicalName) {
        members.add(canonicalName);
      }
    }
  });

  return Array.from(members);
};

const getDishAllergenSummary = (dish: SavedDish) => {
  const cached = allergenSummaryCache.get(dish);
  if (cached) {
    return cached;
  }

  const summary = summarizeDishAllergens(dish.ingredients);
  allergenSummaryCache.set(dish, summary);
  return summary;
};

const dishContainsAllergen = (dish: SavedDish, allergenId: string) => {
  const definition = allergenFilterMap.get(allergenId);
  if (!definition) {
    return false;
  }

  const summary = getDishAllergenSummary(dish);
  const { codes, keywords, category } = definition;
  const normalizedCodeSet = new Set<string>([definition.id.toLowerCase(), ...codes.map((code) => code.toLowerCase())]);
  const normalizedNameSet = new Set<string>([
    definition.name.toLowerCase(),
    ...keywords.map((keyword) => keyword.toLowerCase()),
  ]);
  const normalizedKeywords = keywords.map((keyword) => keyword.toLowerCase());

  if (definition.id === "vegan") {
    const summary = getDishAllergenSummary(dish);
    return !isVeganFriendly(summary);
  }

  if (definition.id === "vegetarian") {
    return !isVegetarianFriendly(summary);
  }

  return dish.ingredients.some((ingredient) => {
    const ingredientName = ingredient.name?.toLowerCase() ?? "";
    const allergens = ingredient.allergens ?? [];

    const matchesAllergenList = allergens.some((allergen) => {
      const code = allergen.code?.toLowerCase() ?? "";
      const name = allergen.name?.toLowerCase() ?? "";

      if (normalizedCodeSet.has(code) || normalizedCodeSet.has(name)) {
        return true;
      }

  const normalizedCodeSet = buildNormalizedCodeSet(definition);
  const normalizedKeywordSet = buildNormalizedKeywordSet(definition);

  for (const code of summary.canonicalCodes) {
    if (normalizedCodeSet.has(code.toLowerCase())) {
      return true;
    }
  }

  for (const family of summary.familyCodes) {
    if (normalizedCodeSet.has(family.toLowerCase())) {
      return true;
    }
  }

  for (const allergen of summary.canonicalAllergens) {
    const canonicalName = allergen.name?.toLowerCase();
    if (canonicalName && normalizedKeywordSet.has(canonicalName)) {
      return true;
    }

    const familyName = allergen.familyName?.toLowerCase();
    if (familyName && normalizedKeywordSet.has(familyName)) {
      return true;
    }
  }

  return false;
};

interface MenuViewProps {
  dishes: SavedDish[];
  restaurantName: string;
  showImages: boolean;
  formatPrice: (value: string | number | null | undefined) => string;
  restaurantId?: number | null;
}

export const MenuView = ({ dishes, restaurantName, showImages, formatPrice, restaurantId }: MenuViewProps) => {
  const [filterMode, setFilterMode] = useState<"highlight" | "exclude">("highlight");
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [ingredientInputValue, setIngredientInputValue] = useState("");
  const [ingredientSearchTerms, setIngredientSearchTerms] = useState<string[]>([]);
  const [showIngredients, setShowIngredients] = useState(false);
  const [savedSections, setSavedSections] = useState<StoredMenuSection[]>([]);
  const sectionLabelMap = useMemo(() => {
    const entries = new Map<string, string>();
    savedSections.forEach((section) => {
      entries.set(section.id.toString(), section.label);
    });
    return entries;
  }, [savedSections]);

  useEffect(() => {
    if (!restaurantId) {
      setSavedSections([]);
      return;
    }

    let isActive = true;
    const cached = loadSavedMenuSections(restaurantId);
    setSavedSections(cached.sections);

    refreshMenuSections(restaurantId)
      .then(({ sections }) => {
        if (isActive) {
          setSavedSections(sections);
        }
      })
      .catch((error) => {
        console.error("Failed to refresh menu view sections", error);
      });

    return () => {
      isActive = false;
    };
  }, [restaurantId]);

  useEffect(() => {
    const handleSectionsUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<MenuSectionsEventDetail>;
      if (!restaurantId || !customEvent.detail || customEvent.detail.restaurantId !== restaurantId) {
        return;
      }

      setSavedSections(customEvent.detail.sections);
    };

    window.addEventListener(MENU_SECTIONS_EVENT, handleSectionsUpdated);
    return () => {
      window.removeEventListener(MENU_SECTIONS_EVENT, handleSectionsUpdated);
    };
  }, [restaurantId]);

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

  const ingredientMatchers = useMemo(
    () =>
      ingredientSearchTerms
        .map((term) => {
          const normalized = term.trim().toLowerCase();
          if (!normalized) {
            return null;
          }

          return {
            raw: term,
            normalized,
            expansion: expandIngredientSearchTerms(normalized),
          };
        })
        .filter((entry): entry is {
          raw: string;
          normalized: string;
          expansion: ReturnType<typeof expandIngredientSearchTerms>;
        } => Boolean(entry)),
    [ingredientSearchTerms],
  );

  const ingredientMatchEvaluator = useMemo(() => {
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
      if (!ingredients.length || ingredientMatchers.length === 0) {
        return { score: 0, matches: [] as string[] };
      }

      let bestOverallScore = 0;
      const matches = new Set<string>();

      ingredientMatchers.forEach((matcher) => {
        let bestScoreForMatcher = 0;
        const { expansion } = matcher;

        if (expansion.phrase) {
          ingredients.forEach((ingredient) => {
            if (ingredient.includes(expansion.phrase!)) {
              const coverage = expansion.phrase!.length / ingredient.length;
              bestScoreForMatcher = Math.max(bestScoreForMatcher, 1 + coverage * 0.3);
            }
          });
        }

        expansion.terms.forEach((term) => {
          ingredients.forEach((ingredient) => {
            const score = computeTermScore(ingredient, term);
            if (score > bestScoreForMatcher) {
              bestScoreForMatcher = score;
            }
          });
        });

        if (bestScoreForMatcher > 0) {
          matches.add(matcher.raw);
          if (bestScoreForMatcher > bestOverallScore) {
            bestOverallScore = bestScoreForMatcher;
          }
        }
      });

      return {
        score: bestOverallScore,
        matches: Array.from(matches),
      };
    };
    return computeScore;
  }, [ingredientMatchers, normalizedIngredientMap]);

  const ingredientMatchResults = useMemo(() => {
    const results = new Map<string, { score: number; matches: string[] }>();
    menuDishes.forEach((dish) => {
      results.set(dish.id, ingredientMatchEvaluator(dish.id));
    });
    return results;
  }, [ingredientMatchEvaluator, menuDishes]);

  const allergenProcessedMenuDishes = useMemo(() => {
    if (filterMode === "exclude") {
      return menuDishes.filter((dish) =>
        selectedAllergens.every((allergenId) => !dishContainsAllergen(dish, allergenId)),
      );
    }

    return menuDishes;
  }, [filterMode, menuDishes, selectedAllergens]);

  const visibleMenuDishes = useMemo(() => {
    const hasIngredientTerms = ingredientMatchers.length > 0;

    if (filterMode === "exclude") {
      if (!hasIngredientTerms) {
        return allergenProcessedMenuDishes;
      }

      return allergenProcessedMenuDishes
        .map((dish) => ({ dish, match: ingredientMatchResults.get(dish.id) }))
        .filter((entry) => (entry.match?.score ?? 0) > 0)
        .sort((a, b) => (b.match?.score ?? 0) - (a.match?.score ?? 0))
        .map((entry) => entry.dish);
    }

    if (!hasIngredientTerms) {
      return allergenProcessedMenuDishes;
    }

    const matching: SavedDish[] = [];
    const nonMatching: SavedDish[] = [];

    allergenProcessedMenuDishes.forEach((dish) => {
      const match = ingredientMatchResults.get(dish.id);
      if (match && match.score > 0) {
        matching.push(dish);
      } else {
        nonMatching.push(dish);
      }
    });

    return [...matching, ...nonMatching];
  }, [allergenProcessedMenuDishes, filterMode, ingredientMatchResults, ingredientMatchers.length]);

  const hasActiveFilters = selectedAllergens.length > 0 || ingredientSearchTerms.length > 0;

  const handleSelectAllergen = (allergenId: string) => {
    setSelectedAllergens((prev) => (prev.includes(allergenId) ? prev : [...prev, allergenId]));
  };

  const handleRemoveAllergen = (allergenId: string) => {
    setSelectedAllergens((prev) => prev.filter((id) => id !== allergenId));
  };

  const handleAddIngredientTerm = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }

    setIngredientSearchTerms((prev) => {
      const exists = prev.some((term) => term.toLowerCase() === trimmed.toLowerCase());
      if (exists) {
        return prev;
      }
      return [...prev, trimmed];
    });
    setIngredientInputValue("");
  };

  const handleRemoveIngredientTerm = (term: string) => {
    setIngredientSearchTerms((prev) => prev.filter((existing) => existing !== term));
  };

  const handleIngredientSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleAddIngredientTerm(ingredientInputValue);
  };

  const handleClearAll = () => {
    setSelectedAllergens([]);
    setIngredientSearchTerms([]);
    setIngredientInputValue("");
  };

  const categoryOrder = useMemo(() => {
    const uniqueCategories = new Set<string>();

    visibleMenuDishes.forEach((dish) => {
      uniqueCategories.add(normalizeCategoryId(dish.menuSectionId));
    });

    const sectionOrder = savedSections
      .map((section) => section.id.toString())
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
    <div className="bg-background">
      <header className="border-b border-border/60 bg-background/80">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 py-4 sm:px-6 sm:py-6">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{restaurantName}</h1>
          <p className="text-sm text-muted-foreground">
            These dishes are currently available on your menu.
          </p>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-6 sm:px-6 sm:py-10">
        <section className="rounded-xl border border-border/60 bg-card p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground">Ingredients & allergens</h2>
                <p className="text-sm text-muted-foreground max-w-2xl">
                  Choose allergens to highlight or hide dishes, or search for ingredients to surface potential
                  concerns.
                </p>
              </div>
              <div className="flex flex-col items-start gap-3 md:items-end">
                <div className="flex items-center gap-2">
                  <Switch
                    id="menu-show-ingredients"
                    checked={showIngredients}
                    onCheckedChange={setShowIngredients}
                  />
                  <Label htmlFor="menu-show-ingredients" className="text-sm font-medium text-foreground">
                    Show ingredients
                  </Label>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-end">
                <div className="space-y-2 md:w-1/2">
                  <Label htmlFor="allergen-select" className="text-sm font-medium text-foreground">
                    Pick an allergen
                  </Label>
                  <Select onValueChange={handleSelectAllergen}>
                    <SelectTrigger id="allergen-select" className="w-full">
                      <SelectValue placeholder="Select an allergen or dietary tag" />
                    </SelectTrigger>
                    <SelectContent>
                      {ALLERGEN_FILTERS.map((definition) => (
                        <SelectItem
                          key={definition.id}
                          value={definition.id}
                          disabled={selectedAllergens.includes(definition.id)}
                          className="flex items-center gap-2"
                        >
                          {definition.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:w-1/2">
                  <Label htmlFor="ingredient-search" className="text-sm font-medium text-foreground">
                    Or search an ingredient
                  </Label>
                  <form onSubmit={handleIngredientSubmit} className="w-full">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                      <Input
                        id="ingredient-search"
                        value={ingredientInputValue}
                        onChange={(event) => setIngredientInputValue(event.target.value)}
                        placeholder="Add an ingredient, e.g. mushroom, soy, cilantro..."
                        className="pl-10 pr-10"
                        autoComplete="off"
                      />
                      {ingredientInputValue && (
                        <button
                          type="button"
                          aria-label="Clear ingredient input"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={() => setIngredientInputValue("")}
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              </div>

              {hasActiveFilters && (
                <div className="flex justify-end">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="exclude-selection"
                      checked={filterMode === "exclude"}
                      onCheckedChange={(checked) => setFilterMode(checked ? "exclude" : "highlight")}
                    />
                    <Label htmlFor="exclude-selection" className="text-sm font-medium text-foreground">
                      Exclude selection
                    </Label>
                  </div>
                </div>
              )}

              {(selectedAllergens.length > 0 || ingredientSearchTerms.length > 0) && (
                <div className="flex flex-wrap items-center gap-2">
                  {selectedAllergens.map((allergenId) => {
                    const definition = allergenFilterMap.get(allergenId);
                    if (!definition) {
                      return null;
                    }

                    const Icon = definition.Icon;
                    return (
                      <Badge
                        key={allergenId}
                        className="flex items-center gap-2 rounded-full bg-muted text-foreground border border-border/60 px-3 py-1 h-auto"
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-sm">{definition.name}</span>
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

                  {ingredientSearchTerms.map((term) => (
                    <Badge
                      key={term}
                      className="flex items-center gap-2 rounded-full bg-muted text-foreground border border-border/60 px-3 py-1 h-auto"
                    >
                      <span className="text-sm">{term}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveIngredientTerm(term)}
                        className="text-muted-foreground transition hover:text-foreground"
                        aria-label={`Remove ${term} search`}
                      >
                        <X size={14} />
                      </button>
                    </Badge>
                  ))}

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-3 text-xs"
                    onClick={handleClearAll}
                  >
                    Clear all
                  </Button>
                </div>
              )}
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
              (dish) => normalizeCategoryId(dish.menuSectionId) === categoryId,
            );

            if (dishesInCategory.length === 0) {
              return null;
            }

            return (
              <section key={categoryId} className="space-y-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                  <h2 className="text-2xl font-semibold text-foreground">
                    {sectionLabelMap.get(categoryId) ?? getFallbackCategoryLabel(categoryId)}
                  </h2>
                  <span className="text-sm text-muted-foreground">
                    {dishesInCategory.length} {dishesInCategory.length === 1 ? "item" : "items"}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {dishesInCategory.map((dish) => {
                    const ingredientMatch = ingredientMatchResults.get(dish.id);
                    const summary = getDishAllergenSummary(dish);
                    const allergenDefinitions = getDishAllergenDefinitions(dish, summary);
                    const allergenBadges = allergenDefinitions.map((definition) => {
                      const memberNames = getDefinitionMemberNames(summary, definition)
                        .map((name) => name.trim())
                        .filter((name): name is string => Boolean(name));
                      const sortedMembers = [...memberNames].sort((a, b) =>
                        a.localeCompare(b, undefined, { sensitivity: "base" }),
                      );
                      const label =
                        definition.category === "allergen" && sortedMembers.length > 0
                          ? `Contains: ${sortedMembers
                              .map((name) => name.toLowerCase())
                              .join(", ")}`
                          : definition.name;

                      return { definition, label };
                    });
                    const highlightedAllergens =
                      filterMode === "highlight"
                        ? selectedAllergens
                            .filter((allergenId) => dishContainsAllergen(dish, allergenId))
                            .map((allergenId) => allergenFilterMap.get(allergenId) ?? null)
                            .filter((definition): definition is AllergenFilterDefinition => Boolean(definition))
                        : [];
                    const highlightedIngredientTerms =
                      filterMode === "highlight" ? ingredientMatch?.matches ?? [] : [];

                    return (
                      <DishCard
                        key={dish.id}
                        dish={dish}
                        showImage={showImages}
                        showIngredients={showIngredients}
                        highlightedAllergens={highlightedAllergens}
                        highlightedIngredientTerms={highlightedIngredientTerms}
                        allergenBadges={allergenBadges}
                        formatPrice={formatPrice}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </main>
    </div>
  );
};
