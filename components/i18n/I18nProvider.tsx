"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { DICT, type I18nKey, type Lang } from "@/lib/i18n/dict";

type I18nContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: I18nKey) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = "wop.lang";

function inferDefaultLang(): Lang {
  if (typeof navigator === "undefined") return "en";
  const l = navigator.language?.toLowerCase() ?? "";
  return l.startsWith("zh") ? "zh" : "en";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (stored === "en" || stored === "zh") {
        setLangState(stored);
      } else {
        setLangState(inferDefaultLang());
      }
    } catch {
      setLangState(inferDefaultLang());
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore
    }
    document.documentElement.lang = lang === "zh" ? "zh-Hans" : "en";
  }, [lang]);

  const setLang = useCallback((next: Lang) => setLangState(next), []);

  const t = useCallback(
    (key: I18nKey) => {
      return DICT[lang][key] ?? DICT.en[key] ?? String(key);
    },
    [lang]
  );

  const value = useMemo<I18nContextValue>(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

