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
  origen?: "citas" | "pagos" | "matricula" | "academico" | "eventos" | "sistema";
  url?: string | null;
}

function safeParentTarget(url?: string | null) {
  if (!url || !url.startsWith("/") || url.startsWith("//") || url.includes("\\")) {
    return null;
  }
  try {
    const parsed = new URL(url, window.location.origin);
    if (parsed.origin !== window.location.origin) return null;
    if (
      parsed.pathname !== "/dashboard" &&
      !parsed.pathname.startsWith("/dashboard/")
    ) {
      return null;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

export default function NotificationBell() {
  const [count, setCount] = useState(0);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timer);
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
        params: { limit: 10 },
      });
      setNotifs(res.data.data ?? []);
    } catch {}
  };

  useEffect(() => {
    const initial = window.setTimeout(() => void fetchCount(), 0);
    const interval = setInterval(fetchCount, 20000);
    return () => {
      window.clearTimeout(initial);
      clearInterval(interval);
    };
  }, []);

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
        await axios.patch(`/api/notificaciones/${notif.id_notif}/leida`, { leida: true }, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCount((prev) => Math.max(0, prev - 1));
        setNotifs((current) =>
          current.map((item) =>
            item.id_notif === notif.id_notif ? { ...item, leida: true } : item,
          ),
        );
      } catch {}
    }

    let targetUrl = safeParentTarget(notif.url);
    if (!targetUrl) {
      switch (notif.origen) {
        case "citas": targetUrl = "/dashboard/citas"; break;
        case "pagos": targetUrl = "/dashboard/pagos"; break;
        case "academico": targetUrl = "/dashboard/calificaciones"; break;
        case "eventos": targetUrl = "/dashboard/calendario"; break;
        default:              targetUrl = "/dashboard/actividad";
      }
    }

    setOpen(false);
    router.push(targetUrl);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        (buttonRef.current && buttonRef.current.contains(target)) ||
        (dropdownRef.current && dropdownRef.current.contains(target))
      ) {
        return;
      }
      setOpen(false);
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
        aria-label="Ver notificaciones"
      >
        <span className="material-symbols-rounded">notifications</span>
        {count > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && mounted && createPortal(
        <div
          ref={dropdownRef}
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
