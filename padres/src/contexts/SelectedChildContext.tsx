"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Child {
  id_estudiante: number;
  nombre: string;
  grado: string;
  color?: string;
  avatar_url?: string;
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
}

const SelectedChildContext = createContext<SelectedChildContextType | undefined>(undefined);

export function SelectedChildProvider({ children }: { children: ReactNode }) {
  const [selectedChild, setSelectedChildState] = useState<Child | null>(null);
  const [hijos, setHijos] = useState<Child[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('selectedChild');
    if (saved) {
      try {
        setSelectedChildState(JSON.parse(saved));
      } catch {}
    }
  }, []);

  const setSelectedChild = (child: Child) => {
    setSelectedChildState(child);
    localStorage.setItem('selectedChild', JSON.stringify(child));
  };

  useEffect(() => {
    if (hijos.length === 0) return;
    if (!selectedChild) {
      setSelectedChild(hijos[0]);
    } else {
      const existe = hijos.find(h => h.id_estudiante === selectedChild.id_estudiante);
      if (!existe) {
        setSelectedChild(hijos[0]);
      }
    }
  }, [hijos]);

  return (
    <SelectedChildContext.Provider value={{ selectedChild, setSelectedChild, hijos, setHijos }}>
      {children}
    </SelectedChildContext.Provider>
  );
}

export function useSelectedChild() {
  const context = useContext(SelectedChildContext);
  if (!context) throw new Error('useSelectedChild debe usarse dentro de SelectedChildProvider');
  return context;
}
