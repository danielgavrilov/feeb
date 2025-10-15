import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";
import { DIETARY_CATEGORIES } from "@/data/recipes";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface MenuSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedDiets: string[];
  onToggleDiet: (dietId: string) => void;
}

export const MenuSearch = ({
  searchQuery,
  onSearchChange,
  selectedDiets,
  onToggleDiet,
}: MenuSearchProps) => {
  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <Input
          placeholder="Search dishes or exclude ingredients..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Dietary Filters */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Filters:</span>
        <div className="flex overflow-x-auto gap-2 flex-1 scrollbar-hide">
          {DIETARY_CATEGORIES.slice(0, 4).map((diet) => (
            <Badge
              key={diet.id}
              variant={selectedDiets.includes(diet.id) ? "default" : "outline"}
              className="cursor-pointer whitespace-nowrap flex-shrink-0"
              onClick={() => onToggleDiet(diet.id)}
            >
              {diet.icon} {diet.label}
            </Badge>
          ))}
          
          {DIETARY_CATEGORIES.length > 4 && (
            <Popover>
              <PopoverTrigger asChild>
                <Badge variant="outline" className="cursor-pointer whitespace-nowrap">
                  More filters
                </Badge>
              </PopoverTrigger>
              <PopoverContent className="w-72">
                <div className="flex flex-wrap gap-2">
                  {DIETARY_CATEGORIES.slice(4).map((diet) => (
                    <Badge
                      key={diet.id}
                      variant={selectedDiets.includes(diet.id) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => onToggleDiet(diet.id)}
                    >
                      {diet.icon} {diet.label}
                    </Badge>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      {/* Active Filters */}
      {selectedDiets.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Active:</span>
          {selectedDiets.map((dietId) => {
            const diet = DIETARY_CATEGORIES.find((d) => d.id === dietId);
            return (
              <Badge key={dietId} variant="secondary" className="gap-1">
                {diet?.icon} {diet?.label}
                <button onClick={() => onToggleDiet(dietId)} className="ml-1 hover:text-destructive">
                  <X size={12} />
                </button>
              </Badge>
            );
          })}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => selectedDiets.forEach(onToggleDiet)}
            className="h-6 text-xs"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
};
