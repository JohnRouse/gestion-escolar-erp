import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSidebar } from '../contexts/SidebarContext';
import { ChevronDown, ChevronRight, PanelLeftClose, PanelLeft } from 'lucide-react';
import { useState } from 'react';

import {
  LayoutDashboard, UserPlus, Wallet, Mail, Users, FileText, CheckSquare,
  Settings, UserCircle, CalendarDays, Camera, MessageSquareHeart,
  HeartPulse, ChartColumn, Bell, GraduationCap, BookOpen,
} from 'lucide-react';

interface NavItem {
  title: string;
  icon: React.ElementType;
  path?: string;
  roles?: string[];
  children?: { title: string; path: string }[];
}

const menuPrincipal: NavItem[] = [
  { title: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ['Admin', 'Secretaria', 'Director', 'Profesor'] },
  { title: 'Búsqueda Global', icon: BookOpen, path: '/busqueda', roles: ['Admin', 'Secretaria', 'Director'] },
];

const menuAcademico: NavItem[] = [
  { title: 'Matrícula', icon: UserPlus, path: '/matricula', roles: ['Admin', 'Secretaria'] },
  {
    title: 'Notas', icon: FileText, path: '/notas', roles: ['Profesor', 'Admin'],
    children: [
      { title: 'Registro', path: '/notas' },
      { title: 'Comentarios', path: '/notas/comentarios' },
      { title: 'Libreta Virtual', path: '/notas/libreta' },
    ],
  },
  { title: 'Asistencia', icon: CheckSquare, path: '/asistencia', roles: ['Profesor', 'Admin'] },
  { title: 'Calendario', icon: CalendarDays, path: '/calendario', roles: ['Admin', 'Secretaria'] },
  { title: 'Horario', icon: GraduationCap, path: '/horario', roles: ['Profesor'] },
];

const menuPersonal: NavItem[] = [
  { title: 'Docentes', icon: Users, path: '/docentes', roles: ['Admin', 'Director'] },
  { title: 'Staff', icon: UserCircle, path: '/staff', roles: ['Admin', 'Director'] },
  { title: 'Citas', icon: MessageSquareHeart, path: '/citas', roles: ['Admin', 'Secretaria'] },
];

const menuBienestar: NavItem[] = [
  { title: 'Enfermería', icon: HeartPulse, path: '/enfermeria', roles: ['Admin'] },
  { title: 'Psicología', icon: HeartPulse, path: '/psicologia', roles: ['Admin', 'Director'] },
];

const menuComunicacion: NavItem[] = [
  { title: 'Circulares', icon: Mail, path: '/circulares', roles: ['Admin', 'Secretaria', 'Director'] },
  { title: 'Notificaciones', icon: Bell, path: '/notificaciones', roles: ['Admin'] },
  { title: 'Pizarra de Anuncios', icon: BookOpen, path: '/anuncios', roles: ['Admin', 'Director'] },
];

const menuFinanzas: NavItem[] = [
  { title: 'Tesorería', icon: Wallet, path: '/tesoreria', roles: ['Admin', 'Secretaria'] },
];

const menuReportes: NavItem[] = [
  { title: 'Reportes', icon: ChartColumn, path: '/reportes', roles: ['Admin', 'Director'] },
];

export default function AppSidebar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isOpen, close, isCollapsed, toggleCollapse } = useSidebar();
  const [expanded, setExpanded] = useState<string | null>(null);

  const filterByRole = (items: NavItem[]) =>
    items.filter(item => !item.roles || item.roles.includes(user?.rol || ''));

  const categorias = [
    { titulo: 'Principal', items: filterByRole(menuPrincipal) },
    { titulo: 'Académico', items: filterByRole(menuAcademico) },
    { titulo: 'Personal', items: filterByRole(menuPersonal) },
    { titulo: 'Bienestar', items: filterByRole(menuBienestar) },
    { titulo: 'Comunicación', items: filterByRole(menuComunicacion) },
    { titulo: 'Finanzas', items: filterByRole(menuFinanzas) },
    { titulo: 'Reportes', items: filterByRole(menuReportes) },
  ].filter(cat => cat.items.length > 0);

  const renderItem = (item: NavItem) => {
    const isActive = item.path ? location.pathname.startsWith(item.path) : false;
    const hasChildren = item.children && item.children.length > 0;
    const Icon = item.icon;

    if (hasChildren) {
      return (
        <div key={item.title}>
          <button
            onClick={() => setExpanded(expanded === item.title ? null : item.title!)}
            className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              isActive ? 'bg-[#F3F5FF] text-[#3652AD]' : 'text-[#6a728b] hover:bg-[#f9fafb] hover:text-[#1B2559]'
            }`}
          >
            <span className="flex items-center gap-3">
              <Icon size={18} className={isActive ? 'text-[#3652AD]' : 'text-[#6a728b]'} />
              {!isCollapsed && item.title}
            </span>
            {!isCollapsed && (expanded === item.title ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
          </button>
          {expanded === item.title && !isCollapsed && (
            <div className="ml-9 mt-1 space-y-1">
              {item.children!.map(child => (
                <button
                  key={child.title}
                  onClick={() => { navigate(child.path); close(); }}
                  className={`w-full text-left px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    location.pathname === child.path ? 'text-[#3652AD] bg-[#F3F5FF]' : 'text-[#6a728b] hover:bg-[#f9fafb] hover:text-[#1B2559]'
                  }`}
                >
                  {child.title}
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <button
        key={item.title}
        onClick={() => { if (item.path) { navigate(item.path); close(); } }}
        className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
          isActive ? 'bg-[#F3F5FF] text-[#3652AD]' : 'text-[#6a728b] hover:bg-[#f9fafb] hover:text-[#1B2559]'
        }`}
      >
        <Icon size={18} className={isActive ? 'text-[#3652AD]' : 'text-[#6a728b]'} />
        {!isCollapsed && item.title}
      </button>
    );
  };

  return (
    <aside
      className={`fixed top-0 left-0 z-50 h-full bg-white border-r border-[#e2e5ef] transform transition-all duration-300 ease-in-out xl:translate-x-0 xl:static xl:z-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } ${isCollapsed ? 'w-20' : 'w-72'}`}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-[#e2e5ef]">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <div className="bg-[#3652AD] text-white p-1.5 rounded-lg">
              <LayoutDashboard size={20} />
            </div>
            <span className="text-lg font-bold text-[#1B2559]">SMV</span>
          </div>
        )}
        <button
          onClick={toggleCollapse}
          className="p-1.5 rounded-lg hover:bg-[#f9fafb] text-[#6a728b] transition-colors"
          title={isCollapsed ? 'Expandir menú' : 'Contraer menú'}
        >
          {isCollapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {/* Navegación con scroll oculto */}
      <nav className="px-3 py-4 space-y-6 overflow-y-auto h-[calc(100vh-65px)] scrollbar-hide">
        {categorias.map(categoria => (
          <div key={categoria.titulo}>
            {!isCollapsed && (
              <p className="px-3 text-xs font-medium text-[#6a728b] uppercase mb-2">
                {categoria.titulo}
              </p>
            )}
            <div className="space-y-1">
              {categoria.items.map(renderItem)}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}