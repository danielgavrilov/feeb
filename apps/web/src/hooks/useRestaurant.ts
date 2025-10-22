import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import {
  Restaurant,
  createRestaurant as apiCreateRestaurant,
  getUserRestaurants,
  deleteRestaurant as apiDeleteRestaurant,
  updateRestaurant as apiUpdateRestaurant,
} from "@/lib/api";

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
      setRestaurants(data);

      // Auto-select first restaurant or get from localStorage
      const savedRestaurantId = localStorage.getItem('selectedRestaurantId');
      const selected = savedRestaurantId
        ? data.find((r) => r.id.toString() === savedRestaurantId)
        : data[0];

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
      setRestaurants((prev) => [...prev, newRestaurant]);
      setRestaurant(newRestaurant);
      localStorage.setItem('selectedRestaurantId', newRestaurant.id.toString());
      return newRestaurant;
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

    try {
      // Call the API to update the restaurant
      const updatedRestaurant = await apiUpdateRestaurant(restaurantId, updates);
      
      // Update local state with the response from the API
      setRestaurants((prev) =>
        prev.map((item) => (item.id === restaurantId ? updatedRestaurant : item))
      );

      setRestaurant((prev) => {
        if (prev && prev.id === restaurantId) {
          return updatedRestaurant;
        }
        return prev;
      });

      return updatedRestaurant;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update restaurant');
      console.error('Failed to update restaurant:', err);
      throw err;
    }
  };

  const deleteRestaurant = async (restaurantId: number) => {
    if (!restaurantId) {
      return;
    }

    try {
      await apiDeleteRestaurant(restaurantId);

      let nextRestaurant: Restaurant | null = null;

      setRestaurants((prev) => {
        const updated = prev.filter((item) => item.id !== restaurantId);
        nextRestaurant = updated[0] ?? null;
        return updated;
      });

      setRestaurant((prev) => {
        if (prev && prev.id === restaurantId) {
          if (nextRestaurant) {
            localStorage.setItem("selectedRestaurantId", nextRestaurant.id.toString());
          } else {
            localStorage.removeItem("selectedRestaurantId");
          }
          return nextRestaurant;
        }

        if (localStorage.getItem("selectedRestaurantId") === restaurantId.toString()) {
          if (nextRestaurant) {
            localStorage.setItem("selectedRestaurantId", nextRestaurant.id.toString());
          } else {
            localStorage.removeItem("selectedRestaurantId");
          }
        }

        return prev;
      });

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete restaurant");
      console.error("Failed to delete restaurant:", err);
      throw err;
    }
  };

  return {
    restaurant,
    restaurants,
    loading,
    error,
    createRestaurant,
    selectRestaurant,
    updateRestaurant,
    deleteRestaurant,
    refreshRestaurants: loadRestaurants,
  };
}

