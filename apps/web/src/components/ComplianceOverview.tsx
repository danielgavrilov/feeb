import { DIETARY_CATEGORIES } from "@/data/recipes";
import { Check, X, Camera, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useRef } from "react";

interface ComplianceOverviewProps {
  compliance: Record<string, boolean>;
  onStartNew: () => void;
  onSave?: () => void;
  image?: string;
  onImageChange?: (image: string) => void;
}

export const ComplianceOverview = ({ compliance, onStartNew, onSave, image, onImageChange }: ComplianceOverviewProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImageChange) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageChange(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Dietary Compliance</h2>
      <div className="grid grid-cols-2 gap-4">
        {DIETARY_CATEGORIES.map((category) => {
          const isCompliant = compliance[category.id];
          return (
            <div
              key={category.id}
              className={`p-6 rounded-lg border-2 transition-all ${
                isCompliant
                  ? "bg-success/10 border-success"
                  : "bg-destructive/10 border-destructive"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-3xl">{category.icon}</span>
                {isCompliant ? (
                  <Check className="w-8 h-8 text-success" strokeWidth={3} />
                ) : (
                  <X className="w-8 h-8 text-destructive" strokeWidth={3} />
                )}
              </div>
              <div className="text-lg font-semibold text-foreground">{category.label}</div>
            </div>
          );
        })}
      </div>

      <div className="space-y-4">
        <Label className="text-lg font-semibold">Dish Photo (Optional)</Label>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-14 text-base"
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera className="w-5 h-5 mr-2" />
            Take Photo
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-14 text-base"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-5 h-5 mr-2" />
            Upload Image
          </Button>
        </div>
        <Input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <Input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />
        {image && (
          <div className="relative w-full aspect-video rounded-lg overflow-hidden border-2 border-border">
            <img src={image} alt="Dish preview" className="w-full h-full object-cover" />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2"
              onClick={() => onImageChange?.("")}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="flex gap-4">
        {onSave && (
          <Button
            onClick={onSave}
            className="flex-1 h-16 text-xl font-semibold"
            size="lg"
          >
            Save Dish
          </Button>
        )}
        <Button
          onClick={onStartNew}
          variant="outline"
          className="flex-1 h-16 text-xl font-semibold"
          size="lg"
        >
          Add Another Dish
        </Button>
      </div>
    </div>
  );
};
