import { SavedDish } from "./RecipeBook";
import { DishCard } from "./menu/DishCard";

interface MenuViewProps {
  dishes: SavedDish[];
  restaurantName: string;
  showImages: boolean;
}

const getCategoryLabel = (category?: string | null) => {
  if (!category) return "Other";
  const trimmed = category.trim();
  return trimmed.length > 0 ? trimmed : "Other";
};

export const MenuView = ({ dishes, restaurantName, showImages }: MenuViewProps) => {
  const menuDishes = dishes.filter((dish) => dish.isOnMenu);

  const categories = menuDishes.reduce<string[]>((acc, dish) => {
    const label = getCategoryLabel(dish.menuCategory);
    if (!acc.includes(label)) {
      acc.push(label);
    }
    return acc;
  }, []);

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
        {menuDishes.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-xl text-muted-foreground">
              No dishes have been added to the menu yet.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Mark dishes as "Added to menu" in the Recipe Book to see them here.
            </p>
          </div>
        ) : (
          categories.map((category) => {
            const dishesInCategory = menuDishes.filter(
              (dish) => getCategoryLabel(dish.menuCategory) === category,
            );

            return (
              <section key={category} className="space-y-4">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-2xl font-semibold text-foreground">{category}</h2>
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
