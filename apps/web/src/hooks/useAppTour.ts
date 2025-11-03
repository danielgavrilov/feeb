import { useEffect, useRef, useCallback } from "react";
import { Driver } from "driver.js";
import { createAppTour, TourCallbacks } from "@/lib/app-tour";
import { useLanguage } from "@/contexts/LanguageContext";

const TOUR_COMPLETED_KEY = "feeb_tour_completed";

export const useAppTour = (callbacks: TourCallbacks) => {
  const { t } = useLanguage();
  const driverRef = useRef<Driver | null>(null);
  const hasInitialized = useRef(false);

  const startTour = useCallback(async () => {
    if (driverRef.current) {
      driverRef.current.destroy();
    }

    // Call onTourStart callback if provided and wait for it
    if (callbacks.onTourStart) {
      await callbacks.onTourStart();
    }

    const driverInstance = createAppTour(callbacks, t);
    driverRef.current = driverInstance;

    driverInstance.drive();

    // Mark tour as completed when it's done or destroyed
    const originalDestroy = driverInstance.destroy.bind(driverInstance);
    driverInstance.destroy = () => {
      localStorage.setItem(TOUR_COMPLETED_KEY, "true");
      originalDestroy();
    };
  }, [callbacks, t]);

  useEffect(() => {
    // Only run once on mount
    if (hasInitialized.current) {
      return;
    }
    hasInitialized.current = true;

    // Check if tour has been completed before
    const tourCompleted = localStorage.getItem(TOUR_COMPLETED_KEY);

    if (!tourCompleted) {
      // Small delay to ensure DOM is fully rendered
      const timer = setTimeout(() => {
        startTour();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [startTour]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (driverRef.current) {
        driverRef.current.destroy();
      }
    };
  }, []);

  return { startTour };
};

