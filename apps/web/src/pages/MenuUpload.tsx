import { useEffect, useMemo, useState, type ComponentType, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, FileText, Link2, NotebookPen, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import ProgressTracker, { type ProgressStep } from "@/components/ProgressTracker";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { createMenuUpload, createRestaurant, MenuUploadCreateResponse, MenuUploadSourceType } from "@/lib/api";
import { useRestaurant } from "@/hooks/useRestaurant";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const optionConfig: Array<{
  id: MenuUploadSourceType | "manual";
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  accept?: string;
}> = [
  {
    id: "pdf",
    title: "Upload a PDF",
    description: "Perfect for menus exported from design tools or POS systems.",
    icon: FileText,
    accept: "application/pdf",
  },
  {
    id: "image",
    title: "Snap or upload photos",
    description: "Take a photo of your menu or upload existing imagery.",
    icon: Camera,
    accept: "image/*",
  },
  {
    id: "url",
    title: "Link to an online menu",
    description: "Paste a URL and we’ll fetch the latest version for you.",
    icon: Link2,
  },
  {
    id: "manual",
    title: "Enter dishes manually",
    description: "Use our guided Add Dish flow to capture each recipe.",
    icon: NotebookPen,
  },
];

const stageLabels: Record<string, string> = {
  stage_0: "Stage 0 · Save upload",
  stage_1: "Stage 1 · Item extraction",
  stage_2: "Stage 2 · Ingredient deduction",
};

const statusTone: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "Pending", variant: "outline" },
  running: { label: "Running", variant: "secondary" },
  completed: { label: "Completed", variant: "default" },
  failed: { label: "Failed", variant: "destructive" },
  skipped: { label: "Skipped", variant: "outline" },
};

const formatDate = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
};

