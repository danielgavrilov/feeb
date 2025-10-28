import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";

const restaurantSchema = z.object({
  name: z.string().min(2, "Restaurant name must be at least 2 characters"),
});

type RestaurantFormData = z.infer<typeof restaurantSchema>;

interface RestaurantOnboardingDialogProps {
  open: boolean;
  onCreateRestaurant: (name: string) => Promise<void>;
}

export function RestaurantOnboardingDialog({
  open,
  onCreateRestaurant,
}: RestaurantOnboardingDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RestaurantFormData>({
    resolver: zodResolver(restaurantSchema),
  });

  const onSubmit = async (data: RestaurantFormData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await onCreateRestaurant(data.name);
      // Modal will close automatically when restaurants.length > 0
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create restaurant");
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} modal>
      <DialogContent 
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        hideCloseButton
      >
        <DialogHeader>
          <DialogTitle className="text-2xl">Welcome to Feeb! 🎉</DialogTitle>
          <DialogDescription className="text-base pt-2">
            Let's get started by setting up your restaurant. You can change this later in settings.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="restaurant-name">Restaurant Name</Label>
            <Input
              id="restaurant-name"
              placeholder="Enter your restaurant name"
              autoFocus
              disabled={isLoading}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

