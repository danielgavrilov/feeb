import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Restaurant } from "@/lib/api";
import {
  CurrencyOption,
  PriceDisplayFormat,
  PRICE_FORMAT_OPTIONS,
  formatPriceDisplay,
  getCurrencySymbol,
} from "@/lib/price-format";

interface SettingsProps {
  restaurant: Restaurant | null;
  restaurants: Restaurant[];
  onCreateRestaurant: (name: string, description?: string) => Promise<Restaurant>;
  onSelectRestaurant: (restaurantId: number) => void;
  showMenuImages: boolean;
  onToggleMenuImages: (show: boolean) => void;
  currency: CurrencyOption;
  onCurrencyChange: (currency: CurrencyOption) => void;
  priceFormat: PriceDisplayFormat;
  onPriceFormatChange: (format: PriceDisplayFormat) => void;
}

export const Settings = ({
  restaurant,
  restaurants,
  onCreateRestaurant,
  onSelectRestaurant,
  showMenuImages,
  onToggleMenuImages,
  currency,
  onCurrencyChange,
  priceFormat,
  onPriceFormatChange,
}: SettingsProps) => {
  const [newRestaurantName, setNewRestaurantName] = useState("");
  const [newRestaurantDescription, setNewRestaurantDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateRestaurant = async () => {
    if (!newRestaurantName.trim()) {
      toast.error("Please enter a restaurant name");
      return;
    }

    try {
      setIsCreating(true);
      await onCreateRestaurant(newRestaurantName, newRestaurantDescription || undefined);
      setNewRestaurantName("");
      setNewRestaurantDescription("");
      toast.success("Restaurant created successfully");
    } catch (error) {
      toast.error("Failed to create restaurant");
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground mb-6">Settings</h2>

      {restaurants.length > 0 && (
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="select-restaurant" className="text-lg font-semibold mb-2 block">
                Current Restaurant
              </Label>
              <Select
                value={restaurant?.id.toString()}
                onValueChange={(value) => onSelectRestaurant(parseInt(value))}
              >
                <SelectTrigger className="h-12 text-lg">
                  <SelectValue placeholder="Select a restaurant" />
                </SelectTrigger>
                <SelectContent>
                  {restaurants.map((r) => (
                    <SelectItem key={r.id} value={r.id.toString()}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Menu Preferences</h3>
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Label htmlFor="menu-images" className="text-base font-semibold text-foreground">
                Show images on menu
              </Label>
              <p className="text-sm text-muted-foreground">
                Toggle dish photos on the menu page. Images are hidden by default.
              </p>
            </div>
            <Switch id="menu-images" checked={showMenuImages} onCheckedChange={onToggleMenuImages} />
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Label htmlFor="currency-toggle" className="text-base font-semibold text-foreground">
                Currency
              </Label>
              <p className="text-sm text-muted-foreground">
                Toggle between Euro and US Dollar price displays.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">
                {currency === "EUR" ? "Euro (€)" : "US Dollar ($)"}
              </span>
              <Switch
                id="currency-toggle"
                checked={currency === "EUR"}
                onCheckedChange={(checked) => onCurrencyChange(checked ? "EUR" : "USD")}
                aria-label="Toggle currency"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price-format" className="text-base font-semibold text-foreground">
              Price format
            </Label>
            <Select
              value={priceFormat}
              onValueChange={(value) => onPriceFormatChange(value as PriceDisplayFormat)}
            >
              <SelectTrigger id="price-format" className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRICE_FORMAT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Preview: {formatPriceDisplay(7.5, { currency, format: priceFormat }) || `${getCurrencySymbol(currency)}7.50`}
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          {restaurants.length === 0 ? "Create Your First Restaurant" : "Add New Restaurant"}
        </h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="new-restaurant-name" className="text-base font-semibold mb-2 block">
              Restaurant Name
            </Label>
            <Input
              id="new-restaurant-name"
              value={newRestaurantName}
              onChange={(e) => setNewRestaurantName(e.target.value)}
              placeholder="Enter restaurant name"
              className="h-12 text-lg"
            />
          </div>

          <div>
            <Label htmlFor="new-restaurant-desc" className="text-base font-semibold mb-2 block">
              Description (Optional)
            </Label>
            <Input
              id="new-restaurant-desc"
              value={newRestaurantDescription}
              onChange={(e) => setNewRestaurantDescription(e.target.value)}
              placeholder="Enter restaurant description"
              className="h-12 text-lg"
            />
          </div>

          <Button 
            onClick={handleCreateRestaurant} 
            className="h-12 text-lg font-semibold" 
            size="lg"
            disabled={isCreating}
          >
            {isCreating ? "Creating..." : "Create Restaurant"}
          </Button>
        </div>
      </Card>

      <Card className="p-6 bg-muted/50">
        <h3 className="font-semibold text-foreground mb-2">About</h3>
        <p className="text-sm text-muted-foreground">
          Feeb helps you manage recipes and track dietary compliance for your kitchen.
        </p>
      </Card>
    </div>
  );
};
