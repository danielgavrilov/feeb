import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Restaurant } from "@/lib/api";
import { RestaurantUpdateInput } from "@/hooks/useRestaurant";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import {
  CurrencyOption,
  PriceDisplayFormat,
  PRICE_FORMAT_OPTIONS,
  formatPriceDisplay,
  getCurrencySymbol,
} from "@/lib/price-format";

const CREATE_RESTAURANT_VALUE = "__create__";
const DEFAULT_PICKER_COLOR = "#2563EB";

const clamp = (value: number, min = 0, max = 255) => Math.min(Math.max(value, min), max);

const normalizeHex = (hex: string | null | undefined): string | null => {
  if (!hex) {
    return null;
  }

  const prefixed = hex.startsWith("#") ? hex : `#${hex}`;
  return /^#[0-9A-Fa-f]{6}$/.test(prefixed) ? prefixed.toUpperCase() : null;
};

const hexToRgb = (hex: string | null | undefined) => {
  const normalized = normalizeHex(hex);
  if (!normalized) {
    return null;
  }

  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  };
};

const rgbToHex = ({ r, g, b }: { r: number; g: number; b: number }) =>
  `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b
    .toString(16)
    .padStart(2, "0")}`.toUpperCase();

interface ColorPickerProps {
  id: string;
  label: string;
  value?: string | null;
  onChange: (color: string) => void;
  onClear?: () => void;
  description?: string;
}

const ColorPicker = ({ id, label, value, onChange, onClear, description }: ColorPickerProps) => {
  const normalizedValue = normalizeHex(value);
  const [internalHex, setInternalHex] = useState<string>(normalizedValue ?? "#2563EB");
  const [hexInput, setHexInput] = useState<string>(normalizedValue ?? "#2563EB");
  const [rgb, setRgb] = useState(() => hexToRgb(normalizedValue ?? "#2563EB") ?? { r: 37, g: 99, b: 235 });

  useEffect(() => {
    const next = normalizeHex(value);
    if (next) {
      setInternalHex(next);
      setHexInput(next);
      const rgbValue = hexToRgb(next);
      if (rgbValue) {
        setRgb(rgbValue);
      }
    }
    // Don't set internal state to default color when value is undefined/null
    // The display will show the neutral gray color instead
  }, [value]);

  const displayColor = normalizeHex(value) ?? "#f3f4f6"; // Light gray when no color selected
  const hasSelection = Boolean(normalizeHex(value));

  const handleNativeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextHex = event.target.value.toUpperCase();
    setInternalHex(nextHex);
    setHexInput(nextHex);
    const rgbValue = hexToRgb(nextHex);
    if (rgbValue) {
      setRgb(rgbValue);
    }
    onChange(nextHex);
  };

  const handleHexInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value.replace(/#/g, "").replace(/[^0-9A-Fa-f]/g, "").slice(0, 6);
    const formatted = `#${raw}`.toUpperCase();
    setHexInput(formatted);

    if (formatted.length === 7) {
      setInternalHex(formatted);
      const rgbValue = hexToRgb(formatted);
      if (rgbValue) {
        setRgb(rgbValue);
      }
      onChange(formatted);
    }
  };

  const handleRgbInputChange = (channel: keyof typeof rgb) => (event: ChangeEvent<HTMLInputElement>) => {
    const numericValue = Number(event.target.value);
    const clampedValue = Number.isNaN(numericValue) ? 0 : clamp(numericValue);
    const nextRgb = { ...rgb, [channel]: clampedValue };
    setRgb(nextRgb);
    const nextHex = rgbToHex(nextRgb);
    setInternalHex(nextHex);
    setHexInput(nextHex);
    onChange(nextHex);
  };

  const handleClear = () => {
    // Don't set internal state to default color when clearing
    // Just call onClear to set the value to undefined
    if (onClear) {
      onClear();
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-base font-semibold text-foreground">
        {label}
      </Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="w-full justify-start gap-3 py-6 text-left font-normal">
            <span
              aria-hidden
              className="h-8 w-8 rounded-md border border-border shadow-sm"
              style={{ backgroundColor: displayColor }}
            />
            <span className="font-mono text-sm uppercase tracking-wide">
              {hasSelection ? displayColor : "Select colour"}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 space-y-4" align="start">
          <div className="space-y-2">
            <Label className="text-sm font-semibold" htmlFor={`${id}-native`}>
              Colour picker
            </Label>
            <input
              id={`${id}-native`}
              type="color"
              value={internalHex}
              onChange={handleNativeChange}
              className="h-12 w-full cursor-pointer rounded-md border border-input bg-background"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            {(["r", "g", "b"] as const).map((channel) => (
              <div key={channel} className="space-y-1">
                <Label htmlFor={`${id}-${channel}`} className="text-xs font-medium uppercase text-muted-foreground">
                  {channel}
                </Label>
                <Input
                  id={`${id}-${channel}`}
                  type="number"
                  min={0}
                  max={255}
                  value={rgb[channel]}
                  onChange={handleRgbInputChange(channel)}
                />
              </div>
            ))}
          </div>

          <div className="space-y-1">
            <Label htmlFor={`${id}-hex`} className="text-xs font-medium uppercase text-muted-foreground">
              Hex
            </Label>
            <Input id={`${id}-hex`} value={hexInput} onChange={handleHexInputChange} maxLength={7} />
          </div>

          {onClear && hasSelection && (
            <Button type="button" variant="ghost" className="w-full justify-center" onClick={handleClear}>
              Clear colour
            </Button>
          )}
        </PopoverContent>
      </Popover>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  );
};

