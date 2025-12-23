"use client";

import { X } from "lucide-react";

import { useI18n } from "@/components/i18n/I18nProvider";
import { useSandbox } from "@/components/sandbox/SandboxContext";
import { BodyInspector } from "@/components/sandbox/overlays/inspector/BodyInspector";
import { FieldInspector } from "@/components/sandbox/overlays/inspector/FieldInspector";

export function InspectorPanel() {
  const { t } = useI18n();
  const { selected, setSelected } = useSandbox();

  if (selected.kind === "none") return null;

  return (
    <div className="pointer-events-none absolute bottom-4 right-4 z-30 w-[390px] max-w-[calc(100vw-2rem)]">
      <div className="pointer-events-auto flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-950/40 shadow-xl backdrop-blur">
        <header className="flex items-center justify-between gap-2 border-b border-slate-800/70 px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-slate-100">{t("inspector.title")}</div>
            <div className="mt-0.5 text-xs text-slate-500">
              {selected.kind === "body" ? t("inspector.subtitleBody") : t("inspector.subtitleField")}
            </div>
          </div>
          <button
            type="button"
            title={t("inspector.close")}
            onClick={() => setSelected({ kind: "none" })}
            className="grid h-9 w-9 place-items-center rounded-md border border-slate-800 bg-slate-950/40 text-slate-200 hover:bg-slate-900/50"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="overflow-auto px-4 py-4 [scrollbar-color:rgba(148,163,184,0.25)_transparent] [scrollbar-width:thin]">
          {selected.kind === "body" ? <BodyInspector bodyId={selected.id} /> : <FieldInspector fieldId={selected.id} />}
        </div>
      </div>
    </div>
  );
}