const parseDetails = (details?: string) => {
  if (!details) return null;
  try {
    const parsed = JSON.parse(details);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch (error) {
    return details;
  }
  return details;
};

const methodRequiresFile = (method: MenuUploadSourceType | "manual" | null) =>
  method === "pdf" || method === "image";

const uploadProgressSteps = [
  {
    key: "saving",
    title: "Saving your menu",
    description: "Storing your menu for analysis...",
    percent: 18,
  },
  {
    key: "extracting",
    title: "Reading each page",
    description: "Our AI is spotting dish names, sections, and prices.",
    percent: 46,
  },
  {
    key: "analysing",
    title: "Working out ingredients",
    description: "We’re matching ingredients and checking for likely allergens.",
    percent: 74,
  },
  {
    key: "finalising",
    title: "Preparing your workspace",
    description: "We’re building your recipe book so it’s ready to review.",
    percent: 92,
  },
];

const MenuUploadPage = () => {
  const navigate = useNavigate();
  const { restaurant, restaurants, selectRestaurant, refreshRestaurants } = useRestaurant();
  const { backendUserId } = useAuth();

  const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(restaurant?.id ?? null);
  const [newRestaurantName, setNewRestaurantName] = useState("");
  const [isCreatingRestaurant, setIsCreatingRestaurant] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<MenuUploadSourceType | "manual" | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [urlValue, setUrlValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<MenuUploadCreateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"form" | "progress" | "summary" | "error">("form");
  const [progressIndex, setProgressIndex] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressComplete, setProgressComplete] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (restaurant?.id && restaurant.id !== selectedRestaurantId) {
      setSelectedRestaurantId(restaurant.id);
    }
  }, [restaurant?.id, selectedRestaurantId]);

  useEffect(() => {
    if (phase !== "progress" || !isSubmitting) {
      return;
    }

    setProgressIndex(0);
    setProgressPercent(uploadProgressSteps[0]?.percent ?? 0);

    const interval = window.setInterval(() => {
      setProgressIndex(prev => {
        if (prev >= uploadProgressSteps.length - 1) {
          window.clearInterval(interval);
          return prev;
        }

        const next = prev + 1;
        setProgressPercent(uploadProgressSteps[next]?.percent ?? uploadProgressSteps[prev]?.percent ?? 90);
        return next;
      });
    }, 3500);

    return () => window.clearInterval(interval);
  }, [phase, isSubmitting]);

  const handleReset = () => {
    setPhase("form");
    setProgressPercent(0);
    setProgressIndex(0);
    setProgressComplete(false);
    setResult(null);
    setError(null);
    setIsSubmitting(false);
    setSelectedMethod(null);
    setFile(null);
    setUrlValue("");
    setShowDetails(false);
  };

  const activeOption = useMemo(
    () => optionConfig.find(option => option.id === selectedMethod),
    [selectedMethod],
  );

  const handleSelectRestaurant = (value: string) => {
    const id = Number(value);
    setSelectedRestaurantId(id);
    selectRestaurant(id);
  };

  const handleCreateRestaurant = async () => {
    if (!newRestaurantName.trim()) {
      toast.error("Please enter a restaurant name");
      return;
    }
    
    if (!backendUserId) {
      toast.error("You must be logged in to create a restaurant");
      return;
    }

    try {
      setIsCreatingRestaurant(true);
      setError(null);
      const newRestaurant = await createRestaurant(newRestaurantName.trim(), backendUserId);
      await refreshRestaurants();
      setSelectedRestaurantId(newRestaurant.id);
      selectRestaurant(newRestaurant.id);
      setNewRestaurantName("");
      toast.success(`Restaurant "${newRestaurant.name}" created successfully`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create restaurant";
      setError(message);
      toast.error(message);
    } finally {
      setIsCreatingRestaurant(false);
    }
  };

  const handleSelectMethod = (method: MenuUploadSourceType | "manual") => {
    if (method === "manual") {
      navigate("/?tab=add", { replace: false });
      return;
    }
    setSelectedMethod(method);
    setFile(null);
    setUrlValue("");
    setResult(null);
    setError(null);
    setPhase("form");
    setProgressPercent(0);
    setProgressIndex(0);
    setProgressComplete(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!selectedRestaurantId) {
      setError("Please select a restaurant before uploading.");
      return;
    }

    if (!selectedMethod || selectedMethod === "manual") {
      setError("Choose how you’d like to import your menu.");
      return;
    }

    if (selectedMethod === "url" && !urlValue.trim()) {
      setError("Enter a valid URL so we can fetch your menu.");
      return;
    }

    if (methodRequiresFile(selectedMethod) && !file) {
      setError("Please attach a file to continue.");
      return;
    }

    try {
      setIsSubmitting(true);
      setPhase("progress");
      setProgressPercent(uploadProgressSteps[0]?.percent ?? 0);

      const response = await createMenuUpload({
        restaurantId: selectedRestaurantId,
        sourceType: selectedMethod,
        userId: backendUserId ?? undefined,
        url: selectedMethod === "url" ? urlValue.trim() : undefined,
        file: methodRequiresFile(selectedMethod) ? file ?? undefined : undefined,
      });

      setResult(response);
      setProgressIndex(uploadProgressSteps.length - 1);
      setProgressPercent(100);
      setProgressComplete(true);

      if (response.created_recipe_ids && response.created_recipe_ids.length > 0) {
        toast.success(`Menu uploaded successfully! ${response.created_recipe_ids.length} dish${response.created_recipe_ids.length === 1 ? '' : 'es'} added to your recipe book.`);
      } else {
        toast.warning("Menu processed but no dishes could be extracted. Try uploading a different format or add dishes manually.");
        setError("No dishes were extracted from the menu. The content might be too complex or in an unsupported format.");
      }

      window.setTimeout(() => {
        setShowDetails(false);
        setPhase("summary");
      }, 800);
    } catch (err) {
      const message = err instanceof Error ? err.message : "We couldn't process the menu.";
      setError(message);
      setResult(null);
      setPhase("error");
      setProgressComplete(false);
      setProgressPercent(0);
      setProgressIndex(0);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderProgress = () => {
    const stepsWithStatus = uploadProgressSteps.map((step, index) => {
      const isComplete = progressComplete || index < progressIndex;
      const isCurrent = !progressComplete && index === progressIndex;
      return { ...step, isComplete, isCurrent };
    });

    return (
      <Card className="p-6 space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">We’re getting everything ready</h2>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Sit tight for a moment. We’re uploading your menu, extracting each dish, and preparing an ingredient list you can review.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Estimated progress</span>
            <span>{Math.min(progressPercent, 100)}%</span>
          </div>
          <Progress value={Math.min(progressPercent, 100)} className="h-3" />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {stepsWithStatus.map(step => (
            <div
              key={step.key}
              className={`rounded-2xl border p-4 transition ${
                step.isComplete
                  ? "border-emerald-200 bg-emerald-50"
                  : step.isCurrent
                    ? "border-primary/60 bg-primary/5"
                    : "border-border bg-card"
              }`}
            >
              <p className="text-sm font-semibold text-foreground">{step.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          You can navigate elsewhere while we work — we’ll save your progress automatically.
        </p>
      </Card>
    );
  };

  const hasProvidedMenu =
    selectedMethod && selectedMethod !== "manual"
      ? methodRequiresFile(selectedMethod)
        ? Boolean(file)
        : Boolean(urlValue.trim())
      : false;

  const summarySteps: ProgressStep[] = useMemo(
    () => [
      {
        key: "upload",
        label: "Upload menu",
        link: "/upload",
        completed: true,
        isCurrent: false,
      },
      {
        key: "confirm",
        label: "Confirm ingredients",
        link: "/ingredients",
        completed: false,
        isCurrent: true,
      },
      {
        key: "customise",
        label: "Customise menu",
        link: "/customise",
        completed: false,
      },
      {
        key: "photos",
        label: "Add photos (optional)",
        link: "/photos",
        completed: false,
      },
      {
        key: "live",
        label: "Set menu live",
        link: "/menu",
        completed: false,
      },
    ],
    [],
  );

  const renderSummary = () => {
    if (!result) return null;
    const detailsId = "menu-upload-summary-details";
    return (
      <div className="space-y-8">
        <Card className="space-y-6 border-primary/40 bg-primary/5 p-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">Your menu is ready for review</h2>
            <p className="text-sm text-muted-foreground">
              We’ve captured your dishes and lined up the next actions so you can publish with confidence.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-3xl font-semibold text-foreground">{result.created_recipe_ids.length}</p>
              <p className="text-sm text-muted-foreground">
                dish{result.created_recipe_ids.length === 1 ? "" : "es"} detected and added to your recipe book
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={() => navigate("/?tab=recipes")}>Review extracted dishes</Button>
            </div>
          </div>

          <Alert className="bg-amber-50 border-amber-200 text-amber-900">
            <AlertTitle>Human review required</AlertTitle>
            <AlertDescription>
              The extracted ingredient and allergen information is an estimate to make your work easier. Please double-check every item to ensure guests are informed correctly about potential allergens.
            </AlertDescription>
          </Alert>
        </Card>

        <div className="space-y-4">
          <ProgressTracker steps={summarySteps} summary="1/5 steps complete" />

          <button
            type="button"
            onClick={() => setShowDetails(prev => !prev)}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            aria-expanded={showDetails}
            aria-controls={detailsId}
          >
            {showDetails ? "Hide details" : "More details"}
          </button>

          {showDetails ? (
            <Card id={detailsId} className="p-6 space-y-5">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">What happened</h3>
                <p className="text-sm text-muted-foreground">
                  Here’s a quick summary of the steps our system took to prepare your menu upload.
                </p>
              </div>
              <div className="space-y-3">
                {result.stages.map(stage => {
                  const tone = statusTone[stage.status] ?? statusTone.pending;
                  const label = stageLabels[stage.stage] ?? stage.stage;
                  const parsed = parseDetails(stage.details);
                  return (
                    <div key={stage.stage} className="rounded-xl border border-border/70 bg-card/70 p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">{label}</p>
                        <Badge variant={tone.variant}>{tone.label}</Badge>
                      </div>
                      {parsed ? (
                        <div className="text-xs text-muted-foreground space-y-1">
                          {typeof parsed === "string" ? (
                            <p>{parsed}</p>
                          ) : (
                            Object.entries(parsed).map(([key, value]) => (
                              <p key={key} className="capitalize">
                                {key.replace(/_/g, " ")}: <span className="font-medium">{String(value)}</span>
                              </p>
                            ))
                          )}
                        </div>
                      ) : null}
                      <div className="text-[11px] text-muted-foreground space-y-1">
                        {formatDate(stage.started_at) ? <p>Started: {formatDate(stage.started_at)}</p> : null}
                        {formatDate(stage.completed_at) ? <p>Completed: {formatDate(stage.completed_at)}</p> : null}
                        {stage.error_message ? <p className="text-destructive">{stage.error_message}</p> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    );
  };

  const renderError = () => (
    <Card className="p-6 space-y-4 border-destructive/40 bg-destructive/5">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground">We hit a snag while uploading</h2>
        <p className="text-sm text-muted-foreground">
          {error ?? "Something went wrong while processing your menu. Please try again."}
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button onClick={handleReset}>Try again</Button>
        <Button variant="outline" onClick={() => navigate("/?tab=add")}>Add dishes manually</Button>
      </div>
    </Card>
  );

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-5xl py-12 space-y-10">
        {phase !== "summary" ? (
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold text-foreground">Upload your menu</h1>
            <p className="text-muted-foreground max-w-2xl">
              Choose how you’d like to share your menu. We’ll extract each dish, infer ingredients, and place everything into
              your recipe book ready for review.
            </p>
          </div>
        ) : null}
        {phase === "form" ? (
          <form onSubmit={handleSubmit} className="space-y-8">
            <Card className="p-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">
                  {restaurants.length > 0 ? "Select your restaurant" : "Restaurant name"}
                </Label>
                {restaurants.length > 0 ? (
                  <Select
                    value={selectedRestaurantId ? String(selectedRestaurantId) : undefined}
                    onValueChange={handleSelectRestaurant}
                  >
                    <SelectTrigger className="w-full sm:w-80 h-12 text-left text-base">
                      <SelectValue placeholder="Select a restaurant" />
                    </SelectTrigger>
                    <SelectContent>
                      {restaurants.map(item => (
                        <SelectItem key={item.id} value={String(item.id)}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex gap-3">
                    <Input
                      type="text"
                      placeholder="Enter your restaurant name"
                      value={newRestaurantName}
                      onChange={(e) => setNewRestaurantName(e.target.value)}
                      className="h-12 flex-1"
                      disabled={isCreatingRestaurant}
                    />
                    <Button
                      type="button"
                      onClick={handleCreateRestaurant}
                      disabled={isCreatingRestaurant || !newRestaurantName.trim()}
                      className="h-12"
                    >
                      {isCreatingRestaurant ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        "Create"
                      )}
                    </Button>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <Label className="text-sm font-medium text-muted-foreground">How would you like to import your menu?</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  {optionConfig.map(option => {
                    const Icon = option.icon;
                    const isActive = selectedMethod === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleSelectMethod(option.id)}
                        className={`text-left rounded-2xl border p-5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 ${
                          isActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/60"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`flex h-10 w-10 items-center justify-center rounded-full border ${
                              isActive ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                            }`}
                          >
                            <Icon className="h-5 w-5" />
                          </span>
                          <div className="space-y-1">
                            <p className="text-base font-semibold text-foreground">{option.title}</p>
                            <p className="text-sm text-muted-foreground">{option.description}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedMethod && selectedMethod !== "manual" ? (
                <div className="grid gap-6 md:grid-cols-[1fr,1.5fr]">
                  <div className="space-y-3">
                    <h2 className="text-lg font-semibold text-foreground">Provide your menu</h2>
                    <p className="text-sm text-muted-foreground">
                      We’ll store a copy securely, send it to our LLM extraction service, and return structured dishes within minutes.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {methodRequiresFile(selectedMethod) ? (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Upload file</Label>
                        <Input
                          type="file"
                          accept={activeOption?.accept}
                          capture={selectedMethod === "image" ? "environment" : undefined}
                          onChange={event => {
                            const selected = event.target.files?.[0] ?? null;
                            setFile(selected);
                          }}
                          className="h-12"
                        />
                        <p className="text-xs text-muted-foreground">
                          {selectedMethod === "pdf"
                            ? "Accepted format: PDF up to 10MB"
                            : "Accepted formats: JPG, PNG or HEIC up to 10MB"}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">Menu URL</Label>
                        <Input
                          type="url"
                          placeholder="https://restaurant.com/menu"
                          value={urlValue}
                          onChange={event => setUrlValue(event.target.value)}
                          className="h-12"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              {selectedMethod && selectedMethod !== "manual" ? (
                <div className="flex items-center gap-3">
                  <Button type="submit" disabled={isSubmitting} className="h-12 px-8 text-base font-semibold">
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Uploading…
                      </span>
                    ) : (
                      "Upload menu"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => navigate("/?tab=add")}
                    className="h-12 px-6"
                  >
                    Add dishes manually
                  </Button>
                </div>
              ) : null}
            </Card>
            </form>
          ) : null}

        {phase === "progress" ? renderProgress() : null}

        {phase === "summary" ? renderSummary() : null}

        {phase === "error" ? renderError() : null}
      </div>
    </main>
  );
};

export default MenuUploadPage;
