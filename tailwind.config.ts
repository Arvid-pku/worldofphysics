import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      boxShadow: {
        glowBlue: "0 0 0 1px rgba(59,130,246,0.25), 0 0 24px rgba(59,130,246,0.35)",
        glowRed: "0 0 0 1px rgba(239,68,68,0.25), 0 0 24px rgba(239,68,68,0.35)"
      }
    }
  },
  plugins: []
};

export default config;

