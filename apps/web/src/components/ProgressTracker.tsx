import { Link } from "react-router-dom";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";

export interface ProgressStep {
  key: string;
  label: string;
  link: string;
  completed: boolean;
  isCurrent?: boolean;
}

interface ProgressTrackerProps {
  steps: ProgressStep[];
  summary?: string;
  onStartTour?: () => void;
}

export const ProgressTracker = ({ steps, summary, onStartTour }: ProgressTrackerProps) => {
  const { t } = useLanguage();

  return (
    <section data-tour="progress-tracker" className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-foreground">{t("progressTracker.title")}</h2>
          {onStartTour && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onStartTour}
              data-tour="help-button"
              className="h-6 w-6 p-0"
              title={t("progressTracker.helpButton")}
            >
              <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </Button>
          )}
        </div>
        {summary ? <span className="text-xs text-muted-foreground">{summary}</span> : null}
      </div>
      <div className="mt-4 overflow-x-auto pb-1">
        <ol className="flex items-center gap-3 sm:gap-4">
          {steps.map((step, index) => (
            <li key={step.key} className="flex items-center gap-3">
              {index !== 0 ? (
                <div
                  className={cn(
                    "h-0.5 w-8 sm:w-12 transition-colors",
                    steps[index - 1].completed ? "bg-emerald-500" : "bg-muted",
                  )}
                />
              ) : null}
              <Link
                to={step.link}
                className="group flex min-w-[72px] flex-col items-center gap-2 text-center sm:min-w-[88px]"
              >
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
                    step.completed
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : step.isCurrent
                        ? "border-emerald-500 text-emerald-600"
                        : "border-muted text-muted-foreground group-hover:border-emerald-400 group-hover:text-emerald-600",
                  )}
                >
                  {step.completed ? "✓" : index + 1}
                </span>
                <span
                  className={cn(
                    "text-[11px] font-medium uppercase tracking-wide text-muted-foreground",
                    step.completed
                      ? "text-emerald-700"
                      : step.isCurrent
                        ? "text-emerald-600"
                        : "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

export default ProgressTracker;
