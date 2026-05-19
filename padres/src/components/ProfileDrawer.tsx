"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import axios from "axios";
import TabDatos from "./TabDatos";
import TabSeguridad from "./TabSeguridad";
import TabPreferencias from "./TabPreferencias";
import TabHijos from "./TabHijos";

type TabKey = "datos" | "seguridad" | "preferencias" | "hijos" | "servicios";

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAvatarChange?: (url: string) => void;
  initialTab?: TabKey;
}

export default function ProfileDrawer({ isOpen, onClose, onAvatarChange, initialTab = "datos" }: ProfileDrawerProps) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [tema, setTema] = useState("claro");
  const [notificaciones, setNotificaciones] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    cargarPreferencias();
  }, []);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const cargarPreferencias = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/apoderados/perfil", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTema(res.data.tema || "claro");
      setNotificaciones(res.data.notificaciones_activas);
    } catch {}
  };

  const handleTemaChange = (nuevoTema: string) => {
    setTema(nuevoTema);
    localStorage.setItem("tema", nuevoTema);
    if (nuevoTema === "oscuro") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  if (!isOpen || !mounted) return null;

  const tabs = [
    { key: "datos", label: "Datos", icon: "person" },
    { key: "seguridad", label: "Seguridad", icon: "lock" },
    { key: "preferencias", label: "Preferencias", icon: "tune" },
    { key: "hijos", label: "Hijos", icon: "child_care" },
    { key: "servicios", label: "Servicios", icon: "grid_view" },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-88 md:w-110 max-w-[85vw] profile-drawer shadow-2xl animate-slide-left custom-scrollbar">
        <div className="flex items-center justify-between p-4 border-b border-border dark:border-gray-700">
          <h2 className="text-lg font-extrabold text-text dark:text-gray-100">Mi Perfil</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-surface-alt dark:hover:bg-gray-700 flex items-center justify-center">
            <X size={18} />
          </button>
        </div>

        <div className="flex border-b border-border dark:border-gray-700">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as TabKey)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-3 text-xs md:text-sm font-bold transition-all border-b-2 ${
                tab === t.key
                  ? "border-accent text-accent"
                  : "border-transparent text-text-muted hover:text-text dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              <span className="material-symbols-rounded text-lg md:text-xl">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <div className="p-4 overflow-y-auto custom-scrollbar" style={{ maxHeight: "calc(100vh - 140px)" }}>
          {tab === "datos" && <TabDatos onAvatarChange={onAvatarChange} />}
          {tab === "seguridad" && <TabSeguridad />}
          {tab === "preferencias" && (
            <TabPreferencias
              temaActual={tema}
              notificacionesActual={notificaciones}
              onTemaChange={handleTemaChange}
            />
          )}
          {tab === "hijos" && <TabHijos />}
          {tab === "servicios" && (
            <div className="space-y-3">
              <button
                onClick={() => { router.push("/dashboard/staff"); onClose(); }}
                className="btn-contained"
              >
                Directorio Académico
              </button>
              <button
                onClick={() => { router.push("/dashboard/citas"); onClose(); }}
                className="btn-contained"
              >
                Mis Citas
              </button>
              <button
                onClick={() => { router.push("/dashboard/calendario"); onClose(); }}
                className="btn-contained"
              >
                Calendario Escolar
              </button>
              <button
  onClick={() => { router.push("/dashboard/galeria"); onClose(); }}
  className="btn-contained"
>
  Momentos Victoria
</button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}