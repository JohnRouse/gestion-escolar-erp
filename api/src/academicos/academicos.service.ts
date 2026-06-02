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
      throw new BadRequestException('La fecha de nacimiento no es válida.');
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

        throw new BadRequestException('Ya existe un registro con estos datos.');
      }

      if (error.code === 'P2000') {
        throw new BadRequestException(
          'Uno de los campos ingresados excede el tamaño permitido.',
        );
      }
    }

    throw error;
  }

  private async resolveScope(params: ScopeParams): Promise<MatriculaScope> {
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

    if (!usuario) throw new UnauthorizedException('Usuario no encontrado');

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
        throw new UnauthorizedException('No tienes acceso a este colegio');
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
        colegioIds: colegiosPermitidos.map((item) => item.id_colegio),
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

  private async resolveAnioActivo(scope: MatriculaScope, idAnio?: number) {
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
    params: ScopeParams & { gradoId?: number; anioId?: number },
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
      matriculados: Array.isArray(sec.matriculas) ? sec.matriculas.length : 0,
      disponibles:
        sec.aula.capacidad -
        (Array.isArray(sec.matriculas) ? sec.matriculas.length : 0),
      label: `${sec.grado.nombre_grado} "${sec.letra}" · ${sec.grado.nivel.nombre_nivel}`,
    }));
  }

  async buscarAlumno(params: ScopeParams & { dni: string }) {
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
    const limit = Math.min(Math.max(Number(params.limit || 10), 5), 50);
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
        Number.isFinite(numericId) ? { id_matricula: numericId } : undefined,
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
    const parentesco = params.parentesco?.trim() || 'Apoderado';

    const estudiante = await this.prisma.estudiante.findUnique({
      where: { id_persona: params.idEstudiante },
      include: { persona: true },
    });

    if (!estudiante) {
      throw new NotFoundException('No se encontró el alumno seleccionado.');
    }

    const apoderado = await this.prisma.apoderado.findUnique({
      where: { id_persona: params.idApoderado },
      include: { persona: true },
    });

    if (!apoderado) {
      throw new NotFoundException('No se encontró el apoderado seleccionado.');
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

  // ── CREAR ALUMNO ──────────────────────────────────────

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
          fecha_nacimiento: this.validarFechaNacimiento(dto.fecha_nacimiento),
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

      const codigo = `ALU${String(persona.id_persona).padStart(6, '0')}`;

      const estudiante = await this.prisma.estudiante.create({
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

  // ── CREAR APODERADO ───────────────────────────────────

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

      const apoderado = await this.prisma.apoderado.create({
        data: {
          id_persona: persona.id_persona,
          ocupacion: this.normalizeEmpty(dto.ocupacion),
        },
      });

      if (dto.username && dto.password) {
        const rolApoderado = await this.prisma.rol.findUnique({
          where: { nombre_rol: 'Apoderado' },
        });

        if (rolApoderado) {
          const hashed = await bcrypt.hash(dto.password, 10);

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

  // ── CREAR MATRÍCULA ───────────────────────────────────

  async createMatricula(params: {
    dto: CreateMatriculaDto & { id_colegio?: number };
    userId: number;
    rol: string;
    scope?: string;
    colegioId?: number;
  }) {
    const scope = await this.resolveScope({
      userId: params.userId,
      rol: params.rol,
      scope: params.scope,
      colegioId: params.colegioId || params.dto.id_colegio,
    });

    if (scope.tipo === 'todos' || scope.colegioIds.length !== 1) {
      throw new BadRequestException(
        'Selecciona un colegio específico para matricular',
      );
    }

    const idColegio = scope.colegioIds[0];
    const idTenant = scope.tenantId;

    const estudiante = await this.prisma.estudiante.findUnique({
      where: { id_persona: params.dto.id_estudiante },
    });

    if (!estudiante) throw new NotFoundException('Estudiante no encontrado');

    const anio = await this.prisma.anioLectivo.findFirst({
      where: {
        id_anio: params.dto.id_anio,
        id_colegio: idColegio,
      },
    });

    if (!anio) {
      throw new BadRequestException(
        'El año lectivo no pertenece al colegio seleccionado',
      );
    }

    const seccion = await this.prisma.seccion.findFirst({
      where: {
        id_seccion: params.dto.id_seccion,
        id_colegio: idColegio,
      },
      include: { aula: true },
    });

    if (!seccion) {
      throw new BadRequestException(
        'La sección no pertenece al colegio seleccionado',
      );
    }

    const existente = await this.prisma.matricula.findFirst({
      where: {
        id_estudiante: params.dto.id_estudiante,
        id_anio: params.dto.id_anio,
        id_colegio: idColegio,
        estado_matricula: {
          in: ['Activo', 'Pre-matriculado'],
        },
      },
    });

    if (existente) {
      const matriculaExistente = await this.prisma.matricula.findUnique({
        where: { id_matricula: existente.id_matricula },
        include: {
          colegio: true,
          anio: true,
          seccion: {
            include: {
              grado: {
                include: { nivel: true },
              },
            },
          },
        },
      });

      const colegioNombre =
        matriculaExistente?.colegio?.nombre || 'este colegio';
      const anioNombre =
        matriculaExistente?.anio?.nombre_anio ||
        'el año lectivo seleccionado';
      const gradoNombre =
        matriculaExistente?.seccion?.grado?.nombre_grado || 'grado';
      const nivelNombre =
        matriculaExistente?.seccion?.grado?.nivel?.nombre_nivel || 'nivel';
      const letra = matriculaExistente?.seccion?.letra || '-';
      const estado = matriculaExistente?.estado_matricula || 'matriculado';

      throw new BadRequestException(
        `El alumno ya figura como ${estado} en ${colegioNombre}, ${gradoNombre} "${letra}" · ${nivelNombre}, ${anioNombre}.`,
      );
    }

    const matriculados = await this.prisma.matricula.count({
      where: {
        id_seccion: params.dto.id_seccion,
        id_anio: params.dto.id_anio,
        id_colegio: idColegio,
        estado_matricula: {
          in: ['Activo', 'Pre-matriculado'],
        },
      },
    });

    if (matriculados >= seccion.aula.capacidad) {
      throw new BadRequestException('La sección está llena');
    }

    /**
     * Validación obligatoria de apoderados
     * antes de crear la matrícula.
     */
    if (!params.dto.apoderados || params.dto.apoderados.length === 0) {
      throw new BadRequestException(
        'Debes vincular al menos un apoderado para matricular al alumno.',
      );
    }

    for (const apoderado of params.dto.apoderados) {
      const existeApoderado = await this.prisma.apoderado.findUnique({
        where: { id_persona: apoderado.id_apoderado },
      });

      if (!existeApoderado) {
        throw new BadRequestException(
          'Uno de los apoderados seleccionados no existe.',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const matricula = await tx.matricula.create({
        data: {
          id_tenant: idTenant,
          id_colegio: idColegio,
          id_estudiante: params.dto.id_estudiante,
          id_seccion: params.dto.id_seccion,
          id_anio: params.dto.id_anio,
          estado_matricula: 'Pre-matriculado',
          id_usuario_registro: params.userId,
        },
      });

      /**
       * Vinculación de apoderados con el estudiante.
       * Se conserva el upsert solicitado.
       */
      for (const ap of params.dto.apoderados) {
        await tx.apoderadoEstudiante.upsert({
          where: {
            id_apoderado_id_estudiante: {
              id_apoderado: ap.id_apoderado,
              id_estudiante: params.dto.id_estudiante,
            },
          },
          update: { parentesco: ap.parentesco },
          create: {
            id_apoderado: ap.id_apoderado,
            id_estudiante: params.dto.id_estudiante,
            parentesco: ap.parentesco,
          },
        });
      }

      const conceptos = await tx.conceptoPago.findMany({
        where: {
          id_anio: params.dto.id_anio,
          OR: [{ id_colegio: idColegio }, { id_colegio: null }],
          es_pension: false,
          es_extraordinario: false,
          nombre_concepto: {
            contains: 'Matrícula',
          },
        },
        orderBy: [{ id_concepto: 'asc' }],
      });

      if (!conceptos.length) {
        throw new BadRequestException(
          'No existe un concepto de matrícula configurado para este colegio y año lectivo.',
        );
      }

      for (const concepto of conceptos) {
        const fechaVenc = new Date();
        fechaVenc.setDate(fechaVenc.getDate() + 1);

        await tx.cronogramaPagos.create({
          data: {
            id_matricula: matricula.id_matricula,
            id_concepto: concepto.id_concepto,
            fecha_vencimiento: fechaVenc,
            estado_pago: 'Pendiente',
          },
        });
      }

      return matricula;
    });
  }

  // ── ASISTENCIA ────────────────────────────────────────

  async getSeccionesDocente(docenteId: number, anioId: number) {
    const asignaciones = await this.prisma.asignacionDocente.findMany({
      where: { id_docente: docenteId, id_anio: anioId },
      distinct: ['id_seccion'],
      select: { seccion: true },
    });

    return asignaciones.map((a) => a.seccion);
  }

  async getAsistencia(seccionId: number, fecha: string) {
    const matriculas = await this.prisma.matricula.findMany({
      where: { id_seccion: seccionId, estado_matricula: 'Activo' },
      include: {
        estudiante: { include: { persona: true } },
        asistencias: { where: { fecha: new Date(fecha) } },
      },
    });

    return matriculas.map((m) => ({
      id_matricula: m.id_matricula,
      alumno: `${m.estudiante.persona.nombres} ${m.estudiante.persona.apellido_paterno}`,
      estado: m.asistencias.length > 0 ? m.asistencias[0].estado : 'Presente',
    }));
  }

  async saveAsistencia(
    seccionId: number,
    fecha: string,
    asistencias: { id_matricula: number; estado: string }[],
  ) {
    const fechaAsistencia = new Date(fecha);

    if (fechaAsistencia.getDay() === 0 || fechaAsistencia.getDay() === 6) {
      throw new BadRequestException(
        'No se puede registrar asistencia en fines de semana',
      );
    }

    const data = asistencias.map((a) => ({
      id_matricula: a.id_matricula,
      fecha: new Date(fecha),
      estado: a.estado,
    }));

    for (const item of data) {
      await this.prisma.asistencia.upsert({
        where: {
          id_matricula_fecha: {
            id_matricula: item.id_matricula,
            fecha: item.fecha,
          },
        },
        update: { estado: item.estado },
        create: item,
      });
    }

    return { message: 'Asistencia guardada correctamente', total: data.length };
  }

  async getAsistenciaAlumno(estudianteId: number, desde: string, hasta: string) {
    const matriculas = await this.prisma.matricula.findMany({
      where: {
        id_estudiante: estudianteId,
        estado_matricula: 'Activo',
      },
      include: {
        asistencias: {
          where: {
            fecha: {
              gte: new Date(desde),
              lte: new Date(hasta),
            },
          },
          orderBy: { fecha: 'asc' },
        },
      },
    });

    return matriculas.flatMap((mat) =>
      mat.asistencias.map((asist) => ({
        fecha: asist.fecha.toISOString().split('T')[0],
        estado: asist.estado,
      })),
    );
  }

  async getHijosApoderado(apoderadoId: number) {
    const relaciones = await this.prisma.apoderadoEstudiante.findMany({
      where: { id_apoderado: apoderadoId },
      include: {
        estudiante: {
          include: {
            persona: true,
            matriculas: {
              where: { estado_matricula: 'Activo' },
              include: {
                seccion: {
                  include: {
                    grado: {
                      include: { nivel: true },
                    },
                  },
                },
              },
              take: 1,
            },
          },
        },
      },
    });

    return relaciones.map((r) => {
      const matricula = r.estudiante.matriculas[0];
      const seccion = matricula?.seccion;
      const gradoNombre = seccion?.grado?.nombre_grado || '';
      const nivelNombre = seccion?.grado?.nivel?.nombre_nivel || '';

      return {
        id_estudiante: r.id_estudiante,
        nombre: `${r.estudiante.persona.nombres} ${r.estudiante.persona.apellido_paterno}`,
        grado: seccion
          ? `${gradoNombre} ${seccion.letra} · ${nivelNombre}`
          : 'Sin matrícula activa',
        avatar_url: r.estudiante.avatar_url,
      };
    });
  }

  async getHorarioAlumno(alumnoId: number) {
    const matriculaActiva = await this.prisma.matricula.findFirst({
      where: { id_estudiante: alumnoId, estado_matricula: 'Activo' },
      include: { seccion: true },
    });

    if (!matriculaActiva) {
      throw new NotFoundException('No se encontró matrícula activa');
    }

    const horarios = await this.prisma.horario.findMany({
      where: { id_seccion: matriculaActiva.id_seccion },
      orderBy: [{ dia_semana: 'asc' }, { hora_inicio: 'asc' }],
      include: { curso: true, docente: { include: { persona: true } } },
    });

    const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
    const resultado: any = {};

    for (const h of horarios) {
      const diaNombre = dias[h.dia_semana - 1];
      if (!resultado[diaNombre]) resultado[diaNombre] = [];

      resultado[diaNombre].push({
        hora_inicio: h.hora_inicio,
        hora_fin: h.hora_fin,
        curso: h.curso.nombre_curso,
        docente: `${h.docente.persona.nombres} ${h.docente.persona.apellido_paterno}`,
      });
    }

    return resultado;
  }

  async getTotalMatriculados(params: ScopeParams & { anioId: number }) {
    const scope = await this.resolveScope(params);

    return this.prisma.matricula.count({
      where: {
        id_anio: params.anioId,
        estado_matricula: 'Activo',
        ...this.colegioWhere(scope),
      },
    });
  }

  async getTotalDocentes() {
    return this.prisma.docente.count();
  }

  async getAnios(params: ScopeParams) {
    const scope = await this.resolveScope(params);

    return this.prisma.anioLectivo.findMany({
      where: {
        ...this.colegioWhere(scope),
      },
      orderBy: { fecha_inicio: 'desc' },
    });
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

  async getDetalleMatricula(params: ScopeParams & { idMatricula: number }) {
    const scope = await this.resolveScope(params);

    const matricula = await this.prisma.matricula.findFirst({
      where: {
        id_matricula: params.idMatricula,
        ...this.colegioWhere(scope),
      },
      include: {
        tenant: true,
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
            aula: true,
            grado: {
              include: {
                nivel: true,
              },
            },
          },
        },
        cronogramas: {
          include: {
            concepto: true,
            pagos: {
              include: {
                apoderado: {
                  include: {
                    persona: true,
                  },
                },
                cajero: {
                  include: {
                    persona: true,
                    rol: true,
                  },
                },
              },
            },
          },
          orderBy: {
            fecha_vencimiento: 'asc',
          },
        },
      },
    });

    if (!matricula) {
      throw new NotFoundException('No se encontró la matrícula solicitada.');
    }

    const cronogramaMatricula =
      matricula.cronogramas.find((item) =>
        item.concepto.nombre_concepto.toLowerCase().includes('matr'),
      ) || null;

    const cronogramasPensiones = matricula.cronogramas.filter(
      (item) => item.concepto.es_pension,
    );

    const cronogramasExtraordinarios = matricula.cronogramas.filter(
      (item) => item.concepto.es_extraordinario,
    );

    const cronogramasIniciales = matricula.cronogramas.filter(
      (item) => !item.concepto.es_pension && !item.concepto.es_extraordinario,
    );

    const totalProgramado = matricula.cronogramas.reduce(
      (acc, item) => acc + Number(item.concepto.monto_base),
      0,
    );

    const totalPagado = matricula.cronogramas.reduce((acc, item) => {
      const pagadoConcepto = item.pagos.reduce(
        (sum, pago) => sum + Number(pago.monto_pagado),
        0,
      );

      return acc + pagadoConcepto;
    }, 0);

    return {
      ...matricula,
      resumen_financiero: {
        total_programado: totalProgramado,
        total_pagado: totalPagado,
        saldo: totalProgramado - totalPagado,
        concepto_matricula: cronogramaMatricula,
        estado_pago_matricula:
          cronogramaMatricula?.estado_pago || 'No generado',
      },
      clasificacion_cronogramas: {
        iniciales: cronogramasIniciales,
        pensiones: cronogramasPensiones,
        extraordinarios: cronogramasExtraordinarios,
      },
    };
  }

  async getDirectorioStaff(usuarioId: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: usuarioId },
      include: { persona: { include: { apoderados: true } } },
    });

    const apoderadoId = usuario?.persona?.apoderados?.[0]?.id_persona;
    if (!apoderadoId) throw new NotFoundException('Apoderado no encontrado');

    const relaciones = await this.prisma.apoderadoEstudiante.findMany({
      where: { id_apoderado: apoderadoId },
      select: { id_estudiante: true },
    });

    const estudianteIds = relaciones.map((r) => r.id_estudiante);

    const matriculas = await this.prisma.matricula.findMany({
      where: {
        id_estudiante: { in: estudianteIds },
        estado_matricula: 'Activo',
      },
      select: { id_seccion: true },
    });

    const seccionIds = [...new Set(matriculas.map((m) => m.id_seccion))];

    const staffPorSeccion = await this.prisma.staff.findMany({
      where: {
        OR: [
          { id_seccion: { in: seccionIds } },
          { area: 'administrativa' },
          { area: 'salud' },
          { area: 'servicios' },
          { area: 'academica', id_seccion: null },
        ],
      },
      include: {
        persona: true,
        seccion: { include: { grado: { include: { nivel: true } } } },
      },
    });

    const resultado: any[] = [];

    for (const staff of staffPorSeccion) {
      const item: any = {
        id_staff: staff.id_staff,
        id_persona: staff.id_persona,
        nombre: `${staff.persona.nombres} ${staff.persona.apellido_paterno}`,
        cargo: staff.cargo,
        area: staff.area,
        telefono: staff.persona.telefono,
        permite_citas: staff.permite_citas,
        avatar_url: `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(
          staff.persona.nombres,
        )}&backgroundColor=b6e3f4,c0aede,d1d4f9&radius=50`,
      };

      if (
        staff.cargo === 'Docente' ||
        staff.cargo === 'Tutor' ||
        staff.cargo === 'Profesor de Taller' ||
        staff.cargo === 'Auxiliar de Educación'
      ) {
        const docente = await this.prisma.docente.findUnique({
          where: { id_persona: staff.id_persona },
          include: {
            asignaciones: {
              where: { id_seccion: { in: seccionIds } },
              include: { curso: true },
            },
            horarios: {
              include: { curso: true },
              orderBy: [{ dia_semana: 'asc' }, { hora_inicio: 'asc' }],
            },
          },
        });

        if (docente) {
          item.cursos = [
            ...new Set(
              docente.asignaciones.map((a) => a.curso.nombre_curso),
            ),
          ];

          const diasSemana = [
            'Lunes',
            'Martes',
            'Miércoles',
            'Jueves',
            'Viernes',
          ];

          const horarioPorDia: Record<
            string,
            { hora_inicio: string; hora_fin: string; curso: string }[]
          > = {};

          for (const h of docente.horarios) {
            const dia = diasSemana[h.dia_semana - 1];
            if (!horarioPorDia[dia]) horarioPorDia[dia] = [];

            horarioPorDia[dia].push({
              hora_inicio: h.hora_inicio,
              hora_fin: h.hora_fin,
              curso: h.curso.nombre_curso,
            });
          }

          item.horario = horarioPorDia;
        }
      }

      resultado.push(item);
    }

    return resultado;
  }

  async getSeccionAlumno(alumnoId: number) {
    const matricula = await this.prisma.matricula.findFirst({
      where: { id_estudiante: alumnoId, estado_matricula: 'Activo' },
      select: {
        id_seccion: true,
        seccion: {
          select: {
            letra: true,
            grado: {
              select: {
                nombre_grado: true,
                nivel: { select: { nombre_nivel: true } },
              },
            },
          },
        },
      },
    });

    if (!matricula) {
      throw new NotFoundException('No se encontró matrícula activa');
    }

    return matricula;
  }
}