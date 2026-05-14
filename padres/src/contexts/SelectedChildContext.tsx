"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Child {
  id_estudiante: number;
  nombre: string;
  grado: string;
  color?: string;
  avatar_url?: string;  // 🆕
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

  // Cargar el hijo guardado al montar el componente en cliente
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

  // Sincronizar: cuando se cargan los hijos, si no hay hijo seleccionado o el
  // hijo guardado no está en la lista, seleccionar el primero.
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