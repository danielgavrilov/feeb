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
  liveDishCount?: number;
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
  const { unconfirmedRecipes, liveDishCount = 0 } = options;

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
          unconfirmedRecipes && unconfirmedRecipes > 0 ? "/recipes?status=needs_review" : "/?tab=add",
      };
    } else if (liveDishCount === 0) {
      nextStep = {
        title: t("nextStep.addToMenu.title"),
        description: t("nextStep.addToMenu.description"),
        actionLabel: t("nextStep.addToMenu.actionLabel"),
        actionLink: "/?tab=recipes",
      };
    } else if (!restaurant.customisationDone) {
      nextStep = {
        title: t("nextStep.customiseMenu.title"),
        description: t("nextStep.customiseMenu.description"),
        actionLabel: t("nextStep.customiseMenu.actionLabel"),
        actionLink: "/?tab=settings",
      };
    } else {
      nextStep = {
        title: t("nextStep.setLive.title"),
        description: t("nextStep.setLive.description"),
        actionLabel: t("nextStep.setLive.actionLabel"),
        actionLink: "/menu-live",
      };
    }

    const isSetupComplete =
      restaurant.menuUploaded &&
      restaurant.ingredientsConfirmed &&
      restaurant.customisationDone &&
      liveDishCount > 0;

    return { nextStep, isSetupComplete };
  }, [restaurant, t, unconfirmedRecipes, liveDishCount]);
};
