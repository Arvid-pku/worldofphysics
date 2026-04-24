"use client";

import { cn } from "@/lib/utils/cn";

export function BrandMark({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <svg
      className={cn("shrink-0", className)}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="wop-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3D97FF" />
          <stop offset="55%" stopColor="#15CDF5" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
        <radialGradient id="wop-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#3D97FF" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#3D97FF" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="15" fill="url(#wop-glow)" opacity="0.6" />
      <path
        d="M16 3 a13 13 0 0 1 0 26 a13 13 0 0 1 0 -26z"
        stroke="url(#wop-grad)"
        strokeWidth="1.5"
        opacity="0.85"
      />
      {/* Orbital ellipses */}
      <ellipse
        cx="16"
        cy="16"
        rx="13"
        ry="5"
        stroke="url(#wop-grad)"
        strokeWidth="1.4"
        transform="rotate(-22 16 16)"
        opacity="0.95"
      />
      <ellipse
        cx="16"
        cy="16"
        rx="13"
        ry="5"
        stroke="url(#wop-grad)"
        strokeWidth="1.4"
        transform="rotate(34 16 16)"
        opacity="0.55"
      />
      {/* Nucleus */}
      <circle cx="16" cy="16" r="2.6" fill="#fff" />
      <circle cx="16" cy="16" r="2.6" fill="url(#wop-grad)" opacity="0.9" />
    </svg>
  );
}

export function BrandWordmark({ subtitle, className }: { subtitle?: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <BrandMark size={32} />
      <div className="leading-tight">
        <div className="font-display text-[15px] font-semibold tracking-tight text-white">
          World of Physics
        </div>
        {subtitle ? (
          <div className="text-[10.5px] uppercase tracking-[0.18em] text-mute-2">{subtitle}</div>
        ) : null}
      </div>
    </div>
  );
}
