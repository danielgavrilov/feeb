import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const MenuLiveInfo = () => (
  <div className="min-h-screen bg-background">
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <Card className="space-y-6 rounded-3xl border border-border/60 bg-card/90 p-6 shadow-lg sm:p-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Set menu live</h1>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            This product is in MVP mode so for now it is not possible to publish your menu. When we finish the testing
            stage, you will be able to integrate the menu that you created on the menu page on your own website, and
            direct your guests to it with a QR code.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-muted-foreground">We&apos;ll notify you as soon as publishing is enabled.</span>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="secondary">
              <Link to="/?tab=menu">View your menu</Link>
            </Button>
            <Button asChild>
              <Link to="/">Back to home</Link>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  </div>
);

export default MenuLiveInfo;
