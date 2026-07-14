import {
  useEffect,
  useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Bell,
  Check,
  ChevronDown,
  HelpCircle,
  RotateCcw,
  Loader2,
  ImagePlus,
  LogOut,
  Menu,
  Settings,
  User,
  Zap,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSchool } from '../contexts/SchoolContext';
import { useSidebar } from '../contexts/SidebarContext';
import { assetUrl } from '../utils/assets';
import HeaderGlobalSearch from '../components/header/HeaderGlobalSearch';
import InstitutionMark from '../components/InstitutionMark';

function obtenerPartesNombre(nombre?: string | null): string[] {
  return (nombre || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function obtenerApellidoPaterno(nombre?: string | null): string {
  const partes = obtenerPartesNombre(nombre);

  if (partes.length >= 4) return partes[partes.length - 2];
  if (partes.length >= 2) return partes[1];

  return partes[0] || 'Usuario';
}

function obtenerInicialesUsuario(nombre?: string | null): string {
  const partes = obtenerPartesNombre(nombre);
  const primeraInicial = partes[0]?.slice(0, 1) || 'U';
  const apellidoPaterno = obtenerApellidoPaterno(nombre);
  const apellidoInicial = apellidoPaterno?.slice(0, 1) || '';

  return `${primeraInicial}${apellidoInicial}`.toUpperCase();
}

function obtenerNombreCortoUsuario(nombre?: string | null): string {
  const partes = obtenerPartesNombre(nombre);
  const primerNombre = partes[0] || 'Usuario';
  const apellidoPaterno = obtenerApellidoPaterno(nombre);

  if (!apellidoPaterno || apellidoPaterno === primerNombre) return primerNombre;

  return `${primerNombre} ${apellidoPaterno}`;
}

const iconButtonClass =
  'inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/70 bg-white text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500/15';

export default function AppHeader() {
  const { user, logout, token, refreshUser } = useAuth();
  const {
    tenant,
    colegios,
    puedeVerConsolidado,
    activeScope,
    activeColegio,
    scopeLabel,
    institutionSingularLabel,
    institutionPluralLabel,
    setColegioActivo,
    setTodosLosColegios,
  } = useSchool();

  const { toggle } = useSidebar();
  const navigate = useNavigate();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [schoolDropdownOpen, setSchoolDropdownOpen] = useState(false);

  const [
    uploadingSchoolId,
    setUploadingSchoolId,
  ] = useState<number | null>(null);

  const [
    schoolLogoError,
    setSchoolLogoError,
  ] = useState('');

  const userName = user?.nombre || 'Usuario';
  const userShortName = obtenerNombreCortoUsuario(userName);
  const userInitials = obtenerInicialesUsuario(userName);
  const userRole = user?.rol || 'Admin';

  const canManageBranding =
    ['Admin', 'Director'].includes(
      userRole,
    );

  const userEmail = (user as any)?.email || (user as any)?.correo || 'admin@smv.edu.pe';

  const avatarUrl =
    (user as any)?.avatar_url ||
    (user as any)?.foto_url ||
    (user as any)?.foto_perfil_url ||
    null;

  const avatarSrc = assetUrl(avatarUrl);

  const canShowSchoolSelector = colegios.length > 0;
  const activeTipo = activeScope?.tipo || 'todos';

  const activeSchoolTitle =
    activeTipo === 'colegio'
      ? activeColegio?.nombre || scopeLabel || 'Colegio seleccionado'
      : scopeLabel || 'Todos los colegios';

  const consolidatedScopeTitle =
    institutionPluralLabel === 'Academias'
      ? 'Todas las academias'
      : institutionPluralLabel === 'Institutos'
        ? 'Todos los institutos'
        : 'Todos los colegios';


  const handleSchoolLogoUpload =
    async (
      colegioId: number,
      file?: File,
    ) => {
      if (!file || !token) return;

      setSchoolLogoError('');

      if (file.size > 2 * 1024 * 1024) {
        setSchoolLogoError(
          'La imagen debe pesar menos de 2 MB.',
        );
        return;
      }

      const formData = new FormData();
      formData.append('logo', file);

      setUploadingSchoolId(colegioId);

      try {
        await axios.post(
          `/api/colegios/${colegioId}/logo`,
          formData,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          },
        );

        await refreshUser();
      } catch (error: any) {
        setSchoolLogoError(
          error?.response?.data?.message ||
            'No se pudo actualizar el logo.',
        );
      } finally {
        setUploadingSchoolId(null);
      }
    };

  const handleRemoveSchoolLogo =
    async (colegioId: number) => {
      if (!token) return;

      setSchoolLogoError('');
      setUploadingSchoolId(colegioId);

      try {
        await axios.delete(
          `/api/colegios/${colegioId}/logo`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          },
        );

        await refreshUser();
      } catch (error: any) {
        setSchoolLogoError(
          error?.response?.data?.message ||
            'No se pudo restaurar el icono predeterminado.',
        );
      } finally {
        setUploadingSchoolId(null);
      }
    };

  const handleLogout = () => {
    logout();
    navigate('/login');
    setDropdownOpen(false);
    setSchoolDropdownOpen(false);
  };
useEffect(() => {
    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
        setSchoolDropdownOpen(false);
      }
    };

    window.addEventListener(
      'keydown',
      handleKeyDown,
    );

    return () =>
      window.removeEventListener(
        'keydown',
        handleKeyDown,
      );
  }, []);

  return (
    <header className="erp-app-header sticky top-3 z-30 px-4 md:px-6 lg:px-8">
      <style>{`
        @keyframes headerDropdownIn {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes headerSearchIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .header-dropdown-enter {
          animation: headerDropdownIn 0.18s ease-out forwards;
          transform-origin: top;
        }

        .header-search-enter {
          animation: headerSearchIn 0.18s ease-out forwards;
        }
      `}</style>

      <div className="relative mx-auto flex h-16 max-w-[1600px] items-center justify-between rounded-[1.75rem] border border-slate-200/70 bg-white/92 px-3 shadow-[0_18px_55px_-48px_rgba(15,23,42,0.65)] ring-1 ring-white/80 backdrop-blur-xl transition-all duration-300 sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            aria-label="Abrir menú"
            className={`${iconButtonClass} xl:hidden`}
          >
            <Menu size={20} strokeWidth={2} />
          </button>

          {canShowSchoolSelector && (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setSchoolDropdownOpen((value) => !value);
                  setDropdownOpen(false);
                }}
                className="header-school-trigger group hidden h-11 max-w-sm items-center gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/80 px-3 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-sm sm:flex"
              >
                <InstitutionMark
                  kind={activeTipo === 'todos' ? 'all' : 'school'}
                  colegio={activeColegio as any}
                  compact
                />

                <span className="min-w-0">
                  <span className="block truncate text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                    {tenant?.nombre || 'Grupo educativo'}
                  </span>
                  <span className="block max-w-[15rem] truncate text-sm font-bold text-slate-900">
                    {activeSchoolTitle}
                  </span>
                </span>

                <ChevronDown
                  size={16}
                  className={`ml-auto shrink-0 text-slate-400 transition-transform duration-200 ${schoolDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              <button
                type="button"
                onClick={() => {
                  setSchoolDropdownOpen((value) => !value);
                  setDropdownOpen(false);
                }}
                aria-label="Cambiar institución"
                className={`${iconButtonClass} sm:hidden`}
              >
                <InstitutionMark
                  kind={activeTipo === 'todos' ? 'all' : 'school'}
                  colegio={activeColegio as any}
                  compact
                />
              </button>

              {schoolDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setSchoolDropdownOpen(false)} />
                  <div className="header-school-dropdown header-dropdown-enter absolute left-0 z-[1000] mt-3 w-[21rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded border border-slate-300 bg-white shadow-xl">
                    <div className="header-school-dropdown__header border-b border-slate-100 bg-slate-50/80 px-4 py-4">
                      <div className="flex items-center gap-3">
                        <InstitutionMark
                          kind="group"
                          logoUrl={tenant?.logo_url}
                          label={tenant?.nombre}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-slate-950">
                            {tenant?.nombre || 'Grupo educativo'}
                          </p>
                          <p className="truncate text-xs font-medium text-slate-600">
                            Selecciona el {institutionSingularLabel.toLowerCase()} de trabajo
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="max-h-80 overflow-y-auto p-2">
                      {puedeVerConsolidado && colegios.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setTodosLosColegios();
                            setSchoolDropdownOpen(false);
                          }}
                          className={`header-school-option ${
                            activeTipo === 'todos'
                              ? 'header-school-option--active'
                              : ''
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <InstitutionMark kind="all" />
                            <span className="min-w-0">
                              <span className="block text-sm font-bold text-slate-950">
                                {consolidatedScopeTitle}
                              </span>
                              <span className="block truncate text-xs font-medium text-slate-600">
                                Vista consolidada del grupo
                              </span>
                            </span>
                          </span>
                          {activeTipo === 'todos' && <Check size={18} className="shrink-0 text-blue-600" />}
                        </button>
                      )}

                      {puedeVerConsolidado && colegios.length > 1 && <div className="my-2 border-t border-slate-100" />}

                      {colegios.map((colegio: any) => {
                        const selected =
                          activeTipo === 'colegio' &&
                          activeScope?.id_colegio ===
                            colegio.id_colegio;

                        const niveles =
                          (colegio.niveles || [])
                            .map(
                              (nivel: any) =>
                                nivel.nombre_nivel,
                            )
                            .filter(Boolean)
                            .join(' · ');

                        const uploading =
                          uploadingSchoolId ===
                          colegio.id_colegio;

                        return (
                          <div
                            key={colegio.id_colegio}
                            className={`header-school-row ${
                              selected
                                ? 'header-school-row--active'
                                : ''
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setColegioActivo(
                                  colegio.id_colegio,
                                );

                                setSchoolDropdownOpen(
                                  false,
                                );
                              }}
                              className={`header-school-option ${
                                selected
                                  ? 'header-school-option--active'
                                  : ''
                              }`}
                            >
                              <span className="flex min-w-0 items-center gap-3">
                                <InstitutionMark
                                  kind="school"
                                  colegio={colegio}
                                />

                                <span className="min-w-0">
                                  <span className="block truncate text-sm font-bold text-slate-950">
                                    {colegio.nombre}
                                  </span>

                                  <span className="block truncate text-xs font-medium text-slate-600">
                                    {niveles ||
                                      'Sin niveles configurados'}
                                  </span>
                                </span>
                              </span>

                              {selected && (
                                <Check
                                  size={18}
                                  className="header-school-row__check"
                                />
                              )}
                            </button>

                            {canManageBranding && (
                              <div className="header-school-row__actions">
                                <label
                                  className="header-school-logo-action"
                                  title={
                                    colegio.logo_url
                                      ? 'Cambiar logo'
                                      : 'Cargar logo'
                                  }
                                >
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    hidden
                                    disabled={uploading}
                                    onChange={(event) => {
                                      const file =
                                        event.currentTarget
                                          .files?.[0];

                                      void handleSchoolLogoUpload(
                                        colegio.id_colegio,
                                        file,
                                      );

                                      event.currentTarget.value =
                                        '';
                                    }}
                                  />

                                  {uploading ? (
                                    <Loader2
                                      size={15}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <ImagePlus size={15} />
                                  )}
                                </label>

                                {colegio.logo_url &&
                                  !uploading && (
                                    <button
                                      type="button"
                                      className="header-school-logo-action"
                                      title="Usar icono predeterminado"
                                      onClick={() =>
                                        void handleRemoveSchoolLogo(
                                          colegio.id_colegio,
                                        )
                                      }
                                    >
                                      <RotateCcw
                                        size={14}
                                      />
                                    </button>
                                  )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {schoolLogoError && (
                      <div className="header-school-logo-error">
                        {schoolLogoError}
                      </div>
                    )}

                    <div className="header-school-dropdown__footer">
                      Al cambiar de institución,
                      los listados y filtros se
                      actualizarán automáticamente.
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          <HeaderGlobalSearch
            onOpen={() => {
              setDropdownOpen(false);
              setSchoolDropdownOpen(false);
            }}
          />
        </div>

        <div className="flex items-center gap-2">
          <button type="button" aria-label="Ver notificaciones" className={`${iconButtonClass} relative`}>
            <Bell size={18} strokeWidth={2} />
            <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
          </button>

          <div className="relative ml-1">
            <button
              type="button"
              onClick={() => {
                setDropdownOpen((value) => !value);
                setSchoolDropdownOpen(false);
              }}
              aria-expanded={dropdownOpen}
              className="group flex h-11 items-center gap-2.5 rounded-2xl border border-transparent bg-transparent py-1 pl-1 pr-2 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-200/70 hover:bg-slate-50"
            >
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={userName}
                  className="h-9 w-9 rounded-xl bg-white object-cover ring-1 ring-slate-200/70"
                />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-xs font-black text-slate-950 ring-1 ring-slate-200/70">
                  {userInitials}
                </span>
              )}

              <div className="hidden min-w-0 text-left leading-tight sm:block">
                <p className="max-w-28 truncate text-sm font-semibold text-slate-900">{userShortName}</p>
                <p className="max-w-28 truncate text-xs font-medium text-slate-500">{userRole}</p>
              </div>

              <ChevronDown
                size={16}
                className={`hidden text-slate-400 transition-transform duration-200 sm:block ${dropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                <div className="header-dropdown-enter absolute right-0 z-[1000] mt-3 w-80 overflow-hidden rounded border border-slate-300 bg-white shadow-xl">
                  <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-4">
                    <div className="flex items-center gap-3">
                      {avatarSrc ? (
                        <img
                          src={avatarSrc}
                          alt={userName}
                          className="h-12 w-12 rounded-xl bg-white object-cover ring-1 ring-slate-200/70"
                        />
                      ) : (
                        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-sm font-black text-slate-950 ring-1 ring-slate-200/70">
                          {userInitials}
                        </span>
                      )}

                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-950">{userName}</p>
                        <p className="truncate text-xs font-medium text-slate-600">{userEmail}</p>
                      </div>
                    </div>

                    <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 ring-1 ring-blue-100">
                      <Zap size={12} /> {userRole}
                    </span>
                  </div>

                  <div className="p-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate('/perfil');
                      }}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-50 hover:text-slate-950"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <User size={16} />
                      </span>
                      Editar perfil
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate('/configuracion');
                      }}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-50 hover:text-slate-950"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                        <Settings size={16} />
                      </span>
                      Configuración
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        alert('Soporte: contacta al administrador.');
                      }}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-50 hover:text-slate-950"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
                        <HelpCircle size={16} />
                      </span>
                      Soporte
                    </button>
                  </div>

                  <div className="border-t border-slate-100 p-2">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-semibold text-red-600 transition-all duration-200 hover:bg-red-50"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-500">
                        <LogOut size={16} />
                      </span>
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </header>
  );
}
