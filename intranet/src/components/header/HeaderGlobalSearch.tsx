import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowRight,
  GraduationCap,
  LayoutDashboard,
  Loader2,
  PanelsTopLeft,
  Search,
  SearchX,
  Settings,
  UserRound,
  WalletCards,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSchool } from '../../contexts/SchoolContext';
import {
  searchGlobalCatalog,
  type GlobalSearchEntry,
} from '../../config/globalSearchCatalog';

type StudentSearchResult = {
  id_persona: number;
  codigo_estudiante?: string | null;
  avatar_url?: string | null;
  codigos_colegio?: Array<{
    codigo?: string | null;
  }>;
  persona: {
    dni?: string | null;
    nombres?: string | null;
    apellido_paterno?: string | null;
    apellido_materno?: string | null;
  };
  matriculas?: Array<{
    estado_matricula?: string | null;
    colegio?: {
      nombre?: string | null;
    } | null;
    anio?: {
      nombre_anio?: string | null;
    } | null;
    seccion?: {
      letra?: string | null;
      grado?: {
        nombre_grado?: string | null;
        nivel?: {
          nombre_nivel?: string | null;
        } | null;
      } | null;
    } | null;
  }>;
};

type SearchOption =
  | {
      key: string;
      kind: 'student';
      student: StudentSearchResult;
    }
  | {
      key: string;
      kind: 'menu';
      entry: GlobalSearchEntry;
    };

type Props = {
  onOpen?: () => void;
};

