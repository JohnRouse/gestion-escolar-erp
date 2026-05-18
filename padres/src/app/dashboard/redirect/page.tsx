"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSelectedChild } from "@/contexts/SelectedChildContext";
import axios from "axios";

export default function RedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSelectedChild } = useSelectedChild();

  useEffect(() => {
    const alumnoId = searchParams.get("alumno_id");
    const destino = searchParams.get("destino") || "/dashboard/pagos";
    const cronogramaId = searchParams.get("cronograma_id");

    if (!alumnoId) {
      router.replace(destino);
      return;
    }

    const fetchAndRedirect = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("/api/academicos/padres/hijos", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const hijos = res.data;
        const hijo = hijos.find((h: any) => h.id_estudiante === Number(alumnoId));
        if (hijo) {
          setSelectedChild(hijo);
        }
      } catch (e) {
        // Si falla, igual redirigimos
      } finally {
        // Construir la URL de destino conservando otros parámetros
        const params = new URLSearchParams();
        if (cronogramaId) params.set("cronograma_id", cronogramaId);
        const query = params.toString();
        router.replace(`${destino}${query ? `?${query}` : ""}`);
      }
    };

    fetchAndRedirect();
  }, [searchParams, router, setSelectedChild]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-alt">
      <p className="text-text-secondary">Redirigiendo...</p>
    </div>
  );
}