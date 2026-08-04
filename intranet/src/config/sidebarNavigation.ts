import type { ElementType } from 'react';
import {
  LayoutDashboard,
  UserPlus,
  Wallet,
  Mail,
  Users,
  Presentation,
  FileText,
  CheckSquare,
  Settings,
  UserCircle,
  CalendarDays,
  MessageSquareHeart,
  HeartPulse,
  ChartColumn,
  Bell,
  GraduationCap,
  BookOpenCheck,
} from 'lucide-react';

export interface NavLeaf {
  title: string;
  path: string;
}

export interface NavChild {
  title: string;
  path?: string;
  children?: NavLeaf[];
}

export interface NavItem {
  title: string;
  icon: ElementType;
  path?: string;
  roles?: string[];
  children?: NavChild[];
}

export interface SidebarMenuGroup {
  titulo: string;
  items: NavItem[];
}

const menuPrincipal: NavItem[] = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    path: '/dashboard',
    roles: ['Admin', 'Secretaria', 'Director', 'Profesor'],
  },
];

const menuAcademico: NavItem[] = [
  {
    title: 'Matrícula',
    icon: UserPlus,
    path: '/matricula',
    roles: ['Admin', 'Secretaria', 'Director'],
    children: [
      { title: 'Registrar matrícula', path: '/matricula' },
      { title: 'Renovación individual', path: '/matricula/renovacion' },
      { title: 'Promoción masiva', path: '/matricula/promocion-masiva' },
      { title: 'Historial de matrículas', path: '/matricula/historial' },
    ],
  },
  {
    title: 'Notas',
    icon: FileText,
    path: '/notas',
    roles: ['Profesor', 'Admin', 'Director'],
    children: [{ title: 'Registro', path: '/notas' }],
  },
  {
    title: 'Asistencia',
    icon: CheckSquare,
    path: '/asistencia',
    roles: ['Profesor', 'Admin', 'Director'],
  },
  {
    title: 'Calendario',
    icon: CalendarDays,
    path: '/calendario',
    roles: ['Admin', 'Secretaria', 'Director'],
  },
  {
    title: 'Horario',
    icon: GraduationCap,
    path: '/horario',
    roles: ['Profesor'],
  },
];

const menuTutoria: NavItem[] = [
  {
    title: 'Tutoría',
    icon: BookOpenCheck,
    path: '/tutoria',
    roles: ['Profesor', 'Admin', 'Director'],
  },
];

const menuComunidad: NavItem[] = [
  {
    title: 'Comunidad escolar',
    icon: Users,
    path: '/comunidad/alumnos',
    roles: ['Admin', 'Secretaria', 'Director'],
    children: [
      { title: 'Alumnos', path: '/comunidad/alumnos' },
      { title: 'Apoderados', path: '/comunidad/apoderados' },
    ],
  },
];

const menuPersonal: NavItem[] = [
  {
    title: 'Docentes',
    icon: Presentation,
    path: '/docentes',
    roles: ['Admin', 'Director'],
  },
  {
    title: 'Staff',
    icon: UserCircle,
    path: '/staff',
    roles: ['Admin', 'Director'],
  },
  {
    title: 'Citas',
    icon: MessageSquareHeart,
    path: '/citas',
    roles: ['Admin', 'Secretaria'],
  },
];

const menuBienestar: NavItem[] = [
  {
    title: 'Enfermería',
    icon: HeartPulse,
    path: '/enfermeria',
    roles: ['Admin'],
  },
];

const menuComunicacion: NavItem[] = [
  {
    title: 'Circulares',
    icon: Mail,
    path: '/circulares',
    roles: ['Admin', 'Secretaria', 'Director'],
  },
  {
    title: 'Notificaciones',
    icon: Bell,
    path: '/notificaciones',
    roles: ['Admin'],
  },
];

const menuFinanzas: NavItem[] = [
  {
    title: 'Tesorería',
    icon: Wallet,
    path: '/tesoreria',
    roles: ['Admin', 'Secretaria', 'Director'],
    children: [
      {
        title: 'Operaciones',
        children: [
          { title: 'Centro de pagos', path: '/tesoreria/cobranzas' },
          {
            title: 'Agenda de cobranzas',
            path: '/tesoreria/agenda-cobranzas',
          },
          {
            title: 'Estado de cuenta',
            path: '/tesoreria/estado-cuenta',
          },
          {
            title: 'Validar pagos',
            path: '/tesoreria/validar-pagos',
          },
          {
            title: 'Pagos recibidos',
            path: '/tesoreria/pagos-recibidos',
          },
        ],
      },
      {
        title: 'Configuración',
        children: [
          {
            title: 'Configurar pensiones',
            path: '/tesoreria/configuracion',
          },
          {
            title: 'Pagos extraordinarios',
            path: '/tesoreria/pagos-extraordinarios',
          },
          {
            title: 'Datos para cobrar',
            path: '/tesoreria/datos-cobro',
          },
        ],
      },
    ],
  },
];

const menuReportes: NavItem[] = [
  {
    title: 'Reportes',
    icon: ChartColumn,
    path: '/reportes',
    roles: ['Admin', 'Director'],
    children: [
      { title: 'Panel general', path: '/reportes' },
      { title: 'Asistencia global', path: '/reportes/asistencia' },
    ],
  },
];

const menuConfiguracion: NavItem[] = [
  {
    title: 'Configuración',
    icon: Settings,
    path: '/configuracion',
    roles: ['Admin', 'Director'],
  },
];

export const sidebarMenuGroups: SidebarMenuGroup[] = [
  { titulo: 'Principal', items: menuPrincipal },
  { titulo: 'Académico', items: menuAcademico },
  { titulo: 'Tutoría', items: menuTutoria },
  { titulo: 'Comunidad escolar', items: menuComunidad },
  { titulo: 'Personal', items: menuPersonal },
  { titulo: 'Bienestar', items: menuBienestar },
  { titulo: 'Comunicación', items: menuComunicacion },
  { titulo: 'Finanzas', items: menuFinanzas },
  { titulo: 'Reportes', items: menuReportes },
  { titulo: 'Configuración', items: menuConfiguracion },
];
