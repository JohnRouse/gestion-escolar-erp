"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CalendarCheck2, Check, CreditCard, FileText, Home } from "lucide-react";
import { useSelectedChild } from "@/contexts/SelectedChildContext";
import PortalAvatar from "@/components/PortalAvatar";

const navItems = [
  { label: "Inicio", icon: Home, path: "/dashboard" },
  { label: "Notas", icon: FileText, path: "/dashboard/calificaciones" },
  null,
  { label: "Asistencia", icon: CalendarCheck2, path: "/dashboard/asistencia" },
  { label: "Pagos", icon: CreditCard, path: "/dashboard/pagos" },
];

function isActive(pathname: string, target: string) {
  return target === "/dashboard" ? pathname === target : pathname === target || pathname.startsWith(`${target}/`);
}

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { selectedChild, hijos, setSelectedChild } = useSelectedChild();
  const [showChildSheet, setShowChildSheet] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const nombreEstudiante = selectedChild?.nombre?.split(" ")[0] || "";

  useEffect(() => {
    if (!showChildSheet) return;
    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const controls = () => Array.from(dialogRef.current?.querySelectorAll<HTMLButtonElement>("button:not([disabled])") ?? []);
    window.setTimeout(() => controls()[0]?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setShowChildSheet(false);
        return;
      }
      if (event.key !== "Tab") return;
      const buttons = controls();
      const first = buttons[0];
      const last = buttons.at(-1);
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
      trigger?.focus();
    };
  }, [showChildSheet]);

  return (
    <>
      <nav aria-label="Navegación principal" className="portal-nav fixed inset-x-0 bottom-0 z-30 border-t border-border" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="mx-auto grid max-w-[720px] grid-cols-5 items-center px-2 py-1.5">
          {navItems.map((item) => {
            if (item === null) {
              const canSwitch = hijos.length > 1;
              return (
                <div key="child-switcher" className="flex flex-col items-center justify-center">
                  <button
                    ref={triggerRef}
                    type="button"
                    onClick={() => canSwitch && setShowChildSheet(true)}
                    className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-accent bg-white"
                    aria-label={canSwitch ? `Cambiar estudiante. Actual: ${selectedChild?.nombre ?? "ninguno"}` : `Estudiante: ${selectedChild?.nombre ?? "sin seleccionar"}`}
                    aria-haspopup={canSwitch ? "dialog" : undefined}
                    aria-expanded={canSwitch ? showChildSheet : undefined}
                  >
                    <PortalAvatar name={selectedChild?.nombre} src={selectedChild?.avatar_url} className="h-full w-full rounded-full" />
                  </button>
                  <span className="mt-0.5 max-w-16 truncate text-xs font-medium text-text-muted">{nombreEstudiante || "Estudiante"}</span>
                </div>
              );
            }

            const active = isActive(pathname, item.path);
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => router.push(item.path)}
                className={`press flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-lg text-xs font-semibold ${active ? "bg-accent-soft text-accent-dark" : "text-text-secondary hover:bg-surface-alt hover:text-text"}`}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={21} strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {showChildSheet && hijos.length > 1 ? (
        <div className="fixed inset-0 z-50">
          <button type="button" className="portal-sheet-backdrop h-full w-full" onClick={() => setShowChildSheet(false)} aria-label="Cerrar selector de estudiante" />
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="child-picker-title" className="portal-sheet animate-slide-up absolute inset-x-0 bottom-0 mx-auto max-h-[75dvh] max-w-[720px] overflow-y-auto p-5 pb-[max(20px,env(safe-area-inset-bottom))]">
            <div className="portal-sheet-handle mx-auto mb-4" />
            <div className="mb-3">
              <h2 id="child-picker-title" className="text-lg font-semibold text-text">Cambiar estudiante</h2>
              <p className="text-sm text-text-muted">La información del portal se actualizará con tu selección.</p>
            </div>
            <div className="divide-y divide-border">
              {hijos.map((child) => {
                const active = child.id_estudiante === selectedChild?.id_estudiante;
                return (
                  <button
                    key={child.id_estudiante}
                    type="button"
                    onClick={() => { setSelectedChild(child); setShowChildSheet(false); }}
                    className={`portal-child-option flex min-h-[68px] w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors ${active ? "text-accent-dark" : "text-text hover:bg-surface-alt"}`}
                    aria-pressed={active}
                  >
                    <PortalAvatar name={child.nombre} src={child.avatar_url} className="h-11 w-11 rounded-full" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{child.nombre}</span>
                      <span className="block text-xs text-text-muted">{child.grado}{child.anio ? ` · ${child.anio}` : ""}</span>
                    </span>
                    {active ? <span className="portal-icon-box h-8 w-8"><Check size={17} aria-hidden="true" /></span> : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
