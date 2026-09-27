import type { Metadata } from "next";
import { SelectedChildProvider } from "@/contexts/SelectedChildContext";
import ThemeScript from "@/components/ThemeScript";
import PortalSessionBoundary from "@/components/PortalSessionBoundary";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gestión Escolar ERP – Portal de familias",
  description: "Portal móvil para apoderados. Notas, asistencia, pagos, comunicados y horario.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta name="theme-color" content="#f8f9fa" />
      </head>
      <body>
        <ThemeScript />
        <PortalSessionBoundary>
          <SelectedChildProvider>
            <div className="relative mx-auto min-h-screen w-full max-w-[720px] overflow-x-hidden bg-surface-alt md:border-x md:border-border">
              {children}
            </div>
          </SelectedChildProvider>
        </PortalSessionBoundary>
      </body>
    </html>
  );
}
