"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, GraduationCap, LogOut } from "lucide-react";
import axios from "axios";
import { useSelectedChild } from "@/contexts/SelectedChildContext";
import NotificationBell from "@/components/NotificationBell";
import ProfileDrawer from "@/components/ProfileDrawer";
import PortalAvatar from "@/components/PortalAvatar";
import { clearPortalSession } from "@/lib/portalSession";

type TabKey = "datos" | "seguridad" | "preferencias" | "hijos" | "servicios";

function storedUser() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem("user") || "null") as { nombre: string; genero?: string } | null;
  } catch {
    return null;
  }
}

function currentGreeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
}

function DashboardHeaderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedChild, hijos, childrenLoading, childrenError, reloadChildren } = useSelectedChild();
  const servicesRequested = searchParams.get("open") === "servicios";
  const [user] = useState(storedUser);
  const [greeting] = useState(currentGreeting);
  const [profileOpen, setProfileOpen] = useState(servicesRequested);
  const [initialTab, setInitialTab] = useState<TabKey>(servicesRequested ? "servicios" : "datos");
  const [avatarApoderado, setAvatarApoderado] = useState(() => typeof window === "undefined" ? "" : localStorage.getItem("avatar_url") || "");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const controller = new AbortController();
    axios.get<{ avatar_url?: string | null }>("/api/auth/portal/perfil", {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    }).then((response) => {
      const authoritativeAvatar = response.data.avatar_url || "";
      setAvatarApoderado(authoritativeAvatar);
      localStorage.setItem("avatar_url", authoritativeAvatar);
    }).catch((error) => {
      if (!axios.isCancel(error)) setAvatarApoderado("");
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (searchParams.get("open") === "servicios") {
      queueMicrotask(() => {
        setInitialTab("servicios");
        setProfileOpen(true);
      });
    }
  }, [searchParams]);

  const updateAvatar = useCallback((newUrl: string | null) => {
    const cachedUrl = newUrl || "";
    setAvatarApoderado(cachedUrl);
    localStorage.setItem("avatar_url", cachedUrl);
  }, []);

  const handleLogout = () => {
    clearPortalSession();
    router.replace("/login");
  };

  const nombreApoderado = user?.nombre?.split(" ")[0] || "Apoderado";

  return (
    <header className="portal-home-header">
      <div className="portal-brand portal-home-brand">
      <p className="portal-brand-caption mb-3 text-xs font-semibold tracking-wide">Portal de familias</p>
      <div className="flex items-center gap-3">
        <button onClick={() => setProfileOpen(true)} className="block shrink-0 rounded-full p-0 leading-none" aria-label="Abrir perfil y servicios">
          <PortalAvatar name={nombreApoderado} src={avatarApoderado} className="h-11 w-11 rounded-full border border-border" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="portal-brand-caption text-sm">{greeting}</p>
          <p className="truncate text-xl font-bold tracking-[-0.01em] text-white">{nombreApoderado}</p>
        </div>
        <NotificationBell />
        <button onClick={handleLogout} className="portal-icon-button" title="Cerrar sesión" aria-label="Cerrar sesión">
          <LogOut size={18} aria-hidden="true" />
        </button>
      </div>
      </div>

      <div className="portal-student-context">
      {childrenLoading ? (
        <div className="portal-student-button" aria-label="Cargando estudiante">
          <div className="skel h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2"><div className="skel h-3.5 w-40" /><div className="skel h-3 w-24" /></div>
        </div>
      ) : childrenError ? (
        <div className="mt-4 rounded-xl border border-danger/25 bg-danger-soft p-3 text-sm text-text-secondary" role="alert">
          <p>{childrenError}</p>
          <button type="button" onClick={reloadChildren} className="mt-1 font-semibold text-danger">Reintentar</button>
        </div>
      ) : selectedChild ? (
        <button
          type="button"
          onClick={() => { setInitialTab("hijos"); setProfileOpen(true); }}
          className="portal-student-button"
          aria-label={hijos.length > 1 ? `Cambiar estudiante. Actual: ${selectedChild.nombre}` : `Estudiante activo: ${selectedChild.nombre}`}
        >
          <PortalAvatar name={selectedChild.nombre} src={selectedChild.avatar_url} className="h-11 w-11 rounded-lg" />
          <span className="min-w-0 flex-1">
            <span className="portal-eyebrow block">Estudiante activo</span>
            <span className="mt-0.5 block truncate text-sm font-bold text-text">{selectedChild.nombre}</span>
            <span className="block truncate text-xs text-text-muted">{selectedChild.grado}{selectedChild.anio ? ` · ${selectedChild.anio}` : ""}</span>
          </span>
          {hijos.length > 1 ? <ChevronDown size={18} className="text-text-muted" aria-hidden="true" /> : <GraduationCap size={20} className="text-accent" aria-hidden="true" />}
        </button>
      ) : (
        <div className="mt-4 rounded-xl border border-border bg-surface-alt p-4 text-sm text-text-muted">No hay estudiantes vinculados a esta cuenta.</div>
      )}
      </div>

      <ProfileDrawer key={initialTab} isOpen={profileOpen} onClose={() => { setProfileOpen(false); setInitialTab("datos"); }} onAvatarChange={updateAvatar} initialTab={initialTab} />
    </header>
  );
}

export default function DashboardHeader() {
  return (
    <Suspense fallback={<header className="border-b border-border bg-white px-5 py-5"><div className="skel h-11 w-full" /></header>}>
      <DashboardHeaderContent />
    </Suspense>
  );
}
