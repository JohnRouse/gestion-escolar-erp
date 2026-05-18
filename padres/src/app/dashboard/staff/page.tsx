"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import ScreenHeader from "@/components/ScreenHeader";
import PageTransition from "@/components/PageTransition";

interface HorarioDia {
  hora_inicio: string;
  hora_fin: string;
  curso: string;
}

interface StaffItem {
  id_staff: number;
  id_persona: number;
  nombre: string;
  cargo: string;
  area: string;
  telefono: string | null;
  cursos?: string[];
  horario?: Record<string, HorarioDia[]>;
  avatar_url: string;
  permite_citas?: boolean;
}

const AREAS = [
  { key: "todas", label: "Todos" },
  { key: "academica", label: "Académica" },
  { key: "administrativa", label: "Administrativa" },
  { key: "salud", label: "Salud" },
  { key: "servicios", label: "Servicios" },
];

const AREA_COLORS: Record<string, string> = {
  academica: "bg-blue-100 text-blue-700",
  administrativa: "bg-purple-100 text-purple-700",
  salud: "bg-green-100 text-green-700",
  servicios: "bg-orange-100 text-orange-700",
};

const capitalizar = (texto: string) =>
  texto.charAt(0).toUpperCase() + texto.slice(1);

export default function StaffPage() {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<StaffItem | null>(null);
  const [filtroArea, setFiltroArea] = useState("todas");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    axios
      .get("/api/academicos/staff", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setStaff(res.data))
      .catch(() => setStaff([]))
      .finally(() => setLoading(false));
  }, [router]);

  const filtrados: StaffItem[] = useMemo(() => {
    if (filtroArea === "todas") return staff;
    return staff.filter((s) => s.area === filtroArea);
  }, [staff, filtroArea]);

  const abrirWhatsApp = (telefono: string) => {
    const mensaje = encodeURIComponent(
      "Hola, le escribo desde la app del colegio."
    );
    window.open(`https://wa.me/51${telefono}?text=${mensaje}`, "_blank");
  };

  // ── Vista detalle ──
  if (selected) {
    return (
      <main className="min-h-screen bg-surface-alt pb-24">
        <ScreenHeader title={selected.nombre} />
        <PageTransition>
          <div className="px-5 pt-4 pb-28">
            <button
              onClick={() => setSelected(null)}
              className="text-accent font-semibold text-sm mb-4 flex items-center gap-1"
            >
              <span className="material-symbols-rounded">arrow_back</span>{" "}
              Volver
            </button>

            <div className="m-card p-5 text-center">
              <img
                src={selected.avatar_url}
                alt={selected.nombre}
                className="w-24 h-24 rounded-full mx-auto border-4 border-accent"
              />
              <h2 className="text-xl font-extrabold text-text mt-3">
                {selected.nombre}
              </h2>
              <p className="text-sm text-text-secondary">{selected.cargo}</p>
              <span
                className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  AREA_COLORS[selected.area] || "bg-gray-100 text-gray-600"
                }`}
              >
                {capitalizar(selected.area)}
              </span>

              {selected.cursos && selected.cursos.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                  {selected.cursos.map((curso) => (
                    <span
                      key={curso}
                      className="text-xs bg-accent-soft text-accent px-2.5 py-0.5 rounded-full font-bold"
                    >
                      {curso}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {selected.horario &&
              Object.keys(selected.horario).length > 0 && (
                <div className="m-card p-5 mt-4">
                  <h3 className="text-sm font-bold text-text mb-3">
                    Horario de Atención
                  </h3>
                  {Object.entries(selected.horario).map(([dia, bloques]) => (
                    <div key={dia} className="mb-3">
                      <p className="text-xs font-bold text-text-secondary mb-1">
                        {dia}
                      </p>
                      {bloques.map((b, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between text-xs py-1 border-b border-border/50"
                        >
                          <span className="text-text">{b.curso}</span>
                          <span className="text-text-muted">
                            {b.hora_inicio} – {b.hora_fin}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

            {selected.telefono && (
              <button
                onClick={() => abrirWhatsApp(selected.telefono!)}
                className="mt-4 w-full py-3 rounded-xl bg-green-500 text-white font-bold text-sm flex items-center justify-center gap-2"
              >
                <span>WhatsApp</span>
              </button>
            )}

            {selected.permite_citas !== false && (
              <button
                onClick={() => alert("Solicitud de cita en desarrollo")}
                className="mt-3 w-full py-3 rounded-xl bg-accent text-white font-bold text-sm"
              >
                Solicitar cita
              </button>
            )}
          </div>
        </PageTransition>
        <BottomNav />
      </main>
    );
  }

  // ── Lista general ──
  return (
    <main className="min-h-screen bg-surface-alt pb-24">
      <ScreenHeader title="Directorio Académico" />
      <PageTransition>
        <div className="px-5 pt-4 pb-28">
          {/* Chips de filtro por área */}
          <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
            {AREAS.map((area) => (
              <button
                key={area.key}
                onClick={() => setFiltroArea(area.key)}
                className={`press px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                  filtroArea === area.key
                    ? "bg-accent text-white shadow-lg shadow-accent/20"
                    : "bg-white text-text-secondary border border-border hover:bg-surface-alt"
                }`}
              >
                {area.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="m-card p-4 flex items-center gap-3">
                  <div className="skel w-12 h-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="skel h-4 w-32" />
                    <div className="skel h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtrados.length === 0 ? (
            <p className="text-center text-text-secondary py-10">
              No hay personal asignado para sus hijos
            </p>
          ) : (
            filtrados.map((persona) => (
              <button
                key={persona.id_staff}
                onClick={() => setSelected(persona)}
                className="w-full text-left m-card p-4 flex items-center gap-3 press mb-3"
              >
                <img
                  src={persona.avatar_url}
                  alt={persona.nombre}
                  className="w-12 h-12 rounded-full bg-accent-soft"
                />
                <div className="flex-1">
                  <p className="font-extrabold text-text">{persona.nombre}</p>
                  <p className="text-xs text-text-secondary">
                    {persona.cargo}
                    {persona.cursos && ` · ${persona.cursos.join(", ")}`}
                  </p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    AREA_COLORS[persona.area] || "bg-gray-100 text-gray-600"
                  }`}
                >
                  {capitalizar(persona.area)}
                </span>
                <span className="material-symbols-rounded text-text-muted">
                  chevron_right
                </span>
              </button>
            ))
          )}
        </div>
      </PageTransition>
      <BottomNav />
    </main>
  );
}