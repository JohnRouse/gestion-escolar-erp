import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  NOTIFICACION_ORIGENES,
  NotificacionesListDto,
  NotificacionesScopeDto,
} from './notificaciones.dto';

const INTERNAL_ROLES = ['Admin', 'Director', 'Secretaria', 'Profesor'];
const ESTADOS_MATRICULA_OPERATIVA = [
  'Activo',
  'Matriculado',
  'Pre-matriculado',
];

export type NotificacionOrigen = (typeof NOTIFICACION_ORIGENES)[number];
export type NotificacionCanal = 'intranet' | 'padres' | 'portal';

export type CrearNotificacionInput = {
  id_usuario: number;
  id_tenant?: number | null;
  id_colegio?: number | null;
  tipo: string;
  origen: NotificacionOrigen;
  referencia_tipo?: string;
  referencia_id?: string | number;
  canal: NotificacionCanal;
  titulo: string;
  mensaje: string;
  url?: string;
};

type NotificarFamiliasInput = Omit<CrearNotificacionInput, 'id_usuario'> & {
  alumnoId?: number;
  nivelIds?: number[];
};

type ResolvedScope = {
  tenantId: number;
  schoolIds: number[];
  selectedSchoolId: number | null;
  channel: NotificacionCanal;
  includeLegacy: boolean;
};

type EnrollmentContextSource = {
  id_tenant: number | null;
  id_colegio: number | null;
  colegio?: { id_tenant: number } | null;
  seccion?: {
    id_colegio: number | null;
    colegio?: { id_tenant: number } | null;
  } | null;
};

type EnrollmentContext = { tenantId: number; schoolId: number };

const INTRANET_ROUTES = [
  '/asistencia',
  '/calendario',
  '/citas',
  '/circulares',
  '/comunidad',
  '/configuracion',
  '/dashboard',
  '/docentes',
  '/enfermeria',
  '/matricula',
  '/notas',
  '/notificaciones',
  '/perfil',
  '/reportes',
  '/staff',
  '/tesoreria',
  '/tutoria',
];
const PARENT_ROUTES = ['/dashboard'];

function isAllowedRoute(url: string, channel: NotificacionCanal) {
  if (
    !url.startsWith('/') ||
    url.startsWith('//') ||
    url.includes('\\') ||
    Array.from(url).some((character) => character.charCodeAt(0) < 32)
  ) {
    return false;
  }
  let path: string;
  try {
    const parsed = new URL(url, 'https://gestion-escolar.internal');
    if (parsed.origin !== 'https://gestion-escolar.internal') return false;
    path = parsed.pathname;
  } catch {
    return false;
  }
  const allowed = channel === 'intranet' ? INTRANET_ROUTES : PARENT_ROUTES;
  return allowed.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

function startOfTodayBogota() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value;
  return new Date(
    `${part('year')}-${part('month')}-${part('day')}T00:00:00-05:00`,
  );
}

function legacyOrigin(tipo: string): NotificacionOrigen {
  const normalized = tipo.toLocaleLowerCase('es');
  if (normalized.includes('cita')) return 'citas';
  if (normalized.includes('pago') || normalized === 'administrativa') {
    return 'pagos';
  }
  if (normalized.includes('evento')) return 'eventos';
  if (normalized.includes('matricula')) return 'matricula';
  if (normalized.includes('academ') || normalized.includes('asistencia')) {
    return 'academico';
  }
  return 'sistema';
}

