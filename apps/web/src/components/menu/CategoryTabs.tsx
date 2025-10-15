import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/data/menu";

interface CategoryTabsProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export const CategoryTabs = ({ selectedCategory, onSelectCategory }: CategoryTabsProps) => {
  return (
    <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
      {CATEGORIES.map((category) => (
        <Button
          key={category.id}
          variant={selectedCategory === category.id ? "default" : "outline"}
          size="sm"
          onClick={() => onSelectCategory(category.id)}
          className="whitespace-nowrap flex-shrink-0"
        >
          <span className="mr-1">{category.icon}</span>
          {category.label}
        </Button>
      ))}
    </div>
  );
};
