import { driver, DriveStep, Driver, Config } from "driver.js";
import "driver.js/dist/driver.css";

export interface TourCallbacks {
  onTabChange: (tab: string) => void;
  onTourStart?: () => void | Promise<void>;
  onTourEnd?: () => void | Promise<void>;
  onOpenReviewSheet?: (recipeId: string) => void;
  onConfirmDemoRecipe?: () => void | Promise<void>;
}

export const createAppTour = (callbacks: TourCallbacks, t: (key: string) => string): Driver => {
  const steps: DriveStep[] = [
    {
      element: '[data-tour="landing-hero-progress"]',
      popover: {
        title: t("tour.step1.title"),
        description: t("tour.step1.description"),
        side: "bottom",
        align: "start",
      },
    },
    {
      element: '[data-tour="progress-tracker"]',
      popover: {
        title: t("tour.step2.title"),
        description: t("tour.step2.description"),
        side: "bottom",
        align: "start",
      },
    },
    {
      element: '[data-tour="tab-recipes"]',
      popover: {
        title: t("tour.step3.title"),
        description: t("tour.step3.description"),
        side: "bottom",
        align: "start",
        onPrevClick: () => {
          // Go back to landing tab
          callbacks.onTabChange("landing");
          setTimeout(() => {
            driverInstance.movePrevious();
          }, 300);
        },
        onNextClick: () => {
          callbacks.onTabChange("recipes");
          // Wait for recipes tab to render and demo recipe to appear
          setTimeout(() => {
            driverInstance.moveNext();
          }, 500);
        },
      },
    },
    {
      element: '[data-tour="review-button-fries"]',
      popover: {
        title: t("tour.step4.title"),
        description: t("tour.step4.description"),
        side: "top",
        align: "start",
        onPrevClick: () => {
          // Go back to recipes tab when clicking previous
          callbacks.onTabChange("landing");
          setTimeout(() => {
            driverInstance.movePrevious();
          }, 300);
        },
        onNextClick: () => {
          // Programmatically click the review button to open the side sheet
          const reviewButton = document.querySelector('[data-tour="review-button-fries"]') as HTMLButtonElement;
          if (reviewButton) {
            reviewButton.click();
          }
          // Wait for the sheet to open before moving to next step
          setTimeout(() => {
            driverInstance.moveNext();
          }, 500);
        },
      },
    },
    {
      element: '[data-tour="unconfirmed-ingredient"]',
      popover: {
        title: t("tour.step5.title"),
        description: t("tour.step5.description"),
        side: "left",
        align: "start",
        onPrevClick: () => {
          // Close the sheet when going back and wait for it to close
          const closeButton = document.querySelector('[data-tour="close-review-sheet"]') as HTMLButtonElement;
          if (closeButton) {
            closeButton.click();
          }
          setTimeout(() => {
            driverInstance.movePrevious();
          }, 400);
        },
        onNextClick: () => {
          // Keep the sheet open and just move to next step (Base Prep button)
          driverInstance.moveNext();
        },
      },
    },
    {
      element: '[data-tour="add-base-prep-button"]',
      popover: {
        title: t("tour.step6.title"),
        description: t("tour.step6.description"),
        side: "left",
        align: "start",
        onPrevClick: () => {
          // Just go back to the previous step (unconfirmed ingredient is still visible)
          driverInstance.movePrevious();
        },
        onNextClick: async () => {
          // Close the sheet and update the fries recipe status to 'confirmed'
          const closeButton = document.querySelector('[data-tour="close-review-sheet"]') as HTMLButtonElement;
          if (closeButton) {
            closeButton.click();
          }
          
          // Update the demo recipe status to 'confirmed' so "Add to menu" badge appears
          if (callbacks.onConfirmDemoRecipe) {
            await callbacks.onConfirmDemoRecipe();
          }
          
          setTimeout(() => {
            driverInstance.moveNext();
          }, 400);
        },
      },
    },
    {
      element: '[data-tour="add-to-menu-button-fries"]',
      popover: {
        title: t("tour.step7.title"),
        description: t("tour.step7.description"),
        side: "top",
        align: "start",
        onPrevClick: () => {
          // Need to reopen the review sheet for the previous step
          const reviewButton = document.querySelector('[data-tour="review-button-fries"]') as HTMLButtonElement;
          if (reviewButton) {
            reviewButton.click();
          }
          setTimeout(() => {
            driverInstance.movePrevious();
          }, 500);
        },
      },
    },
    {
      element: '[data-tour="tab-menu"]',
      popover: {
        title: t("tour.step8.title"),
        description: t("tour.step8.description"),
        side: "bottom",
        align: "start",
        onPrevClick: () => {
          // Stay on recipes tab when going back
          callbacks.onTabChange("recipes");
          setTimeout(() => {
            driverInstance.movePrevious();
          }, 300);
        },
        onNextClick: () => {
          callbacks.onTabChange("menu");
          // Wait longer for menu tab to render before moving to next step
          setTimeout(() => {
            driverInstance.moveNext();
          }, 400);
        },
      },
    },
    {
      element: '[data-tour="allergen-filter"]',
      popover: {
        title: t("tour.step9.title"),
        description: t("tour.step9.description"),
        side: "bottom",
        align: "start",
        onPrevClick: () => {
          // Stay on menu tab, just go back to the previous step
          driverInstance.movePrevious();
        },
        onNextClick: () => {
          // Go back to landing tab before showing help button
          callbacks.onTabChange("landing");
          // Use setTimeout to ensure tab switch completes before moving to next step
          setTimeout(() => {
            driverInstance.moveNext();
          }, 300);
        },
      },
    },
    {
      element: '[data-tour="help-button"]',
      popover: {
        title: t("tour.step10.title"),
        description: t("tour.step10.description"),
        side: "left",
        align: "start",
        onPrevClick: () => {
          // Go back to menu tab when clicking previous
          callbacks.onTabChange("menu");
          setTimeout(() => {
            driverInstance.movePrevious();
          }, 300);
        },
      },
    },
  ];

  const config: Config = {
    showProgress: true,
    steps,
    nextBtnText: t("tour.next"),
    prevBtnText: t("tour.previous"),
    doneBtnText: t("tour.done"),
    progressText: t("tour.progress"),
    popoverClass: "feeb-tour-popover",
    animate: true,
    smoothScroll: true,
    allowClose: true,
    onDestroyed: () => {
      // Call onTourEnd when the tour is destroyed
      if (callbacks.onTourEnd) {
        callbacks.onTourEnd();
      }
    },
  };

  const driverInstance = driver(config);

  return driverInstance;
};

