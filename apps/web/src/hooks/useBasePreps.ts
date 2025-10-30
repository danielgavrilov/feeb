import { useState, useEffect } from "react";
import {
  BasePrep,
  BasePrepCreate,
  BasePrepUpdate,
  getRestaurantBasePreps,
  createBasePrep as apiCreateBasePrep,
  updateBasePrep as apiUpdateBasePrep,
  deleteBasePrep as apiDeleteBasePrep,
} from "@/lib/api";

export function useBasePreps(restaurantId: number | null) {
  const [basePreps, setBasePreps] = useState<BasePrep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load base preps when restaurant changes
  useEffect(() => {
    if (restaurantId) {
      loadBasePreps();
    } else {
      setBasePreps([]);
      setLoading(false);
    }
  }, [restaurantId]);

  const loadBasePreps = async () => {
    if (!restaurantId) return;

    try {
      setLoading(true);
      const basePrepsData = await getRestaurantBasePreps(restaurantId);
      setBasePreps(basePrepsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load base preps');
      console.error('Failed to load base preps:', err);
    } finally {
      setLoading(false);
    }
  };

  const createBasePrep = async (basePrepData: BasePrepCreate): Promise<BasePrep> => {
    try {
      const newBasePrep = await apiCreateBasePrep(basePrepData);
      setBasePreps((prevBasePreps) => [...prevBasePreps, newBasePrep]);
      return newBasePrep;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create base prep');
      throw err;
    }
  };

  const updateBasePrep = async (basePrepId: number, updates: BasePrepUpdate): Promise<BasePrep> => {
    try {
      const updatedBasePrep = await apiUpdateBasePrep(basePrepId, updates);
      setBasePreps((prevBasePreps) => prevBasePreps.map((bp) => (bp.id === basePrepId ? updatedBasePrep : bp)));
      return updatedBasePrep;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update base prep');
      throw err;
    }
  };

  const deleteBasePrep = async (basePrepId: number): Promise<void> => {
    try {
      await apiDeleteBasePrep(basePrepId);
      setBasePreps((prevBasePreps) => prevBasePreps.filter((bp) => bp.id !== basePrepId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete base prep');
      throw err;
    }
  };

  return {
    basePreps,
    loading,
    error,
    createBasePrep,
    updateBasePrep,
    deleteBasePrep,
    refreshBasePreps: loadBasePreps,
  };
}

