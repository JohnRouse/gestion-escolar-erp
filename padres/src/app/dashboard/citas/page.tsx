"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import ScreenHeader from "@/components/ScreenHeader";
import PageTransition from "@/components/PageTransition";

interface Cita {
  id_cita: number;
  id_staff: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  motivo: string | null;
  estado: string;
  creado_en: string;
  staff: {
    persona: { nombres: string; apellido_paterno: string };
  };
}

export default function CitasPage() {
  const router = useRouter();
  const [citas, setCitas] = useState<Cita[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    axios
      .get("/api/citas/apoderado", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setCitas(res.data))
      .catch(() => setCitas([]))
      .finally(() => setLoading(false));
  }, [router]);

  const getEstadoStyle = (estado: string) => {
    switch (estado) {
      case "pendiente":
        return "bg-warning-soft text-warning";
      case "confirmada":
        return "bg-success-soft text-success";
      case "rechazada":
        return "bg-danger-soft text-danger";
      case "cancelada":
        return "bg-border text-text-muted";
      default:
        return "bg-border text-text-muted";
    }
  };

  if (!mounted) {
    return (
      <main className="min-h-screen bg-surface-alt pb-24">
        <ScreenHeader title="Mis Citas" />
        <div className="px-5 pt-4 pb-28 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="m-card p-4 space-y-2">
              <div className="skel h-4 w-32" />
              <div className="skel h-3 w-24" />
              <div className="skel h-3 w-20" />
            </div>
          ))}
        </div>
        <BottomNav />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-alt pb-24">
      <ScreenHeader title="Mis Citas" />
      <PageTransition>
        <div className="px-5 pt-4 pb-28">
          <button
            onClick={() => router.push("/dashboard?open=servicios")}
            className="text-accent text-sm font-bold hover:underline mb-4 flex items-center gap-1"
          >
            <span className="material-symbols-rounded text-lg">arrow_back</span> Servicios
          </button>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="m-card p-4 space-y-2">
                  <div className="skel h-4 w-32" />
                  <div className="skel h-3 w-24" />
                  <div className="skel h-3 w-20" />
                </div>
              ))}
            </div>
          ) : citas.length === 0 ? (
            <p className="text-center text-text-secondary py-10">
              No tienes citas solicitadas
            </p>
          ) : (
            citas.map((cita) => (
              <div key={cita.id_cita} className="m-card p-4 mb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-extrabold text-text">
                      {cita.staff.persona.nombres}{" "}
                      {cita.staff.persona.apellido_paterno}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {new Date(cita.fecha).toLocaleDateString("es-PE", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                      {" · "}
                      {cita.hora_inicio} – {cita.hora_fin}
                    </p>
                    {cita.motivo && (
                      <p className="text-xs text-text-muted mt-1">
                        "{cita.motivo}"
                      </p>
                    )}
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${getEstadoStyle(
                      cita.estado
                    )}`}
                  >
                    {cita.estado}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </PageTransition>
      <BottomNav />
    </main>
  );
}