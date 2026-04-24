"use client";

import { Languages } from "lucide-react";

import { useI18n } from "@/components/i18n/I18nProvider";
import { cn } from "@/lib/utils/cn";

export function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();

  return (
    <div className="flex items-center gap-1.5">
      <Languages className="h-3.5 w-3.5 text-mute-2" />
      <div className="surface flex h-7 items-center rounded-full p-0.5">
        <button
          type="button"
          title={t("lang.english")}
          onClick={() => setLang("en")}
          className={cn(
            "h-6 rounded-full px-2.5 text-[11px] font-semibold tracking-wide transition",
            lang === "en"
              ? "bg-white/[0.10] text-white"
              : "text-mute hover:text-white"
          )}
        >
          EN
        </button>
        <button
          type="button"
          title={t("lang.chinese")}
          onClick={() => setLang("zh")}
          className={cn(
            "h-6 rounded-full px-2.5 text-[11px] font-semibold tracking-wide transition",
            lang === "zh"
              ? "bg-white/[0.10] text-white"
              : "text-mute hover:text-white"
          )}
        >
          中文
        </button>
      </div>
      <span className="sr-only">{t("lang.label")}</span>
    </div>
  );
}
