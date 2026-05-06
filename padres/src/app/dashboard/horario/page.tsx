"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import BottomNav from "@/components/BottomNav";
import { LogOut } from "lucide-react";

interface Clase {
  hora_inicio: string;
  hora_fin: string;
  curso: string;
  docente: string;
}

export default function HorarioPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ nombre: string } | null>(null);
  const [alumnoId] = useState(2);
  const [horario, setHorario] = useState<Record<string, Clase[]>>({});
  const [diaActivo, setDiaActivo] = useState("Lunes");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.push("/login");
      return;
    }

    setUser(JSON.parse(userData));
    fetchHorario(token, alumnoId);
  }, [router, alumnoId]);

  const fetchHorario = async (token: string, alumnoId: number) => {
    setLoading(true);
    try {
      const response = await axios.get(
        `/api/academicos/padres/horario?alumno_id=${alumnoId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setHorario(response.data);
      const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
      const hoy = new Date().getDay();
      const diaHoy = dias[hoy - 1] || "Lunes";
      setDiaActivo(response.data[diaHoy] ? diaHoy : "Lunes");
    } catch (err) {
      console.error("Error al cargar horario:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  return (
    <main className="min-h-screen bg-slate-100 pb-20">
      <header className="bg-white border-b border-border px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary-light flex items-center justify-center text-sm font-bold text-primary">
            {user?.nombre?.charAt(0) || "U"}
          </div>
          <div>
            <p className="text-xs font-semibold text-text">{user?.nombre}</p>
            <p className="text-[10px] text-text-secondary">Horario Semanal</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="text-text-muted hover:text-danger transition-colors p-2"
          title="Cerrar sesión"
        >
          <LogOut size={18} />
        </button>
      </header>

      <div className="px-4 py-3 flex gap-2 overflow-x-auto">
        {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"].map((dia) => (
          <button
            key={dia}
            onClick={() => setDiaActivo(dia)}
            className={`px-4 py-2 text-xs font-semibold rounded-full whitespace-nowrap transition-all ${
              diaActivo === dia
                ? "bg-primary text-white shadow-md"
                : "bg-surface-secondary text-text-secondary hover:bg-gray-200"
            }`}
          >
            {dia.substring(0, 3)}
          </button>
        ))}
      </div>

      <div className="px-4 py-4">
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card h-24 bg-gray-200" />
            ))}
          </div>
        ) : horario[diaActivo]?.length > 0 ? (
          <div className="space-y-3">
            {horario[diaActivo].map((clase, idx) => (
              <div key={idx} className="card p-4">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-sm font-bold text-text">{clase.curso}</p>
                  <span className="text-xs text-text-muted bg-surface-secondary px-2 py-1 rounded-lg">
                    {clase.hora_inicio} – {clase.hora_fin}
                  </span>
                </div>
                <p className="text-xs text-text-secondary">Prof. {clase.docente}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="card p-8 text-center">
            <p className="text-text-secondary">No hay clases el {diaActivo}.</p>
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  );
}