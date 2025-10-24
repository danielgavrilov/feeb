import { useState, useEffect, useRef, useCallback } from "react";
import { DishNameInput } from "@/components/DishNameInput";
import { IngredientsList, IngredientState } from "@/components/IngredientsList";
import { PrepMethodInput } from "@/components/PrepMethodInput";
import { ComplianceOverview } from "@/components/ComplianceOverview";
import { RecipeBook, SavedDish, RecipeBulkAction } from "@/components/RecipeBook";
import { MenuView } from "@/components/MenuView";
import { Settings } from "@/components/Settings";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useRestaurant } from "@/hooks/useRestaurant";
import { useRecipes } from "@/hooks/useRecipes";
import {
  Recipe,
  updateRecipeIngredient as updateRecipeIngredientAPI,
  deleteRecipeIngredient as deleteRecipeIngredientAPI,
  UpdateRecipeIngredientRequest,
} from "@/lib/api";
import { LandingPage } from "@/components/LandingPage";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSearchParams } from "react-router-dom";
import {
  CurrencyOption,
  PriceDisplayFormat,
  DEFAULT_CURRENCY,
  DEFAULT_PRICE_FORMAT,
  formatPriceDisplay,
} from "@/lib/price-format";
import { ARCHIVE_SECTION_ID, ARCHIVE_SECTION_LABEL, loadSavedMenuSections } from "@/lib/menu-sections";
import { mapIngredientAllergens, mapRecipesToSavedDishes } from "./recipe-mappers";

