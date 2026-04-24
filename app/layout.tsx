import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "World of Physics — Interactive Sandbox",
  description:
    "An interactive 2D sandbox for exploring Newtonian mechanics and electromagnetism. Build, measure, and visualize physics in real time.",
  applicationName: "World of Physics",
  authors: [{ name: "World of Physics" }]
};

export const viewport: Viewport = {
  themeColor: "#05070F",
  colorScheme: "dark"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-dvh bg-ink-900 font-sans text-[#E6EAF6] antialiased">
        {children}
      </body>
    </html>
  );
}
