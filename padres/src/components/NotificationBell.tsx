"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import axios from "axios";

interface Notif {
  id_notif: number;
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  fecha_creacion: string;
  url?: string;
}

export default function NotificationBell() {
  const [count, setCount] = useState(0);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchCount = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await axios.get("/api/notificaciones/count", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCount(res.data.count);
    } catch {}
  };

  const fetchNotifs = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await axios.get("/api/notificaciones", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifs(res.data);
    } catch {}
  };

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 20000);
    return () => clearInterval(interval);
  }, []);

  // Calcular posición del dropdown antes de abrirlo
  const handleToggle = () => {
    if (!open) {
      fetchNotifs();
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setDropdownStyle({
          position: "fixed",
          top: rect.bottom + 8,
          right: window.innerWidth - rect.right,
          width: 288,
          maxHeight: "70vh",
          zIndex: 99999,
        });
      }
    }
    setOpen(!open);
  };

  const handleClick = async (notif: Notif) => {
  if (!notif.leida) {
    try {
      const token = localStorage.getItem("token");
      await axios.put(`/api/notificaciones/${notif.id_notif}/leida`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCount((prev) => Math.max(0, prev - 1));
    } catch {}
  }
  const targetUrl = notif.url || '/dashboard/circulares';
  router.push(targetUrl);
  setTimeout(() => {
    window.location.href = targetUrl;
  }, 300);
  setOpen(false);
};

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!mounted) return null;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="relative w-11 h-11 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
        title="Notificaciones"
      >
        <span className="material-symbols-rounded">notifications</span>
        {count > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {count}
          </span>
        )}
      </button>

      {open && mounted && createPortal(
        <div
          className="bg-white rounded-2xl shadow-2xl border border-border overflow-hidden animate-fade-in"
          style={dropdownStyle}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-3 border-b border-border">
            <p className="text-sm font-bold text-text">Notificaciones</p>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {notifs.length === 0 ? (
              <p className="text-center text-text-muted text-sm py-6">No hay notificaciones</p>
            ) : (
              notifs.map((n) => (
                <button
                  key={n.id_notif}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left px-4 py-3 border-b border-border hover:bg-surface-alt transition-colors ${
                    !n.leida ? "bg-accent-soft/50" : ""
                  }`}
                >
                  <p className="text-xs font-bold text-text">{n.titulo}</p>
                  <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{n.mensaje}</p>
                  <p className="text-[10px] text-text-muted mt-1">
                    {new Date(n.fecha_creacion).toLocaleTimeString("es-PE", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}