function getFullName(
  student: StudentSearchResult,
) {
  return [
    student.persona?.nombres,
    student.persona?.apellido_paterno,
    student.persona?.apellido_materno,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();
}

function getInitials(
  student: StudentSearchResult,
) {
  const parts = getFullName(student)
    .split(/\s+/)
    .filter(Boolean);

  return (
    `${parts[0]?.[0] || 'A'}${
      parts[1]?.[0] || ''
    }`
  ).toUpperCase();
}

function getStudentCode(
  student: StudentSearchResult,
) {
  return (
    student.codigos_colegio?.find(
      (item) => item.codigo,
    )?.codigo ||
    student.codigo_estudiante ||
    'Sin código'
  );
}

function getStudentContext(
  student: StudentSearchResult,
) {
  const enrollment =
    student.matriculas?.[0];

  if (!enrollment) {
    return 'Sin matrícula registrada';
  }

  const grade =
    enrollment.seccion?.grado
      ?.nombre_grado;

  const section =
    enrollment.seccion?.letra;

  const gradeSection = grade
    ? `${grade}${
        section ? ` “${section}”` : ''
      }`
    : null;

  return [
    enrollment.colegio?.nombre,
    enrollment.anio?.nombre_anio,
    enrollment.seccion?.grado
      ?.nivel?.nombre_nivel,
    gradeSection,
  ]
    .filter(Boolean)
    .join(' · ');
}

function getCategoryIcon(
  category: string,
) {
  if (category === 'Configuración') {
    return Settings;
  }

  if (category === 'Finanzas') {
    return WalletCards;
  }

  if (category === 'Académico') {
    return GraduationCap;
  }

  if (category === 'Principal') {
    return LayoutDashboard;
  }

  return PanelsTopLeft;
}

export default function HeaderGlobalSearch({
  onOpen,
}: Props) {
  const { token, user } = useAuth();
  const {
    queryString,
    scopeLabel,
  } = useSchool();

  const navigate = useNavigate();

  const rootRef =
    useRef<HTMLDivElement | null>(null);

  const inputRef =
    useRef<HTMLInputElement | null>(null);

  const [query, setQuery] =
    useState('');

  const [open, setOpen] =
    useState(false);

  const [
    mobileExpanded,
    setMobileExpanded,
  ] = useState(false);

  const [
    studentResults,
    setStudentResults,
  ] = useState<StudentSearchResult[]>([]);

  const [
    studentLoading,
    setStudentLoading,
  ] = useState(false);

  const [
    activeIndex,
    setActiveIndex,
  ] = useState(-1);

  const role = user?.rol || '';

  const canSearchStudents = [
    'Admin',
    'Secretaria',
    'Director',
  ].includes(role);

  const normalizedQuery =
    query.trim();

  const menuResults = useMemo(
    () =>
      searchGlobalCatalog(
        normalizedQuery,
        role,
        9,
      ),
    [normalizedQuery, role],
  );

  const searchOptions =
    useMemo<SearchOption[]>(
      () => [
        ...studentResults.map(
          (student) => ({
            key:
              `student-${student.id_persona}`,
            kind: 'student' as const,
            student,
          }),
        ),
        ...menuResults.map(
          (entry) => ({
            key: `menu-${entry.id}`,
            kind: 'menu' as const,
            entry,
          }),
        ),
      ],
      [studentResults, menuResults],
    );

  const closeSearch = () => {
    setOpen(false);
    setMobileExpanded(false);
    setActiveIndex(-1);
  };

  const activateSearch = () => {
    onOpen?.();
    setOpen(true);
  };

  const focusSearch = () => {
    setMobileExpanded(true);
    activateSearch();

    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const openStudent = (
    student: StudentSearchResult,
  ) => {
    closeSearch();

    navigate(
      `/comunidad/alumnos?alumno=${
        student.id_persona
      }`,
    );
  };

  const openMenu = (
    entry: GlobalSearchEntry,
  ) => {
    closeSearch();
    navigate(entry.path);
  };

  const openOption = (
    option?: SearchOption,
  ) => {
    if (!option) return;

    if (option.kind === 'student') {
      openStudent(option.student);
      return;
    }

    openMenu(option.entry);
  };

  const openAllStudents = () => {
    if (!normalizedQuery) return;

    closeSearch();

    navigate(
      `/comunidad/alumnos?q=${
        encodeURIComponent(
          normalizedQuery,
        )
      }`,
    );
  };

  useEffect(() => {
    setActiveIndex(-1);
  }, [
    normalizedQuery,
    studentResults,
    menuResults,
  ]);

  useEffect(() => {
    if (
      !token ||
      !canSearchStudents ||
      normalizedQuery.length < 2
    ) {
      setStudentResults([]);
      setStudentLoading(false);
      return;
    }

    const controller =
      new AbortController();

    const timer = window.setTimeout(
      async () => {
        setStudentLoading(true);
        setStudentResults([]);

        try {
          const params =
            new URLSearchParams(
              queryString.replace(
                /^\?/,
                '',
              ),
            );

          params.set(
            'q',
            normalizedQuery,
          );

          params.set('page', '1');
          params.set('limit', '6');

          const response =
            await axios.get(
              `/api/academicos/alumnos/listado?${params.toString()}`,
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
                signal:
                  controller.signal,
              },
            );

          const records =
            Array.isArray(
              response.data?.data,
            )
              ? response.data.data
              : Array.isArray(
                    response.data,
                  )
                ? response.data
                : [];

          setStudentResults(
            records.slice(0, 6),
          );
        } catch (error: any) {
          if (
            error?.code !==
            'ERR_CANCELED'
          ) {
            setStudentResults([]);
          }
        } finally {
          if (
            !controller.signal.aborted
          ) {
            setStudentLoading(false);
          }
        }
      },
      280,
    );

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    token,
    canSearchStudents,
    normalizedQuery,
    queryString,
  ]);

  useEffect(() => {
    const handlePointerDown = (
      event: MouseEvent,
    ) => {
      if (
        rootRef.current &&
        !rootRef.current.contains(
          event.target as Node,
        )
      ) {
        closeSearch();
      }
    };

    document.addEventListener(
      'mousedown',
      handlePointerDown,
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        handlePointerDown,
      );
    };
  }, []);

  useEffect(() => {
    const handleShortcut = (
      event: globalThis.KeyboardEvent,
    ) => {
      if (
        (event.metaKey ||
          event.ctrlKey) &&
        event.key.toLowerCase() === 'k'
      ) {
        event.preventDefault();
        focusSearch();
      }

      if (event.key === 'Escape') {
        closeSearch();
      }
    };

    window.addEventListener(
      'keydown',
      handleShortcut,
    );

    return () => {
      window.removeEventListener(
        'keydown',
        handleShortcut,
      );
    };
  });

  const handleInputKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (!searchOptions.length) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();

      setActiveIndex(
        (current) =>
          current >=
          searchOptions.length - 1
            ? 0
            : current + 1,
      );
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();

      setActiveIndex(
        (current) =>
          current <= 0
            ? searchOptions.length - 1
            : current - 1,
      );
    }
  };

  const handleSubmit = () => {
    const selected =
      activeIndex >= 0
        ? searchOptions[activeIndex]
        : searchOptions[0];

    if (selected) {
      openOption(selected);
      return;
    }

    if (
      canSearchStudents &&
      normalizedQuery
    ) {
      openAllStudents();
    }
  };

  const getOptionIndex = (
    key: string,
  ) =>
    searchOptions.findIndex(
      (option) =>
        option.key === key,
    );

  const hasResults =
    studentResults.length > 0 ||
    menuResults.length > 0;

  const showEmpty =
    Boolean(normalizedQuery) &&
    !studentLoading &&
    !hasResults;

  return (
    <div
      ref={rootRef}
      className={
        `header-global-search ${
          mobileExpanded
            ? 'header-global-search--mobile-open'
            : ''
        }`
      }
    >
      <button
        type="button"
        className="header-global-search__mobile-trigger"
        onClick={() => {
          if (mobileExpanded) {
            closeSearch();
          } else {
            focusSearch();
          }
        }}
        aria-label={
          mobileExpanded
            ? 'Cerrar búsqueda'
            : 'Abrir búsqueda'
        }
      >
        {mobileExpanded ? (
          <X size={19} />
        ) : (
          <Search size={19} />
        )}
      </button>

      <form
        className="header-global-search__form"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
      >
        <Search
          size={17}
          className="header-global-search__search-icon"
          aria-hidden="true"
        />

        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder="Buscar alumno, DNI, página o herramienta..."
          autoComplete="off"
          aria-label="Búsqueda global"
          aria-expanded={open}
          aria-controls="header-global-search-results"
          onFocus={activateSearch}
          onKeyDown={
            handleInputKeyDown
          }
          onChange={(event) => {
            setQuery(
              event.target.value,
            );

            activateSearch();
          }}
        />

        {studentLoading && (
          <Loader2
            size={15}
            className="header-global-search__loader animate-spin"
            aria-label="Buscando alumnos"
          />
        )}

        {query && !studentLoading && (
          <button
            type="button"
            className="header-global-search__clear"
            aria-label="Limpiar búsqueda"
            onClick={() => {
              setQuery('');
              setStudentResults([]);
              setActiveIndex(-1);
              inputRef.current?.focus();
            }}
          >
            <X size={14} />
          </button>
        )}

      </form>

      {open && (
        <section
          id="header-global-search-results"
          className="header-global-search__panel"
          aria-label="Resultados de búsqueda"
        >
          <div className="header-global-search__panel-header">
            <div>
              <p>Búsqueda global</p>
              <strong>
                {normalizedQuery
                  ? `Resultados para “${normalizedQuery}”`
                  : '¿Qué necesitas encontrar?'}
              </strong>
            </div>

            <span>{scopeLabel}</span>
          </div>

          {!normalizedQuery && (
            <div className="header-global-search__intro">
              <Search size={24} />

              <div>
                <strong>
                  Busca en todo el sistema
                </strong>

                <p>
                  Escribe el nombre de un alumno,
                  DNI, código, página, módulo o
                  configuración.
                </p>
              </div>

              <div className="header-global-search__examples">
                <span>Secciones</span>
                <span>Pagos</span>
                <span>47516237</span>
                <span>Asistencia</span>
              </div>
            </div>
          )}

          {normalizedQuery &&
            canSearchStudents && (
              <div className="header-global-search__section">
                <div className="header-global-search__section-title">
                  <span>
                    <UserRound size={15} />
                    Alumnos
                  </span>

                  {studentResults.length >
                    0 && (
                    <button
                      type="button"
                      onClick={
                        openAllStudents
                      }
                    >
                      Ver todos
                    </button>
                  )}
                </div>

                {studentLoading && (
                  <div className="header-global-search__loading">
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                    Buscando alumnos...
                  </div>
                )}

                {!studentLoading &&
                  studentResults.map(
                    (student) => {
                      const optionKey =
                        `student-${student.id_persona}`;

                      const optionIndex =
                        getOptionIndex(
                          optionKey,
                        );

                      const enrollment =
                        student
                          .matriculas?.[0];

                      return (
                        <button
                          key={optionKey}
                          type="button"
                          role="option"
                          aria-selected={
                            activeIndex ===
                            optionIndex
                          }
                          className="header-search-result header-search-result--student"
                          data-active={
                            activeIndex ===
                            optionIndex
                          }
                          onMouseEnter={() =>
                            setActiveIndex(
                              optionIndex,
                            )
                          }
                          onClick={() =>
                            openStudent(
                              student,
                            )
                          }
                        >
                          <span className="header-search-result__avatar">
                            {getInitials(
                              student,
                            )}
                          </span>

                          <span className="header-search-result__content">
                            <strong>
                              {getFullName(
                                student,
                              ) ||
                                'Alumno sin nombre'}
                            </strong>

                            <small>
                              DNI:{' '}
                              {student.persona
                                ?.dni ||
                                'No registrado'}
                              {' · '}
                              {getStudentCode(
                                student,
                              )}
                            </small>

                            <em>
                              {getStudentContext(
                                student,
                              )}
                            </em>
                          </span>

                          <span className="header-search-result__badge">
                            {enrollment
                              ?.estado_matricula ||
                              'Alumno'}
                          </span>

                          <ArrowRight
                            size={15}
                            aria-hidden="true"
                          />
                        </button>
                      );
                    },
                  )}

                {!studentLoading &&
                  studentResults.length ===
                    0 && (
                    <p className="header-global-search__section-empty">
                      No se encontraron alumnos
                      con ese dato.
                    </p>
                  )}
              </div>
            )}

          {normalizedQuery &&
            menuResults.length > 0 && (
              <div className="header-global-search__section">
                <div className="header-global-search__section-title">
                  <span>
                    <PanelsTopLeft
                      size={15}
                    />
                    Páginas y herramientas
                  </span>

                  <small>
                    {menuResults.length}
                    {' '}
                    resultados
                  </small>
                </div>

                {menuResults.map(
                  (entry) => {
                    const optionKey =
                      `menu-${entry.id}`;

                    const optionIndex =
                      getOptionIndex(
                        optionKey,
                      );

                    const Icon =
                      getCategoryIcon(
                        entry.category,
                      );

                    return (
                      <button
                        key={optionKey}
                        type="button"
                        role="option"
                        aria-selected={
                          activeIndex ===
                          optionIndex
                        }
                        className="header-search-result header-search-result--menu"
                        data-active={
                          activeIndex ===
                          optionIndex
                        }
                        onMouseEnter={() =>
                          setActiveIndex(
                            optionIndex,
                          )
                        }
                        onClick={() =>
                          openMenu(entry)
                        }
                      >
                        <span className="header-search-result__icon">
                          <Icon
                            size={17}
                          />
                        </span>

                        <span className="header-search-result__content">
                          <strong>
                            {entry.title}
                          </strong>

                          <small>
                            {
                              entry.breadcrumb
                            }
                          </small>

                          <em>
                            {
                              entry.description
                            }
                          </em>
                        </span>

                        <span className="header-search-result__category">
                          {
                            entry.category
                          }
                        </span>

                        <ArrowRight
                          size={15}
                          aria-hidden="true"
                        />
                      </button>
                    );
                  },
                )}
              </div>
            )}

          {showEmpty && (
            <div className="header-global-search__no-results">
              <SearchX size={30} />

              <strong>
                No encontramos coincidencias
              </strong>

              <p>
                Prueba con un nombre, DNI,
                módulo o palabra más general.
              </p>
            </div>
          )}

          <footer className="header-global-search__footer">
            <span>
              <kbd>↑</kbd>
              <kbd>↓</kbd>
              navegar
            </span>

            <span>
              <kbd>Enter</kbd>
              abrir
            </span>

            <span>
              <kbd>Esc</kbd>
              cerrar
            </span>
          </footer>
        </section>
      )}
    </div>
  );
}
