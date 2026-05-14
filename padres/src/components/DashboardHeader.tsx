"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useSelectedChild } from "@/contexts/SelectedChildContext";
import axios from "axios";
import NotificationBell from "@/components/NotificationBell";
import ProfileDrawer from "@/components/ProfileDrawer";

const COLORES_ESTUDIANTES = [
  '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444'
];

export default function DashboardHeader() {
  const router = useRouter();
  const { selectedChild, setSelectedChild, setHijos } = useSelectedChild();
  const [user, setUser] = useState<{ nombre: string; genero?: string } | null>(null);
  const [greeting, setGreeting] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) setUser(JSON.parse(userData));
    const token = localStorage.getItem("token");
    if (token) fetchHijos(token);

    const hour = new Date().getHours();
    const g = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
    setGreeting(g);
  }, []);

  const fetchHijos = async (token: string) => {
    try {
      const res = await axios.get("/api/academicos/padres/hijos", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const hijosConColor = res.data.map((h: any, idx: number) => ({
        ...h,
        color: h.color || COLORES_ESTUDIANTES[idx % COLORES_ESTUDIANTES.length],
      }));
      setHijos(hijosConColor);
      if (!selectedChild && hijosConColor.length > 0) {
        setSelectedChild(hijosConColor[0]);
      }
    } catch {
      setHijos([]);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  const nombreApoderado = user?.nombre?.split(" ")[0] || "Apoderado";
  let generoApoderado = "male";
  if (user?.genero) {
    generoApoderado = user.genero === "F" ? "female" : "male";
  } else {
    generoApoderado = nombreApoderado.endsWith("a") ? "female" : "male";
  }
  const [avatarApoderado, setAvatarApoderado] = useState(
  `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(
    user?.nombre || "usuario"
  )}&gender=${generoApoderado}&backgroundColor=b6e3f4,c0aede,d1d4f9&radius=50`
);

useEffect(() => {
  const saved = localStorage.getItem('avatar_url');
  if (saved) {
    setAvatarApoderado(saved);
  }
}, []);

  const nombreEstudiante = selectedChild?.nombre?.split(" ")[0] || "";
  const generoEstudiante = nombreEstudiante.endsWith("a") ? "female" : "male";
  const avatarEstudiante = selectedChild?.avatar_url
  ? selectedChild.avatar_url
  : selectedChild
    ? `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(
        selectedChild.nombre
      )}&gender=${generoEstudiante}&backgroundColor=b6e3f4,c0aede,d1d4f9&radius=50`
    : "";

    const updateAvatar = (newUrl: string) => {
  setAvatarApoderado(newUrl);
  localStorage.setItem('avatar_url', newUrl);
};

  return (
    <header className="bg-primary pt-12 pb-6 px-5 relative">
      {/* Decorativos contenidos */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute right-[-30px] top-[-30px] w-44 h-44 rounded-full bg-white/5 blur-2xl" />
        <div className="absolute left-[-20px] bottom-[-30px] w-32 h-32 rounded-full bg-accent/10 blur-2xl" />
      </div>

      <div className="relative z-10 flex items-center gap-3">
        {/* Botón de perfil (abre el drawer) */}
        <button
          onClick={() => setProfileOpen(true)}
          className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/20 shadow-md"
        >
          <img
            src={avatarApoderado}
            alt="Avatar"
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
              (target.parentElement as HTMLElement).innerHTML = `<span class="flex items-center justify-center w-full h-full bg-accent text-primary font-extrabold text-sm">${nombreApoderado
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}</span>`;
            }}
          />
        </button>

        <div className="flex-1">
          <p className="text-white/60 text-sm">{greeting || '\u00A0'}</p>
          <p className="text-white text-lg font-extrabold leading-tight">{nombreApoderado}</p>
        </div>

        {/* Campana de notificaciones */}
        <NotificationBell />

        <button
          onClick={handleLogout}
          className="w-11 h-11 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-colors"
          title="Cerrar sesión"
        >
          <LogOut size={18} />
        </button>
      </div>

      {/* Tarjeta del estudiante */}
      {selectedChild && (
        <div className="mt-4 m-card p-4 animate-fade-in relative z-10">
          <p className="text-[10px] tracking-[.22em] text-text-muted font-bold uppercase">ESTUDIANTE</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {avatarEstudiante && (
                <img src={avatarEstudiante} alt={selectedChild.nombre} className="w-12 h-12 rounded-2xl bg-accent-soft shrink-0" />
              )}
              <div className="min-w-0">
                <p className="font-extrabold text-primary text-sm truncate">{selectedChild.nombre}</p>
                <p className="text-xs text-text-secondary mt-0.5">{selectedChild.grado}</p>
              </div>
            </div>
            <span className="material-symbols-rounded text-accent text-3xl">workspace_premium</span>
          </div>
        </div>
      )}

      {/* Drawer de perfil */}
      <ProfileDrawer
  isOpen={profileOpen}
  onClose={() => setProfileOpen(false)}
  onAvatarChange={updateAvatar}
/>
    </header>
  );
}