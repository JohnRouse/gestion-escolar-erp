import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import {
  StaffAccesoDto,
  StaffListDto,
  StaffScopeDto,
  StaffWriteDto,
} from './staff.dto';

export const STAFF_MANAGEMENT_ROLES = ['Admin', 'Director'];
const personaSelect = {
  id_persona: true,
  dni: true,
  nombres: true,
  apellido_paterno: true,
  apellido_materno: true,
  fecha_nacimiento: true,
  direccion: true,
  departamento: true,
  provincia: true,
  distrito: true,
  telefono: true,
  correo: true,
} satisfies Prisma.PersonaSelect;
const staffInclude = {
  persona: { select: personaSelect },
  colegio: { select: { id_colegio: true, nombre: true } },
  seccion: {
    select: {
      id_seccion: true,
      id_colegio: true,
      colegio: { select: { nombre: true } },
    },
  },
} satisfies Prisma.StaffInclude;
type Scope = { tenantId: number; colegioIds: number[]; rol: string };
type Db = Prisma.TransactionClient;

@Injectable()
export class StaffService {
  private readonly logger = new Logger('StaffAudit');
  constructor(private readonly prisma: PrismaService) {}

  // Re-read memberships on every request, including writes inside the transaction.
  async resolveScope(
    db: Db,
    userId: number,
    query: StaffScopeDto,
  ): Promise<Scope> {
    const actor = await db.usuario.findUnique({
      where: { id_usuario: userId },
      select: {
        estado: true,
        rol: true,
        tenants: {
          where: {
            id_tenant: query.tenant_id,
            estado: 'Activo',
            tenant: { estado: 'Activo' },
          },
        },
        colegios: {
          where: {
            estado: 'Activo',
            colegio: { id_tenant: query.tenant_id, estado: 'Activo' },
          },
        },
      },
    });
    if (
      !actor?.estado ||
      !STAFF_MANAGEMENT_ROLES.includes(actor.rol.nombre_rol) ||
      !actor.tenants.length
    ) {
      throw new ForbiddenException(
        'No tienes permiso para gestionar Staff en esta organización.',
      );
    }
    if ((query.scope === 'all') === Boolean(query.colegio_id)) {
      throw new BadRequestException(
        'Selecciona todos los colegios o un colegio específico.',
      );
    }
    const colegioIds = actor.colegios
      .filter((c) => STAFF_MANAGEMENT_ROLES.includes(c.rol_colegio))
      .map((c) => c.id_colegio);
    if (query.colegio_id && !colegioIds.includes(query.colegio_id)) {
      throw new ForbiddenException(
        'No tienes permiso para gestionar Staff en este colegio.',
      );
    }
    return {
      tenantId: query.tenant_id,
      colegioIds: query.colegio_id ? [query.colegio_id] : colegioIds,
      rol: actor.rol.nombre_rol,
    };
  }

  private whereScope(scope: Scope): Prisma.StaffWhereInput {
    // Legacy records are admitted only when a concrete school or section proves ownership.
    return {
      AND: [
        { es_miembro_staff: true },
        { OR: [{ id_tenant: scope.tenantId }, { id_tenant: null }] },
        {
          OR: [
            {
              id_colegio: { in: scope.colegioIds },
              colegio: { id_tenant: scope.tenantId },
            },
            {
              id_colegio: null,
              seccion: {
                id_colegio: { in: scope.colegioIds },
                colegio: { id_tenant: scope.tenantId },
              },
            },
          ],
        },
      ],
    };
  }

  private async record(db: Db, scope: Scope, id: number) {
    const staff = await db.staff.findFirst({
      where: { AND: [this.whereScope(scope), { id_staff: id }] },
      include: staffInclude,
    });
    if (!staff)
      throw new NotFoundException(
        'Staff no disponible en el alcance autorizado.',
      );
    return staff;
  }

