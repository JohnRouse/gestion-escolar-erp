import type { Metadata } from "next";
import { SelectedChildProvider } from "@/contexts/SelectedChildContext";
import ThemeScript from "@/components/ThemeScript";
import "./globals.css";

export const metadata: Metadata = {
  title: "Santa María Victoria – Portal de Padres",
  description: "Portal móvil para apoderados. Notas, asistencia, pagos, avisos y horario.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0"
        />
      </head>
      <body>
        <ThemeScript />
        <SelectedChildProvider>
          <div className="w-full max-w-[420px] md:max-w-4xl mx-auto min-h-screen bg-brand-paper md:bg-surface-alt shadow-2xl relative overflow-hidden">
            {children}
          </div>
        </SelectedChildProvider>
      </body>
    </html>
  );
}