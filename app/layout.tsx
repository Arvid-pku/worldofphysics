import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "World of Physics — Sandbox",
  description: "Interactive 2D physics sandbox for mechanics and electromagnetism."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-dvh bg-slate-950 text-slate-100 antialiased">{children}</body>
    </html>
  );
}