  async list(userId: number, query: StaffListDto) {
    const scope = await this.resolveScope(this.prisma, userId, query);
    const q = query.q?.trim();
    const where: Prisma.StaffWhereInput = {
      AND: [
        this.whereScope(scope),
        {
          permite_citas: query.citas ? query.citas === 'si' : undefined,
          OR: q
            ? [
                { cargo: { contains: q } },
                { area: { contains: q } },
                { persona: { dni: { contains: q } } },
                {
                  AND: q.split(/\s+/).map((term) => ({
                    persona: {
                      OR: [
                        { nombres: { contains: term } },
                        { apellido_paterno: { contains: term } },
                        { apellido_materno: { contains: term } },
                      ],
                    },
                  })),
                },
              ]
            : undefined,
        },
      ],
    };
    const [data, total] = await Promise.all([
      this.prisma.staff.findMany({
        where,
        include: staffInclude,
        orderBy: { id_staff: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.staff.count({ where }),
    ]);
    return {
      data,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async detail(userId: number, query: StaffScopeDto, id: number) {
    const scope = await this.resolveScope(this.prisma, userId, query);
    const staff = await this.record(this.prisma, scope, id);
    const accesos = await this.prisma.usuario.findMany({
      where: {
        id_persona: staff.id_persona,
        rol: {
          nombre_rol: { in: ['Admin', 'Director', 'Secretaria', 'Profesor'] },
        },
        // Do not disclose accounts belonging exclusively to other organizations.
        OR: [
          { tenants: { some: { id_tenant: scope.tenantId } } },
          { tenants: { none: {} }, colegios: { none: {} } },
        ],
      },
      select: {
        username: true,
        estado: true,
        rol: { select: { nombre_rol: true } },
        tenants: {
          where: { id_tenant: scope.tenantId },
          select: { estado: true },
        },
        colegios: {
          where: {
            id_colegio: staff.id_colegio ?? staff.seccion?.id_colegio ?? -1,
          },
          select: { estado: true },
        },
      },
    });
    return { ...staff, accesos };
  }

  // DNI lookup is scoped. Personal data reused here is read-only: changing it could
  // affect Docentes, students or users in institutions outside this actor's scope.
  private async reusablePersona(db: Db, scope: Scope, dni: string) {
    const persona = await db.persona.findUnique({
      where: { dni },
      select: {
        ...personaSelect,
        staff: {
          select: {
            id_staff: true,
            id_tenant: true,
            id_colegio: true,
            es_miembro_staff: true,
            seccion: { select: { id_colegio: true } },
          },
        },
        usuarios: {
          select: {
            tenants: { select: { id_tenant: true } },
            colegios: { select: { id_colegio: true } },
          },
        },
        docentes: {
          select: {
            asignaciones: { select: { id_colegio: true } },
            especialidades: {
              select: { area: { select: { id_colegio: true } } },
            },
          },
        },
        estudiantes: { select: { id_persona: true } },
        apoderados: { select: { id_persona: true } },
      },
    });
    if (!persona) return null;
    const permittedUser = persona.usuarios.some(
      (u) =>
        u.tenants.some((t) => t.id_tenant === scope.tenantId) &&
        u.colegios.some((c) => scope.colegioIds.includes(c.id_colegio)),
    );
    const permittedDocente = persona.docentes.some(
      (docente) =>
        docente.asignaciones.some(
          (asignacion) =>
            asignacion.id_colegio !== null &&
            scope.colegioIds.includes(asignacion.id_colegio),
        ) ||
        docente.especialidades.some(
          (especialidad) =>
            especialidad.area.id_colegio !== null &&
            scope.colegioIds.includes(especialidad.area.id_colegio),
        ),
    );
    const institutionalStaff = persona.staff.find(
      (staff) => staff.es_miembro_staff,
    );
    const permittedTechnicalStaff = persona.staff.some(
      (staff) =>
        !staff.es_miembro_staff &&
        (staff.id_tenant === scope.tenantId || staff.id_tenant === null) &&
        scope.colegioIds.includes(
          staff.id_colegio ?? staff.seccion?.id_colegio ?? -1,
        ),
    );
    const unlinked =
      persona.usuarios.every((u) => !u.tenants.length && !u.colegios.length) &&
      !persona.docentes.length &&
      !persona.estudiantes.length &&
      !persona.apoderados.length &&
      !persona.staff.length;
    if (
      !permittedUser &&
      !permittedDocente &&
      !permittedTechnicalStaff &&
      !unlinked
    )
      throw new ConflictException(
        'El documento ya está registrado. Solicita la vinculación a un administrador de su institución.',
      );
    if (institutionalStaff)
      throw new ConflictException(
        'Esta persona ya pertenece a Staff. Edita el registro existente.',
      );
    return {
      id_persona: persona.id_persona,
      dni: persona.dni,
      nombres: persona.nombres,
      apellido_paterno: persona.apellido_paterno,
      apellido_materno: persona.apellido_materno,
      fecha_nacimiento: persona.fecha_nacimiento,
      direccion: persona.direccion,
      departamento: persona.departamento,
      provincia: persona.provincia,
      distrito: persona.distrito,
      telefono: persona.telefono,
      correo: persona.correo,
    };
  }

  async lookup(userId: number, query: StaffScopeDto, dni: string) {
    if (!/^\d{8}$/.test(dni))
      throw new BadRequestException('El DNI debe tener 8 dígitos.');
    return this.reusablePersona(
      this.prisma,
      await this.resolveScope(this.prisma, userId, query),
      dni,
    );
  }

  protected async ensureAccess(
    db: Db,
    scope: Scope,
    idPersona: number,
    idColegio: number,
    input: StaffAccesoDto,
  ) {
    if (input.rol === 'Admin' && scope.rol !== 'Admin')
      throw new ForbiddenException(
        'Solo Admin puede asociar o crear acceso Admin.',
      );
    const username = input.username.trim().toLowerCase();
    const existing = await db.usuario.findUnique({
      where: { username },
      select: {
        id_usuario: true,
        id_persona: true,
        estado: true,
        rol: true,
        tenants: true,
        colegios: true,
      },
    });
    let idUsuario: number;
    if (existing) {
      if (
        existing.id_persona !== idPersona ||
        existing.rol.nombre_rol !== input.rol
      )
        throw new ConflictException(
          'El usuario ya existe y no corresponde a esta persona y rol.',
        );
      if (input.password)
        throw new BadRequestException(
          'Para asociar un usuario existente, deja vacía la contraseña.',
        );
      if (
        !existing.estado ||
        existing.tenants.some(
          (t) => t.id_tenant === scope.tenantId && t.estado !== 'Activo',
        ) ||
        existing.colegios.some(
          (c) => c.id_colegio === idColegio && c.estado !== 'Activo',
        )
      ) {
        throw new ConflictException(
          'El acceso o su membresía está inactivo. No se reactiva desde Staff.',
        );
      }
      if (
        existing.tenants.length &&
        !existing.tenants.some(
          (t) => t.id_tenant === scope.tenantId && t.estado === 'Activo',
        )
      )
        throw new ForbiddenException(
          'El usuario pertenece a otra organización.',
        );
      idUsuario = existing.id_usuario;
    } else {
      if (!input.password || Buffer.byteLength(input.password, 'utf8') > 72)
        throw new BadRequestException(
          'Ingresa una contraseña inicial de 8 a 72 bytes para el nuevo usuario.',
        );
      const sameRole = await db.usuario.findFirst({
        where: { id_persona: idPersona, rol: { nombre_rol: input.rol } },
        select: { id_usuario: true },
      });
      if (sameRole)
        throw new ConflictException(
          'Esta persona ya tiene credenciales para ese rol. Asocia el usuario existente.',
        );
      const rol = await db.rol.findUnique({ where: { nombre_rol: input.rol } });
      if (!rol)
        throw new BadRequestException(
          'El rol seleccionado no está configurado.',
        );
      const created = await db.usuario.create({
        data: {
          id_persona: idPersona,
          username,
          id_rol: rol.id_rol,
          password_hash: await bcrypt.hash(input.password, 10),
        },
        select: { id_usuario: true },
      });
      idUsuario = created.id_usuario;
    }
    await db.usuarioTenant.upsert({
      where: {
        id_usuario_id_tenant: {
          id_usuario: idUsuario,
          id_tenant: scope.tenantId,
        },
      },
      update: {},
      create: {
        id_usuario: idUsuario,
        id_tenant: scope.tenantId,
        rol_tenant: 'Miembro',
        estado: 'Activo',
      },
    });
    const hasPrincipal = await db.usuarioColegio.count({
      where: { id_usuario: idUsuario, es_principal: true },
    });
    await db.usuarioColegio.upsert({
      where: {
        id_usuario_id_colegio: { id_usuario: idUsuario, id_colegio: idColegio },
      },
      update: {},
      create: {
        id_usuario: idUsuario,
        id_colegio: idColegio,
        rol_colegio: input.rol,
        estado: 'Activo',
        es_principal: hasPrincipal === 0,
      },
    });
    return {
      id_usuario: idUsuario,
      username,
      rol: input.rol,
      accion: existing ? 'asociar' : 'crear',
    };
  }

  async save(
    userId: number,
    query: StaffScopeDto,
    body: StaffWriteDto,
    id?: number,
  ) {
    try {
      const result = await this.prisma.$transaction(
        async (db) => {
          const scope = await this.resolveScope(db, userId, query);
          if (!scope.colegioIds.includes(body.id_colegio))
            throw new ForbiddenException(
              'Selecciona un colegio destino autorizado dentro del alcance activo.',
            );
          if (body.acceso && !body.motivo?.trim())
            throw new BadRequestException(
              'Explica el motivo para dar acceso al ERP o asignar el rol seleccionado.',
            );
          const before = id ? await this.record(db, scope, id) : null;
          if (before && body.persona)
            throw new BadRequestException(
              'Los datos personales compartidos no se modifican desde Staff.',
            );
          if (
            before &&
            body.id_colegio !==
              (before.id_colegio ?? before.seccion?.id_colegio)
          )
            throw new BadRequestException(
              'El traslado de Staff entre colegios requiere un proceso específico.',
            );
          let idPersona = before?.id_persona;
          if (!idPersona) {
            if (!body.persona)
              throw new BadRequestException(
                'Completa los datos de la persona.',
              );
            if (new Date(body.persona.fecha_nacimiento) > new Date())
              throw new BadRequestException(
                'La fecha de nacimiento no puede ser futura.',
              );
            const reused = await this.reusablePersona(
              db,
              scope,
              body.persona.dni,
            );
            idPersona =
              reused?.id_persona ??
              (
                await db.persona.create({
                  data: {
                    ...body.persona,
                    fecha_nacimiento: new Date(body.persona.fecha_nacimiento),
                  },
                })
              ).id_persona;
          }
          const data = {
            cargo: body.cargo,
            area: body.area,
            permite_citas: body.permite_citas,
            id_colegio: body.id_colegio,
            id_tenant: scope.tenantId,
            es_miembro_staff: true,
          };
          const technicalTutor = before
            ? null
            : await db.staff.findUnique({
                where: { id_persona: idPersona },
                include: staffInclude,
              });
          if (technicalTutor?.es_miembro_staff)
            throw new ConflictException(
              'Esta persona ya pertenece a Staff. Edita el registro existente.',
            );
          if (
            technicalTutor &&
            !(
              (technicalTutor.id_tenant === scope.tenantId ||
                technicalTutor.id_tenant === null) &&
              scope.colegioIds.includes(
                technicalTutor.id_colegio ??
                  technicalTutor.seccion?.id_colegio ??
                  -1,
              )
            )
          )
            throw new ConflictException(
              'La asignación académica existente pertenece a otro contexto institucional.',
            );
          const after = await (before || technicalTutor
            ? db.staff.update({
                where: {
                  id_staff: (before ?? technicalTutor)!.id_staff,
                },
                data,
                include: staffInclude,
              })
            : db.staff.create({
                data: { ...data, id_persona: idPersona },
                include: staffInclude,
              }));
          const acceso = body.acceso
            ? await this.ensureAccess(
                db,
                scope,
                idPersona,
                body.id_colegio,
                body.acceso,
              )
            : null;
          return { before: before ?? technicalTutor, after, acceso };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: 15000,
        },
      );
      // Structured operational audit, deliberately excluding credentials/secrets.
      this.logger.log(
        JSON.stringify({
          accion: id ? 'staff.editar' : 'staff.crear',
          usuario: userId,
          fecha: new Date().toISOString(),
          tenant: query.tenant_id,
          colegio: body.id_colegio,
          motivo:
            body.motivo?.trim() ||
            (id
              ? 'Actualización rutinaria de Staff'
              : 'Alta rutinaria de Staff'),
          anterior: result.before,
          posterior: result.after,
          acceso: result.acceso,
        }),
      );
      return result.after;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ['P2002', 'P2034'].includes(error.code)
      )
        throw new ConflictException(
          'El documento o usuario ya existe, o hubo un cambio simultáneo. Recarga y revisa los datos.',
        );
      throw error;
    }
  }
}
