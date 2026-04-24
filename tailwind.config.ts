import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "system-ui",
          "sans-serif"
        ],
        display: [
          "Sora",
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "system-ui",
          "sans-serif"
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace"
        ]
      },
      colors: {
        ink: {
          950: "#05070F",
          900: "#0A0F1F",
          850: "#0E1530",
          800: "#121A38",
          750: "#172143",
          700: "#1E2A52",
          600: "#293768",
          500: "#3B4A82"
        },
        edge: {
          subtle: "rgba(255,255,255,0.04)",
          DEFAULT: "rgba(255,255,255,0.07)",
          strong: "rgba(255,255,255,0.12)"
        },
        spark: {
          50: "#ECF5FF",
          100: "#D0E8FF",
          200: "#A2D1FF",
          300: "#6DB5FF",
          400: "#3D97FF",
          500: "#1E7AFF",
          600: "#0E60E6",
          700: "#0A4DBA",
          800: "#0A3D8E",
          900: "#0A2D60"
        },
        plasma: {
          300: "#7FECFF",
          400: "#3CDFFF",
          500: "#15CDF5",
          600: "#0FA5C9"
        },
        ember: {
          300: "#FFD08A",
          400: "#FFB857",
          500: "#FF9D2E",
          600: "#E07F18"
        },
        violet2: {
          400: "#A78BFA",
          500: "#8B5CF6",
          600: "#7C3AED"
        },
        ok: { 500: "#22C55E", 400: "#4ADE80" },
        warn: { 500: "#FACC15", 400: "#FDE047" },
        bad: { 500: "#F43F5E", 400: "#FB7185" }
      },
      boxShadow: {
        glowBlue: "0 0 0 1px rgba(61,151,255,0.35), 0 0 28px rgba(30,122,255,0.45)",
        glowRed: "0 0 0 1px rgba(244,63,94,0.35), 0 0 28px rgba(244,63,94,0.45)",
        glowCyan: "0 0 0 1px rgba(60,223,255,0.35), 0 0 28px rgba(21,205,245,0.45)",
        glowEmber: "0 0 0 1px rgba(255,184,87,0.35), 0 0 28px rgba(255,157,46,0.45)",
        glass: "0 1px 0 0 rgba(255,255,255,0.06) inset, 0 30px 60px -30px rgba(0,0,0,0.8)",
        floating: "0 14px 40px -12px rgba(0,0,0,0.7), 0 2px 0 0 rgba(255,255,255,0.04) inset"
      },
      backgroundImage: {
        "radial-spotlight":
          "radial-gradient(1200px 600px at 50% -10%, rgba(30,122,255,0.18), transparent 60%), radial-gradient(800px 400px at 110% 110%, rgba(139,92,246,0.10), transparent 60%)",
        "panel-sheen":
          "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0) 30%)",
        "spark-gradient": "linear-gradient(135deg, #1E7AFF 0%, #15CDF5 100%)",
        "ember-gradient": "linear-gradient(135deg, #FF9D2E 0%, #F43F5E 100%)"
      },
      keyframes: {
        "fade-in": { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" }
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" }
        },
        "pulse-ring": {
          "0%": { transform: "scale(1)", opacity: "0.8" },
          "100%": { transform: "scale(1.6)", opacity: "0" }
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        },
        "toast-in": {
          "0%": { opacity: "0", transform: "translateY(12px) scale(0.96)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" }
        }
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out both",
        "fade-up": "fade-up 280ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "scale-in": "scale-in 220ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "pulse-soft": "pulse-soft 1.6s ease-in-out infinite",
        "pulse-ring": "pulse-ring 1.6s cubic-bezier(0.22, 1, 0.36, 1) infinite",
        shimmer: "shimmer 1.6s linear infinite",
        "toast-in": "toast-in 220ms cubic-bezier(0.22, 1, 0.36, 1) both"
      }
    }
  },
  plugins: []
};

export default config;
