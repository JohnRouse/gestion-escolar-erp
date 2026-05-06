import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portal de Padres",
  description: "App para padres del colegio",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <div className="max-w-[430px] mx-auto min-h-screen bg-surface shadow-2xl relative overflow-hidden">
          {children}
        </div>
      </body>
    </html>
  );
}