@Injectable()
export class NotificacionesService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveScope(
    usuarioId: number,
    query: NotificacionesScopeDto,
  ): Promise<ResolvedScope> {
    if (query.scope === 'all' && query.colegio_id) {
      throw new BadRequestException(
        'Selecciona todos los colegios o un colegio específico.',
      );
    }

    const actor = await this.prisma.usuario.findUnique({
      where: { id_usuario: usuarioId },
      select: {
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
            colegio: { select: { id_tenant: true } },
          },
        },
      },
    });

    if (!actor?.estado) {
      throw new NotFoundException('Usuario no disponible.');
    }

    const activeTenantIds = Array.from(
      new Set(actor.tenants.map((membership) => membership.id_tenant)),
    );
    const tenantId = query.tenant_id ?? activeTenantIds[0];
    if (!tenantId || !activeTenantIds.includes(tenantId)) {
      throw new NotFoundException('Alcance de notificaciones no disponible.');
    }
    if (!query.tenant_id && activeTenantIds.length !== 1) {
      throw new BadRequestException(
        'Selecciona el tenant para consultar tus notificaciones.',
      );
    }

    const channel: NotificacionCanal = INTERNAL_ROLES.includes(
      actor.rol.nombre_rol,
    )
      ? 'intranet'
      : 'portal';
    if (channel === 'intranet' && !query.scope && !query.colegio_id) {
      throw new BadRequestException(
        'Selecciona el alcance institucional de la bandeja.',
      );
    }

    const authorizedSchoolIds = actor.colegios
      .filter((membership) => membership.colegio.id_tenant === tenantId)
      .map((membership) => membership.id_colegio);

    if (query.colegio_id && !authorizedSchoolIds.includes(query.colegio_id)) {
      throw new NotFoundException('Alcance de notificaciones no disponible.');
    }
    if (channel === 'intranet' && authorizedSchoolIds.length === 0) {
      throw new NotFoundException('Alcance de notificaciones no disponible.');
    }

    return {
      tenantId,
      schoolIds: query.colegio_id ? [query.colegio_id] : authorizedSchoolIds,
      selectedSchoolId: query.colegio_id ?? null,
      channel,
      includeLegacy: activeTenantIds.length === 1,
    };
  }

  private notificationScopeWhere(
    usuarioId: number,
    scope: ResolvedScope,
  ): Prisma.NotificacionWhereInput {
    const context: Prisma.NotificacionWhereInput[] = [
      { id_tenant: scope.tenantId, id_colegio: null },
      ...(scope.schoolIds.length
        ? [
            {
              id_tenant: scope.tenantId,
              id_colegio: scope.selectedSchoolId ?? { in: scope.schoolIds },
            },
          ]
        : []),
    ];
    if (scope.includeLegacy) {
      context.push({ id_tenant: null, id_colegio: null });
    }

    return {
      id_usuario: usuarioId,
      AND: [
        { OR: context },
        {
          OR:
            scope.channel === 'portal'
              ? [{ canal: 'portal' }, { canal: 'padres' }, { canal: null }]
              : [{ canal: scope.channel }, { canal: null }],
        },
      ],
    };
  }

  async getNotificaciones(usuarioId: number, query: NotificacionesListDto) {
    const scope = await this.resolveScope(usuarioId, query);
    const scopeWhere = this.notificationScopeWhere(usuarioId, scope);
    const filteredWhere: Prisma.NotificacionWhereInput = {
      ...scopeWhere,
      ...(query.leida !== undefined ? { leida: query.leida } : {}),
      ...(query.origen ? { origen: query.origen } : {}),
      ...(query.q
        ? {
            OR: [
              { titulo: { contains: query.q } },
              { mensaje: { contains: query.q } },
            ],
          }
        : {}),
    };
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const today = startOfTodayBogota();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const recentSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [items, total, unread, todayCount, recent] = await Promise.all([
      this.prisma.notificacion.findMany({
        where: filteredWhere,
        orderBy: [{ fecha_creacion: 'desc' }, { id_notif: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          colegio: { select: { id_colegio: true, nombre: true } },
        },
      }),
      this.prisma.notificacion.count({ where: filteredWhere }),
      this.prisma.notificacion.count({
        where: { ...scopeWhere, leida: false },
      }),
      this.prisma.notificacion.count({
        where: {
          ...scopeWhere,
          fecha_creacion: { gte: today, lt: tomorrow },
        },
      }),
      this.prisma.notificacion.count({
        where: { ...scopeWhere, fecha_creacion: { gte: recentSince } },
      }),
    ]);

    return {
      data: items.map((item) => ({
        ...item,
        origen: item.origen ?? legacyOrigin(item.tipo),
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      resumen: { no_leidas: unread, hoy: todayCount, total_reciente: recent },
      politica_legacy: scope.includeLegacy
        ? 'incluidas_por_tenant_unico'
        : 'excluidas_por_contexto_ambiguo',
    };
  }

  async getCountNoLeidas(usuarioId: number, query: NotificacionesScopeDto) {
    const scope = await this.resolveScope(usuarioId, query);
    return this.prisma.notificacion.count({
      where: {
        ...this.notificationScopeWhere(usuarioId, scope),
        leida: false,
      },
    });
  }

  async marcarLectura(
    usuarioId: number,
    id: number,
    leida: boolean,
    query: NotificacionesScopeDto,
  ) {
    const scope = await this.resolveScope(usuarioId, query);
    const where = {
      ...this.notificationScopeWhere(usuarioId, scope),
      id_notif: id,
    };
    const result = await this.prisma.notificacion.updateMany({
      where,
      data: {
        leida,
        fecha_lectura: leida ? new Date() : null,
      },
    });
    if (result.count !== 1) {
      throw new NotFoundException('Notificación no encontrada.');
    }
    return this.prisma.notificacion.findFirst({
      where,
      include: { colegio: { select: { id_colegio: true, nombre: true } } },
    });
  }

  async marcarTodasLeidas(usuarioId: number, query: NotificacionesScopeDto) {
    const scope = await this.resolveScope(usuarioId, query);
    const result = await this.prisma.notificacion.updateMany({
      where: {
        ...this.notificationScopeWhere(usuarioId, scope),
        leida: false,
      },
      data: { leida: true, fecha_lectura: new Date() },
    });
    return { actualizadas: result.count };
  }

  private async validateContext(data: CrearNotificacionInput) {
    if (data.id_colegio && !data.id_tenant) {
      throw new BadRequestException(
        'Una notificación de colegio requiere tenant.',
      );
    }
    if (data.id_colegio) {
      const tenantId = data.id_tenant;
      if (!tenantId) {
        throw new BadRequestException(
          'Una notificación de colegio requiere tenant.',
        );
      }
      const school = await this.prisma.colegio.findFirst({
        where: { id_colegio: data.id_colegio, id_tenant: tenantId },
        select: { id_colegio: true },
      });
      if (!school) {
        throw new BadRequestException(
          'El colegio no pertenece al tenant de la notificación.',
        );
      }
    }
    if (data.url && !isAllowedRoute(data.url, data.canal)) {
      throw new BadRequestException(
        'La acción de la notificación no es una ruta interna válida para su canal.',
      );
    }
  }

  private notificationData(data: CrearNotificacionInput) {
    return {
      id_usuario: data.id_usuario,
      id_tenant: data.id_tenant ?? null,
      id_colegio: data.id_colegio ?? null,
      tipo: data.tipo,
      origen: data.origen,
      referencia_tipo: data.referencia_tipo ?? null,
      referencia_id:
        data.referencia_id === undefined ? null : String(data.referencia_id),
      canal: data.canal,
      titulo: data.titulo,
      mensaje: data.mensaje,
      url: data.url ?? null,
    };
  }

  async crearNotificacion(data: CrearNotificacionInput) {
    await this.validateContext(data);
    return this.prisma.notificacion.create({
      data: this.notificationData(data),
    });
  }

  private enrollmentContext(
    enrollment: EnrollmentContextSource,
  ): EnrollmentContext | null {
    const schoolId = enrollment.id_colegio ?? enrollment.seccion?.id_colegio;
    const tenantId =
      enrollment.id_tenant ??
      enrollment.colegio?.id_tenant ??
      enrollment.seccion?.colegio?.id_tenant;
    return tenantId && schoolId ? { tenantId, schoolId } : null;
  }

  async notificarApoderadosDeAlumno(input: NotificarFamiliasInput) {
    if (!input.alumnoId) {
      throw new BadRequestException('El alumno es obligatorio.');
    }
    const matriculas = await this.prisma.matricula.findMany({
      where: {
        id_estudiante: input.alumnoId,
        estado_matricula: { in: ESTADOS_MATRICULA_OPERATIVA },
        ...(input.id_tenant ? { id_tenant: input.id_tenant } : {}),
        ...(input.id_colegio ? { id_colegio: input.id_colegio } : {}),
      },
      select: {
        id_tenant: true,
        id_colegio: true,
        colegio: { select: { id_tenant: true } },
        seccion: {
          select: {
            id_colegio: true,
            colegio: { select: { id_tenant: true } },
          },
        },
      },
    });
    const relaciones = await this.prisma.apoderadoEstudiante.findMany({
      where: { id_estudiante: input.alumnoId },
      select: {
        apoderado: {
          select: {
            persona: {
              select: {
                usuarios: {
                  where: { estado: true },
                  select: { id_usuario: true },
                },
              },
            },
          },
        },
      },
    });
    const contextsByKey = new Map<string, EnrollmentContext>();
    for (const matricula of matriculas) {
      const context = this.enrollmentContext(matricula);
      if (context) {
        contextsByKey.set(`${context.tenantId}:${context.schoolId}`, context);
      }
    }
    const contexts = [...contextsByKey.values()];
    const recipients = new Map<string, CrearNotificacionInput>();
    for (const relation of relaciones) {
      for (const user of relation.apoderado.persona.usuarios) {
        for (const context of contexts) {
          const item: CrearNotificacionInput = {
            ...input,
            id_usuario: user.id_usuario,
            id_tenant: context.tenantId,
            id_colegio: context.schoolId,
          };
          recipients.set(
            `${user.id_usuario}:${context.tenantId}:${context.schoolId}`,
            item,
          );
        }
      }
    }
    return this.createFamilyNotifications([...recipients.values()]);
  }

  async notificarApoderadosDeNivel(input: NotificarFamiliasInput) {
    if (!input.nivelIds?.length) return { creadas: 0 };
    // Un nivel es un catálogo compartido y no identifica por sí solo un
    // tenant. Sin tenant explícito se omite el aviso; un colegio NULL representa
    // de forma segura un aviso global del tenant.
    if (!input.id_tenant) return { creadas: 0 };
    const matriculas = await this.prisma.matricula.findMany({
      where: {
        estado_matricula: { in: ESTADOS_MATRICULA_OPERATIVA },
        seccion: { grado: { id_nivel: { in: input.nivelIds } } },
        ...(input.id_tenant ? { id_tenant: input.id_tenant } : {}),
        ...(input.id_colegio ? { id_colegio: input.id_colegio } : {}),
      },
      select: {
        id_tenant: true,
        id_colegio: true,
        colegio: { select: { id_tenant: true } },
        seccion: {
          select: {
            id_colegio: true,
            colegio: { select: { id_tenant: true } },
          },
        },
        estudiante: {
          select: {
            apoderados: {
              select: {
                apoderado: {
                  select: {
                    persona: {
                      select: {
                        usuarios: {
                          where: { estado: true },
                          select: { id_usuario: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    const recipients = new Map<string, CrearNotificacionInput>();
    for (const enrollment of matriculas) {
      const context = this.enrollmentContext(enrollment);
      if (!context) continue;
      for (const relation of enrollment.estudiante.apoderados) {
        for (const user of relation.apoderado.persona.usuarios) {
          const notificationSchoolId = input.id_colegio
            ? context.schoolId
            : null;
          const item: CrearNotificacionInput = {
            ...input,
            id_usuario: user.id_usuario,
            id_tenant: context.tenantId,
            id_colegio: notificationSchoolId,
          };
          recipients.set(
            `${user.id_usuario}:${context.tenantId}:${notificationSchoolId ?? 'global'}`,
            item,
          );
        }
      }
    }
    return this.createFamilyNotifications([...recipients.values()]);
  }

  private async createFamilyNotifications(items: CrearNotificacionInput[]) {
    for (const item of items) await this.validateContext(item);
    if (!items.length) return { creadas: 0 };
    const result = await this.prisma.notificacion.createMany({
      data: items.map((item) => this.notificationData(item)),
    });
    return { creadas: result.count };
  }

  async enviarPush(usuarioId: number, titulo: string, mensaje: string) {
    const tokens = await this.prisma.tokenFCM.findMany({
      where: { id_usuario: usuarioId },
    });
    // Integración FCM completa permanece fuera de Notificaciones V1.
    console.log(
      `[FCM] Enviando a ${tokens.length} dispositivos: ${titulo} - ${mensaje}`,
    );
  }
}
