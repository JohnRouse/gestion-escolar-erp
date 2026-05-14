import type { Metadata } from "next";
import { SelectedChildProvider } from "@/contexts/SelectedChildContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Santa María Victoria – Portal de Padres",
  description: "Portal móvil para apoderados. Notas, asistencia, pagos, avisos y horario.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            var tema = localStorage.getItem('tema');
            if (tema === 'oscuro') {
              document.documentElement.classList.add('dark');
            }
          })();
        `,
      }}
    />
        <meta name="theme-color" content="#FCE7E9" />
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
        <SelectedChildProvider>
          <div className="max-w-[420px] mx-auto min-h-screen bg-brand-paper shadow-2xl relative overflow-hidden">
            {children}
          </div>
        </SelectedChildProvider>
      </body>
    </html>
  );
}