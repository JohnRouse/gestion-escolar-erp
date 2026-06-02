import { useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight, X } from 'lucide-react';

interface NavChild {
  label: string;
  path: string;
  roles: string[];
}

interface NavItem {
  label: string;
  icon: string;
  path?: string;
  roles: string[];
  children?: NavChild[];
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    icon: '📊',
    path: '/dashboard',
    roles: ['Admin', 'Secretaria', 'Director', 'Profesor'],
  },
  {
    label: 'Matrícula',
    icon: '👤',
    roles: ['Admin', 'Secretaria'],
    children: [
      {
        label: 'Registrar matrícula',
        path: '/matricula',
        roles: ['Admin', 'Secretaria'],
      },
      {
        label: 'Historial de matrículas',
        path: '/matricula/historial',
        roles: ['Admin', 'Secretaria', 'Director'],
      },
    ],
  },
  {
    label: 'Tesorería',
    icon: '💰',
    path: '/tesoreria',
    roles: ['Admin', 'Secretaria'],
  },
  {
    label: 'Circulares',
    icon: '✉',
    path: '/circulares',
    roles: ['Admin', 'Secretaria', 'Director'],
  },
  {
    label: 'Docentes',
    icon: '👩‍🏫',
    path: '/docentes',
    roles: ['Admin', 'Director'],
  },
  {
    label: 'Asistencia',
    icon: '✓',
    path: '/asistencia',
    roles: ['Profesor', 'Admin'],
  },
  {
    label: 'Notas',
    icon: '✎',
    path: '/notas',
    roles: ['Profesor', 'Admin'],
  },
  {
    label: 'Configuración',
    icon: '⚙',
    path: '/configuracion',
    roles: ['Admin'],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const userRol = user?.rol || '';

  const filteredItems = useMemo(() => {
    return navItems
      .map((item) => {
        const children = item.children?.filter((child) =>
          child.roles.includes(userRol),
        );

        return {
          ...item,
          children,
        };
      })
      .filter((item) => {
        const canViewParent = item.roles.includes(userRol);
        const hasVisibleChildren = Boolean(item.children?.length);

        return canViewParent || hasVisibleChildren;
      });
  }, [userRol]);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Matrícula: true,
  });

  const toggleGroup = (label: string) => {
    setOpenGroups((current) => ({
      ...current,
      [label]: !current[label],
    }));
  };

  const isItemActive = (item: NavItem) => {
    if (item.path) {
      return location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
    }

    return item.children?.some((child) => location.pathname === child.path) || false;
  };

  const isChildActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 xl:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 h-full w-72 transform border-r border-gray-200 bg-white transition-transform duration-300 ease-in-out xl:static xl:z-auto xl:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-500 text-sm font-bold text-gray-900">
              SMV
            </div>

            <div className="min-w-0">
              <span className="block truncate font-semibold text-gray-800">
                Santa María Victoria
              </span>
              <span className="block text-xs font-medium text-gray-400">
                Gestión escolar
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-gray-100 xl:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-2">
          <p className="px-3 py-2 text-xs font-semibold uppercase text-gray-400">
            Principal
          </p>

          <nav className="space-y-1">
            {filteredItems.map((item) => {
              const hasChildren = Boolean(item.children?.length);
              const isOpenGroup = openGroups[item.label];
              const active = isItemActive(item);

              if (hasChildren) {
                return (
                  <div key={item.label}>
                    <button
                      type="button"
                      onClick={() => toggleGroup(item.label)}
                      className={`sidebar-item w-full justify-between ${
                        active ? 'sidebar-item-active' : 'sidebar-item-inactive'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span className="text-lg">{item.icon}</span>
                        {item.label}
                      </span>

                      {isOpenGroup ? (
                        <ChevronDown size={16} />
                      ) : (
                        <ChevronRight size={16} />
                      )}
                    </button>

                    {isOpenGroup && (
                      <div className="mt-1 space-y-1 pl-8">
                        {item.children?.map((child) => {
                          const childActive = isChildActive(child.path);

                          return (
                            <button
                              key={child.path}
                              type="button"
                              onClick={() => {
                                navigate(child.path);
                                onClose();
                              }}
                              className={`w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                                childActive
                                  ? 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-100'
                                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                              }`}
                            >
                              {child.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => {
                    if (item.path) navigate(item.path);
                    onClose();
                  }}
                  className={`sidebar-item ${
                    active ? 'sidebar-item-active' : 'sidebar-item-inactive'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}