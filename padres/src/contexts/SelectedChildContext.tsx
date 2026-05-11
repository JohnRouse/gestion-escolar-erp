"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Child {
  id_estudiante: number;
  nombre: string;
  grado: string;
}

interface SelectedChildContextType {
  selectedChild: Child | null;
  setSelectedChild: (child: Child) => void;
}

const SelectedChildContext = createContext<SelectedChildContextType | undefined>(undefined);

export function SelectedChildProvider({ children }: { children: ReactNode }) {
  // Inicializamos siempre con null para que el primer render coincida en servidor y cliente
  const [selectedChild, setSelectedChildState] = useState<Child | null>(null);

  // Al montar en el cliente, recuperamos el valor guardado en localStorage
  useEffect(() => {
    const saved = localStorage.getItem('selectedChild');
    if (saved) {
      try {
        setSelectedChildState(JSON.parse(saved));
      } catch {
        // Si falla el JSON, ignora
      }
    }
  }, []);

  const setSelectedChild = (child: Child) => {
    setSelectedChildState(child);
    localStorage.setItem('selectedChild', JSON.stringify(child));
  };

  return (
    <SelectedChildContext.Provider value={{ selectedChild, setSelectedChild }}>
      {children}
    </SelectedChildContext.Provider>
  );
}

export function useSelectedChild() {
  const context = useContext(SelectedChildContext);
  if (!context) throw new Error('useSelectedChild debe usarse dentro de SelectedChildProvider');
  return context;
}