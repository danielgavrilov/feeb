import { useMemo } from "react";
import { RestaurantProgress } from "@/data/mockRestaurant";
import { useLanguage } from "@/contexts/LanguageContext";

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

export interface UseNextStepOptions {
  unconfirmedRecipes?: number;
}

export interface UseNextStepResult {
  nextStep: NextStep;
  isSetupComplete: boolean;
}

export const isCarouselStep = (step: NextStep): step is CarouselStep => "carousel" in step;

export const useNextStep = (
  restaurant?: RestaurantProgress | null,
  options: UseNextStepOptions = {},
): UseNextStepResult => {
  const { t } = useLanguage();
  const { unconfirmedRecipes } = options;

  return useMemo(() => {
    if (!restaurant) {
      return {
        nextStep: {
          title: t("nextStep.createProfile.title"),
          description: t("nextStep.createProfile.description"),
          actionLabel: t("nextStep.createProfile.actionLabel"),
          actionLink: "/restaurants/new",
        },
        isSetupComplete: false,
      };
    }

    const wantsImages = restaurant.showImages ?? true;

    let nextStep: NextStep;

    if (!restaurant.menuUploaded) {
      nextStep = {
        title: t("nextStep.uploadMenu.title"),
        description: t("nextStep.uploadMenu.description"),
        actionLabel: t("nextStep.uploadMenu.actionLabel"),
        actionLink: "/upload",
      };
    } else if (!restaurant.ingredientsConfirmed) {
      nextStep = {
        title: t("nextStep.reviewRecipes.title"),
        description: t("nextStep.reviewRecipes.description"),
        actionLabel: t("nextStep.reviewRecipes.actionLabel"),
        actionLink:
          unconfirmedRecipes && unconfirmedRecipes > 0 ? "/recipes?status=needs_review" : "/ingredients",
      };
    } else if (!restaurant.customisationDone) {
      nextStep = {
        title: t("nextStep.customiseMenu.title"),
        description: t("nextStep.customiseMenu.description"),
        actionLabel: t("nextStep.customiseMenu.actionLabel"),
        actionLink: "/customise",
      };
    } else if (wantsImages && !restaurant.imagesUploaded) {
      nextStep = {
        title: t("nextStep.uploadPhotos.title"),
        description: t("nextStep.uploadPhotos.description"),
        actionLabel: t("nextStep.uploadPhotos.actionLabel"),
        actionLink: "/photos",
      };
    } else {
      nextStep = {
        carousel: [
          {
            title: t("nextStep.carousel.addDishTitle"),
            actionLabel: t("nextStep.carousel.addDishAction"),
            actionLink: "/add",
          },
          {
            title: t("nextStep.carousel.printQrTitle"),
            actionLabel: t("nextStep.carousel.printQrAction"),
            actionLink: "/menu",
          },
          {
            title: t("nextStep.carousel.pricingTitle"),
            actionLabel: t("nextStep.carousel.pricingAction"),
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
  }, [restaurant, t, unconfirmedRecipes]);
};
