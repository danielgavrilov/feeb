import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ProgressTracker, { ProgressStep } from "@/components/ProgressTracker";
import { useNextStep, isCarouselStep } from "@/hooks/useNextStep";
import { mockRestaurant, RestaurantProgress } from "@/data/mockRestaurant";
import { useLanguage } from "@/contexts/LanguageContext";

interface LandingPageProps {
  restaurantName?: string;
  menuUploaded?: boolean;
  ingredientsConfirmed?: boolean;
  customisationDone?: boolean;
  totalRecipes?: number;
  unconfirmedRecipes?: number;
  liveDishCount?: number;
  onReviewFirstRecipe?: () => void;
}

export const LandingPage = ({
  restaurantName,
  menuUploaded: menuUploadedProp,
  ingredientsConfirmed: ingredientsConfirmedProp,
  customisationDone: customisationDoneProp,
  totalRecipes = 0,
  unconfirmedRecipes = 0,
  liveDishCount = 0,
  onReviewFirstRecipe,
}: LandingPageProps) => {
  const { t } = useLanguage();
  const effectiveMenuUploaded = menuUploadedProp ?? totalRecipes > 0;
  const effectiveIngredientsConfirmed =
    ingredientsConfirmedProp ?? (effectiveMenuUploaded ? unconfirmedRecipes === 0 : false);
  const confirmedLiveDishCount = liveDishCount;
  const hasLiveDishes = confirmedLiveDishCount > 0;

  const restaurant = useMemo<RestaurantProgress>(
    () => ({
      name: restaurantName ?? mockRestaurant.name,
      menuUploaded: effectiveMenuUploaded,
      ingredientsConfirmed: effectiveIngredientsConfirmed,
      customisationDone: customisationDoneProp ?? mockRestaurant.customisationDone,
    }),
    [
      restaurantName,
      effectiveMenuUploaded,
      effectiveIngredientsConfirmed,
      customisationDoneProp,
    ],
  );

  const { nextStep, isSetupComplete } = useNextStep(restaurant, {
    unconfirmedRecipes,
    liveDishCount: confirmedLiveDishCount,
  });
  const carouselStep = isCarouselStep(nextStep) ? nextStep : null;
  const actionStep = carouselStep ? null : nextStep;
  const [upsellDismissed, setUpsellDismissed] = useState(false);

  const reviewStatusMessage = useMemo(() => {
    if (!effectiveMenuUploaded) {
      return null;
    }

    if (unconfirmedRecipes > 0) {
      return t("landing.reviewStatus.pending", { count: unconfirmedRecipes });
    }

    if (totalRecipes > 0) {
      return t("landing.reviewStatus.complete");
    }

    return null;
  }, [effectiveMenuUploaded, t, unconfirmedRecipes, totalRecipes]);

  const isReviewAction =
    actionStep?.actionLink === "/recipes?status=needs_review" || actionStep?.actionLink === "/ingredients";

  const progressSteps = useMemo<ProgressStep[]>(() => {
    if (!restaurant) return [];

    return [
      {
        key: "upload",
        label: t("landing.progressSteps.upload"),
        link: "/upload",
        completed: restaurant.menuUploaded,
        isCurrent: !restaurant.menuUploaded,
      },
      {
        key: "confirm",
        label: t("landing.progressSteps.confirm"),
        link: "/?tab=add",
        completed: restaurant.ingredientsConfirmed,
        isCurrent: restaurant.menuUploaded && !restaurant.ingredientsConfirmed,
      },
      {
        key: "addToMenu",
        label: t("landing.progressSteps.addToMenu"),
        link: "/?tab=recipes",
        completed: hasLiveDishes,
        isCurrent:
          restaurant.menuUploaded &&
          restaurant.ingredientsConfirmed &&
          !hasLiveDishes,
      },
      {
        key: "customise",
        label: t("landing.progressSteps.customise"),
        link: "/?tab=settings",
        completed: restaurant.customisationDone,
        isCurrent:
          restaurant.menuUploaded &&
          restaurant.ingredientsConfirmed &&
          hasLiveDishes &&
          !restaurant.customisationDone,
      },
      {
        key: "live",
        label: t("landing.progressSteps.live"),
        link: "/menu-live",
        completed: false,
        isCurrent:
          restaurant.menuUploaded &&
          restaurant.ingredientsConfirmed &&
          hasLiveDishes &&
          restaurant.customisationDone,
      },
    ];
  }, [restaurant, t, hasLiveDishes]);

  const completedCount = progressSteps.filter((step) => step.completed).length;
  const progressSummary = t("landing.progressSummary", {
    completed: completedCount,
    total: progressSteps.length,
  });

  return (
    <div className="space-y-8 py-4">
      <section
        className="rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-rose-50 p-4 shadow-sm sm:p-6"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-orange-500">
          {carouselStep ? t("landing.heroLive") : t("landing.heroGettingLive")}
        </p>
        {actionStep ? (
          <div className="mt-3 space-y-4">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                {actionStep.title}
              </h1>
              <p className="text-sm leading-relaxed text-slate-700">
                {actionStep.description}
              </p>
              {isReviewAction && reviewStatusMessage ? (
                <p className="text-xs font-semibold text-amber-600">{reviewStatusMessage}</p>
              ) : null}
            </div>
            {isReviewAction && onReviewFirstRecipe ? (
              <Button className="w-full sm:w-auto" onClick={onReviewFirstRecipe}>
                {actionStep.actionLabel}
              </Button>
            ) : (
              <Button asChild className="w-full sm:w-auto">
                <Link to={actionStep.actionLink}>{actionStep.actionLabel}</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="mt-3 space-y-4">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                {t("landing.greeting", { name: restaurant.name })}
              </h1>
              <p className="text-sm leading-relaxed text-slate-700">
                {t("landing.quickWins")}
              </p>
            </div>
            <div className="-mx-1 flex snap-x gap-3 overflow-x-auto pb-1">
              {carouselStep?.carousel.map(item => (
                <Card
                  key={item.title}
                  className="min-w-[220px] snap-center border-none bg-white/80 p-4 shadow-md"
                >
                  <div className="flex h-full flex-col justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                    </div>
                    <Button asChild variant="secondary" className="w-full">
                      <Link to={item.actionLink}>{item.actionLabel}</Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </section>

      <ProgressTracker steps={progressSteps} summary={progressSummary} />

      {isSetupComplete && !upsellDismissed ? (
        <section>
          <div className="flex items-start justify-between gap-3 rounded-2xl border border-teal-100 bg-teal-50/80 p-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-teal-900">{t("landing.upsellTitle")}</p>
              <p className="text-xs text-teal-800">{t("landing.upsellDescription")}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link to="/pricing">{t("landing.upsellAction")}</Link>
              </Button>
              <button
                type="button"
                onClick={() => setUpsellDismissed(true)}
                className="text-xs font-medium text-teal-700 underline-offset-2 hover:underline"
              >
                {t("landing.upsellDismiss")}
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
};

export default LandingPage;
