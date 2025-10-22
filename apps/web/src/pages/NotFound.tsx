import { useLocation } from "react-router-dom";
import { useEffect } from "react";

import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSelector } from "@/components/LanguageSelector";

const NotFound = () => {
  const location = useLocation();
  const { t } = useLanguage();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 px-4">
      <div className="mb-6 w-full max-w-sm text-right">
        <LanguageSelector size="compact" />
      </div>
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-gray-600">{t("notFound.message")}</p>
        <a href="/" className="text-blue-500 underline hover:text-blue-700">
          {t("notFound.cta")}
        </a>
      </div>
    </div>
  );
};

export default NotFound;
