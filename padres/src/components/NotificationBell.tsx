"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, ChevronRight, X } from "lucide-react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { PortalNotificationIcon, PortalState, PortalSkeletonList } from "@/components/PortalUI";
import { activatePortalNotification, PortalNotificationAction } from "@/lib/portalNotificationNavigation";

interface Notif extends PortalNotificationAction {
  id_notif: number;
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  fecha_creacion: string;
}

export default function NotificationBell() {
  const [count, setCount] = useState(0);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const fetchCount = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await axios.get("/api/notificaciones/portal/count", { headers: { Authorization: `Bearer ${token}` } });
      setCount(res.data.count);
    } catch {
      setCount(0);
    }
  };

  const fetchNotifs = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await axios.get("/api/notificaciones/portal", { headers: { Authorization: `Bearer ${token}` }, params: { limit: 10 } });
      setNotifs(res.data.data ?? []);
    } catch {
      setNotifs([]);
      setError("No se pudieron cargar las notificaciones.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initial = window.setTimeout(() => void fetchCount(), 0);
    const interval = window.setInterval(fetchCount, 20000);
    return () => { window.clearTimeout(initial); window.clearInterval(interval); };
  }, []);

  useEffect(() => {
    if (!open) return;
    const trigger = buttonRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => dialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus(), 0);
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])') ?? []);
      const first = controls[0];
      const last = controls.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", keydown);
      trigger?.focus();
    };
  }, [open]);

  const handleToggle = () => {
    if (!open) void fetchNotifs();
    setOpen((value) => !value);
  };

  const handleClick = (notif: Notif) => {
    activatePortalNotification({
      notification: notif,
      markRead: () => {
        const token = localStorage.getItem("token");
        if (!token) return Promise.resolve();
        return axios.patch(`/api/notificaciones/portal/${notif.id_notif}/leida`, { leida: true }, { headers: { Authorization: `Bearer ${token}` } });
      },
      onOptimisticRead: () => {
        setCount((prev) => Math.max(0, prev - 1));
        setNotifs((current) => current.map((item) => item.id_notif === notif.id_notif ? { ...item, leida: true } : item));
      },
      onReadError: () => console.error("No se pudo marcar la notificación como leída."),
      close: () => setOpen(false),
      navigate: (target) => router.push(target),
      origin: window.location.origin,
    });
  };

  if (!mounted) return null;

  return (
    <>
      <button ref={buttonRef} onClick={handleToggle} className="portal-icon-button relative" title="Notificaciones" aria-label={`Ver notificaciones${count > 0 ? `, ${count} sin leer` : ""}`} aria-expanded={open} aria-haspopup="dialog">
        <Bell size={18} aria-hidden="true" />
        {count > 0 ? <span className="absolute -right-0.5 -top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">{count > 99 ? "99+" : count}</span> : null}
      </button>

      {open ? createPortal(
        <div className="fixed inset-0 z-[110] flex items-end justify-center md:items-center md:p-6">
          <button type="button" className="portal-sheet-backdrop h-full w-full" onClick={() => setOpen(false)} aria-label="Cerrar notificaciones" />
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="notification-title" className="portal-sheet animate-slide-up relative flex max-h-[82dvh] w-full max-w-[520px] flex-col overflow-hidden md:rounded-[18px] md:border-b">
            <div className="portal-sheet-handle mx-auto mt-3 md:hidden" />
            <header className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 id="notification-title" className="text-lg font-semibold text-text">Notificaciones</h2>
                <p className="text-xs text-text-muted">{count > 0 ? `${count} sin leer` : "Todo al día"}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="portal-icon-button" aria-label="Cerrar notificaciones"><X size={18} /></button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
              {loading ? <PortalSkeletonList rows={3} /> : error ? (
                <PortalState kind="error" title="No pudimos cargar tus notificaciones" description={error} actionLabel="Reintentar" onAction={() => void fetchNotifs()} />
              ) : notifs.length === 0 ? (
                <PortalState title="No hay notificaciones" description="Los avisos nuevos aparecerán aquí." />
              ) : (
                <div className="divide-y divide-border">
                  {notifs.map((n) => (
                    <button key={n.id_notif} onClick={() => handleClick(n)} className={`portal-list-item w-full text-left ${!n.leida ? "bg-accent-soft/45" : ""}`}>
                      <span className="portal-icon-box"><PortalNotificationIcon origin={n.origen || n.tipo} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-text">{n.titulo}</span>
                          {!n.leida ? <span className="h-2 w-2 shrink-0 rounded-full bg-accent" aria-label="Sin leer" /> : null}
                        </span>
                        <span className="mt-0.5 line-clamp-2 text-xs text-text-muted">{n.mensaje}</span>
                        <span className="mt-1 block text-xs text-text-muted">{new Date(n.fecha_creacion).toLocaleString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                      </span>
                      <ChevronRight size={17} className="shrink-0 text-text-muted" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <footer className="border-t border-border bg-white p-3">
              <button type="button" className="portal-button portal-button-quiet w-full" onClick={() => { setOpen(false); router.push("/dashboard/actividad"); }}>Ver todas las notificaciones</button>
            </footer>
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
