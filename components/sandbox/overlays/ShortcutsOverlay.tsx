"use client";

import { useEffect, useState } from "react";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  Copy,
  Keyboard,
  Pause,
  RotateCcw,
  Trash2,
  Undo2,
  Wand2,
  X,
  ZoomIn
} from "lucide-react";

import { useI18n } from "@/components/i18n/I18nProvider";
import { useSandbox } from "@/components/sandbox/SandboxContext";

type ShortcutItem = { keys: string[]; label: string; icon?: React.ReactNode };
type ShortcutGroup = { title: string; items: ShortcutItem[] };

export function ShortcutsOverlay() {
  const { t } = useI18n();
  const { showShortcuts, setShowShortcuts } = useSandbox();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!showShortcuts) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShowShortcuts(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showShortcuts, setShowShortcuts]);

  if (!showShortcuts) return null;

  const isMac = typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);
  const mod = isMac ? "⌘" : "Ctrl";
  const shift = "⇧";

  const groups: ShortcutGroup[] = [
    {
      title: t("shortcuts.section.tools"),
      items: [
        { keys: ["V"], label: t("shortcuts.tool.select") },
        { keys: ["H"], label: t("shortcuts.tool.pan") },
        { keys: ["C"], label: t("shortcuts.tool.circle") },
        { keys: ["R"], label: t("shortcuts.tool.rectangle") },
        { keys: ["P"], label: t("tool.polygon") },
        { keys: ["L"], label: t("shortcuts.tool.velocity") },
        { keys: ["M"], label: t("shortcuts.tool.ruler") }
      ]
    },
    {
      title: t("shortcuts.section.edit"),
      items: [
        { keys: ["Del"], label: t("shortcuts.edit.delete"), icon: <Trash2 className="h-3.5 w-3.5" /> },
        { keys: [mod, "C"], label: t("shortcuts.edit.copy"), icon: <Copy className="h-3.5 w-3.5" /> },
        { keys: [mod, "V"], label: t("shortcuts.edit.paste") },
        { keys: [mod, "D"], label: t("shortcuts.edit.duplicate") },
        { keys: [mod, "Z"], label: t("shortcuts.edit.undo"), icon: <Undo2 className="h-3.5 w-3.5" /> },
        { keys: [mod, shift, "Z"], label: t("shortcuts.edit.redo") }
      ]
    },
    {
      title: t("shortcuts.section.transport"),
      items: [
        { keys: ["Space"], label: t("shortcuts.transport.toggle"), icon: <Pause className="h-3.5 w-3.5" /> },
        { keys: ["→"], label: t("shortcuts.transport.step"), icon: <ArrowLeftRight className="h-3.5 w-3.5" /> },
        { keys: [shift, "R"], label: t("shortcuts.transport.reset"), icon: <RotateCcw className="h-3.5 w-3.5" /> }
      ]
    },
    {
      title: t("shortcuts.section.view"),
      items: [
        { keys: [mod, "Scroll"], label: t("shortcuts.view.zoom"), icon: <ZoomIn className="h-3.5 w-3.5" /> },
        { keys: ["?"], label: t("shortcuts.view.help"), icon: <Keyboard className="h-3.5 w-3.5" /> },
        { keys: ["L"], label: t("shortcuts.view.labs"), icon: <Wand2 className="h-3.5 w-3.5" /> }
      ]
    }
  ];

  const q = query.trim().toLowerCase();
  const filtered = q
    ? groups
        .map((g) => ({
          ...g,
          items: g.items.filter(
            (i) =>
              i.label.toLowerCase().includes(q) ||
              i.keys.join(" ").toLowerCase().includes(q)
          )
        }))
        .filter((g) => g.items.length > 0)
    : groups;

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center p-6">
      <div
        aria-hidden
        className="absolute inset-0 animate-fade-in bg-ink-950/80 backdrop-blur-md"
        onClick={() => setShowShortcuts(false)}
      />
      <div
        role="dialog"
        aria-labelledby="shortcuts-title"
        className="glass-strong animate-scale-in relative flex w-[760px] max-w-full flex-col overflow-hidden rounded-3xl shadow-floating"
      >
        <header className="flex items-start gap-4 border-b border-white/[0.06] px-6 py-5">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-spark-500/10 ring-1 ring-spark-400/30 text-spark-200">
            <Keyboard className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 id="shortcuts-title" className="font-display text-[18px] font-semibold text-white">
              {t("shortcuts.title")}
            </h2>
            <p className="mt-0.5 text-[12.5px] text-mute">{t("shortcuts.subtitle")}</p>
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter…"
            className="surface h-9 w-44 rounded-lg px-3 text-[12.5px] text-white placeholder:text-mute-2 outline-none focus:ring-1 focus:ring-spark-400/40"
          />
          <button
            type="button"
            onClick={() => setShowShortcuts(false)}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-full text-mute hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="grid max-h-[60vh] grid-cols-1 gap-4 overflow-y-auto p-6 sm:grid-cols-2 scroll-pretty">
          {filtered.length === 0 ? (
            <div className="col-span-full text-center text-[12.5px] text-mute">
              {t("sidebar.searchEmpty")}
            </div>
          ) : null}
          {filtered.map((g) => (
            <section key={g.title} className="surface rounded-2xl p-4">
              <div className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-mute-2">
                {g.title}
              </div>
              <ul className="space-y-1.5">
                {g.items.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition hover:bg-white/[0.04]"
                  >
                    <span className="flex items-center gap-2 text-[12.5px] text-[#E6EAF6]">
                      {item.icon ? (
                        <span className="text-mute-2">{item.icon}</span>
                      ) : (
                        <span className="h-3.5 w-3.5" />
                      )}
                      {item.label}
                    </span>
                    <span className="flex items-center gap-1">
                      {item.keys.map((k, j) => (
                        <span key={j} className="kbd">
                          {k}
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <footer className="flex items-center justify-between border-t border-white/[0.06] px-6 py-3 text-[11.5px] text-mute">
          <span>
            Press <span className="kbd">?</span> any time
          </span>
          <span>
            <span className="kbd">Esc</span> {t("shortcuts.close")}
          </span>
        </footer>
      </div>
    </div>
  );
}
