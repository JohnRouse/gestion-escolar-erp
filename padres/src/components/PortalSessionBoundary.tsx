"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import axios from "axios";
import { clearPortalSession, isValidPortalToken } from "@/lib/portalSession";

export default function PortalSessionBoundary({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const privateRoute = pathname.startsWith("/dashboard");
    if ((token && !isValidPortalToken(token)) || (privateRoute && !token)) {
      clearPortalSession();
      window.location.replace("/login");
      return;
    }

    queueMicrotask(() => setReady(true));

    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error?.response?.status === 401) {
          clearPortalSession();
          if (window.location.pathname !== "/login") {
            window.location.replace("/login");
          }
        }
        return Promise.reject(error);
      },
    );

    return () => axios.interceptors.response.eject(interceptor);
  }, [pathname]);

  if (!ready) {
    return (
      <main className="grid min-h-screen place-items-center bg-surface-alt px-6">
        <p className="text-sm font-semibold text-text-secondary">Validando sesión…</p>
      </main>
    );
  }

  return children;
}
