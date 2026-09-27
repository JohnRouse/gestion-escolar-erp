"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronRight, Clock3, FileText, GraduationCap, LockKeyhole, Settings2, UserRound, UsersRound, WalletCards, X } from "lucide-react";
import { useRouter } from "next/navigation";
import axios from "axios";
import TabDatos from "./TabDatos";
import TabSeguridad from "./TabSeguridad";
import TabPreferencias from "./TabPreferencias";
import TabHijos from "./TabHijos";
import { PortalState } from "./PortalUI";

type TabKey = "datos" | "seguridad" | "preferencias" | "hijos" | "servicios";

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAvatarChange?: (url: string | null) => void;
  initialTab?: TabKey;
}

const tabs = [
  { key: "datos", label: "Datos", icon: UserRound },
  { key: "seguridad", label: "Seguridad", icon: LockKeyhole },
  { key: "preferencias", label: "Preferencias", icon: Settings2 },
  { key: "hijos", label: "Hijos", icon: GraduationCap },
  { key: "servicios", label: "Servicios", icon: WalletCards },
] as const;

const services = [
  { label: "Directorio Académico", detail: "Personas disponibles para citas", path: "/dashboard/staff", icon: UsersRound },
  { label: "Mis Citas", detail: "Solicitudes y reuniones programadas", path: "/dashboard/citas", icon: CalendarDays },
  { label: "Calendario Escolar", detail: "Eventos y actividades institucionales", path: "/dashboard/calendario", icon: CalendarDays },
  { label: "Libreta Virtual", detail: "Resumen académico bimestral", path: "/dashboard/libreta", icon: FileText },
  { label: "Horario", detail: "Clases de la semana", path: "/dashboard/horario", icon: Clock3 },
  { label: "Comunicados", detail: "Información formal de la institución", path: "/dashboard/comunicados", icon: FileText },
];

export default function ProfileDrawer({ isOpen, onClose, onAvatarChange, initialTab = "datos" }: ProfileDrawerProps) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [tema, setTema] = useState("claro");
  const [notificaciones, setNotificaciones] = useState(true);
  const [preferencesStatus, setPreferencesStatus] = useState<"loading" | "ready" | "error">("loading");
  const drawerRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);

  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => drawerRef.current?.querySelector<HTMLButtonElement>("button")?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !drawerRef.current) return;
      const focusable = Array.from(drawerRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'));
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      returnFocusRef.current?.focus();
    };
  }, [isOpen]);

  async function cargarPreferencias() {
    setPreferencesStatus("loading");
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/auth/portal/perfil", { headers: { Authorization: `Bearer ${token}` } });
      setTema(res.data.tema || "claro");
      setNotificaciones(res.data.notificaciones_activas);
      setPreferencesStatus("ready");
    } catch {
      setPreferencesStatus("error");
    }
  }

  useEffect(() => { queueMicrotask(() => void cargarPreferencias()); }, []);

  const handleTemaChange = (nuevoTema: string) => {
    setTema(nuevoTema);
    localStorage.setItem("tema", nuevoTema);
    document.documentElement.classList.toggle("dark", nuevoTema === "oscuro");
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center md:justify-end">
      <button type="button" aria-label="Cerrar perfil" className="portal-sheet-backdrop h-full w-full" onClick={onClose} />
      <div ref={drawerRef} role="dialog" aria-modal="true" aria-labelledby="profile-title" className="profile-drawer portal-sheet animate-slide-up relative flex h-[86dvh] max-h-[86dvh] w-full max-w-[720px] flex-col overflow-hidden md:h-full md:max-h-none md:w-[520px] md:rounded-none md:border-y-0 md:border-r-0 md:animate-slide-left">
        <div className="portal-sheet-handle mx-auto mt-3 shrink-0 md:hidden" />
        <header className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 id="profile-title" className="text-xl font-semibold text-text">Mi perfil</h2>
            <p className="text-xs text-text-muted">Cuenta, familia y servicios</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar perfil" className="portal-icon-button"><X size={18} /></button>
        </header>

        <div className="no-scrollbar flex shrink-0 gap-1 overflow-x-auto border-b border-border px-3" role="tablist" aria-label="Secciones del perfil">
          {tabs.map((item) => {
            const Icon = item.icon;
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                role="tab"
                aria-selected={active}
                className={`portal-profile-tab flex min-h-[58px] min-w-[86px] flex-col items-center justify-center gap-1 rounded-t-lg border-b-2 px-2 text-xs font-semibold transition-colors ${active ? "border-accent bg-accent text-white" : "border-transparent text-text-secondary hover:text-text"}`}
              >
                <Icon size={17} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-5 pb-[max(20px,env(safe-area-inset-bottom))]">
          {tab === "datos" ? <TabDatos onAvatarChange={onAvatarChange} /> : null}
          {tab === "seguridad" ? <TabSeguridad /> : null}
          {tab === "preferencias" ? (
            preferencesStatus === "loading" ? <div className="space-y-3"><div className="skel h-16 w-full" /><div className="skel h-24 w-full" /></div>
              : preferencesStatus === "error" ? <PortalState kind="error" title="No pudimos cargar las preferencias" actionLabel="Reintentar" onAction={() => void cargarPreferencias()} />
              : <TabPreferencias temaActual={tema} notificacionesActual={notificaciones} onTemaChange={handleTemaChange} />
          ) : null}
          {tab === "hijos" ? <TabHijos /> : null}
          {tab === "servicios" ? (
            <div className="divide-y divide-border">
              {services.map((service) => {
                const Icon = service.icon;
                return (
                  <button key={service.path} onClick={() => { router.push(service.path); onClose(); }} className="portal-list-item w-full text-left">
                    <span className="portal-icon-box"><Icon size={18} aria-hidden="true" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-text">{service.label}</span>
                      <span className="block text-xs text-text-muted">{service.detail}</span>
                    </span>
                    <ChevronRight size={17} className="text-text-muted" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
