import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import {
  Restaurant,
  createRestaurant as apiCreateRestaurant,
  getUserRestaurants,
} from "@/lib/api";

type RestaurantCustomization = Pick<Restaurant, "logoDataUrl" | "primaryColor" | "accentColor">;

const CUSTOMIZATION_STORAGE_KEY = "restaurantCustomizations";

const loadRestaurantCustomizations = (): Record<number, RestaurantCustomization> => {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const stored = window.localStorage.getItem(CUSTOMIZATION_STORAGE_KEY);
    if (!stored) {
      return {};
    }
    const parsed = JSON.parse(stored) as Record<number, RestaurantCustomization>;
    return parsed ?? {};
  } catch (error) {
    console.error("Failed to parse restaurant customizations", error);
    return {};
  }
};

const saveRestaurantCustomizations = (customizations: Record<number, RestaurantCustomization>) => {
  if (typeof window === "undefined") {
    return;
  }

  const sanitizedEntries = Object.entries(customizations).filter(
    ([, value]) => value && Object.keys(value).length > 0,
  );

  if (sanitizedEntries.length === 0) {
    window.localStorage.removeItem(CUSTOMIZATION_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(CUSTOMIZATION_STORAGE_KEY, JSON.stringify(Object.fromEntries(sanitizedEntries)));
};

const mergeRestaurantWithCustomization = (
  restaurant: Restaurant,
  customizations: Record<number, RestaurantCustomization>,
): Restaurant => {
  const customization = customizations[restaurant.id];
  return customization ? { ...restaurant, ...customization } : restaurant;
};

export interface RestaurantUpdateInput {
  name?: string;
  description?: string;
  logoDataUrl?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
}

export function useRestaurant() {
  const { backendUserId } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load user's restaurants
  useEffect(() => {
    if (backendUserId) {
      loadRestaurants();
    }
  }, [backendUserId]);

  const loadRestaurants = async () => {
    if (!backendUserId) return;

    try {
      setLoading(true);
      const data = await getUserRestaurants(backendUserId);
      const customizations = loadRestaurantCustomizations();
      const enhancedRestaurants = data.map((restaurant) =>
        mergeRestaurantWithCustomization(restaurant, customizations),
      );
      setRestaurants(enhancedRestaurants);

      // Auto-select first restaurant or get from localStorage
      const savedRestaurantId = localStorage.getItem('selectedRestaurantId');
      const selected = savedRestaurantId
        ? enhancedRestaurants.find((r) => r.id.toString() === savedRestaurantId)
        : enhancedRestaurants[0];

      setRestaurant(selected || null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load restaurants');
      console.error('Failed to load restaurants:', err);
    } finally {
      setLoading(false);
    }
  };

  const createRestaurant = async (name: string, description?: string) => {
    if (!backendUserId) {
      throw new Error('User not authenticated');
    }

    try {
      const newRestaurant = await apiCreateRestaurant(name, backendUserId, description);
      const customizations = loadRestaurantCustomizations();
      const enhancedRestaurant = mergeRestaurantWithCustomization(newRestaurant, customizations);
      setRestaurants((prev) => [...prev, enhancedRestaurant]);
      setRestaurant(enhancedRestaurant);
      localStorage.setItem('selectedRestaurantId', newRestaurant.id.toString());
      return enhancedRestaurant;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create restaurant');
      throw err;
    }
  };

  const selectRestaurant = (restaurantId: number) => {
    const selected = restaurants.find((r) => r.id === restaurantId);
    if (selected) {
      setRestaurant(selected);
      localStorage.setItem('selectedRestaurantId', selected.id.toString());
    }
  };

  const updateRestaurant = async (restaurantId: number, updates: RestaurantUpdateInput) => {
    if (!restaurantId) {
      return null;
    }

    const customizationMap = loadRestaurantCustomizations();
    const nextCustomizationMap: Record<number, RestaurantCustomization> = { ...customizationMap };
    let customizationsChanged = false;
    let updatedRestaurant: Restaurant | null = null;

    const applyUpdates = (current: Restaurant): Restaurant => {
      let updated: Restaurant = { ...current };

      if (updates.name !== undefined) {
        updated.name = updates.name;
      }

      if (updates.description !== undefined) {
        updated.description = updates.description;
      }

      const existingCustomization = nextCustomizationMap[current.id] || {};
      const nextCustomization: RestaurantCustomization = { ...existingCustomization };
      const existingKeysCount = Object.keys(existingCustomization).length;

      const assignCustomization = (
        key: keyof RestaurantCustomization,
        value: string | null | undefined,
      ) => {
        if (value === undefined) {
          return;
        }

        const currentValue = existingCustomization[key];

        if (value === null || value === "") {
          if (currentValue !== undefined) {
            customizationsChanged = true;
          }
          delete nextCustomization[key];
          return;
        }

        if (currentValue !== value) {
          customizationsChanged = true;
        }

        nextCustomization[key] = value;
      };

      assignCustomization("logoDataUrl", updates.logoDataUrl);
      assignCustomization("primaryColor", updates.primaryColor);
      assignCustomization("accentColor", updates.accentColor);

      const hasCustomization = Object.keys(nextCustomization).length > 0;

      if (!hasCustomization && existingKeysCount > 0) {
        customizationsChanged = true;
      }

      if (hasCustomization) {
        nextCustomizationMap[current.id] = nextCustomization;
        updated = { ...updated, ...nextCustomization };
      } else {
        delete nextCustomizationMap[current.id];
        updated = {
          ...updated,
          logoDataUrl: undefined,
          primaryColor: undefined,
          accentColor: undefined,
        };
      }

      return updated;
    };

    setRestaurants((prev) =>
      prev.map((item) => {
        if (item.id !== restaurantId) {
          return item;
        }

        const next = applyUpdates(item);
        updatedRestaurant = next;
        return next;
      }),
    );

    setRestaurant((prev) => {
      if (prev && prev.id === restaurantId && updatedRestaurant) {
        return updatedRestaurant;
      }
      return prev;
    });

    if (customizationsChanged) {
      saveRestaurantCustomizations(nextCustomizationMap);
    }

    return updatedRestaurant;
  };

  return {
    restaurant,
    restaurants,
    loading,
    error,
    createRestaurant,
    selectRestaurant,
    updateRestaurant,
    refreshRestaurants: loadRestaurants,
  };
}

