"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import axios from "axios";
import { reconcileSelectedChild, updateChildAvatarState, withChildColors } from "@/lib/portalChildren";

export interface Child {
  id_estudiante: number;
  nombre: string;
  grado: string;
  color?: string;
  avatar_url?: string | null;
  id_matricula?: number | null;
  id_tenant?: number | null;
  id_colegio?: number | null;
  colegio?: string | null;
  id_anio?: number | null;
  anio?: string | null;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  bimestre_actual?: number | null;
}

export function childDateRange(child: Child) {
  const currentYear = new Date().getFullYear();
  return {
    desde: child.fecha_inicio?.slice(0, 10) || `${currentYear}-01-01`,
    hasta: child.fecha_fin?.slice(0, 10) || `${currentYear}-12-31`,
  };
}

interface SelectedChildContextType {
  selectedChild: Child | null;
  setSelectedChild: (child: Child) => void;
  hijos: Child[];
  setHijos: (hijos: Child[]) => void;
  childrenLoading: boolean;
  childrenError: string;
  reloadChildren: () => void;
  updateChildAvatar: (studentId: number, avatarUrl: string | null) => void;
}

const SelectedChildContext = createContext<SelectedChildContextType | undefined>(undefined);

export function SelectedChildProvider({ children }: { children: ReactNode }) {
  const [selectedChild, setSelectedChildState] = useState<Child | null>(null);
  const [hijos, setHijos] = useState<Child[]>([]);
  const [childrenLoading, setChildrenLoading] = useState(true);
  const [childrenError, setChildrenError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    let stored: Child | null = null;
    try {
      const value = localStorage.getItem("selectedChild");
      stored = value ? (JSON.parse(value) as Child) : null;
    } catch {
      localStorage.removeItem("selectedChild");
    }

    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        setChildrenLoading(true);
        setChildrenError("");
      }
    });
    axios
      .get<Child[]>("/api/academicos/padres/hijos", {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      })
      .then((response) => {
        const nextChildren = withChildColors(response.data);
        const nextSelected = reconcileSelectedChild(nextChildren, stored);
        setHijos(nextChildren);
        setSelectedChildState(nextSelected);
        if (nextSelected) {
          localStorage.setItem("selectedChild", JSON.stringify(nextSelected));
        } else {
          localStorage.removeItem("selectedChild");
        }
      })
      .catch((error) => {
        if (axios.isCancel(error)) return;
        setHijos([]);
        setSelectedChildState(null);
        localStorage.removeItem("selectedChild");
        setChildrenError("No se pudieron cargar los estudiantes vinculados.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setChildrenLoading(false);
      });

    return () => controller.abort();
  }, [reloadKey]);

  const setSelectedChild = (child: Child) => {
    setSelectedChildState(child);
    localStorage.setItem("selectedChild", JSON.stringify(child));
  };

  const reloadChildren = useCallback(() => setReloadKey((key) => key + 1), []);

  const updateChildAvatar = useCallback((studentId: number, avatarUrl: string | null) => {
    setHijos((current) =>
      updateChildAvatarState(current, null, studentId, avatarUrl).children,
    );
    setSelectedChildState((current) => {
      const next = updateChildAvatarState([], current, studentId, avatarUrl).selectedChild;
      if (next) localStorage.setItem("selectedChild", JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <SelectedChildContext.Provider value={{ selectedChild, setSelectedChild, hijos, setHijos, childrenLoading, childrenError, reloadChildren, updateChildAvatar }}>
      {children}
    </SelectedChildContext.Provider>
  );
}

export function useSelectedChild() {
  const context = useContext(SelectedChildContext);
  if (!context) throw new Error('useSelectedChild debe usarse dentro de SelectedChildProvider');
  return context;
}
