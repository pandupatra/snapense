"use client";

import { en, Translations } from "./locales/en";
import { id, idMonthNames } from "./locales/id";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Locale = "en" | "id";

const locales: Record<Locale, Translations> = { en, id };

const DEFAULT_LOCALE: Locale = "id";

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translations;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [mounted, setMounted] = useState(false);

  // Read from localStorage only after client-side mount
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("locale") as Locale | null;
    if (saved && (saved === "en" || saved === "id")) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("locale", newLocale);
    document.documentElement.lang = newLocale;
  };

  useEffect(() => {
    if (mounted) {
      document.documentElement.lang = locale;
    }
  }, [locale, mounted]);

  const value: I18nContextValue = {
    locale,
    setLocale,
    t: locales[locale],
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}

export function formatMonthName(monthName: string, locale: Locale): string {
  if (locale === "id") {
    return idMonthNames[monthName] || monthName;
  }
  return monthName;
}
