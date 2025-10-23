export type LanguageCode = "en" | "nl";

export interface TranslationValues {
  [key: string]: string | number | boolean | null | undefined;
}

export type TranslationEntry = string | ((values?: TranslationValues) => string);

export type TranslationDictionary = {
  [key: string]: TranslationEntry | TranslationDictionary;
};

export const SUPPORTED_LANGUAGES: Array<{ code: LanguageCode; label: string }> = [
  { code: "en", label: "English" },
  { code: "nl", label: "Nederlands" },
];

export const DEFAULT_LANGUAGE: LanguageCode = "en";
