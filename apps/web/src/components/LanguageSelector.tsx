import { LanguageCode, SUPPORTED_LANGUAGES } from "@/i18n/config";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LanguageSelectorProps {
  className?: string;
  size?: "default" | "compact";
}

export const LanguageSelector = ({ className, size = "default" }: LanguageSelectorProps) => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {size === "default" ? (
        <span className="text-sm font-medium text-muted-foreground hidden sm:inline">
          {t("common.language.label")}
        </span>
      ) : null}
      <Select value={language} onValueChange={(value) => setLanguage(value as LanguageCode)}>
        <SelectTrigger
          className={cn(
            "w-[150px] sm:w-[180px]",
            size === "compact" && "h-9 w-[130px] text-sm sm:w-[150px]",
          )}
          aria-label={t("common.language.label")}
        >
          <SelectValue placeholder={t("common.language.label")} />
        </SelectTrigger>
        <SelectContent>
          {SUPPORTED_LANGUAGES.map((option) => (
            <SelectItem key={option.code} value={option.code}>
              {t(`common.language.names.${option.code}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
