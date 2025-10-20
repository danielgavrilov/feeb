export type CurrencyOption = "EUR" | "USD";

export type PriceDisplayFormat =
  | "valuta"
  | "no_valuta"
  | "comma_valuta"
  | "comma_no_valuta"
  | "simple"
  | "minimalist"
  | "simple_comma"
  | "minimalist_comma";

export const DEFAULT_CURRENCY: CurrencyOption = "EUR";
export const DEFAULT_PRICE_FORMAT: PriceDisplayFormat = "simple";

export const PRICE_FORMAT_OPTIONS: Array<{ value: PriceDisplayFormat; label: string }> = [
  { value: "valuta", label: "Valuta: €10.00" },
  { value: "no_valuta", label: "No valuta: 10.00" },
  { value: "comma_valuta", label: "Comma separated valuta: €10,00" },
  { value: "comma_no_valuta", label: "Comma separated no valuta: 10,00" },
  { value: "simple", label: "Simple (default): 7.50" },
  { value: "minimalist", label: "Minimalist: 7.5" },
  { value: "simple_comma", label: "Simple comma: 7,50" },
  { value: "minimalist_comma", label: "Minimalist comma: 7,5" },
];

const currencySymbolMap: Record<CurrencyOption, string> = {
  EUR: "€",
  USD: "$",
};

const formatMap: Record<PriceDisplayFormat, { useSymbol: boolean; decimalSeparator: "." | ","; decimals: 2 | "trim" }> = {
  valuta: { useSymbol: true, decimalSeparator: ".", decimals: 2 },
  no_valuta: { useSymbol: false, decimalSeparator: ".", decimals: 2 },
  comma_valuta: { useSymbol: true, decimalSeparator: ",", decimals: 2 },
  comma_no_valuta: { useSymbol: false, decimalSeparator: ",", decimals: 2 },
  simple: { useSymbol: false, decimalSeparator: ".", decimals: 2 },
  minimalist: { useSymbol: false, decimalSeparator: ".", decimals: "trim" },
  simple_comma: { useSymbol: false, decimalSeparator: ",", decimals: 2 },
  minimalist_comma: { useSymbol: false, decimalSeparator: ",", decimals: "trim" },
};

export const getCurrencySymbol = (currency: CurrencyOption): string => currencySymbolMap[currency];

export const parsePriceInput = (value: string | number | null | undefined): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const sanitized = trimmed.replace(/[^0-9.,-]/g, "");
  if (!sanitized) {
    return null;
  }

  const normalized = sanitized.replace(/,/g, ".");
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : null;
};

interface FormatPriceOptions {
  currency: CurrencyOption;
  format: PriceDisplayFormat;
}

export const formatPriceDisplay = (
  value: string | number | null | undefined,
  { currency, format }: FormatPriceOptions,
): string => {
  if (value === null || value === undefined) {
    return "";
  }

  const parsed = parsePriceInput(value);

  if (parsed === null) {
    return typeof value === "string" ? value.trim() : "";
  }

  const { useSymbol, decimalSeparator, decimals } = formatMap[format];
  const symbol = currencySymbolMap[currency];
  const isNegative = parsed < 0;
  const absoluteValue = Math.abs(parsed);

  let numericString = decimals === 2 ? absoluteValue.toFixed(2) : Number(absoluteValue.toFixed(2)).toString();

  if (decimalSeparator === ",") {
    numericString = numericString.replace(".", ",");
  }

  let formatted = useSymbol ? `${symbol}${numericString}` : numericString;
  if (isNegative) {
    formatted = `-${formatted}`;
  }

  return formatted;
};

export const createPriceFormatter = (options: FormatPriceOptions) =>
  (value: string | number | null | undefined) => formatPriceDisplay(value, options);
