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
  STAFF_ACCESS_ROLES,
  StaffAccessManageDto,
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
type Scope = {
  tenantId: number;
  colegioIds: number[];
  authorizedColegioIds: number[];
  rolesByColegio: Record<number, string>;
};
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
    const authorizedColegioIds = actor.colegios
      .filter((c) => STAFF_MANAGEMENT_ROLES.includes(c.rol_colegio))
      .map((c) => c.id_colegio);
    if (query.colegio_id && !authorizedColegioIds.includes(query.colegio_id)) {
      throw new ForbiddenException(
        'No tienes permiso para gestionar Staff en este colegio.',
      );
    }
    return {
      tenantId: query.tenant_id,
      colegioIds: query.colegio_id ? [query.colegio_id] : authorizedColegioIds,
      authorizedColegioIds,
      rolesByColegio: Object.fromEntries(
        actor.colegios.map((colegio) => [
          colegio.id_colegio,
          colegio.rol_colegio,
        ]),
      ),
    };
  }

  private actorRole(scope: Scope, idColegio: number) {
    const role = scope.rolesByColegio[idColegio];
    if (!STAFF_MANAGEMENT_ROLES.includes(role))
      throw new ForbiddenException(
        'No tienes permiso institucional para gestionar Staff en este colegio.',
      );
    return role;
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
        id_usuario: true,
        username: true,
        estado: true,
        rol: { select: { nombre_rol: true } },
        tenants: {
          where: { id_tenant: scope.tenantId },
          select: { id_tenant: true, estado: true },
        },
        colegios: {
          where: {
            id_colegio: staff.id_colegio ?? staff.seccion?.id_colegio ?? -1,
          },
          select: {
            id_colegio: true,
            rol_colegio: true,
            estado: true,
          },
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

  private async assertPersonaAuthority(
    db: Db,
    scope: Scope,
    idPersona: number,
  ) {
    const persona = await db.persona.findUnique({
      where: { id_persona: idPersona },
      select: {
        staff: {
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
        },
        usuarios: {
          select: {
            tenants: { select: { id_tenant: true } },
            colegios: {
              select: {
                id_colegio: true,
                colegio: { select: { id_tenant: true } },
              },
            },
          },
        },
        docentes: {
          select: {
            asignaciones: {
              select: {
                id_tenant: true,
                id_colegio: true,
                colegio: { select: { id_tenant: true } },
              },
            },
            especialidades: {
              select: {
                area: {
                  select: {
                    id_tenant: true,
                    id_colegio: true,
                    colegio: { select: { id_tenant: true } },
                  },
                },
              },
            },
          },
        },
        estudiantes: {
          select: {
            matriculas: {
              select: {
                id_tenant: true,
                id_colegio: true,
                colegio: { select: { id_tenant: true } },
              },
            },
          },
        },
        apoderados: {
          select: {
            estudiantes: {
              select: {
                estudiante: {
                  select: {
                    matriculas: {
                      select: {
                        id_tenant: true,
                        id_colegio: true,
                        colegio: { select: { id_tenant: true } },
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
    if (!persona)
      throw new NotFoundException('La Persona vinculada ya no existe.');

    const tenantIds = new Set<number>();
    const colegioIds = new Set<number>();
    const add = (
      idTenant: number | null | undefined,
      idColegio?: number | null,
      colegioTenant?: number | null,
    ) => {
      if (idTenant) tenantIds.add(idTenant);
      if (colegioTenant) tenantIds.add(colegioTenant);
      if (idColegio) colegioIds.add(idColegio);
    };

    for (const staff of persona.staff)
      add(
        staff.id_tenant,
        staff.id_colegio ?? staff.seccion?.id_colegio,
        staff.colegio?.id_tenant ?? staff.seccion?.colegio?.id_tenant,
      );
    for (const usuario of persona.usuarios) {
      for (const tenant of usuario.tenants) tenantIds.add(tenant.id_tenant);
      for (const colegio of usuario.colegios)
        add(null, colegio.id_colegio, colegio.colegio.id_tenant);
    }
    for (const docente of persona.docentes) {
      for (const asignacion of docente.asignaciones)
        add(
          asignacion.id_tenant,
          asignacion.id_colegio,
          asignacion.colegio?.id_tenant,
        );
      for (const especialidad of docente.especialidades)
        add(
          especialidad.area.id_tenant,
          especialidad.area.id_colegio,
          especialidad.area.colegio?.id_tenant,
        );
    }
    for (const estudiante of persona.estudiantes)
      for (const matricula of estudiante.matriculas)
        add(
          matricula.id_tenant,
          matricula.id_colegio,
          matricula.colegio?.id_tenant,
        );
    for (const apoderado of persona.apoderados)
      for (const vinculo of apoderado.estudiantes)
        for (const matricula of vinculo.estudiante.matriculas)
          add(
            matricula.id_tenant,
            matricula.id_colegio,
            matricula.colegio?.id_tenant,
          );

    if ([...tenantIds].some((idTenant) => idTenant !== scope.tenantId))
      throw new ForbiddenException(
        'La Persona también está vinculada a otra organización. Por seguridad, sus datos canónicos no pueden modificarse desde Staff.',
      );
    if (
      [...colegioIds].some(
        (idColegio) => !scope.authorizedColegioIds.includes(idColegio),
      )
    )
      throw new ForbiddenException(
        'La Persona también está vinculada a un colegio que no administras. Solicita la corrección a un administrador con alcance completo.',
      );
  }

  private validateAccessAction(input: StaffAccessManageDto) {
    const requiredField = {
      editar_usuario: 'username',
      cambiar_rol: 'rol',
      restablecer_password: 'password',
      cambiar_estado: 'estado',
    }[input.accion] as 'username' | 'rol' | 'password' | 'estado';
    const supplied = (
      ['username', 'rol', 'password', 'estado'] as const
    ).filter((field) => input[field] !== undefined);
    if (
      input[requiredField] === undefined ||
      supplied.some((field) => field !== requiredField)
    )
      throw new BadRequestException(
        'Envía únicamente el dato correspondiente a la acción de acceso seleccionada.',
      );
  }

  private summarizeAccount(
    account: {
      id_usuario: number;
      username: string;
      estado: boolean;
      rol: { nombre_rol: string };
      tenants: { id_tenant: number; estado: string }[];
      colegios: {
        id_colegio: number;
        rol_colegio: string;
        estado: string;
      }[];
    },
    scope: Scope,
    idColegio: number,
  ) {
    const tenant = account.tenants.find(
      (item) => item.id_tenant === scope.tenantId,
    );
    const colegio = account.colegios.find(
      (item) => item.id_colegio === idColegio,
    );
    return {
      id_usuario: account.id_usuario,
      username: account.username,
      rol: account.rol.nombre_rol,
      estado_usuario: account.estado,
      estado_tenant: tenant?.estado ?? 'Sin membresía',
      estado_colegio: colegio?.estado ?? 'Sin membresía',
    };
  }

  private async manageableAccount(
    db: Db,
    scope: Scope,
    idColegio: number,
    idPersona: number,
    idUsuario: number,
  ) {
    const account = await db.usuario.findFirst({
      where: { id_usuario: idUsuario, id_persona: idPersona },
      select: {
        id_usuario: true,
        id_persona: true,
        username: true,
        estado: true,
        rol: { select: { nombre_rol: true } },
        tenants: { select: { id_tenant: true, estado: true } },
        colegios: {
          select: {
            id_colegio: true,
            rol_colegio: true,
            estado: true,
            colegio: { select: { id_tenant: true } },
          },
        },
      },
    });
    if (!account)
      throw new NotFoundException(
        'La cuenta no pertenece a esta Persona o ya no está disponible.',
      );
    if (
      !STAFF_ACCESS_ROLES.includes(
        account.rol.nombre_rol as (typeof STAFF_ACCESS_ROLES)[number],
      )
    )
      throw new ForbiddenException(
        'Esta cuenta tiene privilegios de plataforma y no puede administrarse desde Staff.',
      );
    if (
      account.tenants.some((tenant) => tenant.id_tenant !== scope.tenantId) ||
      account.colegios.some(
        (colegio) =>
          colegio.colegio.id_tenant !== scope.tenantId ||
          !scope.authorizedColegioIds.includes(colegio.id_colegio),
      )
    )
      throw new ForbiddenException(
        'La cuenta también tiene membresías fuera de tu alcance. Adminístrala desde Usuarios con autoridad completa.',
      );
    const affectedColegioIds = new Set([
      idColegio,
      ...account.colegios.map((colegio) => colegio.id_colegio),
    ]);
    if (
      account.rol.nombre_rol === 'Admin' &&
      [...affectedColegioIds].some(
        (affectedColegioId) =>
          this.actorRole(scope, affectedColegioId) !== 'Admin',
      )
    )
      throw new ForbiddenException(
        'Director no puede modificar ni desactivar una cuenta Admin.',
      );
    return account;
  }

  protected async ensureAccess(
    db: Db,
    scope: Scope,
    idPersona: number,
    idColegio: number,
    input: StaffAccesoDto,
  ) {
    if (input.rol === 'Admin' && this.actorRole(scope, idColegio) !== 'Admin')
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

  async manageAccess(
    userId: number,
    query: StaffScopeDto,
    idStaff: number,
    idUsuario: number,
    body: StaffAccessManageDto,
  ) {
    this.validateAccessAction(body);
    try {
      const result = await this.prisma.$transaction(
        async (db) => {
          const scope = await this.resolveScope(db, userId, query);
          const staff = await this.record(db, scope, idStaff);
          const idColegio = staff.id_colegio ?? staff.seccion?.id_colegio ?? -1;
          if (!scope.colegioIds.includes(idColegio))
            throw new ForbiddenException(
              'La cuenta no pertenece a un colegio del alcance activo.',
            );
          const account = await this.manageableAccount(
            db,
            scope,
            idColegio,
            staff.id_persona,
            idUsuario,
          );
          const before = this.summarizeAccount(account, scope, idColegio);

          if (body.accion === 'editar_usuario') {
            const username = body.username!.trim().toLowerCase();
            if (username === account.username)
              throw new BadRequestException(
                'El nuevo username debe ser distinto del actual.',
              );
            const duplicate = await db.usuario.findUnique({
              where: { username },
              select: { id_usuario: true },
            });
            if (duplicate && duplicate.id_usuario !== idUsuario)
              throw new ConflictException(
                'El username ya está en uso por otra cuenta.',
              );
            await db.usuario.update({
              where: { id_usuario: idUsuario },
              data: { username },
            });
          }

          if (body.accion === 'cambiar_rol') {
            if (body.rol === account.rol.nombre_rol)
              throw new BadRequestException(
                'Selecciona un rol diferente del actual.',
              );
            const affectedColegioIds = new Set([
              idColegio,
              ...account.colegios.map((colegio) => colegio.id_colegio),
            ]);
            if (
              body.rol === 'Admin' &&
              [...affectedColegioIds].some(
                (affectedColegioId) =>
                  this.actorRole(scope, affectedColegioId) !== 'Admin',
              )
            )
              throw new ForbiddenException(
                'Director no puede crear ni elevar una cuenta a Admin.',
              );
            const role = await db.rol.findUnique({
              where: { nombre_rol: body.rol! },
              select: { id_rol: true },
            });
            if (!role)
              throw new BadRequestException(
                'El rol seleccionado no está configurado.',
              );
            await db.usuario.update({
              where: { id_usuario: idUsuario },
              data: { id_rol: role.id_rol },
            });
            await db.usuarioColegio.updateMany({
              where: {
                id_usuario: idUsuario,
                colegio: { id_tenant: scope.tenantId },
              },
              data: { rol_colegio: body.rol! },
            });
          }

          if (body.accion === 'restablecer_password') {
            if (Buffer.byteLength(body.password!, 'utf8') > 72)
              throw new BadRequestException(
                'La nueva contraseña debe tener entre 8 caracteres y 72 bytes.',
              );
            await db.usuario.update({
              where: { id_usuario: idUsuario },
              data: { password_hash: await bcrypt.hash(body.password!, 10) },
            });
          }

          if (body.accion === 'cambiar_estado') {
            const membership = account.colegios.find(
              (item) => item.id_colegio === idColegio,
            );
            if (!body.estado && membership?.estado === 'Inactivo')
              throw new BadRequestException(
                'El acceso ya está desactivado en este colegio.',
              );
            if (body.estado) {
              await db.usuario.update({
                where: { id_usuario: idUsuario },
                data: { estado: true },
              });
              await db.usuarioTenant.upsert({
                where: {
                  id_usuario_id_tenant: {
                    id_usuario: idUsuario,
                    id_tenant: scope.tenantId,
                  },
                },
                update: { estado: 'Activo' },
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
                  id_usuario_id_colegio: {
                    id_usuario: idUsuario,
                    id_colegio: idColegio,
                  },
                },
                update: { estado: 'Activo' },
                create: {
                  id_usuario: idUsuario,
                  id_colegio: idColegio,
                  rol_colegio: account.rol.nombre_rol,
                  estado: 'Activo',
                  es_principal: hasPrincipal === 0,
                },
              });
            } else {
              if (!membership)
                throw new BadRequestException(
                  'La cuenta no tiene acceso en este colegio.',
                );
              await db.usuarioColegio.update({
                where: {
                  id_usuario_id_colegio: {
                    id_usuario: idUsuario,
                    id_colegio: idColegio,
                  },
                },
                data: { estado: 'Inactivo' },
              });
            }
          }

          const updated = await this.manageableAccount(
            db,
            scope,
            idColegio,
            staff.id_persona,
            idUsuario,
          );
          return {
            scope,
            idColegio,
            before,
            after: {
              ...this.summarizeAccount(updated, scope, idColegio),
              ...(body.accion === 'restablecer_password'
                ? { password_restablecida: true }
                : {}),
            },
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: 15000,
        },
      );
      this.logger.log(
        JSON.stringify({
          accion: `staff.acceso.${body.accion}`,
          usuario: userId,
          fecha: new Date().toISOString(),
          tenant: result.scope.tenantId,
          colegio: result.idColegio,
          motivo: body.motivo.trim(),
          anterior: result.before,
          posterior: result.after,
        }),
      );
      return this.detail(userId, query, idStaff);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ['P2002', 'P2034'].includes(error.code)
      )
        throw new ConflictException(
          'El username ya existe o hubo un cambio simultáneo. Recarga y revisa los datos.',
        );
      throw error;
    }
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
          if (
            before &&
            body.id_colegio !==
              (before.id_colegio ?? before.seccion?.id_colegio)
          )
            throw new BadRequestException(
              'El traslado de Staff entre colegios requiere un proceso específico.',
            );
          if (before && body.persona) {
            if (new Date(body.persona.fecha_nacimiento) > new Date())
              throw new BadRequestException(
                'La fecha de nacimiento no puede ser futura.',
              );
            await this.assertPersonaAuthority(db, scope, before.id_persona);
            const duplicateDni = await db.persona.findUnique({
              where: { dni: body.persona.dni },
              select: { id_persona: true },
            });
            if (duplicateDni && duplicateDni.id_persona !== before.id_persona)
              throw new ConflictException(
                'El DNI ya pertenece a otra Persona. Verifica el documento antes de guardar.',
              );
            await db.persona.update({
              where: { id_persona: before.id_persona },
              data: {
                ...body.persona,
                fecha_nacimiento: new Date(body.persona.fecha_nacimiento),
              },
            });
          }
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
