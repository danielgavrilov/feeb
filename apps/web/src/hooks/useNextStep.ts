import { useMemo } from "react";
import { RestaurantProgress } from "@/data/mockRestaurant";

interface NextStepBase {
  title: string;
  description: string;
  actionLabel: string;
  actionLink: string;
}

export interface NextStepCarouselItem {
  title: string;
  actionLabel: string;
  actionLink: string;
}

export interface CarouselStep {
  carousel: NextStepCarouselItem[];
}

export type NextStep = NextStepBase | CarouselStep;

export interface UseNextStepResult {
  nextStep: NextStep;
  isSetupComplete: boolean;
}

export const isCarouselStep = (step: NextStep): step is CarouselStep => "carousel" in step;

export const useNextStep = (
  restaurant?: RestaurantProgress | null,
): UseNextStepResult => {
  return useMemo(() => {
    if (!restaurant) {
      return {
        nextStep: {
          title: "Create your restaurant profile",
          description: "Add your restaurant details so we can tailor your setup journey.",
          actionLabel: "Create Restaurant",
          actionLink: "/restaurants/new",
        },
        isSetupComplete: false,
      };
    }

    const wantsImages = restaurant.showImages ?? true;

    let nextStep: NextStep;

    if (!restaurant.menuUploaded) {
      nextStep = {
        title: "Let’s get your menu live!",
        description: "Upload your menu to start creating your digital recipe book.",
        actionLabel: "Upload Menu",
        actionLink: "/upload",
      };
    } else if (!restaurant.ingredientsConfirmed) {
      nextStep = {
        title: "Confirm your ingredients",
        description: "Make sure each dish has its ingredients and allergens checked.",
        actionLabel: "Review Ingredients",
        actionLink: "/ingredients",
      };
    } else if (!restaurant.customisationDone) {
      nextStep = {
        title: "Customise your menu page",
        description: "Add your logo and colour scheme to match your restaurant.",
        actionLabel: "Customise",
        actionLink: "/customise",
      };
    } else if (wantsImages && !restaurant.imagesUploaded) {
      nextStep = {
        title: "Add photos of your dishes",
        description: "Make your menu shine with mouth-watering pictures.",
        actionLabel: "Upload Photos",
        actionLink: "/photos",
      };
    } else {
      nextStep = {
        carousel: [
          {
            title: "Add a new dish",
            actionLabel: "Add Dish",
            actionLink: "/add",
          },
          {
            title: "Print your QR menu",
            actionLabel: "Print QR",
            actionLink: "/menu",
          },
          {
            title: "Optimise pricing",
            actionLabel: "Try Pricing Insights",
            actionLink: "/pricing",
          },
        ],
      };
    }

    const isSetupComplete =
      restaurant.menuUploaded &&
      restaurant.ingredientsConfirmed &&
      restaurant.customisationDone &&
      (!wantsImages || restaurant.imagesUploaded);

    return { nextStep, isSetupComplete };
  }, [restaurant]);
};
