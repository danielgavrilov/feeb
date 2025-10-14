import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { 
  Restaurant, 
  createRestaurant as apiCreateRestaurant, 
  getUserRestaurants 
} from '@/lib/api';

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
        ? data.find(r => r.id.toString() === savedRestaurantId) 
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
      setRestaurants([...restaurants, newRestaurant]);
      setRestaurant(newRestaurant);
      localStorage.setItem('selectedRestaurantId', newRestaurant.id.toString());
      return newRestaurant;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create restaurant');
      throw err;
    }
  };

  const selectRestaurant = (restaurantId: number) => {
    const selected = restaurants.find(r => r.id === restaurantId);
    if (selected) {
      setRestaurant(selected);
      localStorage.setItem('selectedRestaurantId', selected.id.toString());
    }
  };

  return {
    restaurant,
    restaurants,
    loading,
    error,
    createRestaurant,
    selectRestaurant,
    refreshRestaurants: loadRestaurants,
  };
}

