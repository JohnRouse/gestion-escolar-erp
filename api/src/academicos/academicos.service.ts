import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAlumnoDto } from './dto/create-alumno.dto';
import { CreateApoderadoDto } from './dto/create-apoderado.dto';
import { CreateMatriculaDto } from './dto/create-matricula.dto';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';

interface ScopeParams {
  userId: number;
  rol: string;
  scope?: string;
  colegioId?: number;
}

interface MatriculaScope {
  tipo: 'todos' | 'colegio';
  tenantId: number | null;
  colegioIds: number[];
  colegios: {
    id_colegio: number;
    id_tenant: number;
    nombre: string;
    nombre_corto: string | null;
    codigo: string | null;
  }[];
  puedeVerConsolidado: boolean;
}

@Injectable()
export class AcademicosService {
  constructor(private prisma: PrismaService) {}

  private normalizeEmpty(value?: string | null) {
    const clean = value?.trim();
    return clean ? clean : null;
  }

  private normalizeGenero(value?: string | null) {
    if (!value) return null;
    if (value === 'Masculino') return 'M';
    if (value === 'Femenino') return 'F';
    return String(value).charAt(0).toUpperCase();
  }

  private validarFechaNacimiento(fecha: string) {
    const nacimiento = new Date(fecha);

    if (Number.isNaN(nacimiento.getTime())) {
      throw new BadRequestException(
        'La fecha de nacimiento no es válida.',
      );
    }

    const hoy = new Date();
    const fechaMinima = new Date('1990-01-01');

    if (nacimiento > hoy) {
      throw new BadRequestException(
        'La fecha de nacimiento no puede ser futura.',
      );
    }

    if (nacimiento < fechaMinima) {
      throw new BadRequestException(
        'La fecha de nacimiento ingresada parece demasiado antigua. Revisa el dato.',
      );
    }

    return nacimiento;
  }

  private handlePersonaPrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = Array.isArray(error.meta?.target)
          ? error.meta?.target.join(', ')
          : String(error.meta?.target || '');

        if (target.includes('dni')) {
          throw new BadRequestException(
            'Ya existe una persona registrada con este DNI.',
          );
        }

        if (target.includes('username')) {
          throw new BadRequestException(
            'El nombre de usuario ya está registrado. Usa otro usuario para el acceso.',
          );
        }

