export type GlobalSearchEntry = {
  id: string;
  title: string;
  description: string;
  category: string;
  breadcrumb: string;
  path: string;
  keywords: string[];
  roles?: string[];
};

const ADMIN_ROLES = [
  'Admin',
  'Director',
];

const MANAGEMENT_ROLES = [
  'Admin',
  'Secretaria',
  'Director',
];

const ACADEMIC_ROLES = [
  'Admin',
  'Director',
  'Profesor',
];

export const GLOBAL_SEARCH_ENTRIES:
  GlobalSearchEntry[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    description:
      'Resumen general, indicadores y actividad reciente.',
    category: 'Principal',
    breadcrumb: 'Principal · Dashboard',
    path: '/dashboard',
    keywords: [
      'inicio',
      'resumen',
      'panel',
      'indicadores',
      'estadisticas',
    ],
    roles: [
      'Admin',
      'Secretaria',
      'Director',
      'Profesor',
    ],
  },
  {
    id: 'matricula-registro',
    title: 'Registrar matrícula',
    description:
      'Buscar alumnos, vincular apoderados y registrar matrículas.',
    category: 'Académico',
    breadcrumb: 'Matrícula · Registrar matrícula',
    path: '/matricula',
    keywords: [
      'alumno',
      'dni',
      'matricula',
      'prematricula',
      'seccion',
      'apoderado',
      'nuevo alumno',
    ],
    roles: MANAGEMENT_ROLES,
  },
  {
    id: 'matricula-renovacion',
    title: 'Renovación / Re-matrícula',
    description:
      'Renovar alumnos y seleccionar la sección del siguiente año.',
    category: 'Académico',
    breadcrumb: 'Matrícula · Renovación',
    path: '/matricula/renovacion',
    keywords: [
      'renovar',
      'rematricula',
      'continuidad',
      'seccion destino',
      'cambio de sede',
    ],
    roles: MANAGEMENT_ROLES,
  },
  {
    id: 'matricula-historial',
    title: 'Historial de matrículas',
    description:
      'Consultar matrículas registradas y sus estados.',
    category: 'Académico',
    breadcrumb: 'Matrícula · Historial',
    path: '/matricula/historial',
    keywords: [
      'historial',
      'matriculas',
      'registrado por',
      'revision',
      'aprobado',
    ],
    roles: MANAGEMENT_ROLES,
  },
  {
    id: 'notas',
    title: 'Registro de notas',
    description:
      'Registrar y consultar calificaciones por curso y sección.',
    category: 'Académico',
    breadcrumb: 'Académico · Notas',
    path: '/notas',
    keywords: [
      'notas',
      'calificaciones',
      'evaluaciones',
      'curso',
      'seccion',
      'alumnos',
    ],
    roles: ACADEMIC_ROLES,
  },
  {
    id: 'asistencia',
    title: 'Asistencia',
    description:
      'Registrar asistencia de alumnos por sección y fecha.',
    category: 'Académico',
    breadcrumb: 'Académico · Asistencia',
    path: '/asistencia',
    keywords: [
      'seccion',
      'secciones',
      'alumnos',
      'presente',
      'ausente',
      'tardanza',
      'justificado',
      'registro',
    ],
    roles: ACADEMIC_ROLES,
  },
  {
    id: 'calendario-horario',
    title: 'Horario escolar',
    description:
      'Programar clases por año, sección, curso y docente.',
    category: 'Académico',
    breadcrumb: 'Académico · Calendario',
    path: '/calendario',
    keywords: [
      'calendario',
      'horario',
      'seccion',
      'secciones',
      'curso',
      'docente',
      'clases',
      'dia',
    ],
    roles: MANAGEMENT_ROLES,
  },
  {
    id: 'tutoria',
    title: 'Tutoría',
    description:
      'Seguimiento, criterios y acompañamiento del alumno.',
    category: 'Académico',
    breadcrumb: 'Tutoría · Seguimiento',
    path: '/tutoria',
    keywords: [
      'tutor',
      'tutoria',
      'seguimiento',
      'alumno',
      'criterios',
    ],
    roles: ACADEMIC_ROLES,
  },
  {
    id: 'alumnos',
    title: 'Alumnos',
    description:
      'Consultar información personal y académica de alumnos.',
    category: 'Comunidad escolar',
    breadcrumb: 'Comunidad escolar · Alumnos',
    path: '/comunidad/alumnos',
    keywords: [
      'alumno',
      'estudiante',
      'dni',
      'codigo',
      'matricula',
      'foto',
      'seccion',
    ],
    roles: MANAGEMENT_ROLES,
  },
  {
    id: 'apoderados',
    title: 'Apoderados',
    description:
      'Consultar datos y alumnos vinculados a cada apoderado.',
    category: 'Comunidad escolar',
    breadcrumb: 'Comunidad escolar · Apoderados',
    path: '/comunidad/apoderados',
    keywords: [
      'padre',
      'madre',
      'tutor',
      'familia',
      'dni',
      'telefono',
      'alumno vinculado',
    ],
    roles: MANAGEMENT_ROLES,
  },
  {
    id: 'docentes',
    title: 'Docentes',
    description:
      'Administrar docentes y sus datos institucionales.',
    category: 'Personal',
    breadcrumb: 'Personal · Docentes',
    path: '/docentes',
    keywords: [
      'profesor',
      'docente',
      'maestro',
      'personal',
      'curso',
    ],
    roles: ADMIN_ROLES,
  },
  {
    id: 'staff',
    title: 'Staff institucional',
    description:
      'Administrar personal no docente y colaboradores.',
    category: 'Personal',
    breadcrumb: 'Personal · Staff',
    path: '/staff',
    keywords: [
      'personal',
      'administrativo',
      'auxiliar',
      'colaborador',
      'staff',
    ],
    roles: ADMIN_ROLES,
  },
  {
    id: 'citas',
    title: 'Citas y entrevistas',
    description:
      'Programar reuniones con familias y personal.',
    category: 'Personal',
    breadcrumb: 'Personal · Citas',
    path: '/citas',
    keywords: [
      'cita',
      'entrevista',
      'reunion',
      'apoderado',
      'docente',
    ],
    roles: [
      'Admin',
      'Secretaria',
    ],
  },
  {
    id: 'enfermeria',
    title: 'Enfermería',
    description:
      'Registrar atenciones y alertas de salud escolar.',
    category: 'Bienestar',
    breadcrumb: 'Bienestar · Enfermería',
    path: '/enfermeria',
    keywords: [
      'salud',
      'enfermeria',
      'medicina',
      'atencion',
      'alumno',
    ],
    roles: [
      'Admin',
    ],
  },
  {
    id: 'circulares',
    title: 'Circulares',
    description:
      'Crear y consultar comunicaciones institucionales.',
    category: 'Comunicación',
    breadcrumb: 'Comunicación · Circulares',
    path: '/circulares',
    keywords: [
      'comunicado',
      'circular',
      'mensaje',
      'familias',
      'aviso',
    ],
    roles: MANAGEMENT_ROLES,
  },
  {
    id: 'notificaciones',
    title: 'Notificaciones',
    description:
      'Consultar alertas y avisos internos del sistema.',
    category: 'Comunicación',
    breadcrumb: 'Comunicación · Notificaciones',
    path: '/notificaciones',
    keywords: [
      'alerta',
      'aviso',
      'mensaje',
      'notificacion',
    ],
    roles: [
      'Admin',
    ],
  },
  {
    id: 'tesoreria-centro-pagos',
    title: 'Centro de pagos',
    description:
      'Consultar deudas y registrar pagos por alumno.',
    category: 'Finanzas',
    breadcrumb: 'Tesorería · Operaciones · Centro de pagos',
    path: '/tesoreria/cobranzas',
    keywords: [
      'pago',
      'deuda',
      'saldo',
      'alumno',
      'pension',
      'cobranza',
    ],
    roles: MANAGEMENT_ROLES,
  },
  {
    id: 'tesoreria-agenda',
    title: 'Agenda de cobranzas',
    description:
      'Gestionar recordatorios e historial de cobranzas.',
    category: 'Finanzas',
    breadcrumb: 'Tesorería · Operaciones · Agenda',
    path: '/tesoreria/agenda-cobranzas',
    keywords: [
      'cobranza',
      'recordatorio',
      'vencido',
      'gestion',
      'historial',
    ],
    roles: MANAGEMENT_ROLES,
  },
  {
    id: 'tesoreria-estado',
    title: 'Estado de cuenta',
    description:
      'Consultar cronogramas, pagos y saldos del alumno.',
    category: 'Finanzas',
    breadcrumb: 'Tesorería · Operaciones · Estado de cuenta',
    path: '/tesoreria/estado-cuenta',
    keywords: [
      'cuenta',
      'saldo',
      'cronograma',
      'pago',
      'dni',
      'matricula',
    ],
    roles: MANAGEMENT_ROLES,
  },
  {
    id: 'tesoreria-validar',
    title: 'Validar pagos',
    description:
      'Revisar comprobantes y confirmar pagos reportados.',
    category: 'Finanzas',
    breadcrumb: 'Tesorería · Operaciones · Validar pagos',
    path: '/tesoreria/validar-pagos',
    keywords: [
      'validar',
      'confirmar',
      'comprobante',
      'transferencia',
      'operacion',
    ],
    roles: MANAGEMENT_ROLES,
  },
  {
    id: 'tesoreria-recibidos',
    title: 'Pagos recibidos',
    description:
      'Consultar pagos reportados y su auditoría.',
    category: 'Finanzas',
    breadcrumb: 'Tesorería · Operaciones · Pagos recibidos',
    path: '/tesoreria/pagos-recibidos',
    keywords: [
      'pago',
      'recibido',
      'auditoria',
      'confirmado',
      'comprobante',
    ],
    roles: MANAGEMENT_ROLES,
  },
  {
    id: 'tesoreria-pensiones',
    title: 'Configurar pensiones',
    description:
      'Crear cronogramas, descuentos y campañas.',
    category: 'Finanzas',
    breadcrumb: 'Tesorería · Configuración · Pensiones',
    path: '/tesoreria/configuracion',
    keywords: [
      'pension',
      'pensiones',
      'descuento',
      'campaña',
      'cronograma',
      'mensualidad',
    ],
    roles: MANAGEMENT_ROLES,
  },
  {
    id: 'tesoreria-extraordinarios',
    title: 'Pagos extraordinarios',
    description:
      'Crear cobros extraordinarios por nivel o sección.',
    category: 'Finanzas',
    breadcrumb:
      'Tesorería · Configuración · Pagos extraordinarios',
    path: '/tesoreria/pagos-extraordinarios',
    keywords: [
      'extraordinario',
      'cobro',
      'seccion',
      'secciones',
      'nivel',
      'destinatarios',
    ],
    roles: MANAGEMENT_ROLES,
  },
  {
    id: 'tesoreria-datos',
    title: 'Datos para cobrar',
    description:
      'Configurar cuentas y medios de pago institucionales.',
    category: 'Finanzas',
    breadcrumb: 'Tesorería · Configuración · Datos para cobrar',
    path: '/tesoreria/datos-cobro',
    keywords: [
      'banco',
      'cuenta',
      'yape',
      'plin',
      'transferencia',
      'medio de pago',
    ],
    roles: MANAGEMENT_ROLES,
  },
  {
    id: 'reportes-panel',
    title: 'Panel de reportes',
    description:
      'Consultar indicadores y reportes institucionales.',
    category: 'Reportes',
    breadcrumb: 'Reportes · Panel general',
    path: '/reportes',
    keywords: [
      'reporte',
      'estadistica',
      'indicador',
      'grafico',
      'resumen',
    ],
    roles: ADMIN_ROLES,
  },
  {
    id: 'reportes-asistencia',
    title: 'Asistencia global',
    description:
      'Consultar reportes de asistencia por sección.',
    category: 'Reportes',
    breadcrumb: 'Reportes · Asistencia global',
    path: '/reportes/asistencia',
    keywords: [
      'reporte',
      'asistencia',
      'seccion',
      'secciones',
      'ausentes',
      'presentes',
    ],
    roles: ADMIN_ROLES,
  },

  /* Configuración */
  {
    id: 'config-anios',
    title: 'Años lectivos',
    description:
      'Crear y administrar periodos académicos anuales.',
    category: 'Configuración',
    breadcrumb: 'Configuración · Tiempo académico',
    path: '/configuracion?tab=anios',
    keywords: [
      'año',
      'anios',
      'lectivo',
      'periodo escolar',
      'fecha inicio',
    ],
    roles: ADMIN_ROLES,
  },
  {
    id: 'config-periodos',
    title: 'Periodos y unidades',
    description:
      'Configurar bimestres, trimestres y unidades.',
    category: 'Configuración',
    breadcrumb: 'Configuración · Tiempo académico',
    path: '/configuracion?tab=periodos',
    keywords: [
      'periodo',
      'unidad',
      'bimestre',
      'trimestre',
      'notas',
    ],
    roles: ADMIN_ROLES,
  },
  {
    id: 'config-preparacion',
    title: 'Preparación del año',
    description:
      'Revisar configuraciones necesarias para operar.',
    category: 'Configuración',
    breadcrumb: 'Configuración · Tiempo académico',
    path: '/configuracion?tab=preparacion',
    keywords: [
      'preparacion',
      'validacion',
      'año',
      'configuraciones',
      'listo',
      'bloqueos',
    ],
    roles: ADMIN_ROLES,
  },
  {
    id: 'config-niveles',
    title: 'Niveles y grados',
    description:
      'Administrar niveles educativos y grados.',
    category: 'Configuración',
    breadcrumb: 'Configuración · Estructura académica',
    path: '/configuracion?tab=niveles',
    keywords: [
      'nivel',
      'grado',
      'inicial',
      'primaria',
      'secundaria',
    ],
    roles: ADMIN_ROLES,
  },
  {
    id: 'config-secciones',
    title: 'Secciones',
    description:
      'Administrar secciones, aulas, capacidad y tutores.',
    category: 'Configuración',
    breadcrumb: 'Configuración · Estructura académica',
    path: '/configuracion?tab=secciones',
    keywords: [
      'seccion',
      'secciones',
      'aula',
      'salon',
      'capacidad',
      'tutor',
      'grado',
    ],
    roles: ADMIN_ROLES,
  },
  {
    id: 'config-cursos',
    title: 'Cursos y áreas',
    description:
      'Administrar áreas curriculares y cursos.',
    category: 'Configuración',
    breadcrumb: 'Configuración · Estructura académica',
    path: '/configuracion?tab=cursos',
    keywords: [
      'curso',
      'cursos',
      'area',
      'areas',
      'materia',
      'asignatura',
    ],
    roles: ADMIN_ROLES,
  },
  {
    id: 'config-asignaciones',
    title: 'Asignaciones docentes',
    description:
      'Vincular docentes, cursos, años y secciones.',
    category: 'Configuración',
    breadcrumb: 'Configuración · Estructura académica',
    path: '/configuracion?tab=asignaciones',
    keywords: [
      'asignacion',
      'docente',
      'curso',
      'seccion',
      'secciones',
      'año lectivo',
    ],
    roles: ADMIN_ROLES,
  },
  {
    id: 'config-escala',
    title: 'Escala de calificación',
    description:
      'Configurar valores y rangos de notas.',
    category: 'Configuración',
    breadcrumb: 'Configuración · Evaluación y notas',
    path: '/configuracion?tab=escala',
    keywords: [
      'escala',
      'calificacion',
      'nota',
      'rango',
      'letra',
    ],
    roles: ADMIN_ROLES,
  },
  {
    id: 'config-tipos',
    title: 'Tipos de evaluación',
    description:
      'Administrar clases de evaluaciones.',
    category: 'Configuración',
    breadcrumb: 'Configuración · Evaluación y notas',
    path: '/configuracion?tab=tipos',
    keywords: [
      'evaluacion',
      'examen',
      'practica',
      'tipo',
      'notas',
    ],
    roles: ADMIN_ROLES,
  },
  {
    id: 'config-plantillas',
    title: 'Plantillas de evaluación',
    description:
      'Configurar ponderaciones y evaluaciones por curso.',
    category: 'Configuración',
    breadcrumb: 'Configuración · Evaluación y notas',
    path: '/configuracion?tab=plantillas',
    keywords: [
      'plantilla',
      'ponderacion',
      'evaluacion',
      'curso',
      'promedio',
    ],
    roles: ADMIN_ROLES,
  },
  {
    id: 'config-tutoria',
    title: 'Criterios de tutoría',
    description:
      'Administrar criterios usados en tutoría.',
    category: 'Configuración',
    breadcrumb: 'Configuración · Evaluación y notas',
    path: '/configuracion?tab=criterios-tutoria',
    keywords: [
      'criterio',
      'tutoria',
      'seguimiento',
      'evaluacion',
    ],
    roles: ADMIN_ROLES,
  },
  {
    id: 'config-libreta',
    title: 'Cabecera de libreta',
    description:
      'Configurar datos institucionales de la libreta.',
    category: 'Configuración',
    breadcrumb: 'Configuración · Evaluación y notas',
    path: '/configuracion?tab=cabecera-libreta',
    keywords: [
      'libreta',
      'cabecera',
      'reporte',
      'notas',
      'institucion',
    ],
    roles: ADMIN_ROLES,
  },
  {
    id: 'config-conceptos',
    title: 'Conceptos de pago',
    description:
      'Administrar conceptos usados en tesorería.',
    category: 'Configuración',
    breadcrumb: 'Configuración · Finanzas',
    path: '/configuracion?tab=pagos',
    keywords: [
      'concepto',
      'pago',
      'matricula',
      'pension',
      'tesoreria',
    ],
    roles: ADMIN_ROLES,
  },
];

