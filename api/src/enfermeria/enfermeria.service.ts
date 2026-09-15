import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ActualizarAtencionDto,
  AdministrarMedicacionDto,
  CerrarAtencionDto,
  ContactoEnfermeriaDto,
  CrearAtencionDto,
  CrearAutorizacionMedicacionDto,
  EnfermeriaBuscarAlumnoDto,
  EnfermeriaListDto,
  EnfermeriaScopeDto,
  FichaScopeDto,
  GuardarFichaSaludDto,
  RevocarAutorizacionDto,
} from './enfermeria.dto';

const ROLES_ENFERMERIA = ['Admin', 'Director'];
const ESTADOS_MATRICULA_OPERATIVA = [
  'Activo',
  'Matriculado',
  'Pre-matriculado',
];

type Db = PrismaService | Prisma.TransactionClient;
type Scope = { tenantId: number; schoolIds: number[] };

const atencionInclude = {
  colegio: { select: { id_colegio: true, nombre: true } },
  matricula: {
    include: {
      estudiante: { include: { persona: true } },
      seccion: { include: { grado: { include: { nivel: true } } } },
    },
  },
  responsable: { include: { persona: true } },
  medicacion_registrada_por: { include: { persona: true } },
  autorizacion_medicacion: {
    include: {
      apoderado: { include: { persona: true } },
      registrado_por: { include: { persona: true } },
      revocado_por: { include: { persona: true } },
    },
  },
  contactos: {
    include: {
      apoderado: { include: { persona: true } },
      actor: { include: { persona: true } },
    },
    orderBy: { fecha_hora: 'desc' as const },
  },
} satisfies Prisma.AtencionEnfermeriaInclude;

type AtencionRecord = Prisma.AtencionEnfermeriaGetPayload<{
  include: typeof atencionInclude;
}>;

type AutorizacionRecord = Prisma.AutorizacionMedicacionGetPayload<{
  include: {
    apoderado: { include: { persona: true } };
    registrado_por: { include: { persona: true } };
    revocado_por: { include: { persona: true } };
  };
}>;

function fullName(
  person?: {
    nombres: string;
    apellido_paterno: string;
    apellido_materno: string;
  } | null,
) {
  return person
    ? [person.nombres, person.apellido_paterno, person.apellido_materno]
        .filter(Boolean)
        .join(' ')
    : 'Sin identificar';
}

function parseDate(value: string) {
  return new Date(`${value.slice(0, 10)}T12:00:00.000Z`);
}

