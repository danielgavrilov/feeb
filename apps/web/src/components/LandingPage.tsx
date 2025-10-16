import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ProgressTracker, { ProgressStep } from "@/components/ProgressTracker";
import { useNextStep, isCarouselStep } from "@/hooks/useNextStep";
import { mockRestaurant, RestaurantProgress } from "@/data/mockRestaurant";

interface LandingPageProps {
  restaurantName?: string;
}

interface QuickAction {
  icon: string;
  label: string;
  description: string;
  href: string;
}

const quickActions: QuickAction[] = [
  {
    icon: "➕",
    label: "Add Dish",
    description: "Capture a new recipe in minutes",
    href: "/add",
  },
  {
    icon: "📚",
    label: "Recipe Book",
    description: "Review everything your team has added",
    href: "/recipes",
  },
  {
    icon: "📸",
    label: "Upload Photos",
    description: "Showcase dishes with beautiful imagery",
    href: "/photos",
  },
  {
    icon: "⚙️",
    label: "Customise Menu",
    description: "Match your brand colours and logo",
    href: "/customise",
  },
  {
    icon: "💬",
    label: "Support",
    description: "Chat with us if you need a hand",
    href: "/support",
  },
  {
    icon: "📈",
    label: "Pricing Insights",
    description: "See profitability suggestions",
    href: "/pricing",
  },
];

export const LandingPage = ({ restaurantName }: LandingPageProps) => {
  const [restaurant] = useState<RestaurantProgress>({
    ...mockRestaurant,
    name: restaurantName ?? mockRestaurant.name,
  });
  const { nextStep, isSetupComplete } = useNextStep(restaurant);
  const carouselStep = isCarouselStep(nextStep) ? nextStep : null;
  const actionStep = carouselStep ? null : nextStep;
  const [upsellDismissed, setUpsellDismissed] = useState(false);

  const progressSteps = useMemo<ProgressStep[]>(() => {
    if (!restaurant) return [];

    const wantsImages = restaurant.showImages ?? true;

    return [
      {
        key: "upload",
        label: "Upload",
        link: "/upload",
        completed: restaurant.menuUploaded,
        isCurrent: !restaurant.menuUploaded,
      },
      {
        key: "confirm",
        label: "Confirm",
        link: "/ingredients",
        completed: restaurant.ingredientsConfirmed,
        isCurrent: restaurant.menuUploaded && !restaurant.ingredientsConfirmed,
      },
      {
        key: "customise",
        label: "Customise",
        link: "/customise",
        completed: restaurant.customisationDone,
        isCurrent:
          restaurant.menuUploaded &&
          restaurant.ingredientsConfirmed &&
          !restaurant.customisationDone,
      },
      {
        key: "photos",
        label: "Photos",
        link: "/photos",
        completed: !wantsImages || restaurant.imagesUploaded,
        isCurrent:
          restaurant.menuUploaded &&
          restaurant.ingredientsConfirmed &&
          restaurant.customisationDone &&
          wantsImages &&
          !restaurant.imagesUploaded,
      },
      {
        key: "live",
        label: "Go Live",
        link: "/menu",
        completed: isSetupComplete,
        isCurrent: isSetupComplete,
      },
    ];
  }, [restaurant, isSetupComplete]);

  const completedCount = progressSteps.filter(step => step.completed).length;
  const progressSummary = `${completedCount}/${progressSteps.length} steps complete`;

  return (
    <div className="space-y-8 py-4">
      <section
        className="rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-rose-50 p-6 shadow-sm"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-orange-500">
          {carouselStep ? "You’re live!" : "Let’s get you live"}
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
            </div>
            <Button asChild className="w-full sm:w-auto">
              <Link to={actionStep.actionLink}>{actionStep.actionLabel}</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-3 space-y-4">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                Welcome back, {restaurant.name} 🌟
              </h1>
              <p className="text-sm leading-relaxed text-slate-700">
                Keep the momentum going with these quick wins for your team.
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

      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-foreground">Quick actions</h2>
          <span className="text-xs text-muted-foreground">Focus on one task at a time</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {quickActions.map(action => (
            <Link key={action.label} to={action.href}>
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
              <p className="text-sm font-semibold text-teal-900">
                Want to boost your profits?
              </p>
              <p className="text-xs text-teal-800">
                Try Pricing Insights to spot margin opportunities without the guesswork.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link to="/pricing">Explore</Link>
              </Button>
              <button
                type="button"
                onClick={() => setUpsellDismissed(true)}
                className="text-xs font-medium text-teal-700 underline-offset-2 hover:underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
};

export default LandingPage;
