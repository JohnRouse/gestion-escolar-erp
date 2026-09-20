import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  ActualizarEventoDto,
  CancelarEventoDto,
  CrearEventoDto,
  EventoAudienciaDto,
  EventosScopeDto,
  ListarEventosDto,
  ListarEventosPadresDto,
  OpcionesEventosDto,
} from './dto/eventos.dto';

const ROLES_EVENTOS = ['admin', 'director', 'secretaria', 'profesor'];
const ROLES_GESTION = ['admin', 'director', 'secretaria'];
const ESTADOS_MATRICULA_OPERATIVA = [
  'Activo',
  'Matriculado',
  'Pre-matriculado',
];
const ESTADOS_ANIO_ACTUAL = new Set([
  'abierto',
  'en curso',
  'activo',
  'matricula abierta',
]);
const ESTADO_ANIO_PLANIFICACION = 'planificacion';

const EVENTO_INCLUDE = Prisma.validator<Prisma.EventoInclude>()({
  colegio: { select: { id_colegio: true, nombre: true } },
  anio: { select: { id_anio: true, nombre_anio: true } },
  creado_por: {
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
  actualizado_por: {
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
  destinatarios: {
    include: {
      nivel: true,
      grado: { include: { nivel: true } },
      seccion: { include: { grado: { include: { nivel: true } } } },
    },
  },
  movimientos: {
    orderBy: { creado_en: 'desc' },
    include: {
      actor: {
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
});

type EventoCompleto = Prisma.EventoGetPayload<{
  include: typeof EVENTO_INCLUDE;
}>;
type DbClient = Prisma.TransactionClient | PrismaService;
type Membership = {
  id_colegio: number;
  rol_colegio: string;
  colegio: { id_tenant: number };
};

export function eventPortalUrl(event: {
  id_evento: number;
  id_anio: number;
  fecha: Date;
}) {
  return `/dashboard/calendario?anio_id=${event.id_anio}&mes=${event.fecha.getUTCMonth() + 1}&dia=${event.fecha.getUTCDate()}&evento_id=${event.id_evento}`;
}

function normalizeRole(value: unknown) {
  const source =
    typeof value === 'string' || typeof value === 'number' ? String(value) : '';
  const normalized = source
    .trim()
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (['admin', 'administrador'].includes(normalized)) return 'admin';
  if (['director', 'direccion'].includes(normalized)) return 'director';
  if (['secretaria', 'tesoreria'].includes(normalized)) return 'secretaria';
  if (['profesor', 'docente'].includes(normalized)) return 'profesor';
  if (['apoderado', 'padre', 'madre'].includes(normalized)) {
    return 'apoderado';
  }
  return normalized;
}

function personName(
  user?: {
    persona?: {
      nombres: string;
      apellido_paterno: string;
      apellido_materno: string;
    } | null;
  } | null,
) {
  if (!user?.persona) return null;
  return [
    user.persona.nombres,
    user.persona.apellido_paterno,
    user.persona.apellido_materno,
  ]
    .filter(Boolean)
    .join(' ');
}

function dateOnly(value: string, label = 'fecha') {
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    !year ||
    !month ||
    !day ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new BadRequestException(`La ${label} no es válida.`);
  }
  return parsed;
}

function normalizeState(value: unknown) {
  const source =
    typeof value === 'string' || typeof value === 'number' ? String(value) : '';
  return source
    .trim()
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function operationalYearPriority(state: unknown) {
  const normalized = normalizeState(state);
  if (ESTADOS_ANIO_ACTUAL.has(normalized)) return 0;
  if (normalized === ESTADO_ANIO_PLANIFICACION) return 1;
  return null;
}

function utcDateStamp(value: Date) {
  return Date.UTC(
    value.getUTCFullYear(),
    value.getUTCMonth(),
    value.getUTCDate(),
  );
}

function audienceFromRows(rows: EventoCompleto['destinatarios']) {
  const type = rows[0]?.tipo_destino as EventoAudienciaDto['tipo'] | undefined;
  if (!type) return { tipo: 'colegio' as const, ids: [] };
  const ids = rows
    .map((row) =>
      type === 'niveles'
        ? row.id_nivel
        : type === 'grados'
          ? row.id_grado
          : type === 'secciones'
            ? row.id_seccion
            : null,
    )
    .filter((id): id is number => id !== null)
    .sort((a, b) => a - b);
  return { tipo: type, ids };
}

@Injectable()
export class EventosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacionesService: NotificacionesService,
  ) {}

  private validateTimes(start?: string | null, end?: string | null) {
    if (end && !start) {
      throw new BadRequestException(
        'Indica la hora de inicio cuando existe una hora de fin.',
      );
    }
    if (start && end && end <= start) {
      throw new BadRequestException(
        'La hora de fin debe ser posterior a la hora de inicio.',
      );
    }
  }

  private async actorContext(actorId: number, db: DbClient = this.prisma) {
    const actor = await db.usuario.findUnique({
      where: { id_usuario: actorId },
      select: {
        id_persona: true,
        estado: true,
        rol: { select: { nombre_rol: true } },
        tenants: {
          where: { estado: 'Activo', tenant: { estado: 'Activo' } },
          select: { id_tenant: true },
        },
        colegios: {
          where: { estado: 'Activo', colegio: { estado: 'Activo' } },
          select: {
            id_colegio: true,
            rol_colegio: true,
            colegio: { select: { id_tenant: true } },
          },
        },
      },
    });
    const role = normalizeRole(actor?.rol.nombre_rol);
    if (!actor?.estado || !ROLES_EVENTOS.includes(role)) {
      throw new ForbiddenException('No tienes acceso al módulo de eventos.');
    }
    const colegios = actor.colegios.filter((item) =>
      ROLES_EVENTOS.includes(normalizeRole(item.rol_colegio)),
    ) as Membership[];
    return { ...actor, role, colegios };
  }

  private async resolveScope(
    actorId: number,
    query: EventosScopeDto,
    db: DbClient = this.prisma,
  ) {
    if (query.scope === 'all' && query.colegio_id) {
      throw new BadRequestException(
        'Selecciona todos los colegios o un colegio específico.',
      );
    }
    const actor = await this.actorContext(actorId, db);
    const tenantIds = [...new Set(actor.tenants.map((item) => item.id_tenant))];
    const tenantId = query.tenant_id ?? tenantIds[0];
    if (!tenantId || !tenantIds.includes(tenantId)) {
      throw new NotFoundException('Alcance de eventos no disponible.');
    }
    if (!query.tenant_id && tenantIds.length !== 1) {
      throw new BadRequestException(
        'Selecciona el tenant para consultar los eventos.',
      );
    }
    const memberships = actor.colegios.filter(
      (item) => item.colegio.id_tenant === tenantId,
    );
    if (query.colegio_id) {
      const selected = memberships.find(
        (item) => item.id_colegio === query.colegio_id,
      );
      if (!selected) {
        throw new NotFoundException('Alcance de eventos no disponible.');
      }
      return { actor, tenantId, memberships: [selected] };
    }
    if (query.scope === 'all') {
      if (!['admin', 'director'].includes(actor.role)) {
        throw new ForbiddenException(
          'Tu rol no permite usar el alcance consolidado de eventos.',
        );
      }
      if (!memberships.length) {
        throw new NotFoundException('Alcance de eventos no disponible.');
      }
      return { actor, tenantId, memberships };
    }
    if (memberships.length !== 1) {
      throw new BadRequestException('Selecciona un colegio para continuar.');
    }
    return { actor, tenantId, memberships };
  }

  private canManage(actorRole: string, membershipRole: string) {
    return (
      ROLES_GESTION.includes(actorRole) &&
      ROLES_GESTION.includes(normalizeRole(membershipRole))
    );
  }

  private async requireManagement(
    actorId: number,
    tenantId: number,
    schoolId: number,
    db: DbClient = this.prisma,
  ) {
    const scope = await this.resolveScope(
      actorId,
      { tenant_id: tenantId, colegio_id: schoolId },
      db,
    );
    const membership = scope.memberships[0];
    if (!this.canManage(scope.actor.role, membership.rol_colegio)) {
      throw new ForbiddenException(
        'Tu rol no permite gestionar eventos en esta institución.',
      );
    }
    return scope;
  }

  private async requireYear(
    tenantId: number,
    schoolId: number,
    yearId: number,
    db: DbClient = this.prisma,
  ) {
    const year = await db.anioLectivo.findFirst({
      where: {
        id_anio: yearId,
        id_tenant: tenantId,
        id_colegio: schoolId,
        colegio: { id_tenant: tenantId },
      },
      select: {
        id_anio: true,
        nombre_anio: true,
        fecha_inicio: true,
        fecha_fin: true,
        estado: true,
      },
    });
    if (!year) throw new NotFoundException('Año lectivo no disponible.');
    return year;
  }

  private validateOperationalYear(state: string) {
    if (operationalYearPriority(state) === null) {
      throw new BadRequestException(
        'El año lectivo seleccionado no está disponible para crear eventos.',
      );
    }
  }

  private validateEventDate(
    eventDate: Date,
    year: { fecha_inicio: Date; fecha_fin: Date },
  ) {
    const value = utcDateStamp(eventDate);
    if (
      value < utcDateStamp(year.fecha_inicio) ||
      value > utcDateStamp(year.fecha_fin)
    ) {
      throw new BadRequestException(
        'La fecha del evento no corresponde al año lectivo seleccionado.',
      );
    }
  }

  private normalizeAudience(audience: EventoAudienciaDto) {
    const ids = [...new Set(audience.ids ?? [])].sort((a, b) => a - b);
    if (audience.tipo === 'colegio') {
      if (ids.length) {
        throw new BadRequestException(
          'La audiencia de todo el colegio no recibe IDs adicionales.',
        );
      }
      return { tipo: audience.tipo, ids };
    }
    if (!ids.length) {
      throw new BadRequestException(
        'Selecciona al menos un destino para la audiencia.',
      );
    }
    return { tipo: audience.tipo, ids };
  }

  private async validateAudience(
    tenantId: number,
    schoolId: number,
    yearId: number,
    input: EventoAudienciaDto,
    db: DbClient = this.prisma,
  ) {
    const audience = this.normalizeAudience(input);
    if (audience.tipo === 'colegio') {
      return {
        audience,
        rows: [
          { tipo_destino: 'colegio' },
        ] as Prisma.EventoDestinatarioCreateWithoutEventoInput[],
      };
    }
    const sectionYears = await db.seccionAnio.findMany({
      where: {
        id_tenant: tenantId,
        id_colegio: schoolId,
        id_anio: yearId,
        estado: 'Activo',
        colegio: { id_tenant: tenantId },
        anio: { id_tenant: tenantId, id_colegio: schoolId },
        seccion:
          audience.tipo === 'niveles'
            ? {
                id_tenant: tenantId,
                id_colegio: schoolId,
                grado: { id_nivel: { in: audience.ids } },
              }
            : audience.tipo === 'grados'
              ? {
                  id_tenant: tenantId,
                  id_colegio: schoolId,
                  id_grado: { in: audience.ids },
                }
              : {
                  id_tenant: tenantId,
                  id_colegio: schoolId,
                  id_seccion: { in: audience.ids },
                },
      },
      select: {
        id_seccion: true,
        seccion: {
          select: { id_grado: true, grado: { select: { id_nivel: true } } },
        },
      },
    });
    const found = new Set(
      sectionYears.map((item) =>
        audience.tipo === 'niveles'
          ? item.seccion.grado.id_nivel
          : audience.tipo === 'grados'
            ? item.seccion.id_grado
            : item.id_seccion,
      ),
    );
    if (audience.ids.some((id) => !found.has(id))) {
      throw new BadRequestException(
        'La audiencia contiene un nivel, grado o sección ajeno al colegio y año seleccionados.',
      );
    }
    const rows = audience.ids.map((id) => ({
      tipo_destino: audience.tipo,
      ...(audience.tipo === 'niveles' ? { id_nivel: id } : {}),
      ...(audience.tipo === 'grados' ? { id_grado: id } : {}),
      ...(audience.tipo === 'secciones' ? { id_seccion: id } : {}),
    })) as Prisma.EventoDestinatarioCreateWithoutEventoInput[];
    return { audience, rows };
  }

  private accessWhere(
    actorRole: string,
    memberships: Membership[],
    assignments: Array<{
      id_colegio: number | null;
      id_anio: number;
      id_seccion: number;
      seccion: { id_grado: number; grado: { id_nivel: number } };
    }>,
  ): Prisma.EventoWhereInput {
    const managerSchools = memberships
      .filter((item) => this.canManage(actorRole, item.rol_colegio))
      .map((item) => item.id_colegio);
    const readerSchools = memberships
      .filter((item) => !managerSchools.includes(item.id_colegio))
      .map((item) => item.id_colegio);
    const branches: Prisma.EventoWhereInput[] = [];
    if (managerSchools.length)
      branches.push({ id_colegio: { in: managerSchools } });
    for (const schoolId of readerSchools) {
      branches.push({
        id_colegio: schoolId,
        destinatarios: { some: { tipo_destino: 'colegio' } },
      });
      const byYear = new Map<number, typeof assignments>();
      for (const assignment of assignments.filter(
        (item) => item.id_colegio === schoolId,
      )) {
        byYear.set(assignment.id_anio, [
          ...(byYear.get(assignment.id_anio) ?? []),
          assignment,
        ]);
      }
      for (const [yearId, items] of byYear) {
        branches.push({
          id_colegio: schoolId,
          id_anio: yearId,
          destinatarios: {
            some: {
              OR: [
                {
                  tipo_destino: 'niveles',
                  id_nivel: {
                    in: [
                      ...new Set(
                        items.map((item) => item.seccion.grado.id_nivel),
                      ),
                    ],
                  },
                },
                {
                  tipo_destino: 'grados',
                  id_grado: {
                    in: [
                      ...new Set(items.map((item) => item.seccion.id_grado)),
                    ],
                  },
                },
                {
                  tipo_destino: 'secciones',
                  id_seccion: {
                    in: [...new Set(items.map((item) => item.id_seccion))],
                  },
                },
              ],
            },
          },
        });
      }
    }
    return branches.length ? { OR: branches } : { id_evento: -1 };
  }

  async obtenerEventos(actorId: number, query: ListarEventosDto) {
    const scope = await this.resolveScope(actorId, query);
    if (query.mes && !query.anio_id) {
      throw new BadRequestException(
        'Selecciona un año lectivo para filtrar por mes.',
      );
    }
    let dateFilter: Prisma.DateTimeFilter | undefined;
    if (query.anio_id && query.mes) {
      const year = await this.prisma.anioLectivo.findFirst({
        where: {
          id_anio: query.anio_id,
          id_tenant: scope.tenantId,
          id_colegio: { in: scope.memberships.map((item) => item.id_colegio) },
        },
        select: { fecha_inicio: true },
      });
      if (!year) throw new NotFoundException('Año lectivo no disponible.');
      const calendarYear = year.fecha_inicio.getUTCFullYear();
      dateFilter = {
        gte: new Date(Date.UTC(calendarYear, query.mes - 1, 1)),
        lt: new Date(Date.UTC(calendarYear, query.mes, 1)),
      };
    } else if (query.desde || query.hasta) {
      const from = query.desde
        ? dateOnly(query.desde, 'fecha inicial')
        : undefined;
      const until = query.hasta
        ? dateOnly(query.hasta, 'fecha final')
        : undefined;
      if (from && until && until < from) {
        throw new BadRequestException(
          'La fecha final no puede ser anterior a la fecha inicial.',
        );
      }
      dateFilter = {
        ...(from ? { gte: from } : {}),
        ...(until
          ? { lt: new Date(until.getTime() + 24 * 60 * 60 * 1000) }
          : {}),
      };
    }
    const assignments = await this.prisma.asignacionDocente.findMany({
      where: {
        id_docente: scope.actor.id_persona,
        id_tenant: scope.tenantId,
        id_colegio: { in: scope.memberships.map((item) => item.id_colegio) },
        ...(query.anio_id ? { id_anio: query.anio_id } : {}),
      },
      select: {
        id_colegio: true,
        id_anio: true,
        id_seccion: true,
        seccion: {
          select: {
            id_grado: true,
            grado: { select: { id_nivel: true } },
          },
        },
      },
    });
    const where: Prisma.EventoWhereInput = {
      id_tenant: scope.tenantId,
      id_colegio: { in: scope.memberships.map((item) => item.id_colegio) },
      ...(query.anio_id ? { id_anio: query.anio_id } : {}),
      ...(dateFilter ? { fecha: dateFilter } : {}),
      ...(query.estado ? { estado: query.estado } : {}),
      ...(query.tipo ? { tipo: query.tipo } : {}),
      AND: [
        this.accessWhere(scope.actor.role, scope.memberships, assignments),
        ...(query.q
          ? [
              {
                OR: [
                  { titulo: { contains: query.q } },
                  { descripcion: { contains: query.q } },
                  { ubicacion: { contains: query.q } },
                ],
              } as Prisma.EventoWhereInput,
            ]
          : []),
      ],
    };
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [items, total] = await Promise.all([
      this.prisma.evento.findMany({
        where,
        include: EVENTO_INCLUDE,
        orderBy: [
          { fecha: 'asc' },
          { hora_inicio: 'asc' },
          { id_evento: 'asc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.evento.count({ where }),
    ]);
    return {
      data: items.map((item) => this.serialize(item)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  private async canReadEvent(actorId: number, event: EventoCompleto) {
    if (!event.id_tenant || !event.id_colegio) return false;
    const scope = await this.resolveScope(actorId, {
      tenant_id: event.id_tenant,
      colegio_id: event.id_colegio,
    });
    const membership = scope.memberships[0];
    if (this.canManage(scope.actor.role, membership.rol_colegio)) return true;
    if (event.destinatarios.some((item) => item.tipo_destino === 'colegio')) {
      return true;
    }
    const assignments = await this.prisma.asignacionDocente.findMany({
      where: {
        id_docente: scope.actor.id_persona,
        id_tenant: event.id_tenant,
        id_colegio: event.id_colegio,
        id_anio: event.id_anio,
      },
      select: {
        id_seccion: true,
        seccion: {
          select: { id_grado: true, grado: { select: { id_nivel: true } } },
        },
      },
    });
    const levels = new Set(
      assignments.map((item) => item.seccion.grado.id_nivel),
    );
    const grades = new Set(assignments.map((item) => item.seccion.id_grado));
    const sections = new Set(assignments.map((item) => item.id_seccion));
    return event.destinatarios.some(
      (item) =>
        (item.id_nivel !== null && levels.has(item.id_nivel)) ||
        (item.id_grado !== null && grades.has(item.id_grado)) ||
        (item.id_seccion !== null && sections.has(item.id_seccion)),
    );
  }

  async obtenerEvento(actorId: number, eventId: number) {
    const event = await this.prisma.evento.findUnique({
      where: { id_evento: eventId },
      include: EVENTO_INCLUDE,
    });
    if (!event || !(await this.canReadEvent(actorId, event))) {
      throw new NotFoundException('Evento no encontrado.');
    }
    return this.serialize(event);
  }

  async obtenerOpciones(actorId: number, query: OpcionesEventosDto) {
    await this.requireManagement(actorId, query.tenant_id, query.colegio_id);
    const allYears = await this.prisma.anioLectivo.findMany({
      where: {
        id_tenant: query.tenant_id,
        id_colegio: query.colegio_id,
        colegio: { id_tenant: query.tenant_id },
      },
      select: {
        id_anio: true,
        nombre_anio: true,
        fecha_inicio: true,
        fecha_fin: true,
        estado: true,
      },
      orderBy: { fecha_inicio: 'desc' },
    });
    const operationalYears = allYears.filter(
      (year) => operationalYearPriority(year.estado) !== null,
    );
    const selectedHistoricalYear = query.anio_id
      ? allYears.find(
          (year) =>
            year.id_anio === query.anio_id &&
            operationalYearPriority(year.estado) === null,
        )
      : undefined;
    const years = selectedHistoricalYear
      ? [...operationalYears, selectedHistoricalYear]
      : operationalYears;
    const defaultYear = [...operationalYears].sort(
      (left, right) =>
        (operationalYearPriority(left.estado) ?? 2) -
        (operationalYearPriority(right.estado) ?? 2),
    )[0];
    if (!query.anio_id) {
      return {
        anios: years,
        anio_predeterminado_id: defaultYear?.id_anio ?? null,
        niveles: [],
        grados: [],
        secciones: [],
      };
    }
    await this.requireYear(query.tenant_id, query.colegio_id, query.anio_id);
    const configured = await this.prisma.seccionAnio.findMany({
      where: {
        id_tenant: query.tenant_id,
        id_colegio: query.colegio_id,
        id_anio: query.anio_id,
        estado: 'Activo',
        colegio: { id_tenant: query.tenant_id },
        anio: {
          id_tenant: query.tenant_id,
          id_colegio: query.colegio_id,
        },
        seccion: {
          id_tenant: query.tenant_id,
          id_colegio: query.colegio_id,
        },
      },
      select: {
        seccion: {
          select: {
            id_seccion: true,
            letra: true,
            grado: {
              select: {
                id_grado: true,
                nombre_grado: true,
                nivel: { select: { id_nivel: true, nombre_nivel: true } },
              },
            },
          },
        },
      },
      orderBy: { id_seccion: 'asc' },
    });
    const levels = new Map<
      number,
      { id_nivel: number; nombre_nivel: string }
    >();
    const grades = new Map<
      number,
      { id_grado: number; nombre_grado: string; id_nivel: number }
    >();
    const sections = configured.map(({ seccion }) => {
      levels.set(seccion.grado.nivel.id_nivel, seccion.grado.nivel);
      grades.set(seccion.grado.id_grado, {
        id_grado: seccion.grado.id_grado,
        nombre_grado: seccion.grado.nombre_grado,
        id_nivel: seccion.grado.nivel.id_nivel,
      });
      return {
        id_seccion: seccion.id_seccion,
        letra: seccion.letra,
        id_grado: seccion.grado.id_grado,
        nombre: `${seccion.grado.nivel.nombre_nivel} · ${seccion.grado.nombre_grado} · Sección ${seccion.letra}`,
      };
    });
    return {
      anios: years,
      anio_predeterminado_id: defaultYear?.id_anio ?? null,
      niveles: [...levels.values()],
      grados: [...grades.values()],
      secciones: sections,
    };
  }

  async crearEvento(actorId: number, dto: CrearEventoDto) {
    this.validateTimes(dto.hora_inicio, dto.hora_fin);
    const event = await this.prisma.$transaction(async (tx) => {
      await this.requireManagement(actorId, dto.id_tenant, dto.id_colegio, tx);
      const year = await this.requireYear(
        dto.id_tenant,
        dto.id_colegio,
        dto.id_anio,
        tx,
      );
      this.validateOperationalYear(year.estado);
      const eventDate = dateOnly(dto.fecha);
      this.validateEventDate(eventDate, year);
      const audience = await this.validateAudience(
        dto.id_tenant,
        dto.id_colegio,
        dto.id_anio,
        dto.audiencia,
        tx,
      );
      return tx.evento.create({
        data: {
          id_tenant: dto.id_tenant,
          id_colegio: dto.id_colegio,
          id_anio: dto.id_anio,
          titulo: dto.titulo,
          descripcion: dto.descripcion || null,
          fecha: eventDate,
          hora: dto.hora_inicio || null,
          hora_inicio: dto.hora_inicio || null,
          hora_fin: dto.hora_fin || null,
          tipo: dto.tipo,
          estado: 'programado',
          ubicacion: dto.ubicacion || null,
          id_usuario_creador: actorId,
          id_usuario_actualizador: actorId,
          destinatarios: { create: audience.rows },
          movimientos: {
            create: {
              id_tenant: dto.id_tenant,
              id_colegio: dto.id_colegio,
              id_usuario_actor: actorId,
              accion: 'creado',
              datos: {
                estado: 'programado',
                audiencia: audience.audience,
              },
            },
          },
        },
        include: EVENTO_INCLUDE,
      });
    });
    await this.notify(event, 'evento.creado');
    return this.serialize(event);
  }

  async actualizarEvento(
    actorId: number,
    eventId: number,
    dto: ActualizarEventoDto,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      const current = await tx.evento.findUnique({
        where: { id_evento: eventId },
        include: EVENTO_INCLUDE,
      });
      if (!current?.id_tenant || !current.id_colegio) {
        throw new NotFoundException('Evento no encontrado.');
      }
      await this.requireManagement(
        actorId,
        current.id_tenant,
        current.id_colegio,
        tx,
      );
      if (current.estado !== 'programado') {
        throw new ConflictException(
          'Solo se puede editar un evento programado.',
        );
      }
      const start =
        dto.hora_inicio !== undefined ? dto.hora_inicio : current.hora_inicio;
      const end = dto.hora_fin !== undefined ? dto.hora_fin : current.hora_fin;
      this.validateTimes(start, end);
      const nextDate = dto.fecha ? dateOnly(dto.fecha) : current.fecha;
      const year = await this.requireYear(
        current.id_tenant,
        current.id_colegio,
        current.id_anio,
        tx,
      );
      this.validateEventDate(nextDate, year);
      const changes: string[] = [];
      if (dto.titulo !== undefined && dto.titulo !== current.titulo)
        changes.push('titulo');
      if (
        dto.descripcion !== undefined &&
        (dto.descripcion || null) !== current.descripcion
      ) {
        changes.push('descripcion');
      }
      if (nextDate.getTime() !== current.fecha.getTime()) changes.push('fecha');
      if (start !== current.hora_inicio) changes.push('hora_inicio');
      if (end !== current.hora_fin) changes.push('hora_fin');
      if (
        dto.ubicacion !== undefined &&
        (dto.ubicacion || null) !== current.ubicacion
      ) {
        changes.push('ubicacion');
      }
      let audienceUpdate:
        | Awaited<ReturnType<EventosService['validateAudience']>>
        | undefined;
      let audienceChanged = false;
      if (dto.audiencia) {
        audienceUpdate = await this.validateAudience(
          current.id_tenant,
          current.id_colegio,
          current.id_anio,
          dto.audiencia,
          tx,
        );
        audienceChanged =
          JSON.stringify(audienceUpdate.audience) !==
          JSON.stringify(audienceFromRows(current.destinatarios));
      }
      if (!changes.length && !audienceChanged) {
        throw new BadRequestException('No hay cambios para guardar.');
      }
      await tx.evento.update({
        where: { id_evento: eventId },
        data: {
          ...(dto.titulo !== undefined ? { titulo: dto.titulo } : {}),
          ...(dto.descripcion !== undefined
            ? { descripcion: dto.descripcion || null }
            : {}),
          ...(dto.fecha !== undefined ? { fecha: nextDate } : {}),
          ...(dto.hora_inicio !== undefined
            ? { hora_inicio: start || null, hora: start || null }
            : {}),
          ...(dto.hora_fin !== undefined ? { hora_fin: end || null } : {}),
          ...(dto.ubicacion !== undefined
            ? { ubicacion: dto.ubicacion || null }
            : {}),
          id_usuario_actualizador: actorId,
          ...(audienceChanged && audienceUpdate
            ? {
                destinatarios: {
                  deleteMany: {},
                  create: audienceUpdate.rows,
                },
              }
            : {}),
        },
      });
      if (changes.length) {
        await tx.eventoMovimiento.create({
          data: {
            id_evento: eventId,
            id_tenant: current.id_tenant,
            id_colegio: current.id_colegio,
            id_usuario_actor: actorId,
            accion: 'editado',
            datos: { campos: changes },
          },
        });
      }
      if (audienceChanged && audienceUpdate) {
        await tx.eventoMovimiento.create({
          data: {
            id_evento: eventId,
            id_tenant: current.id_tenant,
            id_colegio: current.id_colegio,
            id_usuario_actor: actorId,
            accion: 'audiencia_actualizada',
            datos: { audiencia: audienceUpdate.audience },
          },
        });
      }
      const updated = await tx.evento.findUniqueOrThrow({
        where: { id_evento: eventId },
        include: EVENTO_INCLUDE,
      });
      return {
        event: updated,
        notify:
          audienceChanged ||
          changes.some((item) =>
            ['fecha', 'hora_inicio', 'hora_fin'].includes(item),
          ),
      };
    });
    if (result.notify) await this.notify(result.event, 'evento.actualizado');
    return this.serialize(result.event);
  }

  async cancelarEvento(
    actorId: number,
    eventId: number,
    dto: CancelarEventoDto,
  ) {
    const event = await this.prisma.$transaction(async (tx) => {
      const current = await tx.evento.findUnique({
        where: { id_evento: eventId },
        include: EVENTO_INCLUDE,
      });
      if (!current?.id_tenant || !current.id_colegio) {
        throw new NotFoundException('Evento no encontrado.');
      }
      await this.requireManagement(
        actorId,
        current.id_tenant,
        current.id_colegio,
        tx,
      );
      if (current.estado !== 'programado') {
        throw new ConflictException(
          'Solo se puede cancelar un evento programado.',
        );
      }
      await tx.evento.update({
        where: { id_evento: eventId },
        data: {
          estado: 'cancelado',
          motivo_cancelacion: dto.motivo,
          cancelado_en: new Date(),
          id_usuario_actualizador: actorId,
        },
      });
      await tx.eventoMovimiento.create({
        data: {
          id_evento: eventId,
          id_tenant: current.id_tenant,
          id_colegio: current.id_colegio,
          id_usuario_actor: actorId,
          accion: 'cancelado',
          motivo: dto.motivo,
          datos: { estado_anterior: current.estado, estado_nuevo: 'cancelado' },
        },
      });
      return tx.evento.findUniqueOrThrow({
        where: { id_evento: eventId },
        include: EVENTO_INCLUDE,
      });
    });
    await this.notify(event, 'evento.cancelado');
    return this.serialize(event);
  }

  async realizarEvento(actorId: number, eventId: number) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.evento.findUnique({
        where: { id_evento: eventId },
        include: EVENTO_INCLUDE,
      });
      if (!current?.id_tenant || !current.id_colegio) {
        throw new NotFoundException('Evento no encontrado.');
      }
      await this.requireManagement(
        actorId,
        current.id_tenant,
        current.id_colegio,
        tx,
      );
      if (current.estado !== 'programado') {
        throw new ConflictException(
          'Solo se puede marcar como realizado un evento programado.',
        );
      }
      await tx.evento.update({
        where: { id_evento: eventId },
        data: {
          estado: 'realizado',
          id_usuario_actualizador: actorId,
        },
      });
      await tx.eventoMovimiento.create({
        data: {
          id_evento: eventId,
          id_tenant: current.id_tenant,
          id_colegio: current.id_colegio,
          id_usuario_actor: actorId,
          accion: 'realizado',
          datos: { estado_anterior: current.estado, estado_nuevo: 'realizado' },
        },
      });
      const updated = await tx.evento.findUniqueOrThrow({
        where: { id_evento: eventId },
        include: EVENTO_INCLUDE,
      });
      return this.serialize(updated);
    });
  }

  async obtenerEventosPadres(actorId: number, query: ListarEventosPadresDto) {
    const actor = await this.prisma.usuario.findUnique({
      where: { id_usuario: actorId },
      select: {
        id_persona: true,
        estado: true,
        rol: { select: { nombre_rol: true } },
      },
    });
    if (!actor?.estado || normalizeRole(actor.rol.nombre_rol) !== 'apoderado') {
      throw new ForbiddenException('Acceso exclusivo para apoderados.');
    }
    const enrollments = await this.prisma.matricula.findMany({
      where: {
        estado_matricula: { in: ESTADOS_MATRICULA_OPERATIVA },
        ...(query.anio_id ? { id_anio: query.anio_id } : {}),
        estudiante: {
          apoderados: { some: { id_apoderado: actor.id_persona } },
        },
      },
      select: {
        id_tenant: true,
        id_colegio: true,
        id_anio: true,
        id_seccion: true,
        seccion: {
          select: {
            id_grado: true,
            grado: { select: { id_nivel: true } },
          },
        },
        anio: { select: { fecha_inicio: true } },
      },
    });
    const contexts = new Map<
      string,
      {
        tenantId: number;
        schoolId: number;
        yearId: number;
        calendarYear: number;
        levelIds: Set<number>;
        gradeIds: Set<number>;
        sectionIds: Set<number>;
      }
    >();
    for (const enrollment of enrollments) {
      if (!enrollment.id_tenant || !enrollment.id_colegio) continue;
      const key = `${enrollment.id_tenant}:${enrollment.id_colegio}:${enrollment.id_anio}`;
      const context = contexts.get(key) ?? {
        tenantId: enrollment.id_tenant,
        schoolId: enrollment.id_colegio,
        yearId: enrollment.id_anio,
        calendarYear: enrollment.anio.fecha_inicio.getUTCFullYear(),
        levelIds: new Set<number>(),
        gradeIds: new Set<number>(),
        sectionIds: new Set<number>(),
      };
      context.levelIds.add(enrollment.seccion.grado.id_nivel);
      context.gradeIds.add(enrollment.seccion.id_grado);
      context.sectionIds.add(enrollment.id_seccion);
      contexts.set(key, context);
    }
    const branches: Prisma.EventoWhereInput[] = [...contexts.values()].map(
      (context) => ({
        id_tenant: context.tenantId,
        id_colegio: context.schoolId,
        id_anio: context.yearId,
        ...(query.mes
          ? {
              fecha: {
                gte: new Date(Date.UTC(context.calendarYear, query.mes - 1, 1)),
                lt: new Date(Date.UTC(context.calendarYear, query.mes, 1)),
              },
            }
          : {}),
        destinatarios: {
          some: {
            OR: [
              { tipo_destino: 'colegio' },
              {
                tipo_destino: 'niveles',
                id_nivel: { in: [...context.levelIds] },
              },
              {
                tipo_destino: 'grados',
                id_grado: { in: [...context.gradeIds] },
              },
              {
                tipo_destino: 'secciones',
                id_seccion: { in: [...context.sectionIds] },
              },
            ],
          },
        },
      }),
    );
    if (!branches.length) return { data: [] };
    const events = await this.prisma.evento.findMany({
      where: { OR: branches },
      include: EVENTO_INCLUDE,
      orderBy: [{ fecha: 'asc' }, { hora_inicio: 'asc' }],
    });
    return { data: events.map((event) => this.serialize(event)) };
  }

  private async notify(
    event: EventoCompleto,
    type: 'evento.creado' | 'evento.actualizado' | 'evento.cancelado',
  ) {
    if (!event.id_tenant || !event.id_colegio) return { creadas: 0 };
    const audience = audienceFromRows(event.destinatarios);
    const action =
      type === 'evento.cancelado'
        ? 'Evento cancelado'
        : type === 'evento.actualizado'
          ? 'Evento actualizado'
          : 'Nuevo evento';
    const time = event.hora_inicio ? ` a las ${event.hora_inicio}` : '';
    const message = `${event.titulo} · ${event.fecha.toLocaleDateString(
      'es-PE',
      {
        day: '2-digit',
        month: 'short',
        timeZone: 'UTC',
      },
    )}${time}${event.ubicacion ? ` · ${event.ubicacion}` : ''}`;
    return this.notificacionesService.notificarApoderadosDeAudienciaEvento({
      id_tenant: event.id_tenant,
      id_colegio: event.id_colegio,
      id_anio: event.id_anio,
      audiencia: audience,
      tipo: type,
      origen: 'eventos',
      referencia_tipo: 'evento',
      referencia_id: event.id_evento,
      canal: 'padres',
      titulo: action,
      mensaje: message,
      url: eventPortalUrl(event),
    });
  }

  private serialize(event: EventoCompleto) {
    const audience = audienceFromRows(event.destinatarios);
    const audienceLabels = event.destinatarios.map((item) => {
      if (item.tipo_destino === 'colegio') return 'Todo el colegio';
      if (item.nivel) return item.nivel.nombre_nivel;
      if (item.grado) {
        return `${item.grado.nivel.nombre_nivel} · ${item.grado.nombre_grado}`;
      }
      if (item.seccion) {
        return `${item.seccion.grado.nivel.nombre_nivel} · ${item.seccion.grado.nombre_grado} · Sección ${item.seccion.letra}`;
      }
      return 'Audiencia institucional';
    });
    return {
      id_evento: event.id_evento,
      id_tenant: event.id_tenant,
      id_colegio: event.id_colegio,
      id_anio: event.id_anio,
      titulo: event.titulo,
      descripcion: event.descripcion,
      fecha: event.fecha,
      hora_inicio: event.hora_inicio ?? event.hora,
      hora_fin: event.hora_fin,
      hora: event.hora_inicio ?? event.hora,
      tipo: event.tipo,
      estado: event.estado,
      ubicacion: event.ubicacion,
      motivo_cancelacion: event.motivo_cancelacion,
      creado_en: event.creado_en,
      actualizado_en: event.actualizado_en,
      colegio: event.colegio,
      anio: event.anio,
      audiencia: { ...audience, etiquetas: audienceLabels },
      creado_por: personName(event.creado_por),
      actualizado_por: personName(event.actualizado_por),
      historial: event.movimientos.map((item) => ({
        accion: item.accion,
        fecha: item.creado_en,
        motivo: item.motivo,
        datos: item.datos,
        actor: personName(item.actor),
      })),
    };
  }
}
