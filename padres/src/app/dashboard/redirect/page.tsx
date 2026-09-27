"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSelectedChild } from "@/contexts/SelectedChildContext";
import { safePortalTarget } from "@/lib/portalNotificationNavigation";

function RedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSelectedChild, hijos, childrenLoading } = useSelectedChild();

  useEffect(() => {
    const alumnoId = searchParams.get("alumno_id");
    if (childrenLoading) return;
    const destino = safePortalTarget(
      searchParams.get("destino") || "/dashboard/pagos",
      window.location.origin,
    ) || "/dashboard";
    const cronogramaId = searchParams.get("cronograma_id");

    if (!alumnoId) {
      router.replace(destino);
      return;
    }

    const hijo = hijos.find((item) => item.id_estudiante === Number(alumnoId));
    if (hijo) setSelectedChild(hijo);
    const target = new URL(destino, window.location.origin);
    if (cronogramaId) target.searchParams.set("cronograma_id", cronogramaId);
    router.replace(`${target.pathname}${target.search}${target.hash}`);
  }, [childrenLoading, hijos, searchParams, router, setSelectedChild]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-alt">
      <p className="text-text-secondary">Redirigiendo...</p>
    </div>
  );
}

export default function RedirectPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-surface-alt">
          <p className="text-text-secondary">Redirigiendo...</p>
        </div>
      }
    >
      <RedirectContent />
    </Suspense>
  );
}
