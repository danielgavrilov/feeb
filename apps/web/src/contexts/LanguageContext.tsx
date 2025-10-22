import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  DEFAULT_LANGUAGE,
  LanguageCode,
  SUPPORTED_LANGUAGES,
  TranslationDictionary,
  TranslationEntry,
  TranslationValues,
} from "@/i18n/config";
import { translations } from "@/i18n/locales";

interface LanguageContextValue {
  language: LanguageCode;
  setLanguage: (code: LanguageCode) => void;
  t: (key: string, values?: TranslationValues) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const STORAGE_KEY = "feeb.language";

const languageCodes = SUPPORTED_LANGUAGES.map((item) => item.code);

const isLanguageCode = (value: string | null | undefined): value is LanguageCode =>
  typeof value === "string" && languageCodes.includes(value as LanguageCode);

const resolveTranslation = (
  dictionary: TranslationDictionary,
  key: string,
): TranslationEntry | undefined => {
  const segments = key.split(".");
  let current: TranslationEntry | TranslationDictionary | undefined = dictionary;

  for (const segment of segments) {
    if (!current || typeof current === "string" || typeof current === "function") {
      return undefined;
    }

    current = current[segment];
  }

  return typeof current === "string" || typeof current === "function" ? current : undefined;
};

const applyTranslation = (entry: TranslationEntry, values?: TranslationValues) =>
  typeof entry === "function" ? entry(values ?? {}) : entry;

const translate = (language: LanguageCode, key: string, values?: TranslationValues) => {
  const preferredLanguages: LanguageCode[] = [language];

  if (!preferredLanguages.includes(DEFAULT_LANGUAGE)) {
    preferredLanguages.push(DEFAULT_LANGUAGE);
  }

  for (const code of preferredLanguages) {
    const dictionary = translations[code];
    const entry = resolveTranslation(dictionary, key);
    if (entry) {
      return applyTranslation(entry, values);
    }
  }

  // Fallback to key when no translation is available
  if (process.env.NODE_ENV !== "production") {
    console.warn(`Missing translation for key "${key}" in language "${language}"`);
  }
  return key;
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<LanguageCode>(DEFAULT_LANGUAGE);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isLanguageCode(stored)) {
      setLanguageState(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, language);
  }, [language]);

  const setLanguage = useCallback((code: LanguageCode) => {
    if (languageCodes.includes(code)) {
      setLanguageState(code);
    }
  }, []);

  const translateFn = useCallback(
    (key: string, values?: TranslationValues) => translate(language, key, values),
    [language],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t: translateFn,
    }),
    [language, setLanguage, translateFn],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};

export const useTranslation = () => {
  const { t } = useLanguage();
  return t;
};
