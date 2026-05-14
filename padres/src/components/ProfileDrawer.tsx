"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import axios from "axios";
import TabDatos from "./TabDatos";
import TabSeguridad from "./TabSeguridad";
import TabPreferencias from "./TabPreferencias";

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAvatarChange?: (url: string) => void;
}

export default function ProfileDrawer({ isOpen, onClose, onAvatarChange }: ProfileDrawerProps) {
  const [tab, setTab] = useState<"datos" | "seguridad" | "preferencias">("datos");
  const [tema, setTema] = useState("claro");
  const [notificaciones, setNotificaciones] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    cargarPreferencias();
  }, []);

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
    document.documentElement.classList.toggle("dark", nuevoTema === "oscuro");
  };

  if (!isOpen || !mounted) return null;

  const tabs = [
    { key: "datos", label: "Datos", icon: "person" },
    { key: "seguridad", label: "Seguridad", icon: "lock" },
    { key: "preferencias", label: "Preferencias", icon: "tune" },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-primary/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white shadow-2xl animate-slide-left">
        {/* Encabezado */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-extrabold text-text">Mi Perfil</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-surface-alt flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 ${
                tab === t.key
                  ? "border-accent text-accent"
                  : "border-transparent text-text-muted hover:text-text"
              }`}
            >
              <span className="material-symbols-rounded text-sm mr-1">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Contenido */}
        <div className="p-4 overflow-y-auto" style={{ maxHeight: "calc(100vh - 140px)" }}>
          {tab === "datos" && <TabDatos onAvatarChange={onAvatarChange} />}
          {tab === "seguridad" && <TabSeguridad />}
          {tab === "preferencias" && (
            <TabPreferencias
              temaActual={tema}
              notificacionesActual={notificaciones}
              onTemaChange={handleTemaChange}
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}