import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import {
  COMUNICADO_STORAGE_MIME_EXTENSIONS,
  validateComunicadoAttachments,
} from './comunicados-attachments';
import {
  CircularAudienciaDto,
  CircularesScopeDto,
  CreateCircularDto,
  ListarCircularesDto,
  OpcionesCircularesDto,
} from './dto/create-circular.dto';

const ROLES_GESTION = ['admin', 'director', 'secretaria'];
const ESTADOS_MATRICULA_OPERATIVA = [
  'Activo',
  'Matriculado',
  'Pre-matriculado',
];
const ESTADOS_ANIO_ACTIVO = new Set(['abierto', 'en curso', 'activo']);

const CIRCULAR_INCLUDE = Prisma.validator<Prisma.CircularInclude>()({
  colegio: { select: { id_colegio: true, id_tenant: true, nombre: true } },
  anio: { select: { id_anio: true, nombre_anio: true, estado: true } },
  remitente: {
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
  adjuntos: true,
  destinatarios: {
    include: {
      nivel: true,
      seccion: { include: { grado: { include: { nivel: true } } } },
    },
  },
});

type CircularCompleta = Prisma.CircularGetPayload<{
  include: typeof CIRCULAR_INCLUDE;
}>;
type DbClient = Prisma.TransactionClient | PrismaService;
type Membership = {
  id_colegio: number;
  rol_colegio: string;
  colegio: { id_tenant: number; nombre: string };
};
type PortalEnrollment = {
  id_estudiante: number;
  id_tenant: number | null;
  id_colegio: number | null;
  id_anio: number;
  id_seccion: number;
  colegio: { id_tenant: number } | null;
  estudiante: {
    persona: {
      nombres: string;
      apellido_paterno: string;
      apellido_materno: string;
    };
  };
  seccion: {
    id_colegio: number | null;
    colegio: { id_tenant: number } | null;
    grado: { id_nivel: number };
  };
};
type EstadoPersonal = {
  fecha_lectura: Date | null;
  fecha_confirmacion: Date | null;
};
type ConfiguredStructureRow = {
  seccion: {
    id_seccion: number;
    letra: string;
    grado: {
      nombre_grado: string;
      nivel: { id_nivel: number; nombre_nivel: string };
    };
  };
};
type OperationalYear = {
  id_anio: number;
  nombre_anio: string;
  estado: string;
  fecha_inicio: Date;
};
type OperationalYearOption = OperationalYear & {
  tiene_matriculas_operativas: boolean;
};
type CircularPortal = CircularCompleta & {
  estados_apoderados: EstadoPersonal[];
};

function normalize(value: unknown) {
  const source =
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
      ? String(value)
      : '';
  return source
    .trim()
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeRole(value: unknown) {
  const role = normalize(value);
  if (['admin', 'administrador'].includes(role)) return 'admin';
  if (['director', 'direccion'].includes(role)) return 'director';
  if (['secretaria', 'tesoreria'].includes(role)) return 'secretaria';
  if (['profesor', 'docente'].includes(role)) return 'profesor';
  if (['apoderado', 'padre', 'madre', 'tutor'].includes(role)) {
    return 'apoderado';
  }
  return role;
}

function operationalYearPriority(value: unknown) {
  const state = normalize(value);
  if (ESTADOS_ANIO_ACTIVO.has(state)) return 0;
  if (state === 'matricula abierta') return 1;
  if (state === 'planificacion') return 2;
  return null;
}

function personName(user: CircularCompleta['remitente']) {
  return [
    user.persona.nombres,
    user.persona.apellido_paterno,
    user.persona.apellido_materno,
  ]
    .filter(Boolean)
    .join(' ');
}

@Injectable()
export class CircularesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacionesService: NotificacionesService,
    private readonly storageService: StorageService,
  ) {}

  private async actorContext(actorId: number, db: DbClient = this.prisma) {
    const actor = await db.usuario.findUnique({
      where: { id_usuario: actorId },
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
            rol_colegio: true,
            colegio: {
              select: { id_tenant: true, nombre: true },
            },
          },
        },
      },
    });
    const role = normalizeRole(actor?.rol.nombre_rol);
    if (!actor?.estado || !ROLES_GESTION.includes(role)) {
      throw new ForbiddenException(
        'No tienes acceso a la gestión de comunicados.',
      );
    }
    const colegios = actor.colegios.filter((item) =>
      ROLES_GESTION.includes(normalizeRole(item.rol_colegio)),
    ) as Membership[];
    return { ...actor, role, colegios };
  }

  private async resolveScope(
    actorId: number,
    query: CircularesScopeDto,
    db: DbClient = this.prisma,
  ) {
    if (query.scope === 'all' && query.colegio_id) {
      throw new BadRequestException(
        'Selecciona todos los colegios o una institución específica.',
      );
    }
    const actor = await this.actorContext(actorId, db);
    const tenantIds = [...new Set(actor.tenants.map((item) => item.id_tenant))];
    const tenantId = query.tenant_id ?? tenantIds[0];
    if (!tenantId || !tenantIds.includes(tenantId)) {
      throw new NotFoundException('Alcance de comunicados no disponible.');
    }
    if (!query.tenant_id && tenantIds.length !== 1) {
      throw new BadRequestException(
        'Selecciona el tenant para consultar los comunicados.',
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
        throw new NotFoundException('Alcance de comunicados no disponible.');
      }
      return { actor, tenantId, memberships: [selected] };
    }
    if (query.scope === 'all') {
      if (!['admin', 'director'].includes(actor.role)) {
        throw new ForbiddenException(
          'Tu rol no permite consultar comunicados consolidados.',
        );
      }
      if (!memberships.length) {
        throw new NotFoundException('Alcance de comunicados no disponible.');
      }
      return { actor, tenantId, memberships };
    }
    if (memberships.length !== 1) {
      throw new BadRequestException(
        'Selecciona una institución para continuar.',
      );
    }
    return { actor, tenantId, memberships };
  }

  private async requireManagement(
    actorId: number,
    tenantId: number,
    schoolId: number,
    db: DbClient = this.prisma,
  ) {
    return this.resolveScope(
      actorId,
      { tenant_id: tenantId, colegio_id: schoolId },
      db,
    );
  }

  private legacyAllowed(scope: Awaited<ReturnType<typeof this.resolveScope>>) {
    return (
      scope.actor.tenants.length === 1 &&
      scope.actor.colegios.length === 1 &&
      scope.memberships.length === 1
    );
  }

  private managementWhere(
    scope: Awaited<ReturnType<typeof this.resolveScope>>,
  ): Prisma.CircularWhereInput {
    const schoolIds = scope.memberships.map((item) => item.id_colegio);
    const branches: Prisma.CircularWhereInput[] = [
      {
        id_colegio: { in: schoolIds },
        OR: [{ id_tenant: scope.tenantId }, { id_tenant: null }],
      },
    ];
    if (this.legacyAllowed(scope)) {
      branches.push({ id_tenant: null, id_colegio: null });
    }
    return { OR: branches };
  }

  private async operationalYears(
    tenantId: number,
    schoolId: number,
    db: DbClient = this.prisma,
  ): Promise<OperationalYearOption[]> {
    const [years, operationalEnrollments] = await Promise.all([
      db.anioLectivo.findMany({
        where: {
          id_tenant: tenantId,
          id_colegio: schoolId,
          colegio: { id_tenant: tenantId },
        },
        select: {
          id_anio: true,
          nombre_anio: true,
          estado: true,
          fecha_inicio: true,
        },
        orderBy: { fecha_inicio: 'desc' },
      }) as Promise<OperationalYear[]>,
      db.matricula.findMany({
        where: {
          id_tenant: tenantId,
          id_colegio: schoolId,
          estado_matricula: { in: ESTADOS_MATRICULA_OPERATIVA },
        },
        select: { id_anio: true },
        distinct: ['id_anio'],
      }) as Promise<Array<{ id_anio: number }>>,
    ]);
    const yearsWithEnrollment = new Set(
      operationalEnrollments.map((item) => item.id_anio),
    );
    return years
      .filter((item) => operationalYearPriority(item.estado) !== null)
      .map((item) => ({
        ...item,
        tiene_matriculas_operativas: yearsWithEnrollment.has(item.id_anio),
      }))
      .sort(
        (left, right) =>
          Number(right.tiene_matriculas_operativas) -
            Number(left.tiene_matriculas_operativas) ||
          (operationalYearPriority(left.estado) ?? 3) -
            (operationalYearPriority(right.estado) ?? 3) ||
          right.fecha_inicio.getTime() - left.fecha_inicio.getTime(),
      );
  }

  private async publishingYear(
    tenantId: number,
    schoolId: number,
    yearId: number,
    db: DbClient = this.prisma,
  ) {
    const years = await this.operationalYears(tenantId, schoolId, db);
    const year = years.find((item) => item.id_anio === yearId);
    if (!year) {
      throw new BadRequestException(
        'El año lectivo no está disponible para publicar comunicados en esta institución.',
      );
    }
    return year;
  }

  private async configuredStructure(
    tenantId: number,
    schoolId: number,
    year: OperationalYear,
    db: DbClient = this.prisma,
  ): Promise<ConfiguredStructureRow[]> {
    return db.seccionAnio.findMany({
      where: {
        id_tenant: tenantId,
        id_colegio: schoolId,
        id_anio: year.id_anio,
        estado: 'Activo',
        colegio: { id_tenant: tenantId },
        anio: { id_tenant: tenantId, id_colegio: schoolId },
        seccion: { id_tenant: tenantId, id_colegio: schoolId },
      },
      select: {
        seccion: {
          select: {
            id_seccion: true,
            letra: true,
            grado: {
              select: {
                nombre_grado: true,
                nivel: { select: { id_nivel: true, nombre_nivel: true } },
              },
            },
          },
        },
      },
      orderBy: { id_seccion: 'asc' },
    });
  }

  async getOptions(actorId: number, query: OpcionesCircularesDto) {
    await this.requireManagement(actorId, query.tenant_id, query.colegio_id);
    const years = await this.operationalYears(
      query.tenant_id,
      query.colegio_id,
    );
    const year = query.id_anio
      ? years.find((item) => item.id_anio === query.id_anio)
      : years[0];
    if (query.id_anio && !year) {
      throw new BadRequestException(
        'El año lectivo no está disponible para publicar comunicados en esta institución.',
      );
    }
    const rows = year
      ? await this.configuredStructure(query.tenant_id, query.colegio_id, year)
      : [];
    const levels = new Map<
      number,
      { id_nivel: number; nombre_nivel: string }
    >();
    const sections = rows.map(({ seccion }) => {
      levels.set(seccion.grado.nivel.id_nivel, seccion.grado.nivel);
      return {
        id_seccion: seccion.id_seccion,
        id_nivel: seccion.grado.nivel.id_nivel,
        nombre: `${seccion.grado.nivel.nombre_nivel} · ${seccion.grado.nombre_grado} · Sección ${seccion.letra}`,
      };
    });
    return {
      anios: years.map((item) => ({
        id_anio: item.id_anio,
        nombre_anio: item.nombre_anio,
        estado: item.estado,
        tiene_matriculas_operativas: item.tiene_matriculas_operativas,
      })),
      anio_seleccionado: year
        ? {
            id_anio: year.id_anio,
            nombre_anio: year.nombre_anio,
          }
        : null,
      niveles: [...levels.values()],
      secciones: sections,
    };
  }

  private normalizeAudience(input: CircularAudienciaDto) {
    const ids = [...new Set(input.ids ?? [])].sort((a, b) => a - b);
    if (input.tipo === 'colegio') {
      if (ids.length) {
        throw new BadRequestException(
          'Todo el colegio no recibe destinatarios adicionales.',
        );
      }
      return { tipo: input.tipo, ids };
    }
    if (!ids.length) {
      throw new BadRequestException(
        'Selecciona al menos un destino para la audiencia.',
      );
    }
    return { tipo: input.tipo, ids };
  }

  private async validateAudience(
    tenantId: number,
    schoolId: number,
    yearId: number,
    input: CircularAudienciaDto,
    db: DbClient = this.prisma,
  ) {
    const year = await this.publishingYear(tenantId, schoolId, yearId, db);
    const audience = this.normalizeAudience(input);
    if (audience.tipo === 'colegio') {
      return {
        year,
        audience,
        rows: [{ id_nivel: null, id_seccion: null }],
      };
    }
    const structure = await this.configuredStructure(
      tenantId,
      schoolId,
      year,
      db,
    );
    const sectionLevel = new Map(
      structure.map(({ seccion }) => [
        seccion.id_seccion,
        seccion.grado.nivel.id_nivel,
      ]),
    );
    const levelIds = new Set(sectionLevel.values());
    const invalid = audience.ids.some((id) =>
      audience.tipo === 'niveles' ? !levelIds.has(id) : !sectionLevel.has(id),
    );
    if (invalid) {
      throw new BadRequestException(
        'La audiencia contiene un nivel o sección ajeno a la estructura activa de la institución.',
      );
    }
    return {
      year,
      audience,
      rows: audience.ids.map((id) =>
        audience.tipo === 'niveles'
          ? { id_nivel: id, id_seccion: null }
          : { id_nivel: sectionLevel.get(id)!, id_seccion: id },
      ),
    };
  }

  async create(dto: CreateCircularDto, remitenteId: number) {
    const { circular, audience } = await this.prisma.$transaction(
      async (tx) => {
        await this.requireManagement(
          remitenteId,
          dto.id_tenant,
          dto.id_colegio,
          tx,
        );
        const validated = await this.validateAudience(
          dto.id_tenant,
          dto.id_colegio,
          dto.id_anio,
          dto.audiencia,
          tx,
        );
        const created = await tx.circular.create({
          data: {
            id_tenant: dto.id_tenant,
            id_colegio: dto.id_colegio,
            id_anio: validated.year.id_anio,
            titulo: dto.titulo,
            contenido: dto.contenido,
            remitente_id_usuario: remitenteId,
            categoria: dto.categoria || 'General',
            urgente: dto.urgente,
            requiere_autorizacion: dto.requiere_autorizacion,
            destinatarios: { create: validated.rows },
          },
          include: CIRCULAR_INCLUDE,
        });
        return { circular: created, audience: validated.audience };
      },
    );

    let notificationResult: { creadas: number; error?: string };
    try {
      notificationResult =
        await this.notificacionesService.notificarApoderadosDeAudienciaComunicado(
          {
            id_tenant: dto.id_tenant,
            id_colegio: dto.id_colegio,
            id_anio: circular.id_anio!,
            audiencia: audience,
            tipo: 'circular.publicada',
            origen: 'sistema',
            referencia_tipo: 'circular',
            referencia_id: circular.id_circular,
            canal: 'padres',
            titulo: 'Nuevo comunicado',
            mensaje: `Se publicó el comunicado: “${circular.titulo}”.`,
            url: `/dashboard/comunicados?id_circular=${circular.id_circular}`,
            deduplicar_existentes: true,
          },
        );
    } catch (error) {
      notificationResult = {
        creadas: 0,
        error:
          error instanceof Error
            ? error.message
            : 'No se pudieron crear las notificaciones.',
      };
    }

    return {
      ...this.serialize(circular),
      notificaciones: notificationResult,
    };
  }

  async findAll(actorId: number, query: ListarCircularesDto) {
    const scope = await this.resolveScope(actorId, query);
    const where: Prisma.CircularWhereInput = {
      AND: [
        this.managementWhere(scope),
        ...(query.q
          ? [
              {
                OR: [
                  { titulo: { contains: query.q } },
                  { contenido: { contains: query.q } },
                ],
              } as Prisma.CircularWhereInput,
            ]
          : []),
      ],
      ...(query.categoria ? { categoria: query.categoria } : {}),
      ...(query.urgente !== undefined ? { urgente: query.urgente } : {}),
    };
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [items, total] = await Promise.all([
      this.prisma.circular.findMany({
        where,
        include: CIRCULAR_INCLUDE,
        orderBy: [{ fecha_creacion: 'desc' }, { id_circular: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.circular.count({ where }),
    ]);
    return {
      data: items.map((item) => this.serialize(item)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  private async loadInternalCircular(actorId: number, id: number) {
    const circular = await this.prisma.circular.findUnique({
      where: { id_circular: id },
      include: CIRCULAR_INCLUDE,
    });
    if (!circular) throw new NotFoundException('Comunicado no encontrado.');

    if (circular.id_colegio) {
      const tenantId = circular.id_tenant ?? circular.colegio?.id_tenant;
      if (!tenantId) throw new NotFoundException('Comunicado no encontrado.');
      await this.requireManagement(actorId, tenantId, circular.id_colegio);
      return circular;
    }
    if (circular.id_tenant) {
      throw new NotFoundException('Comunicado no encontrado.');
    }
    const scope = await this.resolveScope(actorId, {});
    if (!this.legacyAllowed(scope)) {
      throw new NotFoundException('Comunicado no encontrado.');
    }
    return circular;
  }

  async findOne(actorId: number, id: number) {
    return this.serialize(await this.loadInternalCircular(actorId, id));
  }

  async getTotalCirculares(actorId: number, query: ListarCircularesDto) {
    const result = await this.findAll(actorId, { ...query, page: 1, limit: 1 });
    return { count: result.meta.total };
  }

  async addAttachments(
    actorId: number,
    circularId: number,
    files: Express.Multer.File[],
  ) {
    const circular = await this.loadInternalCircular(actorId, circularId);
    validateComunicadoAttachments(files);
    if (!circular.id_tenant || !circular.id_colegio) {
      throw new BadRequestException(
        'No se pueden agregar adjuntos a un comunicado histórico sin contexto.',
      );
    }
    if (circular.adjuntos.length + files.length > 10) {
      throw new BadRequestException(
        'Un comunicado admite como máximo 10 archivos adjuntos.',
      );
    }
    const attachments: Array<{
      id_circular: number;
      nombre_archivo: string;
      url: string;
    }> = [];
    for (const file of files) {
      const saved = await this.storageService.saveFile(file, {
        folder: `comunicados-${circular.id_tenant}-${circular.id_colegio}`,
        prefix: 'comunicado',
        entityId: circularId,
        cacheBust: false,
        allowedMimeExtensions: COMUNICADO_STORAGE_MIME_EXTENSIONS,
      });
      const originalName = Array.from(
        String(file.originalname || saved.filename)
          .split(/[\\/]/)
          .pop()!,
      )
        .filter((character) => {
          const code = character.charCodeAt(0);
          return code >= 32 && code !== 127;
        })
        .join('')
        .slice(0, 240);
      attachments.push({
        id_circular: circularId,
        nombre_archivo: originalName || saved.filename,
        url: saved.url,
      });
    }
    await this.prisma.adjunto.createMany({ data: attachments });
    return this.findOne(actorId, circularId);
  }

  private async requirePortalActor(userId: number, apoderadoId: number) {
    const actor = await this.prisma.usuario.findUnique({
      where: { id_usuario: userId },
      select: {
        id_persona: true,
        estado: true,
        rol: { select: { nombre_rol: true } },
        persona: { select: { apoderados: { select: { id_persona: true } } } },
      },
    });
    if (
      !actor?.estado ||
      actor.id_persona !== apoderadoId ||
      normalizeRole(actor.rol.nombre_rol) !== 'apoderado' ||
      !actor.persona.apoderados.some((item) => item.id_persona === apoderadoId)
    ) {
      throw new NotFoundException('Comunicados del portal no disponibles.');
    }
  }

  private async portalEnrollments(apoderadoId: number) {
    return this.prisma.matricula.findMany({
      where: {
        estado_matricula: { in: ESTADOS_MATRICULA_OPERATIVA },
        estudiante: {
          apoderados: { some: { id_apoderado: apoderadoId } },
        },
      },
      select: {
        id_estudiante: true,
        id_tenant: true,
        id_colegio: true,
        id_anio: true,
        id_seccion: true,
        colegio: { select: { id_tenant: true } },
        estudiante: {
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
        seccion: {
          select: {
            id_colegio: true,
            colegio: { select: { id_tenant: true } },
            grado: { select: { id_nivel: true } },
          },
        },
      },
    });
  }

  private enrollmentContext(enrollment: PortalEnrollment) {
    const tenantId =
      enrollment.id_tenant ??
      enrollment.colegio?.id_tenant ??
      enrollment.seccion.colegio?.id_tenant;
    const schoolId = enrollment.id_colegio ?? enrollment.seccion.id_colegio;
    if (!tenantId || !schoolId) return null;
    return {
      tenantId,
      schoolId,
      yearId: enrollment.id_anio,
      levelId: enrollment.seccion.grado.id_nivel,
      sectionId: enrollment.id_seccion,
    };
  }

  private portalWhere(enrollments: PortalEnrollment[]) {
    const branches: Prisma.CircularWhereInput[] = [];
    const seen = new Set<string>();
    for (const enrollment of enrollments) {
      const context = this.enrollmentContext(enrollment);
      if (!context) continue;
      const key = `${context.tenantId}:${context.schoolId}:${context.yearId}:${context.levelId}:${context.sectionId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      branches.push({
        id_anio: context.yearId,
        id_colegio: context.schoolId,
        OR: [{ id_tenant: context.tenantId }, { id_tenant: null }],
        destinatarios: {
          some: {
            OR: [
              { id_nivel: null, id_seccion: null },
              { id_nivel: context.levelId, id_seccion: null },
              { id_seccion: context.sectionId },
            ],
          },
        },
      });
      branches.push({
        id_anio: null,
        id_colegio: context.schoolId,
        OR: [{ id_tenant: context.tenantId }, { id_tenant: null }],
        destinatarios: {
          some: {
            OR: [
              { id_nivel: null, id_seccion: null },
              { id_nivel: context.levelId, id_seccion: null },
              { id_seccion: context.sectionId },
            ],
          },
        },
      });
      branches.push({
        id_anio: null,
        id_tenant: null,
        id_colegio: null,
        destinatarios: { some: { id_seccion: context.sectionId } },
      });
    }
    return branches;
  }

  private matchingChildren(
    circular: CircularCompleta,
    enrollments: PortalEnrollment[],
  ) {
    const children = new Map<
      number,
      { id_estudiante: number; nombre: string }
    >();
    for (const enrollment of enrollments) {
      const context = this.enrollmentContext(enrollment);
      if (!context) continue;
      const isLegacy = circular.id_anio === null;
      const isContextlessLegacy =
        isLegacy && !circular.id_tenant && !circular.id_colegio;
      const contextualMatch = isContextlessLegacy
        ? circular.destinatarios.some(
            (item) => item.id_seccion === context.sectionId,
          )
        : (circular.id_tenant ?? circular.colegio?.id_tenant) ===
            context.tenantId &&
          circular.id_colegio === context.schoolId &&
          (isLegacy || circular.id_anio === context.yearId) &&
          circular.destinatarios.some(
            (item) =>
              (!item.id_nivel && !item.id_seccion) ||
              item.id_seccion === context.sectionId ||
              (item.id_nivel === context.levelId && !item.id_seccion),
          );
      if (!contextualMatch) continue;
      const person = enrollment.estudiante.persona;
      children.set(enrollment.id_estudiante, {
        id_estudiante: enrollment.id_estudiante,
        nombre: [
          person.nombres,
          person.apellido_paterno,
          person.apellido_materno,
        ]
          .filter(Boolean)
          .join(' '),
      });
    }
    return [...children.values()];
  }

  async findForApoderado(userId: number, apoderadoId: number) {
    await this.requirePortalActor(userId, apoderadoId);
    const enrollments = await this.portalEnrollments(apoderadoId);
    const branches = this.portalWhere(enrollments);
    if (!branches.length) return [];
    const circulars = await this.prisma.circular.findMany({
      where: { OR: branches },
      include: {
        ...CIRCULAR_INCLUDE,
        estados_apoderados: {
          where: { id_apoderado: apoderadoId },
          select: { fecha_lectura: true, fecha_confirmacion: true },
        },
      },
      orderBy: [{ fecha_creacion: 'desc' }, { id_circular: 'desc' }],
      distinct: ['id_circular'],
    });
    return circulars
      .map((item) => ({
        item,
        children: this.matchingChildren(item, enrollments),
      }))
      .filter(({ children }) => children.length > 0)
      .map(({ item, children }) => this.serializePortal(item, children));
  }

  private async portalCircular(
    circularId: number,
    userId: number,
    apoderadoId: number,
  ) {
    await this.requirePortalActor(userId, apoderadoId);
    const enrollments = await this.portalEnrollments(apoderadoId);
    const branches = this.portalWhere(enrollments);
    const circular = branches.length
      ? await this.prisma.circular.findFirst({
          where: { id_circular: circularId, OR: branches },
          include: CIRCULAR_INCLUDE,
        })
      : null;
    if (
      !circular ||
      this.matchingChildren(circular, enrollments).length === 0
    ) {
      throw new NotFoundException('Comunicado no disponible.');
    }
    return circular;
  }

  private async upsertRead(
    circularId: number,
    apoderadoId: number,
    userId: number,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      await tx.circularEstadoApoderado.updateMany({
        where: {
          id_circular: circularId,
          id_apoderado: apoderadoId,
          fecha_lectura: null,
        },
        data: { fecha_lectura: now, id_usuario_lectura: userId },
      });
      return tx.circularEstadoApoderado.upsert({
        where: {
          id_circular_id_apoderado: {
            id_circular: circularId,
            id_apoderado: apoderadoId,
          },
        },
        create: {
          id_circular: circularId,
          id_apoderado: apoderadoId,
          fecha_lectura: now,
          id_usuario_lectura: userId,
        },
        update: {},
      });
    });
  }

  async marcarLeida(circularId: number, userId: number, apoderadoId: number) {
    await this.portalCircular(circularId, userId, apoderadoId);
    const state = await this.upsertRead(circularId, apoderadoId, userId);
    return {
      leida: Boolean(state.fecha_lectura),
      fecha_lectura: state.fecha_lectura,
      confirmada: Boolean(state.fecha_confirmacion),
      fecha_confirmacion: state.fecha_confirmacion,
    };
  }

  async confirmar(circularId: number, userId: number, apoderadoId: number) {
    const circular = await this.portalCircular(circularId, userId, apoderadoId);
    if (!circular.requiere_autorizacion) {
      throw new BadRequestException(
        'Este comunicado no requiere confirmación.',
      );
    }
    const state = await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      await tx.circularEstadoApoderado.updateMany({
        where: {
          id_circular: circularId,
          id_apoderado: apoderadoId,
          fecha_lectura: null,
        },
        data: { fecha_lectura: now, id_usuario_lectura: userId },
      });
      await tx.circularEstadoApoderado.updateMany({
        where: {
          id_circular: circularId,
          id_apoderado: apoderadoId,
          fecha_confirmacion: null,
        },
        data: {
          fecha_confirmacion: now,
          id_usuario_confirmacion: userId,
        },
      });
      return tx.circularEstadoApoderado.upsert({
        where: {
          id_circular_id_apoderado: {
            id_circular: circularId,
            id_apoderado: apoderadoId,
          },
        },
        create: {
          id_circular: circularId,
          id_apoderado: apoderadoId,
          fecha_lectura: now,
          fecha_confirmacion: now,
          id_usuario_lectura: userId,
          id_usuario_confirmacion: userId,
        },
        update: {},
      });
    });
    return {
      leida: Boolean(state.fecha_lectura),
      fecha_lectura: state.fecha_lectura,
      confirmada: Boolean(state.fecha_confirmacion),
      fecha_confirmacion: state.fecha_confirmacion,
    };
  }

  private audience(circular: CircularCompleta) {
    if (
      circular.destinatarios.some((item) => !item.id_nivel && !item.id_seccion)
    ) {
      return {
        tipo: 'colegio' as const,
        ids: [],
        etiquetas: ['Todo el colegio'],
      };
    }
    const sections = circular.destinatarios.filter(
      (item) => item.id_seccion !== null,
    );
    if (sections.length) {
      return {
        tipo: 'secciones' as const,
        ids: sections.map((item) => item.id_seccion!),
        etiquetas: sections.map((item) =>
          item.seccion
            ? `${item.seccion.grado.nivel.nombre_nivel} · ${item.seccion.grado.nombre_grado} · Sección ${item.seccion.letra}`
            : 'Sección histórica',
        ),
      };
    }
    const levels = circular.destinatarios.filter(
      (item) => item.id_nivel !== null,
    );
    return {
      tipo: 'niveles' as const,
      ids: levels.map((item) => item.id_nivel!),
      etiquetas: levels.map(
        (item) => item.nivel?.nombre_nivel || 'Nivel histórico',
      ),
    };
  }

  private serialize(circular: CircularCompleta) {
    const audience = this.audience(circular);
    return {
      id_circular: circular.id_circular,
      id_tenant: circular.id_tenant,
      id_colegio: circular.id_colegio,
      id_anio: circular.id_anio,
      titulo: circular.titulo,
      contenido: circular.contenido,
      fecha_creacion: circular.fecha_creacion,
      categoria: circular.categoria || 'General',
      urgente: circular.urgente,
      requiere_autorizacion: circular.requiere_autorizacion,
      colegio: circular.colegio,
      institucion: circular.colegio?.nombre ?? 'Histórico sin institución',
      anio_lectivo: circular.anio?.nombre_anio ?? null,
      remitente: personName(circular.remitente),
      audiencia: audience,
      adjuntos: circular.adjuntos,
    };
  }

  private serializePortal(
    circular: CircularPortal,
    children: Array<{ id_estudiante: number; nombre: string }>,
  ) {
    const state = circular.estados_apoderados[0];
    const audience = this.audience(circular);
    return {
      ...this.serialize(circular),
      leida: Boolean(state?.fecha_lectura),
      fecha_lectura: state?.fecha_lectura ?? null,
      confirmada: Boolean(state?.fecha_confirmacion),
      fecha_confirmacion: state?.fecha_confirmacion ?? null,
      dirigido_a: audience.etiquetas.join(', ') || 'Audiencia institucional',
      hijos_incluidos: children,
    };
  }
}
