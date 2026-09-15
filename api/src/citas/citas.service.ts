import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CitaAcuerdoDto,
  CitaApoderadoCreateDto,
  CitaCreateDto,
  CitaEstadoDto,
  CitaReprogramarDto,
  CitasDestinatariosDto,
  CitasListDto,
  CitasParticipantesDto,
  CitasResponsablesDto,
  CitasScopeDto,
} from './citas.dto';

const MANAGEMENT_ROLES = ['Admin', 'Director', 'Secretaria'];
const ACTIVE_STATES = ['pendiente', 'confirmada'];
const PROFESSOR_ROLE = 'Profesor';
const ESTADOS_MATRICULA_ACTIVA = ['Activo', 'Matriculado', 'Pre-matriculado'];
const OPERATIONAL_YEAR_STATES = [
  'En curso',
  'Abierto',
  'Planificación',
  'Matrícula abierta',
  'Activo',
];

type Db = Prisma.TransactionClient | PrismaService;
type Scope = {
  tenantId: number;
  schoolIds: number[];
  managerSchoolIds: number[];
  professorSchoolIds: number[];
  personId: number;
  globalRole: string;
};

const citaInclude = {
  colegio: { select: { id_colegio: true, nombre: true } },
  staff: {
    select: {
      id_staff: true,
      id_persona: true,
      cargo: true,
      area: true,
      id_colegio: true,
      persona: {
        select: {
          id_persona: true,
          nombres: true,
          apellido_paterno: true,
          apellido_materno: true,
        },
      },
      seccion: { select: { id_colegio: true } },
    },
  },
  docente: {
    select: {
      id_persona: true,
      persona: {
        select: {
          id_persona: true,
          nombres: true,
          apellido_paterno: true,
          apellido_materno: true,
        },
      },
    },
  },
  apoderado: {
    select: {
      id_persona: true,
      persona: {
        select: {
          id_persona: true,
          nombres: true,
          apellido_paterno: true,
          apellido_materno: true,
          telefono: true,
        },
      },
    },
  },
  seccion: {
    select: {
      id_seccion: true,
      id_colegio: true,
      letra: true,
      grado: {
        select: {
          nombre_grado: true,
          nivel: { select: { nombre_nivel: true } },
        },
      },
    },
  },
  matricula: {
    select: {
      id_matricula: true,
      id_estudiante: true,
      id_colegio: true,
      estudiante: {
        select: {
          codigo_estudiante: true,
          persona: {
            select: {
              id_persona: true,
              nombres: true,
              apellido_paterno: true,
              apellido_materno: true,
            },
          },
        },
      },
      seccion: {
        select: {
          id_seccion: true,
          letra: true,
          id_colegio: true,
          grado: {
            select: {
              nombre_grado: true,
              nivel: { select: { nombre_nivel: true } },
            },
          },
        },
      },
      anio: { select: { id_anio: true, nombre_anio: true } },
    },
  },
  movimientos: {
    orderBy: [{ creado_en: 'asc' as const }, { id_movimiento: 'asc' as const }],
    include: {
      actor: {
        select: {
          id_usuario: true,
          username: true,
          persona: {
            select: {
              nombres: true,
              apellido_paterno: true,
              apellido_materno: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.CitaInclude;

type CitaRecord = Prisma.CitaGetPayload<{ include: typeof citaInclude }>;

function fullName(
  person?: {
    nombres?: string | null;
    apellido_paterno?: string | null;
    apellido_materno?: string | null;
  } | null,
) {
  return person
    ? [person.nombres, person.apellido_paterno, person.apellido_materno]
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
    : '';
}

function normalizedSearchValue(value?: string | null) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es');
}

function personMatchesSearch(
  person: {
    nombres?: string | null;
    apellido_paterno?: string | null;
    apellido_materno?: string | null;
    dni?: string | null;
  },
  tokens: string[],
) {
  const fields = [
    person.nombres,
    person.apellido_paterno,
    person.apellido_materno,
    person.dni,
  ].map(normalizedSearchValue);
  return tokens.every((token) =>
    fields.some((field) => field.includes(normalizedSearchValue(token))),
  );
}

function todayInBogota() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function parseCitaDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestException('La fecha debe tener el formato AAAA-MM-DD.');
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new BadRequestException('La fecha indicada no es válida.');
  }
  return date;
}

export function validateCitaSchedule(
  fecha: string,
  horaInicio: string,
  horaFin: string,
  allowPast = false,
) {
  const date = parseCitaDate(fecha);
  if (
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(horaInicio) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(horaFin)
  ) {
    throw new BadRequestException('Las horas deben tener el formato HH:mm.');
  }
  if (horaInicio >= horaFin) {
    throw new BadRequestException(
      'La hora de inicio debe ser anterior a la hora de fin.',
    );
  }
  if (!allowPast && fecha < todayInBogota()) {
    throw new BadRequestException(
      'No se puede programar una cita en una fecha pasada.',
    );
  }
  return date;
}

export function canTransition(from: string, to: string) {
  const transitions: Record<string, string[]> = {
    pendiente: ['confirmada', 'rechazada', 'cancelada'],
    confirmada: ['realizada', 'cancelada'],
  };
  return transitions[from]?.includes(to) ?? false;
}

@Injectable()
export class CitasService {
  private readonly logger = new Logger('CitasService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  async resolveScope(
    db: Db,
    userId: number,
    query: CitasScopeDto,
  ): Promise<Scope> {
    if ((query.scope === 'all') === Boolean(query.colegio_id)) {
      throw new BadRequestException(
        'Selecciona todos los colegios o un colegio específico.',
      );
    }

    const actor = await db.usuario.findUnique({
      where: { id_usuario: userId },
      select: {
        id_persona: true,
        estado: true,
        rol: { select: { nombre_rol: true } },
        tenants: {
          where: {
            id_tenant: query.tenant_id,
            estado: 'Activo',
            tenant: { estado: 'Activo' },
          },
          select: { id_tenant: true },
        },
        colegios: {
          where: {
            estado: 'Activo',
            colegio: { id_tenant: query.tenant_id, estado: 'Activo' },
          },
          select: { id_colegio: true, rol_colegio: true },
        },
      },
    });

    if (!actor?.estado || !actor.tenants.length) {
      throw new ForbiddenException(
        'No tienes acceso activo a esta organización.',
      );
    }

    const globalRole = actor.rol.nombre_rol;
    const accessibleSchoolIds = actor.colegios.map((item) => item.id_colegio);
    const managerSchoolIds = actor.colegios
      .filter(
        (item) =>
          MANAGEMENT_ROLES.includes(globalRole) &&
          MANAGEMENT_ROLES.includes(item.rol_colegio),
      )
      .map((item) => item.id_colegio);
    const professorSchoolIds = actor.colegios
      .filter(
        (item) =>
          globalRole === PROFESSOR_ROLE && item.rol_colegio === PROFESSOR_ROLE,
      )
      .map((item) => item.id_colegio);

    if (query.colegio_id && !accessibleSchoolIds.includes(query.colegio_id)) {
      throw new ForbiddenException('No tienes acceso activo a este colegio.');
    }

    if (query.scope === 'all') {
      if (
        !['Admin', 'Director'].includes(globalRole) ||
        !managerSchoolIds.length
      ) {
        throw new ForbiddenException(
          'No tienes permiso para consultar la agenda consolidada.',
        );
      }
      return {
        tenantId: query.tenant_id,
        schoolIds: managerSchoolIds,
        managerSchoolIds,
        professorSchoolIds,
        personId: actor.id_persona,
        globalRole,
      };
    }

    return {
      tenantId: query.tenant_id,
      schoolIds: [query.colegio_id as number],
      managerSchoolIds,
      professorSchoolIds,
      personId: actor.id_persona,
      globalRole,
    };
  }

  private isManager(scope: Scope, schoolId: number) {
    return (
      MANAGEMENT_ROLES.includes(scope.globalRole) &&
      scope.managerSchoolIds.includes(schoolId)
    );
  }

  private isProfessor(scope: Scope, schoolId: number) {
    return (
      scope.globalRole === PROFESSOR_ROLE &&
      scope.professorSchoolIds.includes(schoolId)
    );
  }

  private schoolWhere(scope: Scope): Prisma.CitaWhereInput {
    return {
      OR: [
        { id_tenant: scope.tenantId, id_colegio: { in: scope.schoolIds } },
        {
          id_tenant: null,
          id_colegio: { in: scope.schoolIds },
          colegio: { id_tenant: scope.tenantId },
        },
        {
          id_colegio: null,
          staff: {
            OR: [
              {
                id_tenant: scope.tenantId,
                id_colegio: { in: scope.schoolIds },
              },
              {
                id_colegio: null,
                seccion: {
                  id_colegio: { in: scope.schoolIds },
                  colegio: { id_tenant: scope.tenantId },
                },
              },
            ],
          },
        },
      ],
    };
  }

  private recipientWhere(personId: number): Prisma.CitaWhereInput {
    return {
      OR: [{ id_docente: personId }, { staff: { id_persona: personId } }],
    };
  }

  private visibleWhere(scope: Scope): Prisma.CitaWhereInput {
    const managesEntireSelection = scope.schoolIds.every((id) =>
      this.isManager(scope, id),
    );
    return {
      AND: [
        this.schoolWhere(scope),
        managesEntireSelection ? {} : this.recipientWhere(scope.personId),
      ],
    };
  }

  async list(userId: number, query: CitasListDto) {
    const scope = await this.resolveScope(this.prisma, userId, query);
    const baseWhere = this.visibleWhere(scope);
    const filters: Prisma.CitaWhereInput[] = [];
    const q = query.q?.trim();

    if (q) {
      const personSearch = {
        OR: [
          { nombres: { contains: q } },
          { apellido_paterno: { contains: q } },
          { apellido_materno: { contains: q } },
        ],
      };
      filters.push({
        OR: [
          { motivo: { contains: q } },
          { funcion_destinatario: { contains: q } },
          { apoderado: { persona: personSearch } },
          { matricula: { estudiante: { persona: personSearch } } },
          { staff: { persona: personSearch } },
          { docente: { persona: personSearch } },
        ],
      });
    }
    if (query.estado) filters.push({ estado: query.estado });
    if (query.desde || query.hasta) {
      filters.push({
        fecha: {
          gte: query.desde ? parseCitaDate(query.desde) : undefined,
          lte: query.hasta ? parseCitaDate(query.hasta) : undefined,
        },
      });
    }
    if (query.destinatario) {
      const [type, idValue] = query.destinatario.split(':');
      filters.push(
        type === 'staff'
          ? { id_staff: Number(idValue) }
          : { id_docente: Number(idValue) },
      );
    }
    if (query.desde && query.hasta && query.desde > query.hasta) {
      throw new BadRequestException(
        'La fecha inicial no puede ser posterior a la final.',
      );
    }

    const where: Prisma.CitaWhereInput = { AND: [baseWhere, ...filters] };
    const today = parseCitaDate(todayInBogota());
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    const [data, total, pending, confirmed, todayCount, upcoming, filterRows] =
      await Promise.all([
        this.prisma.cita.findMany({
          where,
          include: citaInclude,
          orderBy: [
            { fecha: 'asc' },
            { hora_inicio: 'asc' },
            { id_cita: 'asc' },
          ],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        this.prisma.cita.count({ where }),
        this.prisma.cita.count({
          where: { AND: [baseWhere, { estado: 'pendiente' }] },
        }),
        this.prisma.cita.count({
          where: { AND: [baseWhere, { estado: 'confirmada' }] },
        }),
        this.prisma.cita.count({
          where: { AND: [baseWhere, { fecha: today }] },
        }),
        this.prisma.cita.count({
          where: {
            AND: [
              baseWhere,
              { fecha: { gte: tomorrow }, estado: { in: ACTIVE_STATES } },
            ],
          },
        }),
        this.prisma.cita.findMany({
          where: baseWhere,
          select: {
            id_staff: true,
            id_docente: true,
            contexto_destinatario: true,
            funcion_destinatario: true,
            staff: { select: { persona: true, cargo: true } },
            docente: { select: { persona: true } },
          },
        }),
      ]);

    const destinatarios = Array.from(
      new Map(
        filterRows.map((row) => {
          const type = row.id_staff ? 'staff' : 'docente';
          const id = row.id_staff ?? row.id_docente;
          const person = row.staff?.persona ?? row.docente?.persona;
          return [
            `${type}:${id}`,
            {
              value: `${type}:${id}`,
              nombre: fullName(person),
              contexto: row.contexto_destinatario,
              funcion:
                row.funcion_destinatario ?? row.staff?.cargo ?? 'Docente',
            },
          ] as const;
        }),
      ).values(),
    ).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

    return {
      data: data.map((item) => this.formatCita(item)),
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
      resumen: {
        pendientes: pending,
        confirmadas: confirmed,
        hoy: todayCount,
        proximas: upcoming,
      },
      filtros: { destinatarios },
    };
  }

  async detail(userId: number, query: CitasScopeDto, id: number) {
    const scope = await this.resolveScope(this.prisma, userId, query);
    const cita = await this.prisma.cita.findFirst({
      where: { AND: [{ id_cita: id }, this.visibleWhere(scope)] },
      include: citaInclude,
    });
    if (!cita) {
      throw new NotFoundException(
        'Cita no disponible en el alcance autorizado.',
      );
    }
    const audience =
      cita.tipo === 'seccion' && cita.id_seccion
        ? await this.sectionAudience(this.prisma, cita.id_seccion)
        : undefined;
    return this.formatCita(
      cita,
      this.permissionsFor(cita, scope, false),
      audience,
    );
  }

  async participants(userId: number, query: CitasParticipantesDto) {
    const scope = await this.resolveScope(this.prisma, userId, query);
    if (!scope.schoolIds.every((id) => this.isManager(scope, id))) {
      throw new ForbiddenException(
        'No tienes permiso para crear citas en este alcance.',
      );
    }
    const q = query.q?.trim();
    if (!q) return [];

    const tokens = q.split(/\s+/).filter(Boolean);
    const personSearch: Prisma.PersonaWhereInput = {
      AND: tokens.map((token) => ({
        OR: [
          { nombres: { contains: token } },
          { apellido_paterno: { contains: token } },
          { apellido_materno: { contains: token } },
          { dni: { contains: token } },
        ],
      })),
    };
    const matriculas = await this.prisma.matricula.findMany({
      where: {
        estado_matricula: { in: ESTADOS_MATRICULA_ACTIVA },
        AND: [
          {
            OR: [
              {
                id_tenant: scope.tenantId,
                id_colegio: { in: scope.schoolIds },
              },
              {
                id_colegio: null,
                seccion: {
                  id_colegio: { in: scope.schoolIds },
                  colegio: { id_tenant: scope.tenantId },
                },
              },
            ],
          },
          {
            OR: [
              { codigo_matricula: { contains: q } },
              { estudiante: { codigo_estudiante: { contains: q } } },
              { estudiante: { persona: personSearch } },
              {
                estudiante: {
                  apoderados: {
                    some: { apoderado: { persona: personSearch } },
                  },
                },
              },
            ],
          },
        ],
      },
      include: {
        colegio: true,
        seccion: {
          include: { colegio: true, grado: { include: { nivel: true } } },
        },
        anio: true,
        estudiante: {
          include: {
            persona: true,
            apoderados: {
              include: { apoderado: { include: { persona: true } } },
            },
          },
        },
      },
      orderBy: { id_matricula: 'desc' },
      take: 25,
    });
    return matriculas.map((matricula) => {
      const matchingParents = matricula.estudiante.apoderados.filter(
        (relationship) =>
          personMatchesSearch(relationship.apoderado.persona, tokens),
      );
      return {
        id_matricula: matricula.id_matricula,
        codigo_matricula: matricula.codigo_matricula,
        id_colegio: matricula.id_colegio ?? matricula.seccion.id_colegio,
        colegio:
          matricula.colegio?.nombre ??
          matricula.seccion.colegio?.nombre ??
          'Institución',
        estudiante: {
          id_estudiante: matricula.id_estudiante,
          nombre: fullName(matricula.estudiante.persona),
          codigo: matricula.estudiante.codigo_estudiante,
          seccion: this.sectionLabel(matricula.seccion),
          anio: matricula.anio.nombre_anio,
        },
        apoderados: matricula.estudiante.apoderados.map((relationship) => ({
          id_apoderado: relationship.id_apoderado,
          nombre: fullName(relationship.apoderado.persona),
          parentesco: relationship.parentesco,
        })),
        apoderado_coincidente:
          matchingParents.length === 1
            ? matchingParents[0].id_apoderado
            : undefined,
      };
    });
  }

  private sectionWhere(scope: Scope): Prisma.SeccionWhereInput {
    return {
      OR: [
        {
          id_tenant: scope.tenantId,
          id_colegio: { in: scope.schoolIds },
        },
        {
          id_tenant: null,
          id_colegio: { in: scope.schoolIds },
          colegio: { id_tenant: scope.tenantId },
        },
      ],
    };
  }

  async sections(userId: number, query: CitasScopeDto) {
    const scope = await this.resolveScope(this.prisma, userId, query);
    const managesSelection = scope.schoolIds.every((id) =>
      this.isManager(scope, id),
    );

    if (managesSelection) {
      const sections = await this.prisma.seccion.findMany({
        where: this.sectionWhere(scope),
        include: { colegio: true, grado: { include: { nivel: true } } },
        orderBy: [{ id_grado: 'asc' }, { letra: 'asc' }],
      });
      return sections.map((section) =>
        this.formatSectionOption(section, ['Gestión institucional']),
      );
    }

    const schoolId = scope.schoolIds[0];
    if (!this.isProfessor(scope, schoolId)) {
      throw new ForbiddenException(
        'No tienes permiso para crear reuniones de sección en este colegio.',
      );
    }

    const [assignments, tutorRecords] = await Promise.all([
      this.prisma.asignacionDocente.findMany({
        where: {
          id_docente: scope.personId,
          anio: { estado: { in: OPERATIONAL_YEAR_STATES } },
          seccion: this.sectionWhere(scope),
        },
        include: {
          curso: true,
          seccion: {
            include: { colegio: true, grado: { include: { nivel: true } } },
          },
        },
      }),
      this.prisma.staff.findMany({
        where: {
          id_persona: scope.personId,
          es_tutor: true,
          id_seccion: { not: null },
          seccion: this.sectionWhere(scope),
        },
        include: {
          seccion: {
            include: { colegio: true, grado: { include: { nivel: true } } },
          },
        },
      }),
    ]);

    const options = new Map<
      number,
      {
        section: (typeof assignments)[number]['seccion'];
        relations: Set<string>;
      }
    >();
    for (const assignment of assignments) {
      const current = options.get(assignment.id_seccion) ?? {
        section: assignment.seccion,
        relations: new Set<string>(),
      };
      current.relations.add(assignment.curso.nombre_curso);
      options.set(assignment.id_seccion, current);
    }
    for (const record of tutorRecords) {
      if (!record.seccion) continue;
      const current = options.get(record.seccion.id_seccion) ?? {
        section: record.seccion,
        relations: new Set<string>(),
      };
      current.relations.add('Tutor');
      options.set(record.seccion.id_seccion, current);
    }
    return Array.from(options.values())
      .map(({ section, relations }) =>
        this.formatSectionOption(section, Array.from(relations)),
      )
      .sort(
        (a, b) =>
          a.colegio.localeCompare(b.colegio, 'es') ||
          a.label.localeCompare(b.label, 'es'),
      );
  }

  async sectionResponsibles(userId: number, query: CitasResponsablesDto) {
    const scope = await this.resolveScope(this.prisma, userId, query);
    const section = await this.assertSectionCreationAccess(
      this.prisma,
      scope,
      query.seccion_id,
    );
    return this.sectionResponsibleOptions(this.prisma, scope, section);
  }

  async recipients(userId: number, query: CitasDestinatariosDto) {
    const scope = await this.resolveScope(this.prisma, userId, query);
    const enrollment = await this.loadEnrollment(
      this.prisma,
      query.matricula_id,
    );
    const schoolId = this.enrollmentSchoolId(enrollment);
    if (
      !scope.schoolIds.includes(schoolId) ||
      !this.isManager(scope, schoolId)
    ) {
      throw new NotFoundException(
        'Matrícula no disponible en el alcance autorizado.',
      );
    }
    return this.recipientOptions(this.prisma, enrollment);
  }

  async createInternal(
    userId: number,
    query: CitasScopeDto,
    body: CitaCreateDto,
  ) {
    if (body.tipo === 'individual' && body.id_seccion) {
      throw new BadRequestException(
        'Una cita individual no acepta una sección colectiva.',
      );
    }
    if (body.tipo === 'seccion' && (body.id_matricula || body.id_apoderado)) {
      throw new BadRequestException(
        'Una reunión de sección no acepta matrícula ni apoderado individual.',
      );
    }

    const created =
      body.tipo === 'seccion'
        ? await this.createSectionTransaction(userId, query, body)
        : await this.createTransaction(userId, query, body, false);
    await this.notifyRecipient(created);
    if (created.tipo === 'seccion') {
      await this.notifySectionFamilies(created, 'creada');
    }
    return this.formatCita(created);
  }

  async parentChildren(userId: number) {
    const apoderadoId = await this.parentId(this.prisma, userId);
    const matriculas = await this.prisma.matricula.findMany({
      where: {
        estado_matricula: { in: ESTADOS_MATRICULA_ACTIVA },
        estudiante: { apoderados: { some: { id_apoderado: apoderadoId } } },
        OR: [
          {
            colegio: {
              estado: 'Activo',
              tenant: { estado: 'Activo' },
            },
          },
          {
            id_colegio: null,
            seccion: {
              colegio: {
                estado: 'Activo',
                tenant: { estado: 'Activo' },
              },
            },
          },
        ],
      },
      include: {
        colegio: true,
        seccion: {
          include: { colegio: true, grado: { include: { nivel: true } } },
        },
        anio: true,
        estudiante: { include: { persona: true } },
      },
      orderBy: { id_matricula: 'desc' },
    });
    return matriculas.map((item) => ({
      id_matricula: item.id_matricula,
      id_colegio: item.id_colegio ?? item.seccion.id_colegio,
      colegio:
        item.colegio?.nombre ?? item.seccion.colegio?.nombre ?? 'Institución',
      estudiante: {
        id_estudiante: item.id_estudiante,
        nombre: fullName(item.estudiante.persona),
        codigo: item.estudiante.codigo_estudiante,
        seccion: this.sectionLabel(item.seccion),
        anio: item.anio.nombre_anio,
      },
    }));
  }

  async parentRecipients(userId: number, matriculaId: number) {
    const apoderadoId = await this.parentId(this.prisma, userId);
    const enrollment = await this.loadEnrollment(this.prisma, matriculaId);
    this.assertParentEnrollment(enrollment, apoderadoId);
    return this.recipientOptions(this.prisma, enrollment);
  }

  async createParent(userId: number, body: CitaApoderadoCreateDto) {
    const apoderadoId = await this.parentId(this.prisma, userId);
    const enrollment = await this.loadEnrollment(
      this.prisma,
      body.id_matricula,
    );
    this.assertParentEnrollment(enrollment, apoderadoId);
    const schoolId = this.enrollmentSchoolId(enrollment);
    const tenantId = this.enrollmentTenantId(enrollment);
    const created = await this.createTransaction(
      userId,
      { tenant_id: tenantId, colegio_id: schoolId },
      {
        ...body,
        tipo: 'individual',
        id_colegio: schoolId,
        id_apoderado: apoderadoId,
      },
      true,
    );
    await this.notifyRecipient(created);
    return this.formatCita(created);
  }

  async parentAppointments(userId: number) {
    const apoderadoId = await this.parentId(this.prisma, userId);
    const data = await this.prisma.cita.findMany({
      where: {
        OR: [
          { tipo: 'individual', id_apoderado: apoderadoId },
          {
            tipo: 'seccion',
            seccion: {
              matriculas: {
                some: {
                  estado_matricula: { in: ESTADOS_MATRICULA_ACTIVA },
                  estudiante: {
                    apoderados: { some: { id_apoderado: apoderadoId } },
                  },
                },
              },
            },
          },
        ],
      },
      include: citaInclude,
      orderBy: [{ fecha: 'desc' }, { hora_inicio: 'desc' }],
    });
    return data.map((item) =>
      this.formatCita(item, this.permissionsFor(item, null, true)),
    );
  }

  async parentCancel(userId: number, id: number, comentario: string) {
    if (!comentario?.trim()) {
      throw new BadRequestException('Indica el motivo de la cancelación.');
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      // La identidad del apoderado se vuelve a resolver dentro de la misma
      // transacción que muta la cita; el id recibido nunca decide la pertenencia.
      const apoderadoId = await this.parentId(tx, userId);
      const cita = await tx.cita.findFirst({
        where: { id_cita: id, id_apoderado: apoderadoId },
        include: citaInclude,
      });
      if (!cita) throw new NotFoundException('Cita no disponible.');
      if (!canTransition(cita.estado, 'cancelada')) {
        throw new BadRequestException('Esta cita ya no puede cancelarse.');
      }
      return this.writeStateChange(
        tx,
        userId,
        cita,
        'cancelada',
        comentario.trim(),
      );
    });
    await this.notifyFamily(updated, 'cancelada');
    return this.formatCita(updated, this.permissionsFor(updated, null, true));
  }

  async changeState(
    userId: number,
    query: CitasScopeDto,
    id: number,
    body: CitaEstadoDto,
  ) {
    if (
      ['rechazada', 'cancelada'].includes(body.estado) &&
      !body.comentario?.trim()
    ) {
      throw new BadRequestException(
        `Indica el motivo de la cita ${body.estado}.`,
      );
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const { cita } = await this.authorizedInternalRecord(
        tx,
        userId,
        query,
        id,
      );
      if (cita.tipo === 'seccion' && body.estado === 'rechazada') {
        throw new BadRequestException(
          'Una reunión de sección no admite rechazo colectivo.',
        );
      }
      if (!canTransition(cita.estado, body.estado)) {
        throw new BadRequestException(
          `No se puede cambiar una cita ${cita.estado} a ${body.estado}.`,
        );
      }
      return this.writeStateChange(
        tx,
        userId,
        cita,
        body.estado,
        body.comentario?.trim(),
      );
    });
    await this.notifyFamily(updated, body.estado);
    return this.formatCita(updated);
  }

  async reprogram(
    userId: number,
    query: CitasScopeDto,
    id: number,
    body: CitaReprogramarDto,
  ) {
    const date = validateCitaSchedule(
      body.fecha,
      body.hora_inicio,
      body.hora_fin,
    );
    const updated = await this.prisma.$transaction(
      async (tx) => {
        const { cita } = await this.authorizedInternalRecord(
          tx,
          userId,
          query,
          id,
        );
        if (!ACTIVE_STATES.includes(cita.estado)) {
          throw new BadRequestException(
            'Solo una cita pendiente o confirmada puede reprogramarse.',
          );
        }
        await this.assertNoOverlap(
          tx,
          cita.id_staff,
          cita.id_docente,
          cita.staff?.id_persona ?? cita.docente?.id_persona ?? null,
          date,
          body.hora_inicio,
          body.hora_fin,
          cita.id_cita,
        );
        await tx.cita.update({
          where: { id_cita: cita.id_cita },
          data: {
            fecha: date,
            hora_inicio: body.hora_inicio,
            hora_fin: body.hora_fin,
            estado: 'pendiente',
          },
        });
        await tx.citaMovimiento.create({
          data: {
            id_cita: cita.id_cita,
            id_usuario_actor: userId,
            accion: 'reprogramada',
            estado_anterior: cita.estado,
            estado_nuevo: 'pendiente',
            fecha_anterior: cita.fecha,
            fecha_nueva: date,
            hora_inicio_anterior: cita.hora_inicio,
            hora_fin_anterior: cita.hora_fin,
            hora_inicio_nueva: body.hora_inicio,
            hora_fin_nueva: body.hora_fin,
            comentario: body.comentario,
          },
        });
        return tx.cita.findUniqueOrThrow({
          where: { id_cita: cita.id_cita },
          include: citaInclude,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    await this.notifyFamily(updated, 'reprogramada');
    return this.formatCita(updated);
  }

  async addAgreement(
    userId: number,
    query: CitasScopeDto,
    id: number,
    body: CitaAcuerdoDto,
  ) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const { cita } = await this.authorizedInternalRecord(
        tx,
        userId,
        query,
        id,
      );
      if (!['confirmada', 'realizada'].includes(cita.estado)) {
        throw new BadRequestException(
          'Los acuerdos se registran cuando la cita está confirmada o realizada.',
        );
      }
      await tx.citaMovimiento.create({
        data: {
          id_cita: cita.id_cita,
          id_usuario_actor: userId,
          accion: 'acuerdos',
          estado_anterior: cita.estado,
          estado_nuevo: cita.estado,
          comentario: body.acuerdos,
        },
      });
      return tx.cita.findUniqueOrThrow({
        where: { id_cita: cita.id_cita },
        include: citaInclude,
      });
    });
    return this.formatCita(updated);
  }

  private formatSectionOption(
    section: {
      id_seccion: number;
      id_colegio: number | null;
      colegio: { id_colegio: number; nombre: string } | null;
      letra: string;
      grado: { nombre_grado: string; nivel: { nombre_nivel: string } };
    },
    relations: string[],
  ) {
    const schoolId = section.id_colegio ?? section.colegio?.id_colegio;
    if (!schoolId) {
      throw new ConflictException(
        'La sección no tiene un colegio verificable.',
      );
    }
    return {
      id_seccion: section.id_seccion,
      id_colegio: schoolId,
      colegio: section.colegio?.nombre ?? 'Institución',
      label: this.sectionLabel(section),
      relaciones: Array.from(new Set(relations)).sort((a, b) =>
        a.localeCompare(b, 'es'),
      ),
    };
  }

  private async loadSectionInScope(db: Db, scope: Scope, sectionId: number) {
    const section = await db.seccion.findFirst({
      where: {
        AND: [{ id_seccion: sectionId }, this.sectionWhere(scope)],
      },
      include: { colegio: true, grado: { include: { nivel: true } } },
    });
    if (!section) {
      throw new NotFoundException(
        'Sección no disponible en el alcance autorizado.',
      );
    }
    return section;
  }

  private async assertSectionCreationAccess(
    db: Db,
    scope: Scope,
    sectionId: number,
  ) {
    const section = await this.loadSectionInScope(db, scope, sectionId);
    const schoolId = section.id_colegio ?? section.colegio?.id_colegio;
    if (!schoolId) {
      throw new ConflictException(
        'La sección no tiene un colegio verificable.',
      );
    }
    if (this.isManager(scope, schoolId)) return section;
    if (!this.isProfessor(scope, schoolId)) {
      throw new ForbiddenException(
        'No tienes permiso para crear reuniones en esta sección.',
      );
    }

    const [assignment, tutor] = await Promise.all([
      db.asignacionDocente.findFirst({
        where: {
          id_docente: scope.personId,
          id_seccion: sectionId,
          anio: { estado: { in: OPERATIONAL_YEAR_STATES } },
          seccion: this.sectionWhere(scope),
        },
        select: { id_asignacion: true },
      }),
      db.staff.findFirst({
        where: {
          id_persona: scope.personId,
          id_seccion: sectionId,
          es_tutor: true,
          seccion: this.sectionWhere(scope),
        },
        select: { id_staff: true },
      }),
    ]);
    if (!assignment && !tutor) {
      throw new ForbiddenException(
        'Solo puedes crear reuniones en secciones donde eres docente o tutor.',
      );
    }
    return section;
  }

  private async sectionResponsibleOptions(
    db: Db,
    scope: Scope,
    section: Awaited<ReturnType<CitasService['loadSectionInScope']>>,
  ) {
    const schoolId = section.id_colegio ?? section.colegio?.id_colegio;
    if (!schoolId) {
      throw new ConflictException(
        'La sección no tiene un colegio verificable.',
      );
    }
    const [assignments, tutors, staff] = await Promise.all([
      db.asignacionDocente.findMany({
        where: {
          id_seccion: section.id_seccion,
          anio: { estado: { in: OPERATIONAL_YEAR_STATES } },
          seccion: this.sectionWhere(scope),
        },
        include: { docente: { include: { persona: true } }, curso: true },
      }),
      db.staff.findMany({
        where: {
          id_seccion: section.id_seccion,
          es_tutor: true,
          persona: { docentes: { some: {} } },
        },
        include: { persona: { include: { docentes: true } } },
      }),
      db.staff.findMany({
        where: {
          es_miembro_staff: true,
          permite_citas: true,
          AND: [
            {
              OR: [
                { id_colegio: schoolId },
                {
                  id_colegio: null,
                  seccion: { id_colegio: schoolId },
                },
              ],
            },
            { OR: [{ id_tenant: scope.tenantId }, { id_tenant: null }] },
          ],
        },
        include: { persona: true },
      }),
    ]);

    const courses = new Map<
      number,
      {
        person: (typeof assignments)[number]['docente']['persona'];
        names: Set<string>;
      }
    >();
    for (const assignment of assignments) {
      const current = courses.get(assignment.id_docente) ?? {
        person: assignment.docente.persona,
        names: new Set<string>(),
      };
      current.names.add(assignment.curso.nombre_curso);
      courses.set(assignment.id_docente, current);
    }

    const options: Array<{
      key: string;
      tipo: 'staff' | 'docente';
      id_destinatario: number;
      id_persona: number;
      nombre: string;
      contexto: 'staff' | 'docente' | 'tutor';
      funcion: string;
      detalle: string;
    }> = [];
    for (const [id, item] of courses) {
      const names = Array.from(item.names).sort((a, b) =>
        a.localeCompare(b, 'es'),
      );
      options.push({
        key: `docente:${id}:docente`,
        tipo: 'docente',
        id_destinatario: id,
        id_persona: id,
        nombre: fullName(item.person),
        contexto: 'docente',
        funcion: names.length ? `Docente · ${names.join(', ')}` : 'Docente',
        detalle: this.sectionLabel(section),
      });
    }
    for (const tutor of tutors) {
      if (!tutor.persona.docentes.length) continue;
      options.push({
        key: `docente:${tutor.id_persona}:tutor`,
        tipo: 'docente',
        id_destinatario: tutor.id_persona,
        id_persona: tutor.id_persona,
        nombre: fullName(tutor.persona),
        contexto: 'tutor',
        funcion: `Tutor · ${this.sectionLabel(section)}`,
        detalle: 'Tutor actual de la sección',
      });
    }
    for (const member of staff) {
      options.push({
        key: `staff:${member.id_staff}:staff`,
        tipo: 'staff',
        id_destinatario: member.id_staff,
        id_persona: member.id_persona,
        nombre: fullName(member.persona),
        contexto: 'staff',
        funcion: member.cargo,
        detalle: member.area,
      });
    }

    return Array.from(new Map(options.map((item) => [item.key, item])).values())
      .filter(
        (item) =>
          this.isManager(scope, schoolId) || item.id_persona === scope.personId,
      )
      .sort(
        (a, b) =>
          a.nombre.localeCompare(b.nombre, 'es') ||
          a.funcion.localeCompare(b.funcion, 'es'),
      );
  }

  private async validateSectionResponsible(
    db: Db,
    scope: Scope,
    section: Awaited<ReturnType<CitasService['loadSectionInScope']>>,
    body: Pick<
      CitaCreateDto,
      'tipo_destinatario' | 'id_destinatario' | 'contexto_destinatario'
    >,
  ) {
    if (
      (body.tipo_destinatario === 'staff' &&
        body.contexto_destinatario !== 'staff') ||
      (body.tipo_destinatario === 'docente' &&
        body.contexto_destinatario === 'staff')
    ) {
      throw new BadRequestException(
        'El contexto no corresponde al tipo de responsable.',
      );
    }
    const options = await this.sectionResponsibleOptions(db, scope, section);
    const responsible = options.find(
      (item) =>
        item.tipo === body.tipo_destinatario &&
        item.id_destinatario === body.id_destinatario &&
        item.contexto === body.contexto_destinatario,
    );
    if (!responsible) {
      throw new NotFoundException(
        'El responsable no está autorizado para esta sección.',
      );
    }
    return responsible;
  }

  private async createSectionTransaction(
    userId: number,
    query: CitasScopeDto,
    body: CitaCreateDto,
  ) {
    if (!body.id_seccion) {
      throw new BadRequestException('Selecciona una sección.');
    }
    const date = validateCitaSchedule(
      body.fecha,
      body.hora_inicio,
      body.hora_fin,
    );
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const scope = await this.resolveScope(tx, userId, query);
          const section = await this.assertSectionCreationAccess(
            tx,
            scope,
            body.id_seccion as number,
          );
          const schoolId = section.id_colegio ?? section.colegio?.id_colegio;
          if (!schoolId || schoolId !== body.id_colegio) {
            throw new NotFoundException(
              'Sección no disponible en el colegio indicado.',
            );
          }
          const responsible = await this.validateSectionResponsible(
            tx,
            scope,
            section,
            body,
          );
          await this.assertNoOverlap(
            tx,
            body.tipo_destinatario === 'staff' ? body.id_destinatario : null,
            body.tipo_destinatario === 'docente' ? body.id_destinatario : null,
            responsible.id_persona,
            date,
            body.hora_inicio,
            body.hora_fin,
          );

          const cita = await tx.cita.create({
            data: {
              id_tenant: scope.tenantId,
              id_colegio: schoolId,
              id_staff:
                body.tipo_destinatario === 'staff'
                  ? body.id_destinatario
                  : null,
              id_docente:
                body.tipo_destinatario === 'docente'
                  ? body.id_destinatario
                  : null,
              id_apoderado: null,
              id_matricula: null,
              id_seccion: section.id_seccion,
              tipo: 'seccion',
              contexto_destinatario: body.contexto_destinatario,
              funcion_destinatario: responsible.funcion,
              fecha: date,
              hora_inicio: body.hora_inicio,
              hora_fin: body.hora_fin,
              motivo: body.motivo,
              estado: 'pendiente',
            },
          });
          await tx.citaMovimiento.create({
            data: {
              id_cita: cita.id_cita,
              id_usuario_actor: userId,
              accion: 'creada',
              estado_nuevo: 'pendiente',
              fecha_nueva: date,
              hora_inicio_nueva: body.hora_inicio,
              hora_fin_nueva: body.hora_fin,
              comentario: body.motivo,
            },
          });
          return tx.cita.findUniqueOrThrow({
            where: { id_cita: cita.id_cita },
            include: citaInclude,
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new ConflictException(
          'La agenda cambió mientras guardabas. Revisa el horario e inténtalo de nuevo.',
        );
      }
      throw error;
    }
  }

  private async createTransaction(
    userId: number,
    query: CitasScopeDto,
    body: CitaCreateDto,
    parentMode: boolean,
  ) {
    if (!body.id_matricula || !body.id_apoderado) {
      throw new BadRequestException(
        'La cita individual exige matrícula y apoderado.',
      );
    }
    const enrollmentId = body.id_matricula;
    const parentId = body.id_apoderado;
    const date = validateCitaSchedule(
      body.fecha,
      body.hora_inicio,
      body.hora_fin,
    );
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const enrollment = await this.loadEnrollment(tx, enrollmentId);
          const schoolId = this.enrollmentSchoolId(enrollment);
          const tenantId = this.enrollmentTenantId(enrollment);
          if (schoolId !== body.id_colegio || tenantId !== query.tenant_id) {
            throw new NotFoundException(
              'Matrícula no disponible en el colegio indicado.',
            );
          }

          if (parentMode) {
            const resolvedParentId = await this.parentId(tx, userId);
            if (resolvedParentId !== parentId) {
              throw new ForbiddenException('Apoderado no autorizado.');
            }
            this.assertParentEnrollment(enrollment, resolvedParentId);
          } else {
            const scope = await this.resolveScope(tx, userId, query);
            if (
              !scope.schoolIds.includes(schoolId) ||
              !this.isManager(scope, schoolId)
            ) {
              throw new ForbiddenException(
                'No tienes permiso para crear citas en este colegio.',
              );
            }
            this.assertParentEnrollment(enrollment, parentId, 'bad-request');
          }

          const recipient = await this.validateRecipient(tx, enrollment, body);
          await this.assertNoOverlap(
            tx,
            body.tipo_destinatario === 'staff' ? body.id_destinatario : null,
            body.tipo_destinatario === 'docente' ? body.id_destinatario : null,
            recipient.id_persona,
            date,
            body.hora_inicio,
            body.hora_fin,
          );

          const cita = await tx.cita.create({
            data: {
              id_tenant: tenantId,
              id_colegio: schoolId,
              id_staff:
                body.tipo_destinatario === 'staff'
                  ? body.id_destinatario
                  : null,
              id_docente:
                body.tipo_destinatario === 'docente'
                  ? body.id_destinatario
                  : null,
              id_apoderado: parentId,
              id_matricula: enrollmentId,
              id_seccion: null,
              tipo: 'individual',
              contexto_destinatario: body.contexto_destinatario,
              funcion_destinatario: recipient.funcion,
              fecha: date,
              hora_inicio: body.hora_inicio,
              hora_fin: body.hora_fin,
              motivo: body.motivo,
              estado: 'pendiente',
            },
          });
          await tx.citaMovimiento.create({
            data: {
              id_cita: cita.id_cita,
              id_usuario_actor: userId,
              accion: 'creada',
              estado_nuevo: 'pendiente',
              fecha_nueva: date,
              hora_inicio_nueva: body.hora_inicio,
              hora_fin_nueva: body.hora_fin,
              comentario: body.motivo,
            },
          });
          return tx.cita.findUniqueOrThrow({
            where: { id_cita: cita.id_cita },
            include: citaInclude,
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new ConflictException(
          'La agenda cambió mientras guardabas. Revisa el horario e inténtalo de nuevo.',
        );
      }
      throw error;
    }
  }

  private async writeStateChange(
    tx: Prisma.TransactionClient,
    userId: number,
    cita: CitaRecord,
    estado: string,
    comentario?: string,
  ) {
    await tx.cita.update({
      where: { id_cita: cita.id_cita },
      data: { estado },
    });
    await tx.citaMovimiento.create({
      data: {
        id_cita: cita.id_cita,
        id_usuario_actor: userId,
        accion: estado,
        estado_anterior: cita.estado,
        estado_nuevo: estado,
        comentario,
      },
    });
    return tx.cita.findUniqueOrThrow({
      where: { id_cita: cita.id_cita },
      include: citaInclude,
    });
  }

  private async authorizedInternalRecord(
    db: Db,
    userId: number,
    query: CitasScopeDto,
    id: number,
  ) {
    const scope = await this.resolveScope(db, userId, query);
    const cita = await db.cita.findFirst({
      where: { AND: [{ id_cita: id }, this.schoolWhere(scope)] },
      include: citaInclude,
    });
    if (!cita) {
      throw new NotFoundException(
        'Cita no disponible en el alcance autorizado.',
      );
    }
    const schoolId = this.recordSchoolId(cita);
    const recipient =
      cita.id_docente === scope.personId ||
      cita.staff?.id_persona === scope.personId;
    if (!this.isManager(scope, schoolId) && !recipient) {
      throw new NotFoundException(
        'Cita no disponible en el alcance autorizado.',
      );
    }
    return { cita, scope, recipient };
  }

  private async parentId(db: Db, userId: number) {
    const user = await db.usuario.findUnique({
      where: { id_usuario: userId },
      select: {
        estado: true,
        persona: {
          select: { apoderados: { select: { id_persona: true } } },
        },
      },
    });
    const id = user?.estado ? user.persona.apoderados[0]?.id_persona : null;
    if (!id) {
      throw new ForbiddenException(
        'No existe un perfil de apoderado activo para esta cuenta.',
      );
    }
    return id;
  }

  private async loadEnrollment(db: Db, id: number) {
    const enrollment = await db.matricula.findFirst({
      where: {
        id_matricula: id,
        estado_matricula: { in: ESTADOS_MATRICULA_ACTIVA },
        OR: [
          {
            colegio: {
              estado: 'Activo',
              tenant: { estado: 'Activo' },
            },
          },
          {
            id_colegio: null,
            seccion: {
              colegio: {
                estado: 'Activo',
                tenant: { estado: 'Activo' },
              },
            },
          },
        ],
      },
      include: {
        colegio: {
          select: { id_colegio: true, id_tenant: true, nombre: true },
        },
        seccion: {
          include: {
            colegio: {
              select: { id_colegio: true, id_tenant: true, nombre: true },
            },
            grado: { include: { nivel: true } },
          },
        },
        anio: true,
        estudiante: {
          include: {
            persona: true,
            apoderados: {
              include: { apoderado: { include: { persona: true } } },
            },
          },
        },
      },
    });
    if (!enrollment) {
      throw new NotFoundException('Matrícula activa no disponible.');
    }
    return enrollment;
  }

  private enrollmentSchoolId(
    enrollment: Awaited<ReturnType<CitasService['loadEnrollment']>>,
  ) {
    if (
      enrollment.id_colegio &&
      enrollment.id_colegio !== enrollment.seccion.id_colegio
    ) {
      throw new ConflictException(
        'La matrícula tiene un contexto institucional inconsistente.',
      );
    }
    const id = enrollment.id_colegio ?? enrollment.seccion.id_colegio;
    if (!id) {
      throw new ConflictException(
        'La matrícula no tiene un colegio verificable.',
      );
    }
    return id;
  }

  private enrollmentTenantId(
    enrollment: Awaited<ReturnType<CitasService['loadEnrollment']>>,
  ) {
    const id =
      enrollment.colegio?.id_tenant ?? enrollment.seccion.colegio?.id_tenant;
    if (!id) {
      throw new ConflictException(
        'La matrícula no tiene una organización verificable.',
      );
    }
    if (enrollment.id_tenant && enrollment.id_tenant !== id) {
      throw new ConflictException(
        'La matrícula tiene una organización inconsistente.',
      );
    }
    return id;
  }

  private assertParentEnrollment(
    enrollment: Awaited<ReturnType<CitasService['loadEnrollment']>>,
    parentId: number,
    rejection: 'not-found' | 'bad-request' = 'not-found',
  ) {
    if (
      !enrollment.estudiante.apoderados.some(
        (item) => item.id_apoderado === parentId,
      )
    ) {
      if (rejection === 'bad-request') {
        throw new BadRequestException(
          'El apoderado seleccionado no está vinculado al estudiante de esta matrícula.',
        );
      }
      throw new NotFoundException(
        'El apoderado no está vinculado al estudiante de esta matrícula.',
      );
    }
  }

  private async recipientOptions(
    db: Db,
    enrollment: Awaited<ReturnType<CitasService['loadEnrollment']>>,
  ) {
    const schoolId = this.enrollmentSchoolId(enrollment);
    const tenantId = this.enrollmentTenantId(enrollment);
    const [assignments, tutors, staff] = await Promise.all([
      db.asignacionDocente.findMany({
        where: {
          id_seccion: enrollment.id_seccion,
          id_anio: enrollment.id_anio,
          AND: [
            { OR: [{ id_colegio: schoolId }, { id_colegio: null }] },
            { OR: [{ id_tenant: tenantId }, { id_tenant: null }] },
          ],
        },
        include: { docente: { include: { persona: true } }, curso: true },
      }),
      db.staff.findMany({
        where: {
          id_seccion: enrollment.id_seccion,
          es_tutor: true,
          persona: { docentes: { some: {} } },
        },
        include: { persona: { include: { docentes: true } } },
      }),
      db.staff.findMany({
        where: {
          es_miembro_staff: true,
          permite_citas: true,
          AND: [
            {
              OR: [
                { id_colegio: schoolId },
                { id_colegio: null, seccion: { id_colegio: schoolId } },
              ],
            },
            { OR: [{ id_tenant: tenantId }, { id_tenant: null }] },
          ],
        },
        include: { persona: true },
      }),
    ]);

    const courses = new Map<
      number,
      {
        person: (typeof assignments)[number]['docente']['persona'];
        names: Set<string>;
      }
    >();
    for (const assignment of assignments) {
      const current = courses.get(assignment.id_docente) ?? {
        person: assignment.docente.persona,
        names: new Set<string>(),
      };
      current.names.add(assignment.curso.nombre_curso);
      courses.set(assignment.id_docente, current);
    }

    const options: Array<{
      key: string;
      tipo: 'staff' | 'docente';
      id_destinatario: number;
      id_persona: number;
      nombre: string;
      contexto: 'staff' | 'docente' | 'tutor';
      funcion: string;
      detalle: string;
    }> = [];
    for (const [id, item] of courses) {
      const names = Array.from(item.names).sort((a, b) =>
        a.localeCompare(b, 'es'),
      );
      options.push({
        key: `docente:${id}:docente`,
        tipo: 'docente',
        id_destinatario: id,
        id_persona: id,
        nombre: fullName(item.person),
        contexto: 'docente',
        funcion: names.length ? `Docente · ${names.join(', ')}` : 'Docente',
        detalle: this.sectionLabel(enrollment.seccion),
      });
    }
    for (const tutor of tutors) {
      if (!tutor.persona.docentes.length) continue;
      options.push({
        key: `docente:${tutor.id_persona}:tutor`,
        tipo: 'docente',
        id_destinatario: tutor.id_persona,
        id_persona: tutor.id_persona,
        nombre: fullName(tutor.persona),
        contexto: 'tutor',
        funcion: `Tutor · ${this.sectionLabel(enrollment.seccion)}`,
        detalle: 'Tutor actual de la sección',
      });
    }
    for (const member of staff) {
      options.push({
        key: `staff:${member.id_staff}:staff`,
        tipo: 'staff',
        id_destinatario: member.id_staff,
        id_persona: member.id_persona,
        nombre: fullName(member.persona),
        contexto: 'staff',
        funcion: member.cargo,
        detalle: member.area,
      });
    }
    return Array.from(
      new Map(options.map((item) => [item.key, item])).values(),
    ).sort(
      (a, b) =>
        a.nombre.localeCompare(b.nombre, 'es') ||
        a.funcion.localeCompare(b.funcion, 'es'),
    );
  }

  private async validateRecipient(
    db: Db,
    enrollment: Awaited<ReturnType<CitasService['loadEnrollment']>>,
    body: Pick<
      CitaCreateDto,
      'tipo_destinatario' | 'id_destinatario' | 'contexto_destinatario'
    >,
  ) {
    if (
      (body.tipo_destinatario === 'staff' &&
        body.contexto_destinatario !== 'staff') ||
      (body.tipo_destinatario === 'docente' &&
        body.contexto_destinatario === 'staff')
    ) {
      throw new BadRequestException(
        'El contexto no corresponde al tipo de destinatario.',
      );
    }
    const options = await this.recipientOptions(db, enrollment);
    const recipient = options.find(
      (item) =>
        item.tipo === body.tipo_destinatario &&
        item.id_destinatario === body.id_destinatario &&
        item.contexto === body.contexto_destinatario,
    );
    if (!recipient) {
      throw new NotFoundException(
        body.tipo_destinatario === 'staff'
          ? 'El miembro de Staff no acepta citas o no pertenece al colegio.'
          : 'El docente no está relacionado con la matrícula indicada.',
      );
    }
    return recipient;
  }

  private async assertNoOverlap(
    db: Db,
    staffId: number | null,
    docenteId: number | null,
    personId: number | null,
    fecha: Date,
    horaInicio: string,
    horaFin: string,
    excludeId?: number,
  ) {
    const overlap = await db.cita.findFirst({
      where: {
        id_cita: excludeId ? { not: excludeId } : undefined,
        OR: [
          ...(staffId ? [{ id_staff: staffId }] : []),
          ...(docenteId ? [{ id_docente: docenteId }] : []),
          ...(personId
            ? [{ id_docente: personId }, { staff: { id_persona: personId } }]
            : []),
        ],
        fecha,
        estado: { in: ACTIVE_STATES },
        hora_inicio: { lt: horaFin },
        hora_fin: { gt: horaInicio },
      },
      select: { id_cita: true },
    });
    if (overlap) {
      throw new ConflictException(
        'El destinatario ya tiene una cita en ese horario.',
      );
    }
  }

  private recordSchoolId(cita: CitaRecord) {
    const id =
      cita.id_colegio ??
      cita.seccion?.id_colegio ??
      cita.staff?.id_colegio ??
      cita.staff?.seccion?.id_colegio ??
      cita.matricula?.id_colegio;
    if (!id) {
      throw new NotFoundException(
        'La cita histórica no tiene un colegio verificable.',
      );
    }
    return id;
  }

  private sectionLabel(section: {
    letra: string;
    grado: { nombre_grado: string; nivel: { nombre_nivel: string } };
  }) {
    return `${section.grado.nombre_grado} ${section.grado.nivel.nombre_nivel} "${section.letra}"`;
  }

  private async sectionAudience(db: Db, sectionId: number) {
    const enrollments = await db.matricula.findMany({
      where: {
        id_seccion: sectionId,
        estado_matricula: { in: ESTADOS_MATRICULA_ACTIVA },
      },
      select: {
        id_matricula: true,
        estudiante: {
          select: {
            id_persona: true,
            persona: {
              select: {
                nombres: true,
                apellido_paterno: true,
                apellido_materno: true,
              },
            },
            apoderados: {
              select: {
                id_apoderado: true,
                parentesco: true,
                apoderado: {
                  select: {
                    persona: {
                      select: {
                        nombres: true,
                        apellido_paterno: true,
                        apellido_materno: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { id_matricula: 'asc' },
    });
    const students = Array.from(
      new Map(
        enrollments.map((enrollment) => [
          enrollment.estudiante.id_persona,
          {
            id_estudiante: enrollment.estudiante.id_persona,
            nombre: fullName(enrollment.estudiante.persona),
          },
        ]),
      ).values(),
    );
    const families = Array.from(
      new Map(
        enrollments.flatMap((enrollment) =>
          enrollment.estudiante.apoderados.map(
            (relationship) =>
              [
                relationship.id_apoderado,
                {
                  id_apoderado: relationship.id_apoderado,
                  nombre: fullName(relationship.apoderado.persona),
                  parentesco: relationship.parentesco,
                },
              ] as const,
          ),
        ),
      ).values(),
    );
    return {
      familias_convocadas: families.length,
      estudiantes: students.length,
      familias: families,
      lista_estudiantes: students,
    };
  }

  private permissionsFor(
    cita: CitaRecord,
    scope: Scope | null,
    parent: boolean,
  ) {
    const recipient = scope
      ? cita.id_docente === scope.personId ||
        cita.staff?.id_persona === scope.personId
      : false;
    // El apoderado puede consultar una cita histórica propia aun cuando el
    // registro legacy no tenga todavía colegio/matrícula estructurados. La
    // agenda interna, en cambio, nunca gestiona un recurso sin colegio probado.
    const manages = scope
      ? this.isManager(scope, this.recordSchoolId(cita))
      : false;
    const canOperate = manages || recipient;
    return {
      confirmar: canOperate && canTransition(cita.estado, 'confirmada'),
      rechazar:
        cita.tipo !== 'seccion' &&
        canOperate &&
        canTransition(cita.estado, 'rechazada'),
      reprogramar: canOperate && ACTIVE_STATES.includes(cita.estado),
      cancelar:
        (canOperate || parent) && canTransition(cita.estado, 'cancelada'),
      realizar: canOperate && canTransition(cita.estado, 'realizada'),
      acuerdos: canOperate && ['confirmada', 'realizada'].includes(cita.estado),
    };
  }

  formatCita(
    cita: CitaRecord,
    permisos?: ReturnType<CitasService['permissionsFor']>,
    audiencia?: Awaited<ReturnType<CitasService['sectionAudience']>>,
  ) {
    const destinationPerson = cita.staff?.persona ?? cita.docente?.persona;
    const agreements = cita.movimientos.filter(
      (item) => item.accion === 'acuerdos',
    );
    return {
      id_cita: cita.id_cita,
      tipo: cita.tipo,
      id_tenant: cita.id_tenant,
      id_colegio: cita.id_colegio,
      fecha: cita.fecha,
      hora_inicio: cita.hora_inicio,
      hora_fin: cita.hora_fin,
      motivo: cita.motivo,
      estado: cita.estado,
      creado_en: cita.creado_en,
      actualizado_en: cita.actualizado_en,
      legacy: cita.tipo === 'individual' && !cita.id_matricula,
      colegio: cita.colegio
        ? { id_colegio: cita.colegio.id_colegio, nombre: cita.colegio.nombre }
        : null,
      apoderado: cita.apoderado
        ? {
            id_apoderado: cita.apoderado.id_persona,
            nombre: fullName(cita.apoderado.persona),
            telefono: cita.apoderado.persona.telefono,
          }
        : null,
      estudiante: cita.matricula
        ? {
            id_matricula: cita.matricula.id_matricula,
            id_estudiante: cita.matricula.id_estudiante,
            codigo: cita.matricula.estudiante.codigo_estudiante,
            nombre: fullName(cita.matricula.estudiante.persona),
            seccion: this.sectionLabel(cita.matricula.seccion),
            anio: cita.matricula.anio.nombre_anio,
          }
        : null,
      seccion: cita.seccion
        ? {
            id_seccion: cita.seccion.id_seccion,
            nombre: this.sectionLabel(cita.seccion),
          }
        : null,
      audiencia: audiencia ?? null,
      destinatario: {
        tipo: cita.id_staff ? 'staff' : 'docente',
        id_destinatario: cita.id_staff ?? cita.id_docente,
        id_persona: destinationPerson?.id_persona ?? null,
        nombre: fullName(destinationPerson) || 'Destinatario histórico',
        contexto: cita.contexto_destinatario,
        funcion:
          cita.funcion_destinatario ??
          cita.staff?.cargo ??
          (cita.contexto_destinatario === 'tutor' ? 'Tutor' : 'Docente'),
      },
      historial: cita.movimientos.map((item) => ({
        id_movimiento: item.id_movimiento,
        accion: item.accion,
        estado_anterior: item.estado_anterior,
        estado_nuevo: item.estado_nuevo,
        fecha_anterior: item.fecha_anterior,
        fecha_nueva: item.fecha_nueva,
        hora_inicio_anterior: item.hora_inicio_anterior,
        hora_fin_anterior: item.hora_fin_anterior,
        hora_inicio_nueva: item.hora_inicio_nueva,
        hora_fin_nueva: item.hora_fin_nueva,
        comentario: item.comentario,
        creado_en: item.creado_en,
        actor: item.actor
          ? {
              id_usuario: item.actor.id_usuario,
              nombre: fullName(item.actor.persona) || item.actor.username,
            }
          : null,
      })),
      acuerdos: agreements.map((item) => ({
        id_movimiento: item.id_movimiento,
        texto: item.comentario,
        creado_en: item.creado_en,
        actor: item.actor
          ? fullName(item.actor.persona) || item.actor.username
          : 'Actor histórico',
      })),
      permisos,
    };
  }

  private async notifyRecipient(cita: CitaRecord) {
    const personId = cita.staff?.id_persona ?? cita.docente?.id_persona;
    const schoolId = this.recordSchoolId(cita);
    if (!personId) return;
    try {
      const users = await this.prisma.usuario.findMany({
        where: {
          id_persona: personId,
          estado: true,
          colegios: { some: { id_colegio: schoolId, estado: 'Activo' } },
        },
        select: { id_usuario: true },
      });
      const userIds = Array.from(new Set(users.map((user) => user.id_usuario)));
      await Promise.all(
        userIds.map((userId) =>
          this.notificaciones.crearNotificacion({
            id_usuario: userId,
            id_tenant: cita.id_tenant,
            id_colegio: schoolId,
            tipo:
              cita.tipo === 'seccion'
                ? 'cita.seccion.creada.responsable'
                : 'cita_solicitada',
            origen: 'citas',
            referencia_tipo: 'cita',
            referencia_id: cita.id_cita,
            canal: 'intranet',
            titulo:
              cita.tipo === 'seccion'
                ? 'Nueva reunión de sección'
                : 'Nueva solicitud de cita',
            mensaje:
              cita.tipo === 'seccion'
                ? `Se registró una reunión de ${cita.seccion ? this.sectionLabel(cita.seccion) : 'sección'} para el ${cita.fecha.toISOString().slice(0, 10)}.`
                : `${fullName(cita.apoderado?.persona)} propuso una cita para el ${cita.fecha.toISOString().slice(0, 10)}.`,
            url: `/citas?cita=${cita.id_cita}`,
          }),
        ),
      );
    } catch (error) {
      this.logger.warn(
        `No se pudo emitir la notificación de creación de la cita ${cita.id_cita}: ${String(error)}`,
      );
    }
  }

  private async notifyFamily(cita: CitaRecord, action: string) {
    if (cita.tipo === 'seccion') {
      if (action === 'reprogramada' || action === 'cancelada') {
        await this.notifySectionFamilies(cita, action);
      }
      return;
    }
    if (!cita.id_apoderado) return;
    try {
      const users = await this.prisma.usuario.findMany({
        where: { id_persona: cita.id_apoderado, estado: true },
        select: { id_usuario: true },
      });
      const userIds = Array.from(new Set(users.map((user) => user.id_usuario)));
      await Promise.all(
        userIds.map((userId) =>
          this.notificaciones.crearNotificacion({
            id_usuario: userId,
            id_tenant: cita.id_tenant,
            id_colegio: this.recordSchoolId(cita),
            tipo: `cita_${action}`,
            origen: 'citas',
            referencia_tipo: 'cita',
            referencia_id: cita.id_cita,
            canal: 'padres',
            titulo: 'Actualización de cita',
            mensaje: `La cita del ${cita.fecha.toISOString().slice(0, 10)} fue ${action}.`,
            url: `/dashboard/citas?cita=${cita.id_cita}`,
          }),
        ),
      );
    } catch (error) {
      this.logger.warn(
        `No se pudo emitir la notificación de la cita ${cita.id_cita}: ${String(error)}`,
      );
    }
  }

  private async notifySectionFamilies(
    cita: CitaRecord,
    action: 'creada' | 'reprogramada' | 'cancelada',
  ) {
    if (!cita.id_seccion) return;
    try {
      const audience = await this.sectionAudience(this.prisma, cita.id_seccion);
      const users = audience.familias.length
        ? await this.prisma.usuario.findMany({
            where: {
              id_persona: {
                in: audience.familias.map((item) => item.id_apoderado),
              },
              estado: true,
            },
            select: { id_usuario: true },
          })
        : [];
      const actionLabels = {
        creada: 'programada',
        reprogramada: 'reprogramada',
        cancelada: 'cancelada',
      } as const;
      const userIds = Array.from(new Set(users.map((user) => user.id_usuario)));
      await Promise.all(
        userIds.map((userId) =>
          this.notificaciones.crearNotificacion({
            id_usuario: userId,
            id_tenant: cita.id_tenant,
            id_colegio: this.recordSchoolId(cita),
            tipo: `cita.seccion.${action}`,
            origen: 'citas',
            referencia_tipo: 'cita',
            referencia_id: cita.id_cita,
            canal: 'padres',
            titulo: 'Reunión de sección',
            mensaje: `La reunión de ${cita.seccion ? this.sectionLabel(cita.seccion) : 'la sección'} fue ${actionLabels[action]}.`,
            url: `/dashboard/citas?cita=${cita.id_cita}`,
          }),
        ),
      );
    } catch (error) {
      this.logger.warn(
        `No se pudo emitir el evento cita.seccion.${action} de la cita ${cita.id_cita}: ${String(error)}`,
      );
    }
  }
}
