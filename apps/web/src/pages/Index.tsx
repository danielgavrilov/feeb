import { useState, useEffect, useRef, useCallback } from "react";
import { DishNameInput } from "@/components/DishNameInput";
import { IngredientsList, IngredientState } from "@/components/IngredientsList";
import { PrepMethodInput } from "@/components/PrepMethodInput";
import { ComplianceOverview } from "@/components/ComplianceOverview";
import { RecipeBook, SavedDish, RecipeBulkAction } from "@/components/RecipeBook";
import { MenuView } from "@/components/MenuView";
import { Settings } from "@/components/Settings";
import { BasePrepsView } from "@/components/BasePrepsView";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useRestaurant } from "@/hooks/useRestaurant";
import { useRecipes } from "@/hooks/useRecipes";
import { useBasePreps } from "@/hooks/useBasePreps";
import { useAppTour } from "@/hooks/useAppTour";
import {
  Recipe,
  createRecipe as createRecipeAPI,
  createIngredient as createIngredientAPI,
  addRecipeIngredient as addRecipeIngredientAPI,
  updateRecipeIngredient as updateRecipeIngredientAPI,
  deleteRecipeIngredient as deleteRecipeIngredientAPI,
  UpdateRecipeIngredientRequest,
  Ingredient,
} from "@/lib/api";
import { LandingPage } from "@/components/LandingPage";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSearchParams } from "react-router-dom";
import { RestaurantOnboardingDialog } from "@/components/auth/RestaurantOnboardingDialog";
import {
  CurrencyOption,
  PriceDisplayFormat,
  DEFAULT_CURRENCY,
  DEFAULT_PRICE_FORMAT,
  formatPriceDisplay,
} from "@/lib/price-format";
import { ARCHIVE_SECTION_LABEL, loadSavedMenuSections } from "@/lib/menu-sections";
import { mapIngredientAllergens, mapRecipesToSavedDishes } from "./recipe-mappers";