function dayRange(value: string) {
  const start = new Date(`${value.slice(0, 10)}T00:00:00-05:00`);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

function todayBogota() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function nullable(value: string | undefined) {
  return value?.trim() || null;
}

@Injectable()
export class EnfermeriaService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveScope(
    db: Db,
    userId: number,
    query: EnfermeriaScopeDto,
  ): Promise<Scope> {
    if ((query.scope === 'all') === Boolean(query.colegio_id)) {
      throw new BadRequestException(
        'Selecciona todos los colegios o un colegio específico.',
      );
    }
    const actor = await db.usuario.findUnique({
      where: { id_usuario: userId },
      select: {
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
    if (
      !actor?.estado ||
      !actor.tenants.length ||
      !ROLES_ENFERMERIA.includes(actor.rol.nombre_rol)
    ) {
      throw new ForbiddenException('No tienes acceso al módulo de Enfermería.');
    }
    const schoolIds = actor.colegios
      .filter((item) => ROLES_ENFERMERIA.includes(item.rol_colegio))
      .map((item) => item.id_colegio);
    if (query.colegio_id && !schoolIds.includes(query.colegio_id)) {
      throw new NotFoundException('Colegio no disponible en tu alcance.');
    }
    if (!schoolIds.length) {
      throw new ForbiddenException(
        'No tienes una institución autorizada para Enfermería.',
      );
    }
    return {
      tenantId: query.tenant_id,
      schoolIds: query.colegio_id ? [query.colegio_id] : schoolIds,
    };
  }

  private schoolWhere(scope: Scope): Prisma.AtencionEnfermeriaWhereInput {
    return {
      id_tenant: scope.tenantId,
      id_colegio: { in: scope.schoolIds },
    };
  }

  async list(userId: number, query: EnfermeriaListDto) {
    const scope = await this.resolveScope(this.prisma, userId, query);
    if (
      query.colegio_filtro_id &&
      !scope.schoolIds.includes(query.colegio_filtro_id)
    ) {
      throw new NotFoundException('Colegio no disponible en tu alcance.');
    }
    const filters: Prisma.AtencionEnfermeriaWhereInput[] = [
      this.schoolWhere(scope),
    ];
    const q = query.q?.trim();
    if (q) {
      filters.push({
        OR: [
          { motivo: { contains: q } },
          { matricula: { codigo_matricula: { contains: q } } },
          { matricula: { estudiante: { codigo_estudiante: { contains: q } } } },
          {
            matricula: {
              estudiante: {
                persona: {
                  OR: [
                    { nombres: { contains: q } },
                    { apellido_paterno: { contains: q } },
                    { apellido_materno: { contains: q } },
                    { dni: { contains: q } },
                  ],
                },
              },
            },
          },
        ],
      });
    }
    if (query.estado) filters.push({ estado: query.estado });
    if (query.seccion_id) {
      filters.push({ matricula: { id_seccion: query.seccion_id } });
    }
    if (query.colegio_filtro_id) {
      filters.push({ id_colegio: query.colegio_filtro_id });
    }
    if (query.fecha) {
      const range = dayRange(query.fecha);
      filters.push({
        fecha_hora_ingreso: { gte: range.start, lt: range.end },
      });
    }
    const where: Prisma.AtencionEnfermeriaWhereInput = { AND: filters };
    const today = dayRange(todayBogota());
    const base = this.schoolWhere(scope);
    const [data, total, todayCount, openCount, closedToday] = await Promise.all(
      [
        this.prisma.atencionEnfermeria.findMany({
          where,
          include: atencionInclude,
          orderBy: [{ fecha_hora_ingreso: 'desc' }, { id_atencion: 'desc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        this.prisma.atencionEnfermeria.count({ where }),
        this.prisma.atencionEnfermeria.count({
          where: {
            ...base,
            fecha_hora_ingreso: { gte: today.start, lt: today.end },
          },
        }),
        this.prisma.atencionEnfermeria.count({
          where: { ...base, estado: 'abierta' },
        }),
        this.prisma.atencionEnfermeria.count({
          where: {
            ...base,
            estado: 'cerrada',
            fecha_hora_cierre: { gte: today.start, lt: today.end },
          },
        }),
      ],
    );
    return {
      data: data.map((item) => this.formatAttention(item)),
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
      resumen: {
        atenciones_hoy: todayCount,
        en_observacion: openCount,
        cerradas_hoy: closedToday,
      },
    };
  }

  async detail(userId: number, query: EnfermeriaScopeDto, id: number) {
    const scope = await this.resolveScope(this.prisma, userId, query);
    const attention = await this.loadAttention(this.prisma, scope, id);
    const movements = await this.prisma.enfermeriaMovimiento.findMany({
      where: {
        tipo_entidad: 'atencion',
        id_entidad: id,
        id_tenant: scope.tenantId,
        id_colegio: { in: scope.schoolIds },
      },
      include: { actor: { include: { persona: true } } },
      orderBy: [{ creado_en: 'desc' }, { id_movimiento: 'desc' }],
    });
    return {
      ...this.formatAttention(attention),
      historial: movements.map((item) => ({
        ...item,
        actor: fullName(item.actor.persona),
      })),
    };
  }

  async students(userId: number, query: EnfermeriaBuscarAlumnoDto) {
    const scope = await this.resolveScope(this.prisma, userId, query);
    const tokens = query.q.trim().split(/\s+/).filter(Boolean);
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
    const rows = await this.prisma.matricula.findMany({
      where: {
        estado_matricula: { in: ESTADOS_MATRICULA_OPERATIVA },
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
              { codigo_matricula: { contains: query.q } },
              { estudiante: { codigo_estudiante: { contains: query.q } } },
              { estudiante: { persona: personSearch } },
            ],
          },
        ],
      },
      include: {
        colegio: { select: { id_colegio: true, nombre: true } },
        seccion: {
          include: {
            colegio: { select: { id_colegio: true, nombre: true } },
            grado: { include: { nivel: true } },
          },
        },
        estudiante: { include: { persona: true } },
        atenciones_enfermeria: {
          where: {
            id_tenant: scope.tenantId,
            id_colegio: { in: scope.schoolIds },
            estado: 'abierta',
          },
          select: { id_atencion: true },
          orderBy: { id_atencion: 'desc' },
          take: 1,
        },
      },
      orderBy: { id_matricula: 'desc' },
      take: 25,
    });
    return rows.map((row) => {
      const schoolId = row.id_colegio ?? row.seccion.id_colegio;
      if (!schoolId) {
        throw new ConflictException(
          'La matrícula no tiene un colegio verificable.',
        );
      }
      return {
        id_matricula: row.id_matricula,
        codigo_matricula: row.codigo_matricula,
        estado_matricula: row.estado_matricula,
        atencion_abierta_id: row.atenciones_enfermeria[0]?.id_atencion ?? null,
        id_colegio: schoolId,
        colegio:
          row.colegio?.nombre ?? row.seccion.colegio?.nombre ?? 'Institución',
        estudiante: {
          id_estudiante: row.id_estudiante,
          id_seccion: row.id_seccion,
          codigo: row.estudiante.codigo_estudiante,
          nombre: fullName(row.estudiante.persona),
          seccion: this.sectionLabel(row.seccion),
        },
      };
    });
  }

  async create(
    userId: number,
    query: EnfermeriaScopeDto,
    body: CrearAtencionDto,
  ) {
    const created = await this.prisma.$transaction(async (tx) => {
      const scope = await this.resolveScope(tx, userId, query);
      const enrollment = await this.loadEnrollment(tx, body.id_matricula, true);
      this.assertEnrollmentScope(enrollment, scope);
      await tx.$queryRaw(
        Prisma.sql`
          SELECT id_matricula
          FROM Matricula
          WHERE id_matricula = ${enrollment.id_matricula}
          FOR UPDATE
        `,
      );
      const openAttention = await tx.atencionEnfermeria.findFirst({
        where: {
          id_tenant: this.enrollmentTenantId(enrollment),
          id_colegio: this.enrollmentSchoolId(enrollment),
          id_matricula: enrollment.id_matricula,
          estado: 'abierta',
        },
        select: { id_atencion: true },
      });
      if (openAttention) {
        throw new ConflictException({
          code: 'ENFERMERIA_ATENCION_ABIERTA',
          message:
            'Este alumno ya tiene una atención abierta. Continúa registrando la información en esa atención.',
          atencion_abierta_id: openAttention.id_atencion,
        });
      }
      const ingreso = body.fecha_hora_ingreso
        ? new Date(body.fecha_hora_ingreso)
        : new Date();
      if (Number.isNaN(ingreso.getTime())) {
        throw new BadRequestException('La fecha de ingreso no es válida.');
      }
      const attention = await tx.atencionEnfermeria.create({
        data: {
          id_tenant: this.enrollmentTenantId(enrollment),
          id_colegio: this.enrollmentSchoolId(enrollment),
          id_matricula: enrollment.id_matricula,
          fecha_hora_ingreso: ingreso,
          motivo: body.motivo,
          observacion_reportada: nullable(body.observacion_reportada),
          id_usuario_responsable: userId,
        },
      });
      await this.movement(tx, {
        attention,
        type: 'atencion',
        entityId: attention.id_atencion,
        action: 'apertura',
        actorId: userId,
        data: { id_matricula: enrollment.id_matricula, estado: 'abierta' },
      });
      return attention;
    });
    return this.detail(userId, query, created.id_atencion);
  }

  async update(
    userId: number,
    query: EnfermeriaScopeDto,
    id: number,
    body: ActualizarAtencionDto,
  ) {
    if (
      body.observacion_reportada === undefined &&
      body.acciones_realizadas === undefined
    ) {
      throw new BadRequestException('Indica al menos un dato para actualizar.');
    }
    await this.prisma.$transaction(async (tx) => {
      const scope = await this.resolveScope(tx, userId, query);
      const attention = await this.loadAttention(tx, scope, id);
      if (attention.estado === 'cerrada' && !body.motivo_correccion) {
        throw new ConflictException(
          'Una atención cerrada solo admite una corrección con motivo trazable.',
        );
      }
      const changes: Record<
        string,
        { anterior: string | null; nuevo: string | null }
      > = {};
      if (body.observacion_reportada !== undefined) {
        changes.observacion_reportada = {
          anterior: attention.observacion_reportada,
          nuevo: nullable(body.observacion_reportada),
        };
      }
      if (body.acciones_realizadas !== undefined) {
        changes.acciones_realizadas = {
          anterior: attention.acciones_realizadas,
          nuevo: nullable(body.acciones_realizadas),
        };
      }
      await tx.atencionEnfermeria.update({
        where: { id_atencion: id },
        data: {
          ...(body.observacion_reportada !== undefined
            ? { observacion_reportada: nullable(body.observacion_reportada) }
            : {}),
          ...(body.acciones_realizadas !== undefined
            ? { acciones_realizadas: nullable(body.acciones_realizadas) }
            : {}),
        },
      });
      await this.movement(tx, {
        attention,
        type: 'atencion',
        entityId: id,
        action: attention.estado === 'cerrada' ? 'correccion' : 'actualizacion',
        actorId: userId,
        reason: body.motivo_correccion,
        data: { cambios: changes },
      });
    });
    return this.detail(userId, query, id);
  }

  async contact(
    userId: number,
    query: EnfermeriaScopeDto,
    id: number,
    body: ContactoEnfermeriaDto,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const scope = await this.resolveScope(tx, userId, query);
      const attention = await this.loadAttention(tx, scope, id);
      await this.createContact(tx, attention, userId, body);
    });
    return this.detail(userId, query, id);
  }

  async medication(
    userId: number,
    query: EnfermeriaScopeDto,
    id: number,
    body: AdministrarMedicacionDto,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const scope = await this.resolveScope(tx, userId, query);
      const attention = await this.loadAttention(tx, scope, id);
      if (attention.estado !== 'abierta') {
        throw new ConflictException(
          'No se puede administrar medicación en una atención cerrada.',
        );
      }
      if (attention.medicacion_administrada) {
        throw new ConflictException(
          'La atención ya registra una administración de medicación.',
        );
      }
      const authorization = await tx.autorizacionMedicacion.findFirst({
        where: {
          id_autorizacion: body.id_autorizacion,
          estado: 'activa',
          ficha: {
            id_tenant: attention.id_tenant,
            id_colegio: attention.id_colegio,
            id_estudiante: attention.matricula.id_estudiante,
          },
        },
      });
      const today = parseDate(todayBogota());
      if (
        !authorization ||
        authorization.fecha_inicio > today ||
        authorization.fecha_fin < today
      ) {
        throw new BadRequestException(
          'La autorización seleccionada no está activa y vigente para este estudiante.',
        );
      }
      await tx.atencionEnfermeria.update({
        where: { id_atencion: id },
        data: {
          id_autorizacion_medicacion: authorization.id_autorizacion,
          medicacion_administrada: true,
          fecha_medicacion: new Date(),
          id_usuario_medicacion: userId,
        },
      });
      await this.movement(tx, {
        attention,
        type: 'atencion',
        entityId: id,
        action: 'medicacion_administrada',
        actorId: userId,
        data: { id_autorizacion: authorization.id_autorizacion },
      });
    });
    return this.detail(userId, query, id);
  }

  async close(
    userId: number,
    query: EnfermeriaScopeDto,
    id: number,
    body: CerrarAtencionDto,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const scope = await this.resolveScope(tx, userId, query);
      const attention = await this.loadAttention(tx, scope, id);
      if (attention.estado !== 'abierta') {
        throw new ConflictException('La atención ya está cerrada.');
      }
      const closeAt = body.fecha_hora_cierre
        ? new Date(body.fecha_hora_cierre)
        : new Date();
      if (
        Number.isNaN(closeAt.getTime()) ||
        closeAt < attention.fecha_hora_ingreso
      ) {
        throw new BadRequestException(
          'El cierre no puede ser anterior al ingreso.',
        );
      }
      if (body.notificar_apoderado) {
        await this.createContact(tx, attention, userId, {
          id_apoderado: body.id_apoderado as number,
          medio: body.medio_contacto as ContactoEnfermeriaDto['medio'],
          observacion: body.observacion_contacto,
          notificar: true,
        });
      }
      await tx.atencionEnfermeria.update({
        where: { id_atencion: id },
        data: {
          estado: 'cerrada',
          destino: body.destino,
          fecha_hora_cierre: closeAt,
          ...(body.acciones_realizadas !== undefined
            ? { acciones_realizadas: nullable(body.acciones_realizadas) }
            : {}),
        },
      });
      await this.movement(tx, {
        attention,
        type: 'atencion',
        entityId: id,
        action: 'cierre',
        actorId: userId,
        data: { estado: 'cerrada', destino: body.destino },
      });
    });
    return this.detail(userId, query, id);
  }

  async record(userId: number, query: FichaScopeDto, studentId: number) {
    const scope = await this.resolveScope(this.prisma, userId, query);
    const context = await this.studentContext(
      this.prisma,
      scope,
      query,
      studentId,
    );
    const [record, authorizations, attentions, guardians] = await Promise.all([
      this.prisma.fichaSalud.findUnique({
        where: {
          id_colegio_id_estudiante: {
            id_colegio: context.schoolId,
            id_estudiante: studentId,
          },
        },
        include: { actualizado_por: { include: { persona: true } } },
      }),
      this.prisma.autorizacionMedicacion.findMany({
        where: {
          ficha: { id_colegio: context.schoolId, id_estudiante: studentId },
        },
        include: {
          apoderado: { include: { persona: true } },
          registrado_por: { include: { persona: true } },
          revocado_por: { include: { persona: true } },
        },
        orderBy: [{ creado_en: 'desc' }, { id_autorizacion: 'desc' }],
      }),
      this.prisma.atencionEnfermeria.findMany({
        where: {
          id_tenant: scope.tenantId,
          id_colegio: context.schoolId,
          matricula: { id_estudiante: studentId },
        },
        include: atencionInclude,
        orderBy: { fecha_hora_ingreso: 'desc' },
        take: 50,
      }),
      this.prisma.apoderadoEstudiante.findMany({
        where: { id_estudiante: studentId },
        include: { apoderado: { include: { persona: true } } },
      }),
    ]);
    return {
      estudiante: {
        id_estudiante: studentId,
        nombre: fullName(context.person),
        id_colegio: context.schoolId,
        colegio: context.schoolName,
      },
      ficha: record
        ? {
            ...record,
            actualizado_por: fullName(record.actualizado_por.persona),
          }
        : null,
      apoderados: guardians.map((item) => ({
        id_apoderado: item.id_apoderado,
        nombre: fullName(item.apoderado.persona),
        parentesco: item.parentesco,
      })),
      autorizaciones: authorizations.map((item) =>
        this.formatAuthorization(item),
      ),
      atenciones: attentions.map((item) => this.formatAttention(item)),
    };
  }

  async saveRecord(
    userId: number,
    query: FichaScopeDto,
    studentId: number,
    body: GuardarFichaSaludDto,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const scope = await this.resolveScope(tx, userId, query);
      const context = await this.studentContext(tx, scope, query, studentId);
      const before = await tx.fichaSalud.findUnique({
        where: {
          id_colegio_id_estudiante: {
            id_colegio: context.schoolId,
            id_estudiante: studentId,
          },
        },
      });
      const data = {
        grupo_sanguineo: nullable(body.grupo_sanguineo),
        alergias_declaradas: nullable(body.alergias_declaradas),
        condiciones_declaradas: nullable(body.condiciones_declaradas),
        medicacion_habitual_declarada: nullable(
          body.medicacion_habitual_declarada,
        ),
        seguro_centro_atencion: nullable(body.seguro_centro_atencion),
        contacto_emergencia: nullable(body.contacto_emergencia),
        telefono_emergencia: nullable(body.telefono_emergencia),
        observaciones_relevantes: nullable(body.observaciones_relevantes),
        id_usuario_actualizo: userId,
      };
      const saved = await tx.fichaSalud.upsert({
        where: {
          id_colegio_id_estudiante: {
            id_colegio: context.schoolId,
            id_estudiante: studentId,
          },
        },
        create: {
          id_tenant: scope.tenantId,
          id_colegio: context.schoolId,
          id_estudiante: studentId,
          ...data,
        },
        update: data,
      });
      const previous = before ? this.healthValues(before) : null;
      const current = this.healthValues(saved);
      await this.movement(tx, {
        attention: {
          id_tenant: scope.tenantId,
          id_colegio: context.schoolId,
        },
        type: 'ficha',
        entityId: saved.id_ficha,
        action: before ? 'actualizacion' : 'creacion',
        actorId: userId,
        data: before
          ? { anterior: previous, nuevo: current }
          : { nuevo: current },
      });
    });
    return this.record(userId, query, studentId);
  }

  async authorization(
    userId: number,
    query: FichaScopeDto,
    studentId: number,
    body: CrearAutorizacionMedicacionDto,
  ) {
    const start = parseDate(body.fecha_inicio);
    const end = parseDate(body.fecha_fin);
    if (start > end) {
      throw new BadRequestException(
        'La fecha final no puede ser anterior a la fecha inicial.',
      );
    }
    await this.prisma.$transaction(async (tx) => {
      const scope = await this.resolveScope(tx, userId, query);
      const context = await this.studentContext(tx, scope, query, studentId);
      await this.assertGuardian(tx, studentId, body.id_apoderado);
      const existing = await tx.fichaSalud.findUnique({
        where: {
          id_colegio_id_estudiante: {
            id_colegio: context.schoolId,
            id_estudiante: studentId,
          },
        },
      });
      const record =
        existing ??
        (await tx.fichaSalud.create({
          data: {
            id_tenant: scope.tenantId,
            id_colegio: context.schoolId,
            id_estudiante: studentId,
            id_usuario_actualizo: userId,
          },
        }));
      if (!existing) {
        await this.movement(tx, {
          attention: record,
          type: 'ficha',
          entityId: record.id_ficha,
          action: 'creacion',
          actorId: userId,
          data: { ficha_minima: true },
        });
      }
      const authorization = await tx.autorizacionMedicacion.create({
        data: {
          id_ficha: record.id_ficha,
          id_apoderado: body.id_apoderado,
          medicamento: body.medicamento,
          dosis_instruccion: body.dosis_instruccion,
          via: nullable(body.via),
          fecha_inicio: start,
          fecha_fin: end,
          observaciones: nullable(body.observaciones),
          id_usuario_registro: userId,
        },
      });
      await this.movement(tx, {
        attention: record,
        type: 'autorizacion',
        entityId: authorization.id_autorizacion,
        action: 'autorizacion_registrada',
        actorId: userId,
        data: {
          estado: 'activa',
          id_apoderado: body.id_apoderado,
          fecha_inicio: body.fecha_inicio,
          fecha_fin: body.fecha_fin,
        },
      });
    });
    return this.record(userId, query, studentId);
  }

  async revoke(userId: number, id: number, body: RevocarAutorizacionDto) {
    await this.prisma.$transaction(async (tx) => {
      const scope = await this.resolveScope(tx, userId, body);
      const authorization = await tx.autorizacionMedicacion.findFirst({
        where: {
          id_autorizacion: id,
          ficha: {
            id_tenant: scope.tenantId,
            id_colegio: { in: scope.schoolIds },
          },
        },
        include: { ficha: true },
      });
      if (!authorization) {
        throw new NotFoundException(
          'Autorización no disponible en el alcance autorizado.',
        );
      }
      if (authorization.estado !== 'activa') {
        throw new ConflictException('La autorización ya no está activa.');
      }
      await tx.autorizacionMedicacion.update({
        where: { id_autorizacion: id },
        data: {
          estado: 'revocada',
          fecha_revocacion: new Date(),
          id_usuario_revocacion: userId,
          motivo_revocacion: body.motivo,
        },
      });
      await this.movement(tx, {
        attention: authorization.ficha,
        type: 'autorizacion',
        entityId: id,
        action: 'revocacion',
        actorId: userId,
        reason: body.motivo,
        data: { estado_anterior: 'activa', estado_nuevo: 'revocada' },
      });
    });
    return { id_autorizacion: id, estado: 'revocada' };
  }

  private async loadEnrollment(db: Db, id: number, operational: boolean) {
    const enrollment = await db.matricula.findFirst({
      where: {
        id_matricula: id,
        ...(operational
          ? { estado_matricula: { in: ESTADOS_MATRICULA_OPERATIVA } }
          : {}),
        OR: [
          { colegio: { estado: 'Activo', tenant: { estado: 'Activo' } } },
          {
            id_colegio: null,
            seccion: {
              colegio: { estado: 'Activo', tenant: { estado: 'Activo' } },
            },
          },
        ],
      },
      include: {
        colegio: true,
        seccion: {
          include: {
            colegio: true,
            grado: { include: { nivel: true } },
          },
        },
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
      throw new NotFoundException(
        operational
          ? 'Matrícula operativa no disponible.'
          : 'Matrícula no disponible.',
      );
    }
    if (
      (enrollment.id_colegio &&
        enrollment.id_colegio !== enrollment.seccion.id_colegio) ||
      (enrollment.id_tenant &&
        enrollment.id_tenant !== this.enrollmentTenantId(enrollment))
    ) {
      throw new ConflictException(
        'La matrícula tiene un contexto institucional inconsistente.',
      );
    }
    return enrollment;
  }

  private assertEnrollmentScope(
    enrollment: Awaited<ReturnType<EnfermeriaService['loadEnrollment']>>,
    scope: Scope,
  ) {
    if (
      this.enrollmentTenantId(enrollment) !== scope.tenantId ||
      !scope.schoolIds.includes(this.enrollmentSchoolId(enrollment))
    ) {
      throw new NotFoundException(
        'Matrícula no disponible en el alcance autorizado.',
      );
    }
  }

  private enrollmentSchoolId(
    enrollment: Awaited<ReturnType<EnfermeriaService['loadEnrollment']>>,
  ) {
    const schoolId = enrollment.id_colegio ?? enrollment.seccion.id_colegio;
    if (!schoolId) {
      throw new ConflictException(
        'La matrícula no tiene un colegio verificable.',
      );
    }
    return schoolId;
  }

  private enrollmentTenantId(
    enrollment: Awaited<ReturnType<EnfermeriaService['loadEnrollment']>>,
  ) {
    const tenantId =
      enrollment.id_tenant ??
      enrollment.colegio?.id_tenant ??
      enrollment.seccion.colegio?.id_tenant;
    if (!tenantId) {
      throw new ConflictException(
        'La matrícula no tiene una organización verificable.',
      );
    }
    return tenantId;
  }

  private async loadAttention(db: Db, scope: Scope, id: number) {
    const attention = await db.atencionEnfermeria.findFirst({
      where: { id_atencion: id, ...this.schoolWhere(scope) },
      include: atencionInclude,
    });
    if (!attention) {
      throw new NotFoundException(
        'Atención no disponible en el alcance autorizado.',
      );
    }
    return attention;
  }

  private async studentContext(
    db: Db,
    scope: Scope,
    query: FichaScopeDto,
    studentId: number,
  ) {
    const schoolId = query.colegio_ficha_id ?? query.colegio_id;
    if (!schoolId) {
      throw new BadRequestException(
        'Selecciona el colegio de la ficha en el alcance consolidado.',
      );
    }
    if (!scope.schoolIds.includes(schoolId)) {
      throw new NotFoundException('Ficha no disponible en tu alcance.');
    }
    const enrollment = await db.matricula.findFirst({
      where: {
        id_estudiante: studentId,
        OR: [
          { id_tenant: scope.tenantId, id_colegio: schoolId },
          {
            id_colegio: null,
            seccion: {
              id_colegio: schoolId,
              colegio: { id_tenant: scope.tenantId },
            },
          },
        ],
      },
      include: {
        colegio: { select: { nombre: true } },
        seccion: { include: { colegio: { select: { nombre: true } } } },
        estudiante: { include: { persona: true } },
      },
      orderBy: { fecha_matricula: 'desc' },
    });
    if (!enrollment) {
      throw new NotFoundException(
        'Estudiante no disponible en el colegio autorizado.',
      );
    }
    return {
      schoolId,
      schoolName:
        enrollment.colegio?.nombre ??
        enrollment.seccion.colegio?.nombre ??
        'Institución',
      person: enrollment.estudiante.persona,
    };
  }

  private async assertGuardian(db: Db, studentId: number, guardianId: number) {
    const relation = await db.apoderadoEstudiante.findUnique({
      where: {
        id_apoderado_id_estudiante: {
          id_apoderado: guardianId,
          id_estudiante: studentId,
        },
      },
    });
    if (!relation) {
      throw new BadRequestException(
        'El apoderado seleccionado no está vinculado al estudiante.',
      );
    }
  }

  private async createContact(
    tx: Prisma.TransactionClient,
    attention: AtencionRecord,
    userId: number,
    body: ContactoEnfermeriaDto,
  ) {
    await this.assertGuardian(
      tx,
      attention.matricula.id_estudiante,
      body.id_apoderado,
    );
    const users = body.notificar
      ? await tx.usuario.findMany({
          where: { id_persona: body.id_apoderado, estado: true },
          select: { id_usuario: true },
        })
      : [];
    const userIds = [...new Set(users.map((item) => item.id_usuario))];
    const notificationSent = userIds.length > 0;
    const contact = await tx.enfermeriaContacto.create({
      data: {
        id_atencion: attention.id_atencion,
        id_apoderado: body.id_apoderado,
        medio: body.medio,
        observacion: nullable(body.observacion),
        notificacion_enviada: notificationSent,
        id_usuario_actor: userId,
      },
    });
    await this.movement(tx, {
      attention,
      type: 'atencion',
      entityId: attention.id_atencion,
      action: 'contacto_registrado',
      actorId: userId,
      data: {
        id_contacto: contact.id_contacto,
        id_apoderado: body.id_apoderado,
        medio: body.medio,
        notificado: notificationSent,
      },
    });
    if (body.notificar) {
      if (userIds.length) {
        await tx.notificacion.createMany({
          data: userIds.map((recipientId) => ({
            id_usuario: recipientId,
            id_tenant: attention.id_tenant,
            id_colegio: attention.id_colegio,
            tipo: 'enfermeria.atencion.actualizada',
            origen: 'enfermeria',
            referencia_tipo: 'atencion_enfermeria',
            referencia_id: String(attention.id_atencion),
            canal: 'portal',
            titulo: 'Actualización de Enfermería',
            mensaje: `Se registró una atención de enfermería para ${fullName(attention.matricula.estudiante.persona)}. Comuníquese con la institución o revise la información disponible.`,
            url: null,
          })),
        });
      }
      await this.movement(tx, {
        attention,
        type: 'atencion',
        entityId: attention.id_atencion,
        action: 'notificacion_emitida',
        actorId: userId,
        data: { destinatarios: userIds.length, canal: 'portal' },
      });
    }
  }

  private async movement(
    db: Db,
    input: {
      attention: { id_tenant: number; id_colegio: number };
      type: 'ficha' | 'autorizacion' | 'atencion';
      entityId: number;
      action: string;
      actorId: number;
      reason?: string;
      data?: Prisma.InputJsonValue;
    },
  ) {
    await db.enfermeriaMovimiento.create({
      data: {
        id_tenant: input.attention.id_tenant,
        id_colegio: input.attention.id_colegio,
        tipo_entidad: input.type,
        id_entidad: input.entityId,
        accion: input.action,
        id_usuario_actor: input.actorId,
        motivo: nullable(input.reason),
        datos: input.data,
      },
    });
  }

  private healthValues(record: {
    grupo_sanguineo: string | null;
    alergias_declaradas: string | null;
    condiciones_declaradas: string | null;
    medicacion_habitual_declarada: string | null;
    seguro_centro_atencion: string | null;
    contacto_emergencia: string | null;
    telefono_emergencia: string | null;
    observaciones_relevantes: string | null;
  }) {
    return {
      grupo_sanguineo: record.grupo_sanguineo,
      alergias_declaradas: record.alergias_declaradas,
      condiciones_declaradas: record.condiciones_declaradas,
      medicacion_habitual_declarada: record.medicacion_habitual_declarada,
      seguro_centro_atencion: record.seguro_centro_atencion,
      contacto_emergencia: record.contacto_emergencia,
      telefono_emergencia: record.telefono_emergencia,
      observaciones_relevantes: record.observaciones_relevantes,
    };
  }

  private sectionLabel(section: {
    letra: string;
    grado: { nombre_grado: string; nivel: { nombre_nivel: string } };
  }) {
    return `${section.grado.nivel.nombre_nivel} · ${section.grado.nombre_grado} · Sección ${section.letra}`;
  }

  private formatAuthorization(item: AutorizacionRecord) {
    const today = parseDate(todayBogota());
    const status =
      item.estado === 'activa' && item.fecha_fin < today
        ? 'vencida'
        : item.estado;
    return {
      ...item,
      estado: status,
      apoderado: fullName(item.apoderado?.persona),
      registrado_por: fullName(item.registrado_por?.persona),
      revocado_por: item.revocado_por
        ? fullName(item.revocado_por.persona)
        : null,
    };
  }

  private formatAttention(item: AtencionRecord) {
    return {
      id_atencion: item.id_atencion,
      id_tenant: item.id_tenant,
      id_colegio: item.id_colegio,
      id_matricula: item.id_matricula,
      fecha_hora_ingreso: item.fecha_hora_ingreso,
      motivo: item.motivo,
      observacion_reportada: item.observacion_reportada,
      acciones_realizadas: item.acciones_realizadas,
      medicacion_administrada: item.medicacion_administrada,
      fecha_medicacion: item.fecha_medicacion,
      estado: item.estado,
      destino: item.destino,
      fecha_hora_cierre: item.fecha_hora_cierre,
      colegio: item.colegio,
      estudiante: {
        id_estudiante: item.matricula.id_estudiante,
        id_seccion: item.matricula.id_seccion,
        codigo: item.matricula.estudiante.codigo_estudiante,
        nombre: fullName(item.matricula.estudiante.persona),
        seccion: this.sectionLabel(item.matricula.seccion),
        codigo_matricula: item.matricula.codigo_matricula,
      },
      responsable: fullName(item.responsable.persona),
      autorizacion_medicacion: item.autorizacion_medicacion
        ? this.formatAuthorization(item.autorizacion_medicacion)
        : null,
      medicacion_registrada_por: item.medicacion_registrada_por
        ? fullName(item.medicacion_registrada_por.persona)
        : null,
      contactos: item.contactos.map((contact) => ({
        id_contacto: contact.id_contacto,
        fecha_hora: contact.fecha_hora,
        medio: contact.medio,
        observacion: contact.observacion,
        notificacion_enviada: contact.notificacion_enviada,
        apoderado: fullName(contact.apoderado.persona),
        actor: fullName(contact.actor.persona),
      })),
    };
  }
}