        throw new BadRequestException(
          'Ya existe un registro con estos datos.',
        );
      }

      if (error.code === 'P2000') {
        throw new BadRequestException(
          'Uno de los campos ingresados excede el tamaño permitido.',
        );
      }
    }

    throw error;
  }

  private async resolveScope(
    params: ScopeParams,
  ): Promise<MatriculaScope> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: params.userId },
      include: {
        rol: true,
        colegios: {
          where: { estado: 'Activo' },
          include: { colegio: true },
          orderBy: { es_principal: 'desc' },
        },
      },
    });

    if (!usuario)
      throw new UnauthorizedException('Usuario no encontrado');

    const colegiosPermitidos = usuario.colegios.map((acceso) => ({
      id_colegio: acceso.colegio.id_colegio,
      id_tenant: acceso.colegio.id_tenant,
      nombre: acceso.colegio.nombre,
      nombre_corto: acceso.colegio.nombre_corto,
      codigo: acceso.colegio.codigo,
    }));

    if (!colegiosPermitidos.length) {
      return {
        tipo: 'colegio',
        tenantId: null,
        colegioIds: [],
        colegios: [],
        puedeVerConsolidado: false,
      };
    }

    const puedeVerConsolidado =
      ['Admin', 'Director'].includes(params.rol) &&
      colegiosPermitidos.length > 1;

    if (params.colegioId) {
      const colegio = colegiosPermitidos.find(
        (item) => item.id_colegio === params.colegioId,
      );

      if (!colegio) {
        throw new UnauthorizedException(
          'No tienes acceso a este colegio',
        );
      }

      return {
        tipo: 'colegio',
        tenantId: colegio.id_tenant,
        colegioIds: [colegio.id_colegio],
        colegios: [colegio],
        puedeVerConsolidado,
      };
    }

    if (params.scope === 'all' && puedeVerConsolidado) {
      return {
        tipo: 'todos',
        tenantId: colegiosPermitidos[0].id_tenant,
        colegioIds: colegiosPermitidos.map(
          (item) => item.id_colegio,
        ),
        colegios: colegiosPermitidos,
        puedeVerConsolidado,
      };
    }

    const principal = colegiosPermitidos[0];

    return {
      tipo: 'colegio',
      tenantId: principal.id_tenant,
      colegioIds: [principal.id_colegio],
      colegios: [principal],
      puedeVerConsolidado,
    };
  }

  private colegioWhere(scope: MatriculaScope) {
    return scope.colegioIds.length
      ? { id_colegio: { in: scope.colegioIds } }
      : { id_colegio: -1 };
  }

  private async resolveAnioActivo(
    scope: MatriculaScope,
    idAnio?: number,
  ) {
    if (!scope.colegioIds.length) return null;

    if (idAnio) {
      const anio = await this.prisma.anioLectivo.findFirst({
        where: {
          id_anio: idAnio,
          id_colegio: { in: scope.colegioIds },
        },
      });

      if (anio) return anio;
    }

    const activo = await this.prisma.anioLectivo.findFirst({
      where: {
        id_colegio: { in: scope.colegioIds },
        estado: 'Activo',
      },
      orderBy: { id_anio: 'desc' },
    });

    if (activo) return activo;

    return this.prisma.anioLectivo.findFirst({
      where: { id_colegio: { in: scope.colegioIds } },
      orderBy: { id_anio: 'desc' },
    });
  }

  // ── CONSULTAS ──────────────────────────────────────────

  async getNiveles() {
    return this.prisma.nivel.findMany();
  }

  async getGrados(nivelId: number) {
    return this.prisma.grado.findMany({
      where: { id_nivel: nivelId },
    });
  }

  async getSecciones(
    params: ScopeParams & {
      gradoId?: number;
      anioId?: number;
    },
  ) {
    const scope = await this.resolveScope(params);

    const where: any = {
      ...this.colegioWhere(scope),
    };

    if (params.gradoId) where.id_grado = params.gradoId;

    const secciones = await this.prisma.seccion.findMany({
      where,
      include: {
        colegio: true,
        aula: true,
        grado: { include: { nivel: true } },
        matriculas: params.anioId
          ? {
              where: {
                id_anio: params.anioId,
                estado_matricula: {
                  in: ['Activo', 'Pre-matriculado'],
                },
                ...this.colegioWhere(scope),
              },
            }
          : false,
      },
      orderBy: [
        { colegio: { nombre: 'asc' } },
        { grado: { id_nivel: 'asc' } },
        { id_grado: 'asc' },
        { letra: 'asc' },
      ],
    });

    return secciones.map((sec) => ({
      id_seccion: sec.id_seccion,
      id_tenant: sec.id_tenant,
      id_colegio: sec.id_colegio,
      colegio: sec.colegio,
      letra: sec.letra,
      grado: sec.grado,
      aula: sec.aula,
      matriculas: sec.matriculas || [],
      capacidad: sec.aula.capacidad,
      matriculados: Array.isArray(sec.matriculas)
        ? sec.matriculas.length
        : 0,
      disponibles:
        sec.aula.capacidad -
        (Array.isArray(sec.matriculas)
          ? sec.matriculas.length
          : 0),
      label: `${sec.grado.nombre_grado} "${sec.letra}" · ${sec.grado.nivel.nombre_nivel}`,
    }));
  }

  async buscarAlumno(
    params: ScopeParams & { dni: string },
  ) {
    const scope = await this.resolveScope(params);

    const persona = await this.prisma.persona.findFirst({
      where: {
        dni: params.dni,
        estudiantes: { some: {} },
      },
      include: {
        estudiantes: {
          include: {
            apoderados: {
              include: {
                apoderado: {
                  include: {
                    persona: true,
                  },
                },
              },
            },
            matriculas: {
              where: {
                ...this.colegioWhere(scope),
              },
              include: {
                colegio: true,
                anio: true,
                seccion: {
                  include: {
                    colegio: true,
                    grado: { include: { nivel: true } },
                  },
                },
              },
              orderBy: { id_matricula: 'desc' },
            },
          },
        },
      },
    });

    if (!persona) {
      throw new NotFoundException(
        'No se encontró un alumno registrado con ese DNI.',
      );
    }

    return persona;
  }

  async buscarMatriculas(
    params: ScopeParams & {
      q?: string;
      desde?: string;
      hasta?: string;
      registradoPor?: string;
      estado?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const scope = await this.resolveScope(params);

    const page = Math.max(Number(params.page || 1), 1);
    const limit = Math.min(
      Math.max(Number(params.limit || 10), 5),
      50,
    );

    const skip = (page - 1) * limit;

    const where: any = {
      ...this.colegioWhere(scope),
    };

    if (params.estado && params.estado !== 'Todos') {
      where.estado_matricula = params.estado;
    }

    if (params.desde || params.hasta) {
      where.fecha_matricula = {};

      if (params.desde) {
        where.fecha_matricula.gte = new Date(
          `${params.desde}T00:00:00.000-05:00`,
        );
      }

      if (params.hasta) {
        where.fecha_matricula.lte = new Date(
          `${params.hasta}T23:59:59.999-05:00`,
        );
      }
    }

    const q = params.q?.trim();

    if (q) {
      const numericId = Number(q);

      where.OR = [
        Number.isFinite(numericId)
          ? { id_matricula: numericId }
          : undefined,
        {
          estudiante: {
            persona: {
              OR: [
                { dni: { contains: q } },
                { nombres: { contains: q } },
                { apellido_paterno: { contains: q } },
                { apellido_materno: { contains: q } },
              ],
            },
          },
        },
        {
          estudiante: {
            apoderados: {
              some: {
                apoderado: {
                  persona: {
                    OR: [
                      { dni: { contains: q } },
                      { nombres: { contains: q } },
                      { apellido_paterno: { contains: q } },
                      { apellido_materno: { contains: q } },
                      { telefono: { contains: q } },
                    ],
                  },
                },
              },
            },
          },
        },
      ].filter(Boolean);
    }

    if (params.registradoPor?.trim()) {
      const filtro = params.registradoPor.trim();

      where.registrado_por = {
        OR: [
          { username: { contains: filtro } },
          {
            persona: {
              OR: [
                { nombres: { contains: filtro } },
                { apellido_paterno: { contains: filtro } },
                { apellido_materno: { contains: filtro } },
              ],
            },
          },
        ],
      };
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.matricula.count({ where }),
      this.prisma.matricula.findMany({
        where,
        include: {
          colegio: true,
          anio: true,
          registrado_por: {
            include: {
              persona: true,
              rol: true,
            },
          },
          estudiante: {
            include: {
              persona: true,
              apoderados: {
                include: {
                  apoderado: {
                    include: {
                      persona: true,
                    },
                  },
                },
              },
            },
          },
          seccion: {
            include: {
              grado: { include: { nivel: true } },
            },
          },
        },
        orderBy: { fecha_matricula: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async vincularApoderadoAlumno(params: {
    idEstudiante: number;
    idApoderado: number;
    parentesco?: string;
  }) {
    const parentesco =
      params.parentesco?.trim() || 'Apoderado';

    const estudiante =
      await this.prisma.estudiante.findUnique({
        where: { id_persona: params.idEstudiante },
        include: { persona: true },
      });

    if (!estudiante) {
      throw new NotFoundException(
        'No se encontró el alumno seleccionado.',
      );
    }

    const apoderado =
      await this.prisma.apoderado.findUnique({
        where: { id_persona: params.idApoderado },
        include: { persona: true },
      });

    if (!apoderado) {
      throw new NotFoundException(
        'No se encontró el apoderado seleccionado.',
      );
    }

    await this.prisma.apoderadoEstudiante.upsert({
      where: {
        id_apoderado_id_estudiante: {
          id_apoderado: params.idApoderado,
          id_estudiante: params.idEstudiante,
        },
      },
      update: {
        parentesco,
      },
      create: {
        id_apoderado: params.idApoderado,
        id_estudiante: params.idEstudiante,
        parentesco,
      },
    });

    return {
      message: 'Apoderado vinculado correctamente.',
      id_estudiante: params.idEstudiante,
      id_apoderado: params.idApoderado,
      parentesco,
    };
  }

  async buscarApoderado(dni: string) {
    const persona = await this.prisma.persona.findFirst({
      where: {
        dni,
        apoderados: { some: {} },
      },
      include: { apoderados: true },
    });

    if (!persona || !persona.apoderados.length) {
      throw new NotFoundException(
        'No se encontró un apoderado registrado con ese DNI.',
      );
    }

    return {
      id_persona: persona.id_persona,
      dni: persona.dni,
      nombres: persona.nombres,
      apellido_paterno: persona.apellido_paterno,
      apellido_materno: persona.apellido_materno,
      telefono: persona.telefono,
      correo: persona.correo,
      direccion: persona.direccion,
      pais: persona.pais,
      departamento: persona.departamento,
      provincia: persona.provincia,
      distrito: persona.distrito,
      apoderado: persona.apoderados[0],
    };
  }

  async createAlumno(dto: CreateAlumnoDto) {
    const existente = await this.prisma.persona.findUnique({
      where: { dni: dto.dni },
      include: { estudiantes: true },
    });

    if (existente?.estudiantes?.length) {
      throw new BadRequestException(
        'El DNI ya pertenece a un alumno registrado.',
      );
    }

    if (existente) {
      throw new BadRequestException(
        'El DNI ya pertenece a una persona registrada. Revisa si es apoderado, docente o staff.',
      );
    }

    try {
      const persona = await this.prisma.persona.create({
        data: {
          dni: dto.dni.trim(),
          nombres: dto.nombres.trim(),
          apellido_paterno: dto.apellido_paterno.trim(),
          apellido_materno: dto.apellido_materno.trim(),
          fecha_nacimiento:
            this.validarFechaNacimiento(
              dto.fecha_nacimiento,
            ),
          genero: this.normalizeGenero(dto.genero),
          direccion: this.normalizeEmpty(dto.direccion),
          pais: this.normalizeEmpty(dto.pais) || 'Perú',
          departamento: this.normalizeEmpty(dto.departamento),
          provincia: this.normalizeEmpty(dto.provincia),
          distrito: this.normalizeEmpty(dto.distrito),
          telefono: this.normalizeEmpty(dto.telefono),
          correo: this.normalizeEmpty(dto.correo),
        },
      });

      const codigo = `ALU${String(
        persona.id_persona,
      ).padStart(6, '0')}`;

      const estudiante =
        await this.prisma.estudiante.create({
          data: {
            id_persona: persona.id_persona,
            codigo_estudiante: codigo,
          },
        });

      return { persona, estudiante };
    } catch (error) {
      this.handlePersonaPrismaError(error);
    }
  }

  async createApoderado(dto: CreateApoderadoDto) {
    const existente = await this.prisma.persona.findUnique({
      where: { dni: dto.dni },
      include: { apoderados: true },
    });

    if (existente?.apoderados?.length) {
      throw new BadRequestException(
        'Este DNI ya pertenece a un apoderado. Usa la búsqueda para vincularlo.',
      );
    }

    if (existente) {
      throw new BadRequestException(
        'El DNI ya pertenece a una persona registrada. Revisa si es alumno, docente o staff.',
      );
    }

    try {
      const persona = await this.prisma.persona.create({
        data: {
          dni: dto.dni.trim(),
          nombres: dto.nombres.trim(),
          apellido_paterno: dto.apellido_paterno.trim(),
          apellido_materno: dto.apellido_materno.trim(),
          fecha_nacimiento: new Date('1980-01-01'),
          telefono: this.normalizeEmpty(dto.telefono),
          correo: this.normalizeEmpty(dto.correo),
          direccion: this.normalizeEmpty(dto.direccion),
          pais: this.normalizeEmpty(dto.pais) || 'Perú',
          departamento: this.normalizeEmpty(dto.departamento),
          provincia: this.normalizeEmpty(dto.provincia),
          distrito: this.normalizeEmpty(dto.distrito),
        },
      });

      const apoderado =
        await this.prisma.apoderado.create({
          data: {
            id_persona: persona.id_persona,
            ocupacion: this.normalizeEmpty(
              dto.ocupacion,
            ),
          },
        });

      if (dto.username && dto.password) {
        const rolApoderado =
          await this.prisma.rol.findUnique({
            where: { nombre_rol: 'Apoderado' },
          });

        if (rolApoderado) {
          const hashed = await bcrypt.hash(
            dto.password,
            10,
          );

          await this.prisma.usuario.create({
            data: {
              username: dto.username.trim(),
              password_hash: hashed,
              id_persona: persona.id_persona,
              id_rol: rolApoderado.id_rol,
              estado: true,
            },
          });
        }
      }

      return { persona, apoderado };
    } catch (error) {
      this.handlePersonaPrismaError(error);
    }
  }

  async getUltimasMatriculas(params: ScopeParams) {
    const scope = await this.resolveScope(params);

    return this.prisma.matricula.findMany({
      where: {
        ...this.colegioWhere(scope),
      },
      include: {
        colegio: true,
        anio: true,
        registrado_por: {
          include: {
            persona: true,
            rol: true,
          },
        },
        estudiante: { include: { persona: true } },
        seccion: {
          include: {
            grado: { include: { nivel: true } },
          },
        },
      },
      orderBy: { fecha_matricula: 'desc' },
      take: 5,
    });
  }
}