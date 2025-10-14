import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface SettingsProps {
  restaurantName: string;
  onRestaurantNameChange: (name: string) => void;
}

export const Settings = ({ restaurantName, onRestaurantNameChange }: SettingsProps) => {
  const handleSave = () => {
    toast.success("Settings saved");
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground mb-6">Settings</h2>

      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="restaurant-name" className="text-lg font-semibold mb-2 block">
              Restaurant Name
            </Label>
            <Input
              id="restaurant-name"
              value={restaurantName}
              onChange={(e) => onRestaurantNameChange(e.target.value)}
              placeholder="Enter your restaurant name"
              className="h-12 text-lg"
            />
          </div>

          <Button onClick={handleSave} className="h-12 text-lg font-semibold" size="lg">
            Save Settings
          </Button>
        </div>
      </Card>

      <Card className="p-6 bg-muted/50">
        <h3 className="font-semibold text-foreground mb-2">About</h3>
        <p className="text-sm text-muted-foreground">
          Allergen Tracker helps you manage recipes and track dietary compliance for your kitchen.
        </p>
      </Card>
    </div>
  );
};