interface SettingsProps {
  restaurant: Restaurant | null;
  restaurants: Restaurant[];
  onCreateRestaurant: (name: string, description?: string) => Promise<Restaurant>;
  onSelectRestaurant: (restaurantId: number) => void;
  onUpdateRestaurant: (restaurantId: number, updates: RestaurantUpdateInput) => Promise<Restaurant | null> | Restaurant | null;
  onDeleteRestaurant: (restaurantId: number) => Promise<void> | void;
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
  onUpdateRestaurant,
  onDeleteRestaurant,
  showMenuImages,
  onToggleMenuImages,
  currency,
  onCurrencyChange,
  priceFormat,
  onPriceFormatChange,
}: SettingsProps) => {
  const { t } = useLanguage();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newRestaurantName, setNewRestaurantName] = useState("");
  const [newRestaurantDescription, setNewRestaurantDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [restaurantName, setRestaurantName] = useState<string>(restaurant?.name ?? "");
  const [restaurantDescription, setRestaurantDescription] = useState<string>(restaurant?.description ?? "");
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(restaurant?.logoDataUrl ?? null);
  const [primaryColor, setPrimaryColor] = useState<string | undefined>(restaurant?.primaryColor);
  const [accentColor, setAccentColor] = useState<string | undefined>(restaurant?.accentColor);
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [hasDeleteConfirmation, setHasDeleteConfirmation] = useState(false);
  const [isDeletingRestaurant, setIsDeletingRestaurant] = useState(false);

  const logoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setRestaurantName(restaurant?.name ?? "");
    setRestaurantDescription(restaurant?.description ?? "");
    setLogoDataUrl(restaurant?.logoDataUrl ?? null);
    setPrimaryColor(restaurant?.primaryColor);
    setAccentColor(restaurant?.accentColor);
  }, [restaurant]);

  useEffect(() => {
    if (!isCreateDialogOpen) {
      setNewRestaurantName("");
      setNewRestaurantDescription("");
      setIsCreating(false);
    }
  }, [isCreateDialogOpen]);

  const handleRestaurantSelection = (value: string) => {
    if (value === CREATE_RESTAURANT_VALUE) {
      setIsCreateDialogOpen(true);
      return;
    }

    const restaurantId = Number(value);
    if (!Number.isNaN(restaurantId)) {
      onSelectRestaurant(restaurantId);
    }
  };

  const handleCreateRestaurant = async () => {
    if (!newRestaurantName.trim()) {
      toast.error("Please enter a restaurant name");
      return;
    }

    try {
      setIsCreating(true);
      await onCreateRestaurant(newRestaurantName.trim(), newRestaurantDescription.trim() || undefined);
      toast.success("Restaurant created successfully");
      setIsCreateDialogOpen(false);
    } catch (error) {
      toast.error("Failed to create restaurant");
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setLogoDataUrl(result);
      }
    };
    reader.onerror = () => {
      toast.error("Failed to read logo file");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoDataUrl(null);
    if (logoInputRef.current) {
      logoInputRef.current.value = "";
    }
  };

  const handleUpdateRestaurantDetails = async () => {
    if (!restaurant) {
      toast.error("Please select a restaurant first");
      return;
    }

    const trimmedName = restaurantName.trim();
    if (!trimmedName) {
      toast.error("Restaurant name cannot be empty");
      return;
    }

    const updates: RestaurantUpdateInput = {};

    if (trimmedName !== restaurant.name) {
      updates.name = trimmedName;
    }

    if (restaurantDescription !== (restaurant.description ?? "")) {
      updates.description = restaurantDescription;
    }

    if ((logoDataUrl ?? null) !== (restaurant.logoDataUrl ?? null)) {
      updates.logoDataUrl = logoDataUrl;
    }

    if ((primaryColor ?? null) !== (restaurant.primaryColor ?? null)) {
      updates.primaryColor = primaryColor ?? null;
    }

    if ((accentColor ?? null) !== (restaurant.accentColor ?? null)) {
      updates.accentColor = accentColor ?? null;
    }

    if (Object.keys(updates).length === 0) {
      toast.info("No changes to save");
      return;
    }

    try {
      setIsSavingDetails(true);
      await onUpdateRestaurant(restaurant.id, updates);
      toast.success("Restaurant details updated");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update restaurant details");
    } finally {
      setIsSavingDetails(false);
    }
  };

  const handleDeleteDialogChange = (open: boolean) => {
    setIsDeleteDialogOpen(open);
    if (!open) {
      setHasDeleteConfirmation(false);
    }
  };

  const handleConfirmDeleteRestaurant = async () => {
    if (!restaurant) {
      return;
    }

    try {
      setIsDeletingRestaurant(true);
      await onDeleteRestaurant(restaurant.id);
      toast.success("Restaurant deleted");
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete restaurant");
    } finally {
      setIsDeletingRestaurant(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="space-y-6">
      <h2 className="mb-6 text-2xl font-bold text-foreground">Settings</h2>

      <Card className="rounded-2xl p-4 sm:p-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="select-restaurant" className="mb-2 block text-lg font-semibold">
              Restaurant Name
            </Label>
            <Select value={restaurant ? restaurant.id.toString() : undefined} onValueChange={handleRestaurantSelection}>
              <SelectTrigger id="select-restaurant" className="h-12 w-full text-lg">
                <SelectValue
                  placeholder={restaurants.length ? "Select a restaurant" : "Create your first restaurant"}
                />
              </SelectTrigger>
              <SelectContent>
                {restaurants.map((item) => (
                  <SelectItem key={item.id} value={item.id.toString()}>
                    {item.name}
                  </SelectItem>
                ))}
                {restaurants.length > 0 && <SelectSeparator />}
                <SelectItem value={CREATE_RESTAURANT_VALUE} className="font-semibold text-primary">
                  + Add new restaurant
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="rounded-2xl p-4 sm:p-6">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Restaurant Details</h3>
        {restaurant ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="restaurant-name" className="text-base font-semibold text-foreground">
                  Restaurant name
                </Label>
                <Input
                  id="restaurant-name"
                  value={restaurantName}
                  onChange={(event) => setRestaurantName(event.target.value)}
                  placeholder="Enter restaurant name"
                  className="h-12 text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="restaurant-description" className="text-base font-semibold text-foreground">
                  Description
                </Label>
                <Textarea
                  id="restaurant-description"
                  value={restaurantDescription}
                  onChange={(event) => setRestaurantDescription(event.target.value)}
                  placeholder="Describe your restaurant"
                  rows={3}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <ColorPicker
                id="primary-colour"
                label="Primary theme colour"
                value={primaryColor}
                onChange={setPrimaryColor}
                onClear={() => setPrimaryColor(undefined)}
                description="Used for prominent accents across your guest menu."
              />
              <ColorPicker
                id="accent-colour"
                label="Accent colour"
                value={accentColor}
                onChange={setAccentColor}
                onClear={() => setAccentColor(undefined)}
                description="Secondary highlights such as buttons or badges."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="restaurant-logo" className="text-base font-semibold text-foreground">
                Logo
              </Label>
              <Input
                ref={logoInputRef}
                id="restaurant-logo"
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
              />
              {logoDataUrl ? (
                <div className="flex items-center gap-4">
                  <img
                    src={logoDataUrl}
                    alt={`${restaurantName || "Restaurant"} logo preview`}
                    className="h-16 w-16 rounded-md border object-cover"
                  />
                  <Button type="button" variant="ghost" onClick={handleRemoveLogo}>
                    Remove logo
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Upload a square image for the best results.</p>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <AlertDialog open={isDeleteDialogOpen} onOpenChange={handleDeleteDialogChange}>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-muted-foreground/40 bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    disabled={!restaurant || isDeletingRestaurant}
                  >
                    Delete Restaurant
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete restaurant</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this restaurant?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="rounded-md border border-destructive/20 bg-destructive/5 p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="confirm-delete-restaurant"
                        checked={hasDeleteConfirmation}
                        onCheckedChange={(checked) => setHasDeleteConfirmation(checked === true)}
                        disabled={isDeletingRestaurant}
                        className="mt-1"
                      />
                      <Label htmlFor="confirm-delete-restaurant" className="text-sm text-muted-foreground">
                        Deleting this restaurant will get rid of all menu items and associated ingredients.{" "}
                        This action cannot be undone.
                      </Label>
                    </div>
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeletingRestaurant}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleConfirmDeleteRestaurant}
                      disabled={!hasDeleteConfirmation || isDeletingRestaurant}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive"
                    >
                      {isDeletingRestaurant ? "Deleting..." : "Delete restaurant"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button
                type="button"
                onClick={handleUpdateRestaurantDetails}
                disabled={isSavingDetails || isDeletingRestaurant}
              >
                {isSavingDetails ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-muted-foreground/40 p-6 text-center text-sm text-muted-foreground">
            Use the selector above to create your first restaurant and unlock its details.
          </div>
        )}
      </Card>

      <Card className="rounded-2xl p-4 sm:p-6">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Menu Preferences</h3>
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Label className="text-base font-semibold text-foreground">
                {t("settings.language.title")}
              </Label>
              <p className="text-sm text-muted-foreground">{t("settings.language.description")}</p>
            </div>
            <div className="flex sm:justify-end">
              <LanguageSelector className="justify-end" />
            </div>
          </div>

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

          <div className="space-y-2">
            <Label htmlFor="currency-select" className="text-base font-semibold text-foreground">
              Currency
            </Label>
            <Select value={currency} onValueChange={(value) => onCurrencyChange(value as CurrencyOption)}>
              <SelectTrigger id="currency-select" className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EUR">Euro (€)</SelectItem>
                <SelectItem value="USD">US Dollar ($)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Choose the currency used to display prices in the app.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price-format" className="text-base font-semibold text-foreground">
              Price format
            </Label>
            <Select value={priceFormat} onValueChange={(value) => onPriceFormatChange(value as PriceDisplayFormat)}>
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

      <Card className="rounded-2xl p-4 sm:p-6">
        <h3 className="mb-4 text-lg font-semibold text-foreground">{t("settings.account.title")}</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-base font-semibold text-foreground">{t("settings.account.emailLabel")}</Label>
            <div className="rounded-md border bg-muted/50 px-4 py-2.5 text-base text-muted-foreground">
              {user?.email || "No email"}
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={handleSignOut}>
              {t("settings.account.signOut")}
            </Button>
          </div>
        </div>
      </Card>


      <Card className="bg-muted/50 p-6">
        <h3 className="mb-2 font-semibold text-foreground">About</h3>
        <p className="text-sm text-muted-foreground">
          Feeb helps you manage recipes and track dietary compliance for your kitchen.
        </p>
      </Card>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a restaurant</DialogTitle>
            <DialogDescription>Set up a new location to start managing its menu.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-restaurant-name" className="text-base font-semibold text-foreground">
                Restaurant name
              </Label>
              <Input
                id="new-restaurant-name"
                value={newRestaurantName}
                onChange={(event) => setNewRestaurantName(event.target.value)}
                placeholder="Enter restaurant name"
                className="h-12 text-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-restaurant-description" className="text-base font-semibold text-foreground">
                Description (optional)
              </Label>
              <Textarea
                id="new-restaurant-description"
                value={newRestaurantDescription}
                onChange={(event) => setNewRestaurantDescription(event.target.value)}
                placeholder="Enter restaurant description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleCreateRestaurant} disabled={isCreating}>
              {isCreating ? "Creating..." : "Create restaurant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

