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
  imagesUploaded?: boolean;
  showImages?: boolean;
  totalRecipes?: number;
  unconfirmedRecipes?: number;
  onReviewFirstRecipe?: () => void;
  onStartTour?: () => void;
}

type QuickActionId =
  | "uploadMenu"
  | "addDish"
  | "recipeBook"
  | "uploadPhotos"
  | "customiseMenu"
  | "support"
  | "pricing";

interface QuickActionConfig {
  icon: string;
  href: string;
  id: QuickActionId;
}

const QUICK_ACTION_CONFIG: QuickActionConfig[] = [
  { icon: "📤", href: "/upload", id: "uploadMenu" },
  { icon: "➕", href: "/add", id: "addDish" },
  { icon: "📚", href: "/recipes", id: "recipeBook" },
  { icon: "📸", href: "/photos", id: "uploadPhotos" },
  { icon: "⚙️", href: "/customise", id: "customiseMenu" },
  { icon: "💬", href: "/support", id: "support" },
  { icon: "📈", href: "/pricing", id: "pricing" },
];

export const LandingPage = ({
  restaurantName,
  menuUploaded: menuUploadedProp,
  ingredientsConfirmed: ingredientsConfirmedProp,
  customisationDone: customisationDoneProp,
  imagesUploaded: imagesUploadedProp,
  showImages: showImagesProp,
  totalRecipes = 0,
  unconfirmedRecipes = 0,
  onReviewFirstRecipe,
  onStartTour,
}: LandingPageProps) => {
  const { t } = useLanguage();
  const effectiveMenuUploaded = menuUploadedProp ?? totalRecipes > 0;
  const effectiveIngredientsConfirmed =
    ingredientsConfirmedProp ?? (effectiveMenuUploaded ? unconfirmedRecipes === 0 : false);
  const wantsImages = showImagesProp ?? mockRestaurant.showImages;
  const effectiveImagesUploaded = imagesUploadedProp ?? mockRestaurant.imagesUploaded;

  const quickActions = useMemo(
    () =>
      QUICK_ACTION_CONFIG.map((action) => ({
        ...action,
        label: t(`landing.quickActions.${action.id}.label`),
        description: t(`landing.quickActions.${action.id}.description`),
      })),
    [t],
  );

  const restaurant = useMemo<RestaurantProgress>(
    () => ({
      name: restaurantName ?? mockRestaurant.name,
      menuUploaded: effectiveMenuUploaded,
      ingredientsConfirmed: effectiveIngredientsConfirmed,
      customisationDone: customisationDoneProp ?? mockRestaurant.customisationDone,
      imagesUploaded: effectiveImagesUploaded,
      showImages: wantsImages,
    }),
    [
      restaurantName,
      effectiveMenuUploaded,
      effectiveIngredientsConfirmed,
      customisationDoneProp,
      effectiveImagesUploaded,
      wantsImages,
    ],
  );

  const { nextStep, isSetupComplete } = useNextStep(restaurant, { unconfirmedRecipes });
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

    const wantsImagesForStep = restaurant.showImages ?? true;

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
        link: "/ingredients",
        completed: restaurant.ingredientsConfirmed,
        isCurrent: restaurant.menuUploaded && !restaurant.ingredientsConfirmed,
      },
      {
        key: "customise",
        label: t("landing.progressSteps.customise"),
        link: "/customise",
        completed: restaurant.customisationDone,
        isCurrent:
          restaurant.menuUploaded &&
          restaurant.ingredientsConfirmed &&
          !restaurant.customisationDone,
      },
      {
        key: "photos",
        label: t("landing.progressSteps.photos"),
        link: "/photos",
        completed: !wantsImagesForStep || restaurant.imagesUploaded,
        isCurrent:
          restaurant.menuUploaded &&
          restaurant.ingredientsConfirmed &&
          restaurant.customisationDone &&
          wantsImagesForStep &&
          !restaurant.imagesUploaded,
      },
      {
        key: "live",
        label: t("landing.progressSteps.live"),
        link: "/menu",
        completed: isSetupComplete,
        isCurrent: isSetupComplete,
      },
    ];
  }, [restaurant, t, isSetupComplete]);

  const completedCount = progressSteps.filter((step) => step.completed).length;
  const progressSummary = t("landing.progressSummary", {
    completed: completedCount,
    total: progressSteps.length,
  });

  return (
    <div className="space-y-8 py-4">
      <div data-tour="landing-hero-progress">
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

        <div className="mt-8">
          <ProgressTracker steps={progressSteps} summary={progressSummary} onStartTour={onStartTour} />
        </div>
      </div>

      <section>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <h2 className="text-lg font-semibold text-foreground">Quick actions</h2>
          <span className="text-xs text-muted-foreground">Focus on one task at a time</span>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map(action => (
            <Link key={action.id} to={action.href}>
              <Card className="flex h-full flex-col gap-2 rounded-2xl border border-border/70 p-4 transition hover:-translate-y-1 hover:border-emerald-400 hover:shadow-md">
                <span className="text-2xl" aria-hidden>
                  {action.icon}
                </span>
                <span className="text-sm font-semibold text-foreground">{action.label}</span>
                <span className="text-xs text-muted-foreground">{action.description}</span>
              </Card>
            </Link>
          ))}
        </div>
      </section>

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
