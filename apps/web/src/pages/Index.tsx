import { useState, useEffect, useRef } from "react";
import { DishNameInput } from "@/components/DishNameInput";
import { IngredientsList, IngredientState } from "@/components/IngredientsList";
import { PrepMethodInput } from "@/components/PrepMethodInput";
import { ComplianceOverview } from "@/components/ComplianceOverview";
import { RecipeBook, SavedDish } from "@/components/RecipeBook";
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

type Step = "details" | "compliance";

const Index = () => {
  const { restaurant, restaurants, createRestaurant: createRestaurantAPI, selectRestaurant } = useRestaurant();
  const { recipes, createRecipe: createRecipeAPI, updateRecipe: updateRecipeAPI, deleteRecipe: deleteRecipeAPI } = useRecipes(restaurant?.id || null);
  
  const validTabs = ["landing", "add", "recipes", "menu", "settings"] as const;
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTabParam = searchParams.get("tab");
  const initialTab = validTabs.includes(initialTabParam as typeof validTabs[number])
    ? (initialTabParam as typeof validTabs[number])
    : "landing";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [step, setStep] = useState<Step>("details");
  const [dishName, setDishName] = useState("");
  const [menuCategory, setMenuCategory] = useState("");
  const [description, setDescription] = useState("");
  const [servingSize, setServingSize] = useState("1");
  const [price, setPrice] = useState("");
  const [ingredients, setIngredients] = useState<IngredientState[]>([]);
  const [prepMethod, setPrepMethod] = useState("");
  const [compliance, setCompliance] = useState<Record<string, boolean>>({});
  const [dishImage, setDishImage] = useState("");
  const [editingDishId, setEditingDishId] = useState<number | null>(null);
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
  }));

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
    const updated = [...ingredients];
    updated[index].confirmed = true;
    setIngredients(updated);
    toast.success(`${updated[index].name} confirmed`);
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
      confirmed: true,
      allergens: [],
      dietaryInfo: [],
    };
    setIngredients([...ingredients, newIngredient]);
    toast.success(`${name} added`);
  };

  const handleNext = () => {
    if (step === "details") {
      if (!dishName.trim()) {
        toast.error("Please enter a dish name");
        return;
      }
      if (ingredients.length === 0) {
        toast.error("Add at least one ingredient");
        return;
      }
      const hasIncompleteIngredient = ingredients.some(
        (ingredient) => !ingredient.quantity.trim() || !ingredient.unit.trim()
      );
      if (hasIncompleteIngredient) {
        toast.error("Please confirm quantity");
        return;
      }
      calculateCompliance();
      setStep("compliance");
    }
  };

  const handleBack = () => {
    if (step === "compliance") {
      setStep("details");
    }
  };

  const handleAddPhoto = () => {
    toast.info("Photo uploads coming soon");
  };

  const handleAddPreparation = () => {
    if (prepInputRef.current) {
      prepInputRef.current.focus();
      prepInputRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const calculateCompliance = () => {
    const complianceResult: Record<string, boolean> = {};
    
    // Check each dietary category
    ["vegan", "vegetarian", "gluten-free", "nut-free", "dairy-free", "halal", "kosher", "low-fodmap"].forEach((diet) => {
      complianceResult[diet] = ingredients.every((ing) => 
        ing.dietaryInfo?.includes(diet) ?? false
      );
    });

    setCompliance(complianceResult);
  };

  const handleSaveDish = async () => {
    if (!restaurant) {
      toast.error("Please create a restaurant first");
      return;
    }

    try {
      // Check if all ingredients are confirmed
      const allIngredientsConfirmed = ingredients.length > 0 && ingredients.every(ing => ing.confirmed);
      
      // For now, we're saving recipes without ingredient links
      // TODO: Implement ingredient search and linking
      if (editingDishId) {
        await updateRecipeAPI(editingDishId, {
          name: dishName,
          description,
          instructions: prepMethod,
          menu_category: menuCategory,
          serving_size: servingSize,
          price,
          image: dishImage,
          confirmed: allIngredientsConfirmed,
        });
        toast.success(allIngredientsConfirmed ? "Dish reviewed and confirmed" : "Dish updated");
      } else {
        await createRecipeAPI({
          restaurant_id: restaurant.id,
          name: dishName,
          description,
          instructions: prepMethod,
          menu_category: menuCategory,
          serving_size: servingSize,
          price,
          image: dishImage,
          ingredients: [], // TODO: Map ingredients to ingredient IDs
          confirmed: allIngredientsConfirmed,
        });
        toast.success(allIngredientsConfirmed ? "Dish saved and confirmed" : "Dish saved");
      }

      handleStartNew();
      setActiveTab("recipes");
    } catch (error) {
      toast.error("Failed to save dish");
      console.error(error);
    }
  };

  const handleStartNew = () => {
    setStep("details");
    setDishName("");
    setMenuCategory("");
    setDescription("");
    setServingSize("1");
    setPrice("");
    setIngredients([]);
    setPrepMethod("");
    setCompliance({});
    setDishImage("");
    setEditingDishId(null);
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

  const handleEditDish = (id: string) => {
    const dish = savedDishes.find(d => d.id === id);
    if (!dish) return;

    setEditingDishId(parseInt(id));
    setDishName(dish.name);
    setMenuCategory(dish.menuCategory);
    setDescription(dish.description);
    setServingSize(dish.servingSize);
    setPrice(dish.price);
    setIngredients(dish.ingredients.map(ing => ({
      ...ing,
      confirmed: ing.confirmed ?? false,
      allergens: ing.allergens ?? [],
      dietaryInfo: [],
    })));
    setPrepMethod(dish.prepMethod);
    setCompliance(dish.compliance);
    setDishImage(dish.image || "");
    setStep("details");
    handleTabChange("add");
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

  const canProceed = () => {
    if (step === "details") return dishName.trim().length > 0 && ingredients.length > 0;
    return true;
  };

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
            <LandingPage restaurantName={restaurant?.name ?? undefined} />
          </TabsContent>

          <TabsContent value="add">
            <div className="bg-card rounded-xl shadow-lg p-8 space-y-8">
              {step === "details" && (
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
                  />

                  <PrepMethodInput ref={prepInputRef} value={prepMethod} onChange={setPrepMethod} />
                </div>
              )}

              {step === "compliance" && (
                <ComplianceOverview
                  compliance={compliance}
                  onStartNew={handleStartNew}
                  onSave={handleSaveDish}
                  image={dishImage}
                  onImageChange={setDishImage}
                  allIngredientsConfirmed={ingredients.length > 0 && ingredients.every(ing => ing.confirmed)}
                />
              )}

              {step === "compliance" && (
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={handleBack}
                    variant="outline"
                    className="h-14 px-6 text-lg font-semibold"
                    size="lg"
                  >
                    Back to Edit
                  </Button>
                </div>
              )}

              {step === "details" && (
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={handleBack}
                    variant="outline"
                    className="h-14 px-6 text-lg font-semibold"
                    size="lg"
                    disabled
                  >
                    Back
                  </Button>
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
                    Add Preparation
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={!canProceed()}
                    className="h-14 px-6 text-lg font-semibold sm:ml-auto"
                    size="lg"
                  >
                    View Compliance
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="recipes">
            <div className="bg-card rounded-xl shadow-lg p-8">
              <RecipeBook 
                dishes={savedDishes}
                onDelete={handleDeleteDish}
                onEdit={handleEditDish}
              />
            </div>
          </TabsContent>

          <TabsContent value="menu">
            <MenuView 
              dishes={savedDishes}
              restaurantName={restaurant?.name || "My Restaurant"}
            />
          </TabsContent>

          <TabsContent value="settings">
            <div className="bg-card rounded-xl shadow-lg p-8">
              <Settings 
                restaurant={restaurant}
                restaurants={restaurants}
                onCreateRestaurant={createRestaurantAPI}
                onSelectRestaurant={selectRestaurant}
              />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
