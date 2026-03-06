"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import nl from "./nl.json";
import fr from "./fr.json";
import en from "./en.json";

export type Locale = "nl" | "fr" | "en";

const translations: Record<Locale, typeof nl> = { nl, fr, en };

const LOCALE_KEY = "postagen-locale";

type TranslationValue = string | Record<string, unknown>;

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current && typeof current === "object" && key in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return path; // fallback to key
    }
  }
  return typeof current === "string" ? current : path;
}

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  locale: "nl",
  setLocale: () => {},
  t: (key: string) => key,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("nl");

  useEffect(() => {
    const saved = localStorage.getItem(LOCALE_KEY) as Locale | null;
    if (saved && (saved === "nl" || saved === "fr" || saved === "en")) {
      setLocaleState(saved);
    } else {
      // Detect device language
      const browserLang = navigator.language?.split("-")[0]?.toLowerCase();
      if (browserLang === "nl" || browserLang === "fr" || browserLang === "en") {
        setLocaleState(browserLang);
      }
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(LOCALE_KEY, newLocale);
    document.documentElement.lang = newLocale;
  }, []);

  const t = useCallback(
    (key: string): string => {
      return getNestedValue(translations[locale] as unknown as Record<string, unknown>, key);
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useI18n();

  return (
    <div className={`flex items-center gap-1 rounded-full bg-white/10 p-1 ${className || ""}`}>
      {(["nl", "fr", "en"] as const).map((lang) => (
        <button
          key={lang}
          onClick={() => setLocale(lang)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            locale === lang
              ? "bg-purple-600 text-white shadow-sm"
              : "text-gray-400 hover:text-white"
          }`}
        >
          {lang.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