const Index = () => {
  const { t } = useLanguage();
  const {
    restaurant,
    restaurants,
    createRestaurant: createRestaurantAPI,
    selectRestaurant,
    updateRestaurant,
    deleteRestaurant: deleteRestaurantAPI,
  } = useRestaurant();
  const {
    recipes,
    createRecipe: createRecipeAPI,
    updateRecipe: updateRecipeAPI,
    deleteRecipe: deleteRecipeAPI,
  } = useRecipes(restaurant?.id || null);

  const validTabs = ["landing", "add", "recipes", "menu", "settings"] as const;
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTabParam = searchParams.get("tab");
  const initialTab = validTabs.includes(initialTabParam as typeof validTabs[number])
    ? (initialTabParam as typeof validTabs[number])
    : "landing";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [dishName, setDishName] = useState("");
  const [menuSectionId, setMenuSectionId] = useState("");
  const [description, setDescription] = useState("");
  const [servingSize, setServingSize] = useState("1");
  const [price, setPrice] = useState("");
  const [ingredients, setIngredients] = useState<IngredientState[]>([]);
  const [prepMethod, setPrepMethod] = useState("");
  const [dishImage, setDishImage] = useState("");
  const [editingDishId, setEditingDishId] = useState<number | null>(null);
  const [showPrepMethod, setShowPrepMethod] = useState(false);
  const [showMenuImages, setShowMenuImages] = useState(false);
  const [currency, setCurrency] = useState<CurrencyOption>(DEFAULT_CURRENCY);
  const [priceFormat, setPriceFormat] = useState<PriceDisplayFormat>(DEFAULT_PRICE_FORMAT);
  const prepInputRef = useRef<HTMLTextAreaElement | null>(null);
  const manualAddTabSelectionRef = useRef(false);

  const formatPrice = useCallback(
    (value: string | number | null | undefined) =>
      formatPriceDisplay(value, { currency, format: priceFormat }),
    [currency, priceFormat],
  );

  const deriveMenuSectionKey = useCallback(
    (recipe: Recipe): string => {
      const primarySection = recipe.sections[0];
      if (!primarySection) {
        return "";
      }

      return primarySection.section_name.trim().toLowerCase() === ARCHIVE_SECTION_LABEL.toLowerCase()
        ? ARCHIVE_SECTION_ID
        : primarySection.section_id.toString();
    },
    [],
  );

  const resolveSectionId = useCallback(
    (sectionKey: string): number | null => {
      if (!restaurant?.id) {
        return null;
      }

      if (!sectionKey) {
        return null;
      }

      const cached = loadSavedMenuSections(restaurant.id);

      if (sectionKey === ARCHIVE_SECTION_ID) {
        const archive = cached.sections.find((section) =>
          section.label.trim().toLowerCase() === ARCHIVE_SECTION_LABEL.toLowerCase(),
        );
        return archive ? archive.id : null;
      }

      const numericId = Number(sectionKey);
      if (!Number.isNaN(numericId)) {
        return numericId;
      }

      const match = cached.sections.find(
        (section) =>
          section.id.toString() === sectionKey ||
          section.label.trim().toLowerCase() === sectionKey.trim().toLowerCase(),
      );

      return match ? match.id : null;
    },
    [restaurant?.id],
  );

  // Convert API recipes to SavedDish format for existing components
  const savedDishes: SavedDish[] = mapRecipesToSavedDishes(recipes, deriveMenuSectionKey);

  const totalRecipes = recipes.length;
  const unconfirmedRecipeCount = recipes.filter(recipe => !recipe.confirmed).length;
  const hasRecipeImages = recipes.some(recipe => Boolean(recipe.image));
  const menuUploadComplete = totalRecipes > 0 || hasRecipeImages;
  const firstUnconfirmedRecipe = recipes.find(recipe => !recipe.confirmed);
  const lastUnconfirmedRecipe = [...recipes].reverse().find(recipe => !recipe.confirmed);

  const reviewNoticeMessage =
    unconfirmedRecipeCount > 0
      ? t("landing.reviewStatus.pending", { count: unconfirmedRecipeCount })
      : null;

  const handleStartNew = useCallback(() => {
    setDishName("");
    setMenuSectionId("");
    setDescription("");
    setServingSize("1");
    setPrice("");
    setIngredients([]);
    setPrepMethod("");
    setDishImage("");
    setEditingDishId(null);
    setShowPrepMethod(false);
  }, []);

  const populateFormFromRecipe = (recipe: Recipe) => {
    setEditingDishId(recipe.id);
    setDishName(recipe.name);
    setMenuSectionId(deriveMenuSectionKey(recipe));
    setDescription(recipe.description || "");
    setServingSize(recipe.serving_size || "1");
    setPrice(recipe.price || "");
    setIngredients(
      recipe.ingredients.map((ing) => ({
        name: ing.ingredient_name,
        quantity: ing.quantity?.toString() || "",
        unit: ing.unit || (ing.confirmed ? "" : "pcs"), // Default to "pcs" for unconfirmed ingredients with missing units
        confirmed: ing.confirmed && !!(ing.quantity?.toString().trim() && (ing.unit?.trim() || "pcs")), // Only keep confirmed if valid
        ingredientId: ing.ingredient_id,
        originalName: ing.ingredient_name,
        allergens: mapIngredientAllergens(ing.allergens),
        dietaryInfo: [],
        substitution: ing.substitution,
      }))
    );
    setPrepMethod(recipe.instructions || "");
    setShowPrepMethod(Boolean(recipe.instructions));
    setDishImage(recipe.image || "");
    handleTabChange("add");
  };

  const handleRecipeMatch = (recipeId: string) => {
    const numericId = Number(recipeId);
    if (Number.isNaN(numericId)) {
      toast.error("We couldn't load that recipe. Please try again.");
      return;
    }

    const recipe = recipes.find((item) => item.id === numericId);
    if (!recipe) {
      toast.error("That recipe is no longer available in your recipe book.");
      return;
    }

    populateFormFromRecipe(recipe);
  };

  const handleClearDishSelection = () => {
    handleStartNew();
  };

  const handleUpdateIngredient = (index: number, quantity: string) => {
    const updated = [...ingredients];
    updated[index].quantity = quantity;
    setIngredients(updated);
  };

  const handleUpdateIngredientName = (index: number, name: string) => {
    setIngredients((current) =>
      current.map((ingredient, ingredientIndex) =>
        ingredientIndex === index ? { ...ingredient, name } : ingredient,
      ),
    );
  };

  const handleUpdateIngredientUnit = (index: number, unit: string) => {
    const updated = [...ingredients];
    updated[index].unit = unit;
    setIngredients(updated);
  };

  const persistIngredientChanges = useCallback(
    async (
      ingredient: IngredientState,
      overrides?: {
        name?: string;
        quantity?: string;
        unit?: string;
        confirmed?: boolean;
        allergens?: IngredientState["allergens"];
        substitution?: IngredientState["substitution"] | null;
      },
    ) => {
      if (!editingDishId || !ingredient.ingredientId) {
        return true;
      }

      const nextName = (overrides?.name ?? ingredient.name).trim();
      if (!nextName) {
        toast.error("Ingredient name cannot be empty");
        return false;
      }

      const payload: UpdateRecipeIngredientRequest = {
        ingredient_id: ingredient.ingredientId,
        ingredient_name: nextName,
      };

      const confirmedOverride = overrides?.confirmed;
      if (confirmedOverride !== undefined) {
        payload.confirmed = confirmedOverride;
      } else {
        payload.confirmed = ingredient.confirmed;
      }

      const unitValue = overrides?.unit ?? ingredient.unit;
      if (unitValue?.trim()) {
        payload.unit = unitValue.trim();
      }

      const quantityValue = overrides?.quantity ?? ingredient.quantity;
      if (quantityValue && quantityValue.trim()) {
        const parsedQuantity = Number.parseFloat(quantityValue);
        if (!Number.isNaN(parsedQuantity)) {
          payload.quantity = parsedQuantity;
        }
      }

      const hasSubstitutionOverride =
        overrides ? Object.prototype.hasOwnProperty.call(overrides, "substitution") : false;

      if (hasSubstitutionOverride) {
        const substitutionValue = overrides?.substitution ?? null;
        if (substitutionValue) {
          payload.substitution = {
            alternative: substitutionValue.alternative,
            surcharge: substitutionValue.surcharge ?? null,
          };
        } else {
          payload.substitution = null;
        }
      } else if (ingredient.substitution) {
        payload.substitution = {
          alternative: ingredient.substitution.alternative,
          surcharge: ingredient.substitution.surcharge ?? null,
        };
      }

      const nextAllergens = overrides?.allergens ?? ingredient.allergens ?? [];

      // Include allergen data in the payload (always send, even if empty to clear allergens)
      payload.allergens = nextAllergens.map((allergen) => ({
        code: allergen.code,
        name: allergen.name,
        certainty: allergen.certainty,
        canonical_code: allergen.canonicalCode ?? null,
        canonical_name: allergen.canonicalName ?? null,
        family_code: allergen.familyCode ?? null,
        family_name: allergen.familyName ?? null,
        marker_type: allergen.markerType ?? null,
      }));

      try {
        await updateRecipeIngredientAPI(editingDishId, ingredient.ingredientId, payload);
        return true;
      } catch (error) {
        console.error("Failed to update ingredient", error);
        toast.error("Failed to update ingredient");
        return false;
      }
    },
    [editingDishId],
  );

  const handleConfirmIngredient = async (index: number) => {
    const ingredientToConfirm = ingredients[index];
    if (!ingredientToConfirm) return;

    const trimmedName = ingredientToConfirm.name.trim();
    if (!trimmedName) {
      toast.error("Please enter an ingredient name");
      return;
    }

    // Validate that ingredient has both quantity and unit
    if (!ingredientToConfirm.quantity.trim() || !ingredientToConfirm.unit.trim()) {
      toast.error("Please specify the quantity and unit for this ingredient");
      return;
    }

    const persisted = await persistIngredientChanges(ingredientToConfirm, {
      name: trimmedName,
      quantity: ingredientToConfirm.quantity,
      unit: ingredientToConfirm.unit,
      confirmed: true,
    });

    if (!persisted) {
      return;
    }

    setIngredients((current) =>
      current.map((ingredient, i) =>
        i === index
          ? {
              ...ingredient,
              name: trimmedName,
              originalName: trimmedName,
              confirmed: true,
              allergens: (ingredient.allergens ?? []).map((allergen) => ({
                ...allergen,
                certainty: "confirmed",
              })),
            }
          : ingredient
      )
    );
  };

  const handleIngredientNameBlur = async (index: number) => {
    const ingredient = ingredients[index];
    if (!ingredient) {
      return;
    }

    const trimmedName = ingredient.name.trim();
    if (!trimmedName) {
      toast.error("Ingredient name cannot be empty");
      setIngredients((current) =>
        current.map((item, i) =>
          i === index ? { ...item, name: item.originalName ?? "" } : item
        )
      );
      return;
    }

    if (ingredient.originalName && trimmedName === ingredient.originalName) {
      if (ingredient.name !== trimmedName) {
        setIngredients((current) =>
          current.map((item, i) =>
            i === index ? { ...item, name: trimmedName } : item
          )
        );
      }
      return;
    }

    const persisted = await persistIngredientChanges(ingredient, { name: trimmedName });

    if (persisted) {
      setIngredients((current) =>
        current.map((item, i) =>
          i === index
            ? { ...item, name: trimmedName, originalName: trimmedName }
            : item
        )
      );
    } else if (ingredient.originalName) {
      setIngredients((current) =>
        current.map((item, i) =>
          i === index ? { ...item, name: item.originalName } : item
        )
      );
    }
  };

  const handleDeleteIngredient = useCallback(
    async (index: number) => {
      const ingredient = ingredients[index];
      if (!ingredient) {
        return;
      }

      if (editingDishId && ingredient.ingredientId) {
        try {
          await deleteRecipeIngredientAPI(editingDishId, ingredient.ingredientId);
        } catch (error) {
          console.error("Failed to delete ingredient from recipe", error);
          toast.error("Failed to delete ingredient. Please try again.");
          return;
        }
      }

      setIngredients((current) => current.filter((_, i) => i !== index));
    },
    [editingDishId, ingredients],
  );

  const handleAddIngredient = (name: string, quantity: string, unit: string) => {
    const newIngredient: IngredientState = {
      name,
      quantity,
      unit,
      confirmed: false,
      ingredientId: null,
      originalName: name,
      allergens: [],
      dietaryInfo: [],
      substitution: undefined,
    };
    setIngredients([...ingredients, newIngredient]);
  };

  const handleUpdateIngredientAllergens = async (
    index: number,
    allergens: Array<{ code: string; name: string; certainty?: string; canonicalCode?: string | null; canonicalName?: string | null; familyCode?: string | null; familyName?: string | null; markerType?: string | null }>
  ) => {
    const currentIngredient = ingredients[index];
    if (!currentIngredient) {
      return;
    }

    const previousAllergens = currentIngredient.allergens ?? [];
    const previousSubstitution = currentIngredient.substitution;
    const shouldClearSubstitution = allergens.length === 0;

    setIngredients((current) =>
      current.map((ingredient, i) => {
        if (i !== index) {
          return ingredient;
        }

        const next: IngredientState = {
          ...ingredient,
          allergens,
        };

        if (shouldClearSubstitution) {
          next.substitution = undefined;
        }

        return next;
      })
    );

    if (!currentIngredient.ingredientId) {
      return;
    }

    const ingredientForPersist: IngredientState = {
      ...currentIngredient,
      allergens,
      substitution: shouldClearSubstitution ? undefined : currentIngredient.substitution,
    };

    const overrides: {
      allergens: IngredientState["allergens"];
      substitution?: IngredientState["substitution"] | null;
    } = {
      allergens,
    };

    if (shouldClearSubstitution) {
      overrides.substitution = null;
    }

    const persisted = await persistIngredientChanges(ingredientForPersist, overrides);

    if (!persisted) {
      setIngredients((current) =>
        current.map((ingredient, i) => {
          if (i !== index) {
            return ingredient;
          }

          return {
            ...ingredient,
            allergens: previousAllergens,
            substitution: previousSubstitution,
          };
        })
      );
    }
  };

  const handleUpdateIngredientSubstitution = (
    index: number,
    substitution?: IngredientState["substitution"],
  ) => {
    setIngredients((current) =>
      current.map((ingredient, i) =>
        i === index
          ? {
              ...ingredient,
              substitution,
            }
          : ingredient
      )
    );
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
      if (prepInputRef.current) {
        prepInputRef.current.focus();
        prepInputRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 0);
  };

  const handleSaveDish = async () => {
    if (!dishName.trim()) {
      toast.error("Please enter a dish name");
      return;
    }
    if (ingredients.length === 0) {
      toast.error("Add at least one ingredient");
      return;
    }
    
    // Check for incomplete ingredients (missing quantity or unit)
    const incompleteIngredient = ingredients.find(
      (ingredient) => !ingredient.quantity.trim() || !ingredient.unit.trim()
    );
    if (incompleteIngredient) {
      const ingredientName = incompleteIngredient.name?.trim() || "this ingredient";
      const missingValue = !incompleteIngredient.quantity.trim() ? "quantity" : "unit";
      toast.error(`Please specify the ${missingValue} for ${ingredientName}.`);
      return;
    }
    
    // Check for unconfirmed ingredients
    const unconfirmedIngredients = ingredients.filter(ingredient => !ingredient.confirmed);
    if (unconfirmedIngredients.length > 0) {
      toast.error("Please confirm or delete all ingredients before saving.");
      return;
    }

    if (!restaurant) {
      toast.error("Please create a restaurant first");
      return;
    }

    const ingredientsToPersist = ingredients.map((ingredient) => {
      const sanitizedName = ingredient.name.trim();
      const sanitizedQuantity = ingredient.quantity.trim();
      const sanitizedUnit = ingredient.unit.trim();
      const normalizedAllergens = ingredient.allergens ?? [];
      const substitutionOverride = ingredient.substitution ?? null;

      const sanitizedState: IngredientState = {
        ...ingredient,
        name: sanitizedName,
        quantity: sanitizedQuantity,
        unit: sanitizedUnit,
        allergens: normalizedAllergens,
        substitution: substitutionOverride ?? undefined,
      };

      return {
        ingredient,
        overrides: {
          name: sanitizedName,
          quantity: sanitizedQuantity,
          unit: sanitizedUnit,
          confirmed: ingredient.confirmed,
          allergens: normalizedAllergens,
          substitution: substitutionOverride,
        },
        sanitizedState,
      };
    });

    for (const { ingredient, overrides } of ingredientsToPersist) {
      const persisted = await persistIngredientChanges(ingredient, overrides);

      if (!persisted) {
        return;
      }
    }

    setIngredients(ingredientsToPersist.map(({ sanitizedState }) => sanitizedState));

    try {
      // For now, we're saving recipes without ingredient links
      // TODO: Implement ingredient search and linking
      let updatedRecipesList: Recipe[] = recipes;
      let savedRecipe: Recipe;
      const resolvedSectionId = resolveSectionId(menuSectionId);
      if (editingDishId) {
        savedRecipe = await updateRecipeAPI(editingDishId, {
          name: dishName,
          description,
          instructions: prepMethod,
          serving_size: servingSize,
          price,
          image: dishImage,
          confirmed: true,
          menu_section_ids: resolvedSectionId !== null ? [resolvedSectionId] : [],
        });
        updatedRecipesList = recipes.map((recipe) =>
          recipe.id === savedRecipe.id ? savedRecipe : recipe
        );
      } else {
        savedRecipe = await createRecipeAPI({
          restaurant_id: restaurant.id,
          name: dishName,
          description,
          instructions: prepMethod,
          serving_size: servingSize,
          price,
          image: dishImage,
          ingredients: [], // TODO: Map ingredients to ingredient IDs
          confirmed: true,
          menu_section_ids: resolvedSectionId !== null ? [resolvedSectionId] : [],
        });
        updatedRecipesList = [...recipes, savedRecipe];
      }

      const nextUnconfirmedRecipe = updatedRecipesList.find(
        (recipe) => !recipe.confirmed && recipe.id !== savedRecipe.id
      );

      toast.success("Dish saved and confirmed");

      if (nextUnconfirmedRecipe) {
        populateFormFromRecipe(nextUnconfirmedRecipe);
        if (typeof window !== "undefined") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      } else {
        handleStartNew();
        handleTabChange("recipes");
      }
    } catch (error) {
      toast.error("Failed to save dish");
      console.error(error);
    }
  };

  const handleDeleteDish = async (id: string) => {
    try {
      await deleteRecipeAPI(parseInt(id));
      toast.success("Dish deleted");
    } catch (error) {
      toast.error("Failed to delete dish");
      console.error(error);
    }
  };

  const handleBulkRecipeAction = async (action: RecipeBulkAction, ids: string[]) => {
    const recipeIds = ids
      .map((value) => Number(value))
      .filter((value) => !Number.isNaN(value));

    if (recipeIds.length === 0) {
      return;
    }

    try {
      switch (action) {
        case "delete":
          await Promise.all(recipeIds.map((recipeId) => deleteRecipeAPI(recipeId)));
          break;
        case "markForReview":
          await Promise.all(recipeIds.map((recipeId) => updateRecipeAPI(recipeId, { confirmed: false })));
          break;
        case "markAsReviewed":
          await Promise.all(recipeIds.map((recipeId) => updateRecipeAPI(recipeId, { confirmed: true })));
          break;
        case "addToMenu":
          await Promise.all(recipeIds.map((recipeId) => updateRecipeAPI(recipeId, { is_on_menu: true })));
          break;
        case "removeFromMenu":
          await Promise.all(recipeIds.map((recipeId) => updateRecipeAPI(recipeId, { is_on_menu: false })));
          break;
      }

      const successMessages: Record<RecipeBulkAction, string> = {
        delete: `${recipeIds.length} ${recipeIds.length === 1 ? "recipe" : "recipes"} deleted`,
        markForReview: `${recipeIds.length} ${recipeIds.length === 1 ? "recipe" : "recipes"} marked for review`,
        markAsReviewed: `${recipeIds.length} ${recipeIds.length === 1 ? "recipe" : "recipes"} marked as reviewed`,
        addToMenu: `${recipeIds.length} ${recipeIds.length === 1 ? "recipe" : "recipes"} added to the menu`,
        removeFromMenu: `${recipeIds.length} ${recipeIds.length === 1 ? "recipe" : "recipes"} removed from the menu`,
      };

      toast.success(successMessages[action]);
    } catch (error) {
      console.error("Failed to apply bulk recipe action", error);
      toast.error("Unable to update the selected recipes");
      throw error;
    }
  };

  const handleMoveDishesToArchive = async (ids: string[]) => {
    const recipeIds = ids
      .map((value) => Number(value))
      .filter((value) => !Number.isNaN(value));

    if (recipeIds.length === 0) {
      return;
    }

    const archiveSectionNumericId = resolveSectionId(ARCHIVE_SECTION_ID);

    try {
      await Promise.all(
        recipeIds.map((recipeId) =>
          updateRecipeAPI(recipeId, {
            menu_section_ids:
              archiveSectionNumericId !== null ? [archiveSectionNumericId] : [],
          }),
        ),
      );

      toast.success(
        recipeIds.length === 1
          ? "Recipe moved to the Archive section"
          : `${recipeIds.length} recipes moved to the Archive section`,
      );
    } catch (error) {
      toast.error("Unable to move recipes to the Archive section");
      console.error("Failed to move recipes to archive", error);
      throw error;
    }
  };

  const handleToggleMenuStatus = async (id: string, nextStatus: boolean) => {
    const recipeId = Number(id);
    if (Number.isNaN(recipeId)) {
      return;
    }

    const recipe = recipes.find((item) => item.id === recipeId);

    try {
      await updateRecipeAPI(recipeId, { is_on_menu: nextStatus });
      const message = recipe
        ? nextStatus
          ? `${recipe.name} is now live on your menu`
          : `${recipe.name} was removed from your menu`
        : nextStatus
          ? "Recipe is now live on your menu"
          : "Recipe was removed from your menu";
      toast.success(message);
    } catch (error) {
      console.error("Failed to update menu status", error);
      toast.error("Unable to update the recipe's menu status");
      throw error;
    }
  };

  const handleEditDish = (id: string) => {
    const recipe = recipes.find((item) => item.id.toString() === id);
    if (!recipe) return;

    populateFormFromRecipe(recipe);
  };

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const nextTab = validTabs.includes(tabParam as typeof validTabs[number])
      ? (tabParam as typeof validTabs[number])
      : "landing";
    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [searchParams, activeTab]);

  const handleTabChange = (
    value: (typeof validTabs)[number],
    options?: { resetAddForm?: boolean },
  ) => {
    if (value === "add" && options?.resetAddForm) {
      handleStartNew();
    }

    setActiveTab(value);
    const params = new URLSearchParams(searchParams);
    if (value === "landing") {
      params.delete("tab");
    } else {
      params.set("tab", value);
    }
    setSearchParams(params, { replace: true });
  };

  const handleTabsValueChange = (value: string) => {
    const nextTab = validTabs.includes(value as (typeof validTabs)[number])
      ? (value as (typeof validTabs)[number])
      : "landing";
    const shouldResetAddForm = nextTab === "add" && manualAddTabSelectionRef.current;
    handleTabChange(nextTab, { resetAddForm: shouldResetAddForm });
    manualAddTabSelectionRef.current = false;
  };

  const handleReviewLastUnconfirmed = () => {
    if (lastUnconfirmedRecipe) {
      populateFormFromRecipe(lastUnconfirmedRecipe);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }
  };

  const handleReviewFirstUnconfirmed = () => {
    if (firstUnconfirmedRecipe) {
      populateFormFromRecipe(firstUnconfirmedRecipe);
      return;
    }

    if (recipes.length > 0) {
      populateFormFromRecipe(recipes[0]);
      return;
    }

    handleTabChange("recipes");
  };

  const canSave = () => {
    if (dishName.trim().length === 0 || ingredients.length === 0) {
      return false;
    }
    
    // Check for incomplete ingredients
    const hasIncompleteIngredients = ingredients.some(
      (ingredient) => !ingredient.quantity.trim() || !ingredient.unit.trim()
    );
    if (hasIncompleteIngredients) {
      return false;
    }
    
    // Check for unconfirmed ingredients
    const hasUnconfirmedIngredients = ingredients.some(ingredient => !ingredient.confirmed);
    if (hasUnconfirmedIngredients) {
      return false;
    }
    
    return true;
  };

  const tabTriggerClass =
    "min-w-[120px] flex-shrink-0 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-colors " +
    "data-[state=active]:bg-background data-[state=active]:shadow sm:min-w-[140px] sm:text-base sm:flex-1 snap-start";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/70 bg-card/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="Feeb Logo" className="h-8 w-8 feeb-logo" />
            <h1 className="text-xl font-bold text-brand-primary sm:text-2xl">Feeb</h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground sm:text-base">
            <span className="font-medium text-foreground"></span>
            <span className="truncate font-semibold text-brand-primary/80">
              {restaurant?.name || "No restaurant selected"}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-3 pb-10 pt-6 sm:px-4 lg:gap-10">
        <Tabs value={activeTab} onValueChange={handleTabsValueChange} className="w-full">
          <div className="mb-6 overflow-x-auto overflow-y-hidden scroll-smooth snap-x snap-mandatory">
            <TabsList className="flex min-w-full flex-nowrap items-center justify-start gap-2 rounded-xl border border-border/60 bg-muted/40 p-1.5 sm:gap-3">
              <TabsTrigger value="landing" className={tabTriggerClass}>
                {t("navigation.landing")}
              </TabsTrigger>
              <TabsTrigger
                value="add"
                className={tabTriggerClass}
                onClick={() => {
                  manualAddTabSelectionRef.current = true;
                }}
              >
                {t("navigation.add")}
              </TabsTrigger>
              <TabsTrigger value="recipes" className={tabTriggerClass}>
                {t("navigation.recipes")}
              </TabsTrigger>
              <TabsTrigger value="menu" className={tabTriggerClass}>
                {t("navigation.menu")}
              </TabsTrigger>
              <TabsTrigger value="settings" className={tabTriggerClass}>
                {t("navigation.settings")}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="landing">
            <LandingPage
              restaurantName={restaurant?.name ?? undefined}
              menuUploaded={menuUploadComplete}
              ingredientsConfirmed={menuUploadComplete && unconfirmedRecipeCount === 0}
              imagesUploaded={hasRecipeImages}
              totalRecipes={totalRecipes}
              unconfirmedRecipes={unconfirmedRecipeCount}
              onReviewFirstRecipe={handleReviewFirstUnconfirmed}
            />
          </TabsContent>

          <TabsContent value="add">
            <div className="space-y-8 rounded-xl bg-card p-4 shadow-lg sm:p-6 lg:p-8">
              <div className="space-y-8">
                {reviewNoticeMessage && (
                  <button
                    type="button"
                    onClick={handleReviewLastUnconfirmed}
                    className={
                      "w-full rounded-lg border border-border/60 bg-muted/40 px-4 py-3 text-left transition-colors " +
                      "hover:bg-muted/60 focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
                    }
                  >
                    <span className="block text-sm font-semibold text-foreground">
                      {reviewNoticeMessage}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {t("index.reviewHelper")}
                    </span>
                  </button>
                )}

                <DishNameInput
                  value={dishName}
                  onChange={setDishName}
                  onRecipeMatch={handleRecipeMatch}
                  menuSectionId={menuSectionId}
                  onMenuSectionChange={setMenuSectionId}
                  description={description}
                  onDescriptionChange={setDescription}
                  servingSize={servingSize}
                  onServingSizeChange={setServingSize}
                  price={price}
                  onPriceChange={setPrice}
                  formatPrice={formatPrice}
                  existingDishes={savedDishes.map((dish) => ({
                    id: dish.id,
                    name: dish.name,
                    confirmed: dish.confirmed,
                  }))}
                  selectedDishId={editingDishId ? editingDishId.toString() : null}
                  onClearSelectedDish={handleClearDishSelection}
                  restaurantId={restaurant?.id}
                />

                <IngredientsList
                  ingredients={ingredients}
                  onUpdateIngredientName={handleUpdateIngredientName}
                  onUpdateIngredient={handleUpdateIngredient}
                  onUpdateIngredientUnit={handleUpdateIngredientUnit}
                  onConfirmIngredient={handleConfirmIngredient}
                  onDeleteIngredient={handleDeleteIngredient}
                  onAddIngredient={handleAddIngredient}
                  onUpdateIngredientAllergens={handleUpdateIngredientAllergens}
                  onUpdateIngredientSubstitution={handleUpdateIngredientSubstitution}
                  onIngredientNameBlur={handleIngredientNameBlur}
                  formatPrice={formatPrice}
                />

                {showPrepMethod && (
                  <PrepMethodInput ref={prepInputRef} value={prepMethod} onChange={setPrepMethod} />
                )}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button
                  onClick={handleAddPhoto}
                  variant="outline"
                  className="h-12 w-full px-4 text-base font-semibold sm:h-14 sm:w-auto sm:px-6 sm:text-lg"
                  size="lg"
                >
                  Add Photo
                </Button>
                <Button
                  onClick={handleAddPreparation}
                  variant="outline"
                  className="h-12 w-full px-4 text-base font-semibold sm:h-14 sm:w-auto sm:px-6 sm:text-lg"
                  size="lg"
                >
                  {showPrepMethod ? "Hide Preparation" : "Add Preparation"}
                </Button>
                <Button
                  onClick={handleSaveDish}
                  disabled={!canSave()}
                  className="h-12 w-full px-4 text-base font-semibold sm:h-14 sm:w-auto sm:px-6 sm:text-lg sm:ml-auto"
                  size="lg"
                >
                  Save
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="recipes">
            <div className="rounded-xl bg-card p-4 shadow-lg sm:p-6 lg:p-8">
              <RecipeBook
                dishes={savedDishes}
                onDelete={handleDeleteDish}
                onEdit={handleEditDish}
                onBulkAction={handleBulkRecipeAction}
                onToggleMenuStatus={handleToggleMenuStatus}
                onMoveDishesToArchive={handleMoveDishesToArchive}
                formatPrice={formatPrice}
                restaurantId={restaurant?.id ?? null}
              />
            </div>
          </TabsContent>

          <TabsContent value="menu">
            <MenuView
              dishes={savedDishes}
              restaurantName={restaurant?.name || "My Restaurant"}
              showImages={showMenuImages}
              formatPrice={formatPrice}
              restaurantId={restaurant?.id ?? null}
            />
          </TabsContent>

          <TabsContent value="settings">
            <div className="rounded-xl bg-card p-4 shadow-lg sm:p-6 lg:p-8">
              <Settings
                restaurant={restaurant}
                restaurants={restaurants}
                onCreateRestaurant={createRestaurantAPI}
                onSelectRestaurant={selectRestaurant}
                onUpdateRestaurant={updateRestaurant}
                onDeleteRestaurant={deleteRestaurantAPI}
                showMenuImages={showMenuImages}
                onToggleMenuImages={setShowMenuImages}
                currency={currency}
                onCurrencyChange={setCurrency}
                priceFormat={priceFormat}
                onPriceFormatChange={setPriceFormat}
              />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
