import axios from 'axios';
import {
  Check,
  ChevronDown,
  ImagePlus,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { useAuth, type ColegioSaas } from '../../contexts/AuthContext';
import { useSchool } from '../../contexts/SchoolContext';
import InstitutionMark from '../InstitutionMark';

type HeaderInstitutionSelectorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  iconButtonClass: string;
};

export default function HeaderInstitutionSelector({
  open,
  onOpenChange,
  iconButtonClass,
}: HeaderInstitutionSelectorProps) {
  const { user, token, refreshUser } = useAuth();
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

  const desktopTriggerRef = useRef<HTMLButtonElement | null>(null);
  const mobileTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [uploadingSchoolId, setUploadingSchoolId] = useState<number | null>(null);
  const [schoolLogoError, setSchoolLogoError] = useState('');

  const userRole = user?.rol || 'Admin';
  const canManageBranding = ['Admin', 'Director'].includes(userRole);
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

  const closeSelector = (returnFocus = false) => {
    onOpenChange(false);

    if (returnFocus) {
      window.requestAnimationFrame(() => {
        const trigger =
          desktopTriggerRef.current?.offsetParent !== null
            ? desktopTriggerRef.current
            : mobileTriggerRef.current;

        trigger?.focus();
      });
    }
  };

  const toggleSelector = () => {
    onOpenChange(!open);
  };

  const handleTriggerKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
  ) => {
    if (event.key !== 'ArrowDown') return;

    event.preventDefault();
    onOpenChange(true);
  };

  const handleSchoolLogoUpload = async (
    colegioId: number,
    file?: File,
  ) => {
    if (!file || !token) return;

    setSchoolLogoError('');

    if (file.size > 2 * 1024 * 1024) {
      setSchoolLogoError('La imagen debe pesar menos de 2 MB.');
      return;
    }

    const formData = new FormData();
    formData.append('logo', file);
    setUploadingSchoolId(colegioId);

    try {
      await axios.post(`/api/colegios/${colegioId}/logo`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      await refreshUser();
    } catch (error: any) {
      setSchoolLogoError(
        error?.response?.data?.message || 'No se pudo actualizar el logo.',
      );
    } finally {
      setUploadingSchoolId(null);
    }
  };

  const handleRemoveSchoolLogo = async (colegioId: number) => {
    if (!token) return;

    setSchoolLogoError('');
    setUploadingSchoolId(colegioId);

    try {
      await axios.delete(`/api/colegios/${colegioId}/logo`, {
        headers: { Authorization: `Bearer ${token}` },
      });

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

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeSelector(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  if (colegios.length === 0) return null;

  return (
    <div className="relative">
      <button
        ref={desktopTriggerRef}
        id="header-institution-selector-trigger"
        type="button"
        onClick={toggleSelector}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? 'header-institution-selector-list' : undefined}
        className="header-school-trigger group hidden h-11 max-w-sm items-center gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/80 px-3 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:flex"
      >
        <InstitutionMark
          kind={activeTipo === 'todos' ? 'all' : 'school'}
          colegio={activeColegio}
          compact
        />

        <span className="min-w-0">
          <span className="block truncate text-xs font-black uppercase tracking-[0.18em] text-slate-400">
            {tenant?.nombre || 'Grupo educativo'}
          </span>
          <span className="block max-w-[15rem] truncate text-sm font-bold text-slate-900">
            {activeSchoolTitle}
          </span>
        </span>

        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`ml-auto shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <button
        ref={mobileTriggerRef}
        type="button"
        onClick={toggleSelector}
        onKeyDown={handleTriggerKeyDown}
        aria-label="Cambiar institución"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? 'header-institution-selector-list' : undefined}
        className={`${iconButtonClass} sm:hidden`}
      >
        <InstitutionMark
          kind={activeTipo === 'todos' ? 'all' : 'school'}
          colegio={activeColegio}
          compact
        />
      </button>

      {open && (
        <>
          <div
            aria-hidden="true"
            className="fixed inset-0 z-40"
            onClick={() => closeSelector()}
          />

          <div
            id="header-institution-selector-list"
            role="listbox"
            aria-labelledby="header-institution-selector-trigger"
            className="header-school-dropdown header-dropdown-enter absolute left-0 z-[1000] mt-3 w-[21rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded border border-slate-300 bg-white shadow-xl"
          >
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
                  role="option"
                  aria-selected={activeTipo === 'todos'}
                  onClick={() => {
                    setTodosLosColegios();
                    closeSelector();
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
                  {activeTipo === 'todos' && (
                    <Check size={18} aria-hidden="true" className="shrink-0 text-blue-600" />
                  )}
                </button>
              )}

              {puedeVerConsolidado && colegios.length > 1 && (
                <div className="my-2 border-t border-slate-100" />
              )}

              {colegios.map((colegio: ColegioSaas) => {
                const selected =
                  activeTipo === 'colegio' &&
                  activeScope?.id_colegio === colegio.id_colegio;
                const niveles = (colegio.niveles || [])
                  .map((nivel) => nivel.nombre_nivel)
                  .filter(Boolean)
                  .join(' · ');
                const uploading = uploadingSchoolId === colegio.id_colegio;

                return (
                  <div
                    key={colegio.id_colegio}
                    className={`header-school-row ${
                      selected ? 'header-school-row--active' : ''
                    }`}
                  >
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => {
                        setColegioActivo(colegio.id_colegio);
                        closeSelector();
                      }}
                      className={`header-school-option ${
                        selected ? 'header-school-option--active' : ''
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <InstitutionMark kind="school" colegio={colegio} />

                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold text-slate-950">
                            {colegio.nombre}
                          </span>
                          <span className="block truncate text-xs font-medium text-slate-600">
                            {niveles || 'Sin niveles configurados'}
                          </span>
                        </span>
                      </span>

                      {selected && (
                        <Check
                          size={18}
                          aria-hidden="true"
                          className="header-school-row__check"
                        />
                      )}
                    </button>

                    {canManageBranding && (
                      <div className="header-school-row__actions">
                        <label
                          className="header-school-logo-action"
                          title={colegio.logo_url ? 'Cambiar logo' : 'Cargar logo'}
                        >
                          <span className="sr-only">
                            {colegio.logo_url ? 'Cambiar' : 'Cargar'} logo de {colegio.nombre}
                          </span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            hidden
                            disabled={uploading}
                            onChange={(event) => {
                              const file = event.currentTarget.files?.[0];
                              void handleSchoolLogoUpload(colegio.id_colegio, file);
                              event.currentTarget.value = '';
                            }}
                          />

                          {uploading ? (
                            <Loader2 size={15} aria-hidden="true" className="animate-spin" />
                          ) : (
                            <ImagePlus size={15} aria-hidden="true" />
                          )}
                        </label>

                        {colegio.logo_url && !uploading && (
                          <button
                            type="button"
                            className="header-school-logo-action"
                            aria-label={`Usar icono predeterminado para ${colegio.nombre}`}
                            title="Usar icono predeterminado"
                            onClick={() => void handleRemoveSchoolLogo(colegio.id_colegio)}
                          >
                            <RotateCcw size={14} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {schoolLogoError && (
              <div role="alert" className="header-school-logo-error">
                {schoolLogoError}
              </div>
            )}

            <div className="header-school-dropdown__footer">
              Al cambiar de institución, los listados y filtros se actualizarán automáticamente.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