export function normalizeSearchText(
  value?: string | null,
) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function searchGlobalCatalog(
  query: string,
  role?: string | null,
  limit = 9,
) {
  const normalizedQuery =
    normalizeSearchText(query);

  if (!normalizedQuery) {
    return [];
  }

  const tokens = normalizedQuery
    .split(/\s+/)
    .filter(Boolean);

  return GLOBAL_SEARCH_ENTRIES
    .filter((entry) => {
      if (!entry.roles?.length) return true;
      return entry.roles.includes(role || '');
    })
    .map((entry) => {
      const title =
        normalizeSearchText(entry.title);

      const description =
        normalizeSearchText(
          entry.description,
        );

      const breadcrumb =
        normalizeSearchText(
          entry.breadcrumb,
        );

      const category =
        normalizeSearchText(
          entry.category,
        );

      const keywords =
        entry.keywords.map(
          normalizeSearchText,
        );

      const haystack = [
        title,
        description,
        breadcrumb,
        category,
        ...keywords,
      ].join(' ');

      if (
        !tokens.every(
          (token) =>
            haystack.includes(token),
        )
      ) {
        return null;
      }

      let score = 10;

      if (title === normalizedQuery) {
        score += 150;
      } else if (
        title.startsWith(
          normalizedQuery,
        )
      ) {
        score += 110;
      } else if (
        title.includes(
          normalizedQuery,
        )
      ) {
        score += 80;
      }

      if (
        keywords.some(
          (keyword) =>
            keyword === normalizedQuery,
        )
      ) {
        score += 65;
      }

      if (
        breadcrumb.includes(
          normalizedQuery,
        )
      ) {
        score += 35;
      }

      score += tokens.reduce(
        (total, token) => {
          if (title.startsWith(token)) {
            return total + 18;
          }

          if (title.includes(token)) {
            return total + 12;
          }

          if (
            keywords.some(
              (keyword) =>
                keyword.startsWith(token),
            )
          ) {
            return total + 8;
          }

          return total;
        },
        0,
      );

      return {
        entry,
        score,
      };
    })
    .filter(
      (
        item,
      ): item is {
        entry: GlobalSearchEntry;
        score: number;
      } => Boolean(item),
    )
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.entry.title.localeCompare(
          right.entry.title,
          'es',
        ),
    )
    .slice(0, limit)
    .map((item) => item.entry);
}
