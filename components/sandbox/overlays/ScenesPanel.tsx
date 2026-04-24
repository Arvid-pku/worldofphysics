"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileDown, FileUp, Library, Save, Trash2, X } from "lucide-react";

import { useI18n } from "@/components/i18n/I18nProvider";
import { useSandbox } from "@/components/sandbox/SandboxContext";
import { useToast } from "@/components/ui/Toast";
import { applyScene, captureScene, type SceneSnapshot } from "@/lib/physics/sceneSnapshot";
import { STORAGE_KEYS, readJSON, writeJSON } from "@/lib/utils/storage";

type SavedScene = {
  id: string;
  name: string;
  createdAt: number;
  scene: SceneSnapshot;
};

function downloadJSON(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ScenesPanel() {
  const { t } = useI18n();
  const { showScenes, setShowScenes, engineRef, fields, setFields, requestReset, resetNonce } =
    useSandbox();
  const { push } = useToast();

  const [scenes, setScenes] = useState<SavedScene[]>([]);
  const [name, setName] = useState("");

  useEffect(() => {
    if (!showScenes) return;
    setScenes(readJSON<SavedScene[]>(STORAGE_KEYS.scenes, []));
  }, [showScenes]);

  useEffect(() => {
    if (!showScenes) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShowScenes(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showScenes, setShowScenes]);

  const sorted = useMemo(
    () => [...scenes].sort((a, b) => b.createdAt - a.createdAt),
    [scenes]
  );

  function persist(next: SavedScene[]) {
    setScenes(next);
    writeJSON(STORAGE_KEYS.scenes, next);
  }

  function saveCurrent() {
    const engine = engineRef.current;
    if (!engine) return;
    const trimmedName = name.trim();
    const scene = captureScene(engine, fields);
    const id = `s_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    const next: SavedScene = {
      id,
      name:
        trimmedName ||
        `Scene ${new Date().toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        })}`,
      createdAt: Date.now(),
      scene
    };
    persist([next, ...sorted]);
    setName("");
    push({
      tone: "success",
      title: t("scenes.savedToast"),
      description: t("scenes.savedDesc")
        .replace("{count}", String(scene.bodies.length))
        .replace("{fields}", String(scene.fields.length))
    });
  }

  function load(s: SavedScene) {
    requestReset();
    // Wait one frame so the world is reset before re-applying
    requestAnimationFrame(() => {
      applyScene(s.scene, { engine: engineRef.current, setFields });
      push({ tone: "success", title: t("scenes.loadedToast"), description: s.name });
      setShowScenes(false);
    });
  }

  function remove(id: string) {
    persist(sorted.filter((s) => s.id !== id));
    push({ tone: "info", title: t("scenes.deletedToast") });
  }

  function exportCurrent() {
    const engine = engineRef.current;
    if (!engine) return;
    const scene = captureScene(engine, fields);
    downloadJSON(`physics-scene-${Date.now()}.json`, scene);
    push({ tone: "info", title: "Exported JSON" });
  }

  function importJson(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || "{}")) as SceneSnapshot;
        if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.bodies)) {
          throw new Error("Invalid scene file");
        }
        requestReset();
        requestAnimationFrame(() => {
          applyScene(parsed, { engine: engineRef.current, setFields });
          push({ tone: "success", title: t("scenes.loadedToast"), description: file.name });
          setShowScenes(false);
        });
      } catch (err) {
        push({ tone: "danger", title: "Import failed", description: String(err) });
      }
    };
    reader.readAsText(file);
  }

  // resetNonce is referenced so the panel re-renders when scenes are loaded.
  void resetNonce;

  if (!showScenes) return null;

  return (
    <div className="fixed inset-0 z-[110] grid place-items-center p-6">
      <div
        aria-hidden
        className="absolute inset-0 animate-fade-in bg-ink-950/80 backdrop-blur-md"
        onClick={() => setShowScenes(false)}
      />
      <div
        role="dialog"
        aria-labelledby="scenes-title"
        className="glass-strong animate-scale-in relative flex max-h-[80vh] w-[680px] max-w-full flex-col overflow-hidden rounded-3xl shadow-floating"
      >
        <header className="flex items-start gap-4 border-b border-white/[0.06] px-6 py-5">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-violet2-500/10 ring-1 ring-violet2-400/30 text-violet2-400">
            <Library className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 id="scenes-title" className="font-display text-[18px] font-semibold text-white">
              {t("scenes.title")}
            </h2>
            <p className="mt-0.5 text-[12.5px] text-mute">{t("scenes.subtitle")}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowScenes(false)}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-full text-mute hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="border-b border-white/[0.06] px-6 py-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("scenes.namePlaceholder")}
              className="surface h-10 flex-1 rounded-lg px-3 text-[12.5px] text-white placeholder:text-mute-2 outline-none focus:ring-1 focus:ring-spark-400/40"
            />
            <button
              type="button"
              onClick={saveCurrent}
              className="btn-primary flex h-10 items-center gap-2 rounded-lg px-4 text-[12.5px] font-semibold"
            >
              <Save className="h-4 w-4" />
              {t("scenes.saveButton")}
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={exportCurrent}
              className="btn-ghost flex h-9 items-center gap-2 rounded-lg px-3 text-[11.5px]"
            >
              <FileDown className="h-3.5 w-3.5" />
              {t("controls.export")}
            </button>
            <label className="btn-ghost flex h-9 cursor-pointer items-center gap-2 rounded-lg px-3 text-[11.5px]">
              <FileUp className="h-3.5 w-3.5" />
              Import JSON
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) importJson(f);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </div>

        <div className="scroll-pretty min-h-[140px] flex-1 overflow-y-auto p-3">
          {sorted.length === 0 ? (
            <div className="grid place-items-center px-4 py-12 text-center">
              <div className="text-[13px] text-mute">{t("scenes.empty")}</div>
              <div className="mt-1 text-[11.5px] text-mute-2">
                Build something on the canvas, then save it here.
              </div>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {sorted.map((s) => (
                <li
                  key={s.id}
                  className="surface flex items-center gap-3 rounded-xl p-3 transition hover:ring-1 hover:ring-spark-400/30"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-spark-500/10 ring-1 ring-spark-400/30 text-spark-200">
                    <Library className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold text-white">{s.name}</div>
                    <div className="text-[11px] text-mute-2">
                      {s.scene.bodies.length} bodies · {s.scene.fields.length} fields ·{" "}
                      {new Date(s.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadJSON(`${s.name.replace(/\s+/g, "-")}.json`, s.scene)}
                    aria-label="Export"
                    className="grid h-8 w-8 place-items-center rounded-md text-mute hover:bg-white/[0.06] hover:text-white"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(s.id)}
                    aria-label={t("scenes.delete")}
                    className="grid h-8 w-8 place-items-center rounded-md text-mute hover:bg-bad-500/10 hover:text-bad-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => load(s)}
                    className="btn-primary h-9 rounded-lg px-3 text-[12px] font-semibold"
                  >
                    {t("scenes.load")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
