import { createContext, useContext, useState, type ReactNode } from 'react';

interface SidebarContextType {
  isOpen: boolean;
  isCollapsed: boolean;
  toggle: () => void;
  close: () => void;
  toggleCollapse: () => void;
}

const SidebarContext = createContext<SidebarContextType>({
  isOpen: false,
  isCollapsed: false,
  toggle: () => {},
  close: () => {},
  toggleCollapse: () => {},
});

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggle = () => setIsOpen(prev => !prev);
  const close = () => setIsOpen(false);
  const toggleCollapse = () => setIsCollapsed(prev => !prev);

  return (
    <SidebarContext.Provider value={{ isOpen, isCollapsed, toggle, close, toggleCollapse }}>
      {children}
    </SidebarContext.Provider>
  );
}

export const useSidebar = () => useContext(SidebarContext);