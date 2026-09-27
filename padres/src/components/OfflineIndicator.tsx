"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export default function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== "undefined" && !navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed left-0 right-0 top-0 z-[200] flex min-h-10 items-center justify-center gap-2 bg-warning px-3 text-center text-xs font-semibold text-white" role="status">
      <WifiOff size={15} aria-hidden="true" /> Sin conexión · Mostrando datos guardados
    </div>
  );
}
