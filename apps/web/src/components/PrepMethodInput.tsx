import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface PrepMethodInputProps {
  value: string;
  onChange: (value: string) => void;
}

export const PrepMethodInput = ({ value, onChange }: PrepMethodInputProps) => {
  return (
    <div className="space-y-3">
      <Label htmlFor="prep-method" className="text-xl font-semibold text-foreground">
        Preparation Method <span className="text-muted-foreground">(Optional)</span>
      </Label>
      <Textarea
        id="prep-method"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter preparation steps..."
        className="min-h-32 text-lg border-2 resize-none"
      />
    </div>
  );
};
