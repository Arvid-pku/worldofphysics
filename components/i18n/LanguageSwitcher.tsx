"use client";

import { Languages } from "lucide-react";

import { useI18n } from "@/components/i18n/I18nProvider";
import { cn } from "@/lib/utils/cn";

export function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();

  return (
    <div className="flex items-center gap-2">
      <div className="grid h-9 w-9 place-items-center rounded-md border border-slate-800 bg-slate-950/60 text-slate-200">
        <Languages className="h-4 w-4" />
      </div>
      <div className="flex items-center rounded-md border border-slate-800 bg-slate-950/60 p-1">
        <button
          type="button"
          title={t("lang.english")}
          onClick={() => setLang("en")}
          className={cn(
            "h-7 rounded px-2 text-xs font-semibold tracking-wide transition",
            lang === "en" ? "bg-slate-800/80 text-slate-50" : "text-slate-300 hover:text-slate-100"
          )}
        >
          EN
        </button>
        <button
          type="button"
          title={t("lang.chinese")}
          onClick={() => setLang("zh")}
          className={cn(
            "h-7 rounded px-2 text-xs font-semibold tracking-wide transition",
            lang === "zh" ? "bg-slate-800/80 text-slate-50" : "text-slate-300 hover:text-slate-100"
          )}
        >
          中文
        </button>
      </div>
      <span className="sr-only">{t("lang.label")}</span>
    </div>
  );
}

