import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Revento",
  description: "Le stock et les marges des revendeurs, au même endroit.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Revento", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f6f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0d12" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
