import { MenuItem } from "@/data/menu";
import { DishCard } from "./DishCard";

interface FeaturedSectionProps {
  title: string;
  dishes: MenuItem[];
  onViewDetails: (dish: MenuItem) => void;
}

export const FeaturedSection = ({ title, dishes, onViewDetails }: FeaturedSectionProps) => {
  if (dishes.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
        <span className="text-sm text-muted-foreground">{dishes.length} items</span>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {dishes.map((dish) => (
          <DishCard key={dish.id} dish={dish} onViewDetails={onViewDetails} />
        ))}
      </div>
    </section>
  );
};
