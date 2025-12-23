"use client";

import {
  Cable,
  Circle,
  Compass,
  Hand,
  Link2,
  Magnet,
  MousePointer2,
  Spline,
  Square,
  Triangle,
  TrendingUp,
  Waves,
  Zap
} from "lucide-react";

import { useSandbox } from "@/components/sandbox/SandboxContext";
import type { ToolId } from "@/lib/physics/types";
import { cn } from "@/lib/utils/cn";

type ToolButtonProps = {
  id: ToolId;
  label: string;
  icon: React.ReactNode;
};

function ToolButton({ id, label, icon }: ToolButtonProps) {
  const { tool, setTool } = useSandbox();
  const active = tool === id;
  return (
    <button
      type="button"
      onClick={() => setTool(id)}
      className={cn(
        "group flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition",
        active
          ? "bg-slate-800/70 text-slate-50 shadow-[0_0_0_1px_rgba(59,130,246,0.35)]"
          : "text-slate-300 hover:bg-slate-900/60 hover:text-slate-100"
      )}
    >
      <span
        className={cn(
          "grid h-8 w-8 place-items-center rounded-md border text-slate-200 transition",
          active ? "border-blue-500/40 bg-blue-500/10" : "border-slate-800 bg-slate-950/60"
        )}
      >
        {icon}
      </span>
      <span className="truncate">{label}</span>
      <span className="ml-auto text-xs text-slate-500 opacity-0 transition group-hover:opacity-100">
        {id === "pan" ? "drag" : "click"}
      </span>
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="px-2 text-xs font-medium uppercase tracking-widest text-slate-500">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="flex h-full w-[320px] flex-col gap-5 border-r border-slate-900 bg-slate-950/80 p-4">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-slate-100">Physics Sandbox</div>
          <div className="text-xs text-slate-500">Mechanics + E/M</div>
        </div>
        <div className="grid h-9 w-9 place-items-center rounded-md border border-slate-800 bg-slate-950/60 text-slate-200">
          <Compass className="h-4 w-4" />
        </div>
      </header>

      <div className="flex-1 space-y-5 overflow-auto pr-1 [scrollbar-color:rgba(148,163,184,0.25)_transparent] [scrollbar-width:thin]">
        <Section title="Navigate">
          <ToolButton id="select" label="Select" icon={<MousePointer2 className="h-4 w-4" />} />
          <ToolButton id="pan" label="Pan / Orbit" icon={<Hand className="h-4 w-4" />} />
        </Section>

        <Section title="Shapes">
          <ToolButton id="circle" label="Circle" icon={<Circle className="h-4 w-4" />} />
          <ToolButton id="rectangle" label="Rectangle" icon={<Square className="h-4 w-4" />} />
          <ToolButton id="polygon" label="Polygon" icon={<Triangle className="h-4 w-4" />} />
        </Section>

        <Section title="Constraints">
          <ToolButton id="rod" label="Rigid Rod" icon={<Link2 className="h-4 w-4" />} />
          <ToolButton id="rope" label="Rope (Chain)" icon={<Cable className="h-4 w-4" />} />
          <ToolButton id="spring" label="Spring" icon={<Waves className="h-4 w-4" />} />
        </Section>

        <Section title="Statics">
          <ToolButton id="wall" label="Wall" icon={<Square className="h-4 w-4" />} />
          <ToolButton id="slope" label="Slope" icon={<TrendingUp className="h-4 w-4" />} />
          <ToolButton id="track" label="Track (Bezier)" icon={<Spline className="h-4 w-4" />} />
        </Section>

        <Section title="Fields">
          <ToolButton id="field_e_rect" label="Electric Field (Rect)" icon={<Zap className="h-4 w-4" />} />
          <ToolButton id="field_e_circle" label="Electric Field (Circle)" icon={<Zap className="h-4 w-4" />} />
          <ToolButton id="field_b_rect" label="Magnetic Field (Rect)" icon={<Magnet className="h-4 w-4" />} />
          <ToolButton id="field_b_circle" label="Magnetic Field (Circle)" icon={<Magnet className="h-4 w-4" />} />
        </Section>

        <div className="rounded-lg border border-slate-900 bg-slate-950/60 p-3 text-xs text-slate-400">
          Tip: Hold <span className="text-slate-200">Ctrl</span> while scrolling to zoom. Use{" "}
          <span className="text-slate-200">Pan</span> to move around an “infinite” vertical world.
        </div>
      </div>

      <footer className="flex items-center justify-between text-xs text-slate-500">
        <span className="truncate">Matter.js + custom E/M</span>
        <a
          className="rounded-md px-2 py-1 text-slate-400 hover:bg-slate-900/60 hover:text-slate-100"
          href="https://brm.io/matter-js/"
          target="_blank"
          rel="noreferrer"
        >
          Docs
        </a>
      </footer>
    </aside>
  );
}
