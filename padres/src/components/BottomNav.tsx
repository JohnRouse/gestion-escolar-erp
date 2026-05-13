"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSelectedChild } from "@/contexts/SelectedChildContext";

const navItems = [
  { label: "Inicio", icon: "home", path: "/dashboard" },
  { label: "Notas", icon: "description", path: "/dashboard/calificaciones" },
  null, // espacio para el Student Switcher
  { label: "Asistencia", icon: "event_available", path: "/dashboard/asistencia" },
  { label: "Pagos", icon: "credit_card", path: "/dashboard/pagos" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { selectedChild, hijos, setSelectedChild } = useSelectedChild();
  const [showChildSheet, setShowChildSheet] = useState(false);

  const nombreEstudiante = selectedChild?.nombre?.split(" ")[0] || "";
  const generoEstudiante = nombreEstudiante.endsWith("a") ? "female" : "male";
  const avatarUrl = selectedChild
    ? `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(
        selectedChild.nombre
      )}&gender=${generoEstudiante}&backgroundColor=b6e3f4,c0aede,d1d4f9&radius=50`
    : null;

  const colorBorde = selectedChild?.color || "#D97706";

  const handleChildToggle = () => {
  if (hijos.length === 1) {
    setShowChildSheet(true);
  } else if (hijos.length === 2) {
    const otro = hijos.find((h) => h.id_estudiante !== selectedChild?.id_estudiante);
    if (otro) setSelectedChild(otro);
  } else {
    setShowChildSheet(!showChildSheet);
  }
};

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-xl border-t border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="grid grid-cols-5 items-end px-2 pt-1 pb-2 max-w-[420px] mx-auto">
          {navItems.map((item, idx) => {
            // Espacio del Student Switcher
            if (item === null) {
              return (
                <div key="child-switcher" className="flex flex-col items-center">
                  <button
                    onClick={handleChildToggle}
                    className="press relative w-14 h-14 rounded-full border-2 bg-white shadow-lg flex items-center justify-center overflow-hidden -mt-3 z-10"
                    style={{ borderColor: colorBorde }}
                  >
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={selectedChild?.nombre} className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-rounded text-text-muted text-2xl">person</span>
                    )}
                  </button>
                  <span className="text-[10px] font-bold text-text-secondary mt-0.5">
  {nombreEstudiante || "Estudiante"}
</span>
                </div>
              );
            }
            // Ítems normales
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={`press py-2 flex flex-col items-center gap-0.5 ${
                  pathname === item.path ? "text-accent" : "text-text-muted"
                }`}
              >
                <span className="material-symbols-rounded text-2xl">{item.icon}</span>
                <span className="text-[10px] font-bold">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Bottom Sheet para 3+ hijos */}
      {showChildSheet && hijos.length >= 1 && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm" onClick={() => setShowChildSheet(false)} />
          <div className="absolute left-0 right-0 bottom-0 bg-surface rounded-t-[28px] p-6 animate-slide-up max-w-[420px] mx-auto">
            <div className="mx-auto w-12 h-1.5 rounded-full bg-border mb-4" />
            <p className="text-text font-bold text-base mb-4 text-center">Cambiar estudiante</p>
            <div className="space-y-2">
              {hijos.map((h) => (
                <button
                  key={h.id_estudiante}
                  onClick={() => {
                    setSelectedChild(h);
                    setShowChildSheet(false);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                    h.id_estudiante === selectedChild?.id_estudiante ? "bg-accent-soft" : "hover:bg-surface-alt"
                  }`}
                >
                  <img
                    src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(h.nombre)}&gender=${
                      h.nombre.split(" ")[0].endsWith("a") ? "female" : "male"
                    }&backgroundColor=b6e3f4,c0aede,d1d4f9&radius=50`}
                    alt={h.nombre}
                    className="w-10 h-10 rounded-full border-2"
                    style={{ borderColor: h.color || "#D97706" }}
                  />
                  <div className="flex-1 text-left">
                    <p className="text-text font-semibold text-sm">{h.nombre}</p>
                    <p className="text-text-muted text-xs">{h.grado}</p>
                  </div>
                  {h.id_estudiante === selectedChild?.id_estudiante && (
                    <span className="material-symbols-rounded text-accent">check_circle</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}