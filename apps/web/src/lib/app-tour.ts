import { driver, DriveStep, Driver, Config } from "driver.js";
import "driver.js/dist/driver.css";

export interface TourCallbacks {
  onTabChange: (tab: string) => void;
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
      element: '[data-tour="tab-add"]',
      popover: {
        title: t("tour.step3.title"),
        description: t("tour.step3.description"),
        side: "bottom",
        align: "start",
        onNextClick: () => {
          callbacks.onTabChange("add");
          driverInstance.moveNext();
        },
      },
    },
    {
      element: '[data-tour="add-content"]',
      popover: {
        title: t("tour.step3.title"),
        description: t("tour.step3.description"),
        side: "top",
        align: "start",
      },
    },
    {
      element: '[data-tour="tab-recipes"]',
      popover: {
        title: t("tour.step5.title"),
        description: t("tour.step5.description"),
        side: "bottom",
        align: "start",
        onNextClick: () => {
          callbacks.onTabChange("recipes");
          driverInstance.moveNext();
        },
      },
    },
    {
      element: '[data-tour="recipe-book"]',
      popover: {
        title: t("tour.step6.title"),
        description: t("tour.step6.description"),
        side: "top",
        align: "start",
      },
    },
    {
      element: '[data-tour="tab-menu"]',
      popover: {
        title: t("tour.step7.title"),
        description: t("tour.step7.description"),
        side: "bottom",
        align: "start",
        onNextClick: () => {
          callbacks.onTabChange("menu");
          driverInstance.moveNext();
        },
      },
    },
    {
      element: '[data-tour="allergen-filter"]',
      popover: {
        title: t("tour.step8.title"),
        description: t("tour.step8.description"),
        side: "bottom",
        align: "start",
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
        title: t("tour.step9.title"),
        description: t("tour.step9.description"),
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
  };

  const driverInstance = driver(config);

  return driverInstance;
};