const Index = () => {
  const { t } = useLanguage();
  const {
    restaurant,
    restaurants,
    loading: restaurantLoading,
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
    refreshRecipes,
  } = useRecipes(restaurant?.id || null);

  const {
    basePreps,
    loading: basePrepsLoading,
    createBasePrep: createBasePrepAPI,
    updateBasePrep: updateBasePrepAPI,
    deleteBasePrep: deleteBasePrepAPI,
    refreshBasePreps,
  } = useBasePreps(restaurant?.id || null);

  const validTabs = ["landing", "recipes", "base-preps", "menu", "settings"] as const;
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
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [returnToRecipeId, setReturnToRecipeId] = useState<number | null>(null);
  const [shouldOpenBasePrepCreate, setShouldOpenBasePrepCreate] = useState(false);
  const prepInputRef = useRef<HTMLTextAreaElement | null>(null);
  
  // Track demo recipe ID for tour
  const demoRecipeIdRef = useRef<number | null>(null);
  const hasCheckedDemoRecipes = useRef(false);

  // Initialize app tour with demo recipe injection
  const { startTour } = useAppTour({
    onTabChange: (tab: string) => {
      const next = validTabs.includes(tab as (typeof validTabs)[number])
        ? (tab as (typeof validTabs)[number])
        : "landing";
      setActiveTab(next);
      if (next === "landing") {
        setSearchParams({});
      } else {
        setSearchParams({ tab: next });
      }
    },
    onConfirmDemoRecipe: async () => {
      // Update the demo recipe status to 'confirmed'
      if (demoRecipeIdRef.current) {
        try {
          await updateRecipeAPI(demoRecipeIdRef.current, { status: "confirmed" });
          await refreshRecipes();
        } catch (error) {
          console.error("Failed to confirm demo recipe:", error);
        }
      }
    },
    onTourStart: async () => {
      // Create a demo "Fries" recipe for the tour
      if (restaurant?.id && !demoRecipeIdRef.current) {
        try {
          const demoRecipe = await createRecipeAPI({
            restaurant_id: restaurant.id,
            name: "Fries",
            description: "Crispy golden french fries",
            status: "needs_review",
            price: "$6.99",
          });
          demoRecipeIdRef.current = demoRecipe.id;
          
          // Helper function to create or get ingredient
          const getOrCreateIngredient = async (name: string): Promise<number> => {
            try {
              const ingredient = await createIngredientAPI({
                code: `demo:${name.toLowerCase().replace(/\s+/g, '-')}`,
                name,
                source: "demo",
              });
              return ingredient.id;
            } catch (error) {
              // If creation fails, we'll skip this ingredient
              console.error(`Failed to create ingredient ${name}:`, error);
              throw error;
            }
          };
          
          // Add some demo ingredients to make it realistic
          try {
            const potatoId = await getOrCreateIngredient("Potatoes");
            await addRecipeIngredientAPI(demoRecipe.id, {
              ingredient_id: potatoId,
              ingredient_name: "Potatoes",
              quantity: 2,
              unit: "large",
              confirmed: false,
            });
          } catch (error) {
            console.error("Failed to add Potatoes:", error);
          }
          
          try {
            const oilId = await getOrCreateIngredient("Vegetable oil");
            await addRecipeIngredientAPI(demoRecipe.id, {
              ingredient_id: oilId,
              ingredient_name: "Vegetable oil",
              quantity: 0.5,
              unit: "cup",
              confirmed: false,
            });
          } catch (error) {
            console.error("Failed to add Vegetable oil:", error);
          }

          try {
            const saltId = await getOrCreateIngredient("Salt");
            await addRecipeIngredientAPI(demoRecipe.id, {
              ingredient_id: saltId,
              ingredient_name: "Salt",
              quantity: 1,
              unit: "tsp",
              confirmed: false,
            });
          } catch (error) {
            console.error("Failed to add Salt:", error);
          }
          
          // Refresh recipes to show the new one
          await refreshRecipes();
        } catch (error) {
          console.error("Failed to create demo recipe:", error);
        }
      }
    },
    onTourEnd: async () => {
      // Clean up the demo recipe
      if (demoRecipeIdRef.current) {
        try {
          await deleteRecipeAPI(demoRecipeIdRef.current);
          demoRecipeIdRef.current = null;
          await refreshRecipes();
        } catch (error) {
          console.error("Failed to delete demo recipe:", error);
        }
      }
    },
  });

  const formatPrice = useCallback(
    (value: string | number | null | undefined) =>
      formatPriceDisplay(value, { currency, format: priceFormat }),
    [currency, priceFormat],
  );

  const deriveMenuSectionKey = useCallback(
    (recipe: Recipe): string => {
      // Use the first section from recipe.sections
      const primarySection = recipe.sections[0];
      if (primarySection) {
        return primarySection.section_id.toString();
      }

      // Fallback: place unassigned recipes into Archive if available, so they remain visible
      if (restaurant?.id) {
        const cached = loadSavedMenuSections(restaurant.id);
        const archive = cached.sections.find(
          (section) => section.isArchive || section.label.trim().toLowerCase() === ARCHIVE_SECTION_LABEL.toLowerCase(),
        );
        if (archive) {
          return archive.id.toString();
        }
      }

      return "";
    },
    [restaurant?.id],
  );

  const resolveSectionId = useCallback(
    (sectionKey: string): number | null => {
      if (!restaurant?.id) {
        return null;
      }

      if (!sectionKey) {
        return null;
      }

      const numericId = Number(sectionKey);
      if (!Number.isNaN(numericId)) {
        return numericId;
      }

      const cached = loadSavedMenuSections(restaurant.id);

      const archive = cached.sections.find(
        (section) =>
          section.isArchive || section.label.trim().toLowerCase() === ARCHIVE_SECTION_LABEL.toLowerCase(),
      );

      if (archive) {
        const keyNormalized = sectionKey.trim().toLowerCase();
        if (keyNormalized === ARCHIVE_SECTION_LABEL.toLowerCase() || sectionKey === "archive") {
          return archive.id;
        }
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

  // Compute how many dishes use each base prep
  const usageCountByBasePrepId: Record<number, number> = {};
  for (const recipe of recipes) {
    const links = recipe.base_preps ?? [];
    for (const link of links) {
      const id = link.base_prep_id;
      usageCountByBasePrepId[id] = (usageCountByBasePrepId[id] ?? 0) + 1;
    }
  }

  const totalRecipes = recipes.length;
  const unconfirmedRecipeCount = recipes.filter(recipe => recipe.status === "needs_review").length;
  const liveDishCount = savedDishes.filter(dish => dish.status === "live").length;
  const hasRecipeImages = recipes.some(recipe => Boolean(recipe.image));
  const menuUploadComplete = totalRecipes > 0 || hasRecipeImages;
  const firstUnconfirmedRecipe = recipes.find(recipe => recipe.status === "needs_review");
  const lastUnconfirmedRecipe = [...recipes].reverse().find(recipe => recipe.status === "needs_review");

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
    handleTabChange("recipes");
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

      const allergensToPersist = overrides?.allergens ?? ingredient.allergens ?? [];
      // Include allergen data in the payload (always send, even if empty to clear allergens)
      payload.allergens = allergensToPersist.map((allergen) => ({
        code: allergen.code,
        name: allergen.name,
        certainty: allergen.certainty,
        canonical_code: allergen.canonical_code ?? null,
        canonical_name: allergen.canonical_name ?? null,
        family_code: allergen.family_code ?? null,
        family_name: allergen.family_name ?? null,
        marker_type: allergen.marker_type ?? null,
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

    const confirmedAllergens = (ingredientToConfirm.allergens ?? []).map((allergen) => ({
      ...allergen,
      certainty: "confirmed",
    }));

    const persisted = await persistIngredientChanges(ingredientToConfirm, {
      name: trimmedName,
      quantity: ingredientToConfirm.quantity,
      unit: ingredientToConfirm.unit,
      confirmed: true,
      allergens: confirmedAllergens,
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
              allergens: confirmedAllergens,
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

  const handleAddIngredient = async (
    name: string,
    quantity: string,
    unit: string,
    allergens: IngredientState["allergens"],
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

    // If editing an existing recipe, immediately create the ingredient and link it
    if (editingDishId) {
      try {
        // Create a unique code for this user-added ingredient
        const ingredientCode = `user:${crypto.randomUUID()}`;
        
        // Create the ingredient in the database
        const createdIngredient = await createIngredientAPI({
          code: ingredientCode,
          name,
          source: "user",
        });

        // Link it to the recipe
        await addRecipeIngredientAPI(editingDishId, {
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
      // For new recipes, just add to local state (will be created when recipe is saved)
      setIngredients((current) => [...current, newIngredient]);
    }
  };

  const handleUpdateIngredientAllergens = async (
    index: number,
    allergens: Array<{
      code: string;
      name: string;
      certainty?: string;
      canonical_code?: string | null;
      canonical_name?: string | null;
      family_code?: string | null;
      family_name?: string | null;
      marker_type?: string | null;
    }>,
  ) => {
    const ingredient = ingredients[index];
    if (!ingredient) {
      return;
    }

    const normalizedAllergens = allergens.map((allergen) => ({
      ...allergen,
      certainty: allergen.certainty ?? (ingredient.confirmed ? "confirmed" : undefined),
    }));

    const shouldClearSubstitution = normalizedAllergens.length === 0 && Boolean(ingredient.substitution);

    const overrides: {
      allergens: IngredientState["allergens"];
      substitution?: IngredientState["substitution"] | null;
    } = {
      allergens: normalizedAllergens,
    };

    if (shouldClearSubstitution) {
      overrides.substitution = null;
    }

    const persisted = await persistIngredientChanges(ingredient, overrides);

    if (!persisted) {
      return;
    }

    setIngredients((current) =>
      current.map((currentIngredient, i) => {
        if (i !== index) {
          return currentIngredient;
        }

        return {
          ...currentIngredient,
          allergens: normalizedAllergens,
          substitution: shouldClearSubstitution ? undefined : currentIngredient.substitution,
        };
      }),
    );
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

    // For existing recipes, persist ingredient changes
    if (editingDishId) {
      for (const { ingredient, overrides } of ingredientsToPersist) {
        const persisted = await persistIngredientChanges(ingredient, overrides);

        if (!persisted) {
          return;
        }
      }
    }

    setIngredients(ingredientsToPersist.map(({ sanitizedState }) => sanitizedState));

    try {
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
          status: "confirmed",
          menu_section_ids: resolvedSectionId !== null ? [resolvedSectionId] : [],
        });
        updatedRecipesList = recipes.map((recipe) =>
          recipe.id === savedRecipe.id ? savedRecipe : recipe
        );
      } else {
        // Create the recipe first
        savedRecipe = await createRecipeAPI({
          restaurant_id: restaurant.id,
          name: dishName,
          description,
          instructions: prepMethod,
          serving_size: servingSize,
          price,
          image: dishImage,
          ingredients: [],
          status: "confirmed",
          menu_section_ids: resolvedSectionId !== null ? [resolvedSectionId] : [],
        });
        updatedRecipesList = [...recipes, savedRecipe];
        
        // Now create and link ingredients to the new recipe
        for (const { ingredient, overrides } of ingredientsToPersist) {
          try {
            // Create the ingredient in the database
            const ingredientCode = `user:${crypto.randomUUID()}`;
            const createdIngredient = await createIngredientAPI({
              code: ingredientCode,
              name: overrides.name || ingredient.name,
              source: "user",
            });

            // Link it to the recipe
            await addRecipeIngredientAPI(savedRecipe.id, {
              ingredient_id: createdIngredient.id,
              ingredient_name: overrides.name || ingredient.name,
              quantity: parseFloat(overrides.quantity || ingredient.quantity) || undefined,
              unit: overrides.unit || ingredient.unit,
              confirmed: true,
              allergens: (overrides.allergens || ingredient.allergens || []).map((a) => ({
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
          } catch (error) {
            console.error("Failed to create ingredient for new recipe", error);
            toast.error("Failed to save ingredient. Please try again.");
            return;
          }
        }
      }

      const nextUnconfirmedRecipe = updatedRecipesList.find(
        (recipe) => recipe.status === "needs_review" && recipe.id !== savedRecipe.id
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
          await Promise.all(recipeIds.map((recipeId) => updateRecipeAPI(recipeId, { status: "needs_review" })));
          break;
        case "markAsReviewed":
          await Promise.all(recipeIds.map((recipeId) => updateRecipeAPI(recipeId, { status: "confirmed" })));
          break;
        case "addToMenu":
          await Promise.all(recipeIds.map((recipeId) => updateRecipeAPI(recipeId, { status: "live" })));
          break;
        case "removeFromMenu":
          await Promise.all(recipeIds.map((recipeId) => updateRecipeAPI(recipeId, { status: "confirmed" })));
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

    const archiveSectionNumericId = resolveSectionId(ARCHIVE_SECTION_LABEL);

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
      // When toggling to menu: live, when toggling off: confirmed
      await updateRecipeAPI(recipeId, { status: nextStatus ? "live" : "confirmed" });
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

  const handleEditRecipeInSheet = async (dishId: string, updates: import("@/components/RecipeEditSheet").RecipeUpdatePayload) => {
    const recipeId = Number(dishId);
    if (Number.isNaN(recipeId)) {
      toast.error("Invalid recipe ID");
      return;
    }

    try {
      await updateRecipeAPI(recipeId, updates);
      toast.success("Recipe updated successfully");
    } catch (error) {
      console.error("Failed to update recipe", error);
      toast.error("Failed to update recipe. Please try again.");
      throw error;
    }
  };

  const handleCreateRecipeInSheet = async (updates: import("@/components/RecipeEditSheet").RecipeUpdatePayload) => {
    if (!restaurant?.id) {
      toast.error("Please select a restaurant first");
      return;
    }

    try {
      // Create as regular recipe
      // 1) Create the recipe WITHOUT ingredients first
      const created = await createRecipeAPI({
        restaurant_id: restaurant.id,
        name: updates.name || "",
        description: updates.description,
        instructions: updates.instructions,
        serving_size: updates.serving_size,
        price: updates.price,
        image: updates.image,
        status: "confirmed",
        menu_section_ids: updates.menu_section_ids || [],
        ingredients: [],
      });

      // 2) If the user provided ingredient rows, create the ingredients and link them
      if (updates.ingredients && updates.ingredients.length > 0) {
        for (const ing of updates.ingredients) {
          // Create a unique code for this user-added ingredient
          const ingredientCode = `user:${crypto.randomUUID()}`;

          const createdIngredient = await createIngredientAPI({
            code: ingredientCode,
            name: ing.ingredient_name,
            source: "user",
          });

          await addRecipeIngredientAPI(created.id, {
            ingredient_id: createdIngredient.id,
            ingredient_name: ing.ingredient_name,
            quantity: ing.quantity ?? undefined,
            unit: ing.unit ?? undefined,
            confirmed: Boolean(ing.confirmed),
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
            substitution: ing.substitution,
          });
        }
      }

      // 3) Link base preps if provided
      if (updates.base_preps && updates.base_preps.length > 0) {
        const { linkRecipeToBasePrep } = await import("@/lib/api");
        for (const basePrep of updates.base_preps) {
          await linkRecipeToBasePrep(created.id, basePrep.base_prep_id, {
            quantity: basePrep.quantity ?? undefined,
            unit: basePrep.unit ?? undefined,
          });
        }
      }

      toast.success("Recipe created successfully");
      // Refresh recipes to include the new recipe
      await refreshRecipes();
    } catch (error) {
      console.error("Failed to create recipe", error);
      toast.error("Failed to create recipe. Please try again.");
      throw error;
    }
  };

  const handleRequestCreateBasePrepFromRecipe = useCallback(async (recipeId: number) => {
    // Store the recipe ID to return to after base prep creation
    setReturnToRecipeId(recipeId);
    // Switch to base preps tab
    setActiveTab("base-preps");
    setSearchParams({ tab: "base-preps" });
    // Trigger the base prep create sheet to open
    setShouldOpenBasePrepCreate(true);
  }, [setSearchParams]);

  const handleBasePrepCreateComplete = useCallback(async () => {
    // Close the base prep create sheet
    setShouldOpenBasePrepCreate(false);
    // Refresh base preps to get the new one
    await refreshBasePreps();
    
    // If we have a return recipe ID, go back to recipes tab and reopen that recipe
    if (returnToRecipeId) {
      setActiveTab("recipes");
      setSearchParams({ tab: "recipes" });
      // Small delay to ensure tab switch completes
      setTimeout(() => {
        const recipe = recipes.find((r) => r.id === returnToRecipeId);
        if (recipe) {
          handleEditDish(returnToRecipeId.toString());
        }
        setReturnToRecipeId(null);
      }, 100);
    }
  }, [returnToRecipeId, refreshBasePreps, recipes, setSearchParams]);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const nextTab = validTabs.includes(tabParam as typeof validTabs[number])
      ? (tabParam as typeof validTabs[number])
      : "landing";
    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [searchParams, activeTab]);

  // Show onboarding dialog if user has no restaurants
  useEffect(() => {
    if (!restaurantLoading && restaurants.length === 0) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
  }, [restaurantLoading, restaurants]);

  // Clean up demo recipes ONLY if tour was completed and page was refreshed
  useEffect(() => {
    if (hasCheckedDemoRecipes.current || !recipes || recipes.length === 0) {
      return;
    }
    hasCheckedDemoRecipes.current = true;

    // Only clean up if tour was already completed before (stored in localStorage)
    const tourCompleted = localStorage.getItem("feeb_tour_completed");
    if (tourCompleted) {
      // Tour was completed, so clean up any leftover demo recipes
      const demoRecipes = recipes.filter(recipe => 
        recipe.name === "Fries" && 
        recipe.ingredients.some(ing => ing.ingredient_name === "Potatoes" || ing.ingredient_name === "Salt")
      );
      
      if (demoRecipes.length > 0) {
        Promise.all(demoRecipes.map(recipe => deleteRecipeAPI(recipe.id)))
          .then(() => {
            console.log("Cleaned up demo recipes from previous tour session");
          })
          .catch(error => {
            console.error("Failed to clean up demo recipes:", error);
          });
      }
    }
  }, [recipes, deleteRecipeAPI]);

  const handleTabChange = (
    value: (typeof validTabs)[number],
  ) => {
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
    handleTabChange(nextTab);
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

  const handleCreateRestaurantFromOnboarding = async (name: string) => {
    await createRestaurantAPI(name);
    toast.success(`Welcome! ${name} has been created.`);
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
      <header data-tour="feeb-header" className="sticky top-0 z-50 border-b border-border/70 bg-card/95 shadow-sm backdrop-blur">
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
            <TabsList data-tour="tabs-list" className="flex min-w-full flex-nowrap items-center justify-start gap-2 rounded-xl border border-border/60 bg-muted/40 p-1.5 sm:gap-3">
              <TabsTrigger value="landing" data-tour="tab-landing" className={tabTriggerClass}>
                {t("navigation.landing")}
              </TabsTrigger>
              
              <TabsTrigger value="recipes" data-tour="tab-recipes" className={tabTriggerClass}>
                {t("navigation.recipes")}
              </TabsTrigger>
              <TabsTrigger value="base-preps" data-tour="tab-base-preps" className={tabTriggerClass}>
                Base Preps
              </TabsTrigger>
              <TabsTrigger value="menu" data-tour="tab-menu" className={tabTriggerClass}>
                {t("navigation.menu")}
              </TabsTrigger>
              <TabsTrigger value="settings" className={tabTriggerClass}>
                {t("navigation.settings")}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="landing" data-tour="landing-content">
            <LandingPage
              restaurantName={restaurant?.name ?? undefined}
              menuUploaded={menuUploadComplete}
              ingredientsConfirmed={menuUploadComplete && unconfirmedRecipeCount === 0}
              totalRecipes={totalRecipes}
              unconfirmedRecipes={unconfirmedRecipeCount}
              liveDishCount={liveDishCount}
              onReviewFirstRecipe={handleReviewFirstUnconfirmed}
              onStartTour={startTour}
            />
          </TabsContent>

          

          <TabsContent value="recipes">
            <div className="rounded-xl bg-card p-4 shadow-lg sm:p-6 lg:p-8">
              <RecipeBook
                dishes={savedDishes}
                onDelete={handleDeleteDish}
                onEdit={handleEditDish}
                onEditRecipeInSheet={handleEditRecipeInSheet}
                onCreateRecipeInSheet={handleCreateRecipeInSheet}
                onRequestCreateBasePrep={handleRequestCreateBasePrepFromRecipe}
                onBulkAction={handleBulkRecipeAction}
                onToggleMenuStatus={handleToggleMenuStatus}
                onMoveDishesToArchive={handleMoveDishesToArchive}
                formatPrice={formatPrice}
                restaurantId={restaurant?.id ?? null}
              />
            </div>
          </TabsContent>

          <TabsContent value="base-preps">
            <div className="rounded-xl bg-card p-4 shadow-lg sm:p-6 lg:p-8">
              <BasePrepsView
                basePreps={basePreps}
                loading={basePrepsLoading}
                restaurantId={restaurant?.id ?? null}
                formatPrice={formatPrice}
                usageCountByBasePrepId={usageCountByBasePrepId}
                shouldOpenCreate={shouldOpenBasePrepCreate}
                onCreateComplete={handleBasePrepCreateComplete}
                onChanged={async () => {
                  await Promise.all([refreshBasePreps(), refreshRecipes()]);
                }}
                onEdit={async (basePrepId, updates) => {
                  await updateBasePrepAPI(basePrepId, updates);
                  await Promise.all([refreshBasePreps(), refreshRecipes()]);
                  toast.success("Base prep updated successfully");
                }}
                onDelete={async (basePrepId) => {
                  await deleteBasePrepAPI(basePrepId);
                  await Promise.all([refreshBasePreps(), refreshRecipes()]);
                }}
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

      <RestaurantOnboardingDialog
        open={showOnboarding}
        onCreateRestaurant={handleCreateRestaurantFromOnboarding}
      />
    </div>
  );
};

export default Index;
