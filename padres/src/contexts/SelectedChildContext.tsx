"use client";

import { createContext, useContext, useState, ReactNode } from 'react';

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
  const [selectedChild, setSelectedChild] = useState<Child | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('selectedChild');
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });

  const updateChild = (child: Child) => {
    setSelectedChild(child);
    localStorage.setItem('selectedChild', JSON.stringify(child));
  };

  return (
    <SelectedChildContext.Provider value={{ selectedChild, setSelectedChild: updateChild }}>
      {children}
    </SelectedChildContext.Provider>
  );
}

export function useSelectedChild() {
  const context = useContext(SelectedChildContext);
  if (!context) throw new Error('useSelectedChild must be used within SelectedChildProvider');
  return context;
}