"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useSelectedChild, Child } from "@/contexts/SelectedChildContext";
import axios from "axios";

export default function DashboardHeader() {
  const router = useRouter();
  const { selectedChild, setSelectedChild } = useSelectedChild();
  const [user, setUser] = useState<{ nombre: string } | null>(null);
  const [hijos, setHijos] = useState<Child[]>([]);
  const [showSelector, setShowSelector] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) setUser(JSON.parse(userData));

    const token = localStorage.getItem("token");
    if (token) fetchHijos(token);
  }, []);

  const fetchHijos = async (token: string) => {
    try {
      const res = await axios.get("/api/academicos/padres/hijos", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHijos(res.data);
    } catch {
      setHijos([]);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  // Determinar género del apoderado por heurística del nombre
  const nombreApoderado = user?.nombre?.split(" ")[0] || "Apoderado";
  const generoApoderado = nombreApoderado.endsWith("a") ? "female" : "male";
  const avatarApoderado = `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(
    user?.nombre || "usuario"
  )}&gender=${generoApoderado}&backgroundColor=b6e3f4,c0aede,d1d4f9&radius=50`;

  // Determinar género del estudiante
  const nombreEstudiante = selectedChild?.nombre?.split(" ")[0] || "";
  const generoEstudiante = nombreEstudiante.endsWith("a") ? "female" : "male";
  const avatarEstudiante = selectedChild
    ? `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(
        selectedChild.nombre
      )}&gender=${generoEstudiante}&backgroundColor=b6e3f4,c0aede,d1d4f9&radius=50`
    : "";

  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  return (
    <header className="bg-primary pt-12 pb-6 px-5 relative overflow-hidden">
      <div className="absolute right-[-30px] top-[-30px] w-44 h-44 rounded-full bg-white/5 blur-2xl" />
      <div className="absolute left-[-20px] bottom-[-30px] w-32 h-32 rounded-full bg-accent/10 blur-2xl" />

      <div className="relative z-10 flex items-center gap-3">
        <button
          className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/20 shadow-md"
          title="Ver perfil"
        >
          <img
            src={avatarApoderado}
            alt="Avatar"
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
              const parent = target.parentElement as HTMLElement;
              parent.innerHTML = `<span class="flex items-center justify-center w-full h-full bg-accent text-primary font-extrabold text-sm">${nombreApoderado
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}</span>`;
            }}
          />
        </button>

        <div className="flex-1">
          <p className="text-white/60 text-sm">{greeting},</p>
          <p className="text-white text-lg font-extrabold leading-tight">
            {nombreApoderado}
          </p>
        </div>

        <button className="relative w-11 h-11 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white">
          <span className="material-symbols-rounded">notifications</span>
        </button>

        <button
          onClick={handleLogout}
          className="w-11 h-11 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-colors"
          title="Cerrar sesión"
        >
          <LogOut size={18} />
        </button>
      </div>

      {selectedChild && (
        <div
          className="mt-4 m-card p-4 animate-fade-in relative z-10 cursor-pointer"
          onClick={() => hijos.length > 1 && setShowSelector(!showSelector)}
        >
          <p className="text-[10px] tracking-[.22em] text-text-muted font-bold uppercase">
            ESTUDIANTE
          </p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={avatarEstudiante}
                alt={selectedChild.nombre}
                className="w-12 h-12 rounded-2xl bg-accent-soft shrink-0"
              />
              <div className="min-w-0">
                <p className="font-extrabold text-primary text-sm truncate">
                  {selectedChild.nombre}
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  {selectedChild.grado}
                </p>
              </div>
            </div>
            {hijos.length > 1 && (
              <span className="material-symbols-rounded text-accent text-2xl">
                {showSelector ? "expand_less" : "expand_more"}
              </span>
            )}
          </div>

          {showSelector && hijos.length > 1 && (
            <div className="mt-3 pt-3 border-t border-border">
              <select
                className="w-full bg-surface-alt border border-border rounded-xl px-3 py-2 text-sm font-bold text-text"
                value={selectedChild.id_estudiante}
                onChange={(e) => {
                  const hijo = hijos.find(
                    (h) => h.id_estudiante === Number(e.target.value)
                  );
                  if (hijo) {
                    setSelectedChild(hijo);
                    setShowSelector(false);
                    window.location.reload();
                  }
                }}
              >
                {hijos.map((h) => (
                  <option key={h.id_estudiante} value={h.id_estudiante}>
                    {h.nombre} — {h.grado}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </header>
  );
}