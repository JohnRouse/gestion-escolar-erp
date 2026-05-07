import type { Metadata } from "next";
import { SelectedChildProvider } from "@/contexts/SelectedChildContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portal de Padres",
  description: "App para apoderados del colegio Santa María Victoria",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" data-scroll-behavior="smooth">
      <body>
        <SelectedChildProvider>
          <div className="max-w-[430px] mx-auto min-h-screen shadow-2xl relative overflow-hidden">
            {children}
          </div>
        </SelectedChildProvider>
      </body>
    </html>
  );
}