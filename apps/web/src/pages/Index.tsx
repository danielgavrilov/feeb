import { useState, useEffect, useRef } from "react";
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
import { Recipe } from "@/lib/api";
import { LandingPage } from "@/components/LandingPage";
import { useSearchParams } from "react-router-dom";

const Index = () => {
  const { restaurant, restaurants, createRestaurant: createRestaurantAPI, selectRestaurant } = useRestaurant();
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
  const [menuCategory, setMenuCategory] = useState("");
  const [description, setDescription] = useState("");
  const [servingSize, setServingSize] = useState("1");
  const [price, setPrice] = useState("");
  const [ingredients, setIngredients] = useState<IngredientState[]>([]);
  const [prepMethod, setPrepMethod] = useState("");
  const [dishImage, setDishImage] = useState("");
  const [editingDishId, setEditingDishId] = useState<number | null>(null);
  const [showPrepMethod, setShowPrepMethod] = useState(false);
  const [showMenuImages, setShowMenuImages] = useState(false);
  const prepInputRef = useRef<HTMLTextAreaElement | null>(null);

  // Convert API recipes to SavedDish format for existing components
  const savedDishes: SavedDish[] = recipes.map((recipe: Recipe) => ({
    id: recipe.id.toString(),
    name: recipe.name,
    menuCategory: recipe.menu_category || "",
    description: recipe.description || "",
    servingSize: recipe.serving_size || "1",
    price: recipe.price || "",
    ingredients: recipe.ingredients.map(ing => ({
      name: ing.ingredient_name,
      quantity: ing.quantity?.toString() || "",
      unit: ing.unit || "",
      confirmed: ing.confirmed,
      allergens: ing.allergens || [],
    })),
    prepMethod: recipe.instructions || "",
    compliance: {}, // We'll compute this from ingredients
    image: recipe.image || "",
    confirmed: recipe.confirmed,
    isOnMenu: recipe.is_on_menu,
  }));

  const totalRecipes = recipes.length;
  const unconfirmedRecipeCount = recipes.filter(recipe => !recipe.confirmed).length;
  const hasRecipeImages = recipes.some(recipe => Boolean(recipe.image));
  const menuUploadComplete = totalRecipes > 0 || hasRecipeImages;
  const firstUnconfirmedRecipe = recipes.find(recipe => !recipe.confirmed);

  const populateFormFromRecipe = (recipe: Recipe) => {
    setEditingDishId(recipe.id);
    setDishName(recipe.name);
    setMenuCategory(recipe.menu_category || "");
    setDescription(recipe.description || "");
    setServingSize(recipe.serving_size || "1");
    setPrice(recipe.price || "");
    setIngredients(
      recipe.ingredients.map((ing) => ({
        name: ing.ingredient_name,
        quantity: ing.quantity?.toString() || "",
        unit: ing.unit || "",
        confirmed: ing.confirmed,
        allergens: ing.allergens || [],
        dietaryInfo: [],
      }))
    );
    setPrepMethod(recipe.instructions || "");
    setShowPrepMethod(Boolean(recipe.instructions));
    setDishImage(recipe.image || "");
    handleTabChange("add");
  };

  const handleRecipeMatch = (recipeKey: string) => {
    // For now, recipe matching from hard-coded recipes is removed
    // TODO: Implement recipe template system if needed
    toast.info("Recipe templates coming soon!");
  };

  const handleUpdateIngredient = (index: number, quantity: string) => {
    const updated = [...ingredients];
    updated[index].quantity = quantity;
    setIngredients(updated);
  };

  const handleUpdateIngredientUnit = (index: number, unit: string) => {
    const updated = [...ingredients];
    updated[index].unit = unit;
    setIngredients(updated);
  };

  const handleConfirmIngredient = (index: number) => {
    const ingredientToConfirm = ingredients[index];
    if (!ingredientToConfirm) return;

    setIngredients((current) =>
      current.map((ingredient, i) =>
        i === index
          ? {
              ...ingredient,
              confirmed: true,
              allergens: (ingredient.allergens ?? []).map((allergen) => ({
                ...allergen,
                certainty: "confirmed",
              })),
            }
          : ingredient
      )
    );

    toast.success(`${ingredientToConfirm.name} confirmed`);
  };

  const handleDeleteIngredient = (index: number) => {
    const updated = ingredients.filter((_, i) => i !== index);
    setIngredients(updated);
    toast.success("Ingredient removed");
  };

  const handleAddIngredient = (name: string, quantity: string, unit: string) => {
    const newIngredient: IngredientState = {
      name,
      quantity,
      unit,
      confirmed: false,
      allergens: [],
      dietaryInfo: [],
    };
    setIngredients([...ingredients, newIngredient]);
    toast.success(`${name} added`);
  };

  const handleUpdateIngredientAllergens = (
    index: number,
    allergens: Array<{ code: string; name: string; certainty?: string }>
  ) => {
    setIngredients((current) =>
      current.map((ingredient, i) =>
        i === index
          ? {
              ...ingredient,
              allergens,
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
    const incompleteIngredient = ingredients.find(
      (ingredient) => !ingredient.quantity.trim() || !ingredient.unit.trim()
    );
    if (incompleteIngredient) {
      const ingredientName = incompleteIngredient.name?.trim() || "this ingredient";
      toast.error(`Please specify the quantity of ${ingredientName}`);
      return;
    }

    if (!restaurant) {
      toast.error("Please create a restaurant first");
      return;
    }

    try {
      const confirmedIngredients = ingredients.map((ingredient) => ({
        ...ingredient,
        confirmed: true,
        allergens: (ingredient.allergens ?? []).map((allergen) => ({
          ...allergen,
          certainty: "confirmed",
        })),
      }));
      setIngredients(confirmedIngredients);

      // For now, we're saving recipes without ingredient links
      // TODO: Implement ingredient search and linking
      let updatedRecipesList: Recipe[] = recipes;
      let savedRecipe: Recipe;
      if (editingDishId) {
        savedRecipe = await updateRecipeAPI(editingDishId, {
          name: dishName,
          description,
          instructions: prepMethod,
          menu_category: menuCategory,
          serving_size: servingSize,
          price,
          image: dishImage,
          confirmed: true,
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
          menu_category: menuCategory,
          serving_size: servingSize,
          price,
          image: dishImage,
          ingredients: [], // TODO: Map ingredients to ingredient IDs
          confirmed: true,
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
        setActiveTab("recipes");
      }
    } catch (error) {
      toast.error("Failed to save dish");
      console.error(error);
    }
  };

  const handleStartNew = () => {
    setDishName("");
    setMenuCategory("");
    setDescription("");
    setServingSize("1");
    setPrice("");
    setIngredients([]);
    setPrepMethod("");
    setDishImage("");
    setEditingDishId(null);
    setShowPrepMethod(false);
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

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const params = new URLSearchParams(searchParams);
    if (value === "landing") {
      params.delete("tab");
    } else {
      params.set("tab", value);
    }
    setSearchParams(params, { replace: true });
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

  const canSave = () => dishName.trim().length > 0 && ingredients.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo.svg" alt="Feeb Logo" className="w-8 h-8 feeb-logo" />
              <h1 className="text-2xl font-bold text-brand-primary">Feeb</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">{restaurant?.name || "No Restaurant"}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="mb-6 flex w-full flex-wrap gap-2 sm:gap-3 sm:h-14">
            <TabsTrigger value="landing" className="flex-1 min-w-[140px] text-sm font-semibold sm:text-base">
              Landing
            </TabsTrigger>
            <TabsTrigger value="add" className="flex-1 min-w-[140px] text-sm font-semibold sm:text-base">
              Add/Edit Dish
            </TabsTrigger>
            <TabsTrigger value="recipes" className="flex-1 min-w-[140px] text-sm font-semibold sm:text-base">
              Recipe Book
            </TabsTrigger>
            <TabsTrigger value="menu" className="flex-1 min-w-[140px] text-sm font-semibold sm:text-base">
              Menu
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex-1 min-w-[140px] text-sm font-semibold sm:text-base">
              Settings
            </TabsTrigger>
          </TabsList>

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
            <div className="bg-card rounded-xl shadow-lg p-8 space-y-8">
              <div className="space-y-8">
                <DishNameInput
                  value={dishName}
                  onChange={setDishName}
                  onRecipeMatch={handleRecipeMatch}
                  menuCategory={menuCategory}
                  onMenuCategoryChange={setMenuCategory}
                  description={description}
                  onDescriptionChange={setDescription}
                  servingSize={servingSize}
                  onServingSizeChange={setServingSize}
                  price={price}
                  onPriceChange={setPrice}
                  existingDishNames={savedDishes.map((dish) => dish.name)}
                />

                <IngredientsList
                  ingredients={ingredients}
                  onUpdateIngredient={handleUpdateIngredient}
                  onUpdateIngredientUnit={handleUpdateIngredientUnit}
                  onConfirmIngredient={handleConfirmIngredient}
                  onDeleteIngredient={handleDeleteIngredient}
                  onAddIngredient={handleAddIngredient}
                  onUpdateIngredientAllergens={handleUpdateIngredientAllergens}
                />

                {showPrepMethod && (
                  <PrepMethodInput ref={prepInputRef} value={prepMethod} onChange={setPrepMethod} />
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleAddPhoto}
                  variant="outline"
                  className="h-14 px-6 text-lg font-semibold"
                  size="lg"
                >
                  Add Photo
                </Button>
                <Button
                  onClick={handleAddPreparation}
                  variant="outline"
                  className="h-14 px-6 text-lg font-semibold"
                  size="lg"
                >
                  {showPrepMethod ? "Hide Preparation" : "Add Preparation"}
                </Button>
                <Button
                  onClick={handleSaveDish}
                  disabled={!canSave()}
                  className="h-14 px-6 text-lg font-semibold sm:ml-auto"
                  size="lg"
                >
                  Save
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="recipes">
            <div className="bg-card rounded-xl shadow-lg p-8">
              <RecipeBook
                dishes={savedDishes}
                onDelete={handleDeleteDish}
                onEdit={handleEditDish}
                onBulkAction={handleBulkRecipeAction}
                onToggleMenuStatus={handleToggleMenuStatus}
              />
            </div>
          </TabsContent>

          <TabsContent value="menu">
            <MenuView
              dishes={savedDishes}
              restaurantName={restaurant?.name || "My Restaurant"}
              showImages={showMenuImages}
            />
          </TabsContent>

          <TabsContent value="settings">
            <div className="bg-card rounded-xl shadow-lg p-8">
              <Settings
                restaurant={restaurant}
                restaurants={restaurants}
                onCreateRestaurant={createRestaurantAPI}
                onSelectRestaurant={selectRestaurant}
                showMenuImages={showMenuImages}
                onToggleMenuImages={setShowMenuImages}
              />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
