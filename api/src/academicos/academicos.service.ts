import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAlumnoDto } from './dto/create-alumno.dto';
import { CreateApoderadoDto } from './dto/create-apoderado.dto';
import { CreateMatriculaDto } from './dto/create-matricula.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AcademicosService {
  constructor(private prisma: PrismaService) {}

  // ── CONSULTAS ──────────────────────────────────────────

  async getNiveles() {
    return this.prisma.nivel.findMany();
  }

  async getGrados(nivelId: number) {
    return this.prisma.grado.findMany({
      where: { id_nivel: nivelId },
    });
  }

  async getSecciones(gradoId?: number, anioId?: number) {
  const where: any = {};
  if (gradoId) where.id_grado = gradoId;

  const secciones = await this.prisma.seccion.findMany({
    where,
    include: {
      aula: true,
      grado: { include: { nivel: true } },
      matriculas: anioId
        ? {
            where: { id_anio: anioId, estado_matricula: 'Activo' },
          }
        : false,
    },
  });

  return secciones.map((sec) => ({
    id_seccion: sec.id_seccion,
    letra: sec.letra,
    grado: sec.grado,
    aula: sec.aula,
    matriculas: sec.matriculas || [],
    capacidad: sec.aula.capacidad,
    matriculados: Array.isArray(sec.matriculas) ? sec.matriculas.length : 0,
    disponibles:
      sec.aula.capacidad - (Array.isArray(sec.matriculas) ? sec.matriculas.length : 0),
  }));
}

  async buscarAlumno(dni: string) {
    return this.prisma.persona.findFirst({
      where: { dni },
      include: { estudiantes: { include: { matriculas: true } } },
    });
  }

  // ── CREAR ALUMNO (PERSONA + ESTUDIANTE) ─────────────

  async createAlumno(dto: CreateAlumnoDto) {
    const existente = await this.prisma.persona.findUnique({
      where: { dni: dto.dni },
    });
    if (existente) throw new BadRequestException('El DNI ya está registrado');

    const persona = await this.prisma.persona.create({
      data: {
        dni: dto.dni,
        nombres: dto.nombres,
        apellido_paterno: dto.apellido_paterno,
        apellido_materno: dto.apellido_materno,
        fecha_nacimiento: new Date(dto.fecha_nacimiento),
        genero: dto.genero,
        direccion: dto.direccion,
        telefono: dto.telefono,
        correo: dto.correo,
      },
    });

    // Generar código de estudiante automático
    const codigo = `ALU${String(persona.id_persona).padStart(6, '0')}`;
    const estudiante = await this.prisma.estudiante.create({
      data: {
        id_persona: persona.id_persona,
        codigo_estudiante: codigo,
      },
    });

    return { persona, estudiante };
  }

  // ── CREAR APODERADO (PERSONA + APODERADO + USUARIO) ──

  async createApoderado(dto: CreateApoderadoDto) {
    const existente = await this.prisma.persona.findUnique({
      where: { dni: dto.dni },
    });
    if (existente) throw new BadRequestException('El DNI ya está registrado');

    const persona = await this.prisma.persona.create({
      data: {
        dni: dto.dni,
        nombres: dto.nombres,
        apellido_paterno: dto.apellido_paterno,
        apellido_materno: dto.apellido_materno,
        fecha_nacimiento: new Date('1980-01-01'), // fecha genérica
        telefono: dto.telefono,
        correo: dto.correo,
      },
    });

    const apoderado = await this.prisma.apoderado.create({
      data: {
        id_persona: persona.id_persona,
        ocupacion: dto.ocupacion,
      },
    });

    // Crear usuario para el apoderado si se proporcionan credenciales
    if (dto.username && dto.password) {
      const rolApoderado = await this.prisma.rol.findUnique({
        where: { nombre_rol: 'Apoderado' },
      });
      if (rolApoderado) {
        const hashed = await bcrypt.hash(dto.password, 10);
        await this.prisma.usuario.create({
          data: {
            username: dto.username,
            password_hash: hashed,
            id_persona: persona.id_persona,
            id_rol: rolApoderado.id_rol,
            estado: true,
          },
        });
      }
    }

    return { persona, apoderado };
  }

  // ── CREAR MATRÍCULA (TRANSACCIÓN COMPLETA) ──────────

  async createMatricula(dto: CreateMatriculaDto) {
    // Validar que el estudiante exista
    const estudiante = await this.prisma.estudiante.findUnique({
      where: { id_persona: dto.id_estudiante },
    });
    if (!estudiante) throw new NotFoundException('Estudiante no encontrado');

    // Validar que no tenga matrícula activa en el mismo año
    const existente = await this.prisma.matricula.findFirst({
      where: {
        id_estudiante: dto.id_estudiante,
        id_anio: dto.id_anio,
        estado_matricula: 'Activo',
      },
    });
    if (existente) throw new BadRequestException('El alumno ya está matriculado en este año lectivo');

    // Validar cupo
    const seccion = await this.prisma.seccion.findUnique({
      where: { id_seccion: dto.id_seccion },
      include: { aula: true },
    });
    if (!seccion) throw new NotFoundException('Sección no encontrada');

    const matriculados = await this.prisma.matricula.count({
      where: {
        id_seccion: dto.id_seccion,
        id_anio: dto.id_anio,
        estado_matricula: 'Activo',
      },
    });
    if (matriculados >= seccion.aula.capacidad) {
      throw new BadRequestException('La sección está llena');
    }

    // Transacción: crear matrícula, generar deudas, asociar apoderados
    return this.prisma.$transaction(async (tx) => {
      // 1. Matrícula
      const matricula = await tx.matricula.create({
        data: {
          id_estudiante: dto.id_estudiante,
          id_seccion: dto.id_seccion,
          id_anio: dto.id_anio,
          estado_matricula: 'Activo',
        },
      });

      // 2. Asociar apoderados (si se enviaron)
      if (dto.apoderados) {
        for (const ap of dto.apoderados) {
          await tx.apoderadoEstudiante.upsert({
            where: {
              id_apoderado_id_estudiante: {
                id_apoderado: ap.id_apoderado,
                id_estudiante: dto.id_estudiante,
              },
            },
            update: { parentesco: ap.parentesco },
            create: {
              id_apoderado: ap.id_apoderado,
              id_estudiante: dto.id_estudiante,
              parentesco: ap.parentesco,
            },
          });
        }
      }

      // 3. Generar deudas automáticas
const conceptos = await tx.conceptoPago.findMany({
  where: { id_anio: dto.id_anio },
});
const fechaBase = new Date(); // fecha actual
for (let i = 0; i < conceptos.length; i++) {
  const concepto = conceptos[i];
  let fechaVenc = new Date(fechaBase);
  if (concepto.es_pension) {
    // La primera pensión vence el día 5 del mes siguiente; las sucesivas, el día 5 de los meses subsiguientes
    fechaVenc.setMonth(fechaVenc.getMonth() + 1 + i, 5);
  } else {
    // Conceptos no pensión (ej. matrícula) vencen al día siguiente
    fechaVenc.setDate(fechaVenc.getDate() + 1);
  }
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

  // ── ASISTENCIA ─────────────────────────────────────────

async getSeccionesDocente(docenteId: number, anioId: number) {
  const asignaciones = await this.prisma.asignacionDocente.findMany({
    where: { id_docente: docenteId, id_anio: anioId },
    distinct: ['id_seccion'],
    select: { seccion: true },
  });
  return asignaciones.map((a) => a.seccion);
}

async getAsistencia(seccionId: number, fecha: string) {
  // Obtener matriculados activos en esa sección y año
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
    estado:
      m.asistencias.length > 0 ? m.asistencias[0].estado : 'Presente', // por defecto
  }));
}

async saveAsistencia(seccionId: number, fecha: string, asistencias: { id_matricula: number; estado: string }[]) {

  const fechaAsistencia = new Date(fecha);
if (fechaAsistencia.getDay() === 0 || fechaAsistencia.getDay() === 6) {
  throw new BadRequestException('No se puede registrar asistencia en fines de semana');
}
  const data = asistencias.map((a) => ({
    id_matricula: a.id_matricula,
    fecha: new Date(fecha),
    estado: a.estado,
  }));

  // Usar upsert: si ya existe para esa (matrícula, fecha), se actualiza
  for (const item of data) {
    await this.prisma.asistencia.upsert({
      where: {
        id_matricula_fecha: { id_matricula: item.id_matricula, fecha: item.fecha },
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

  // Usamos flatMap para obtener una lista plana de asistencias formateadas
  return matriculas.flatMap((mat) =>
    mat.asistencias.map((asist) => ({
      fecha: asist.fecha.toISOString().split('T')[0],
      estado: asist.estado,
    }))
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
                include: {
                  nivel: true,  // 👈 agregar esta línea
                },
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
    avatar_url: r.estudiante.avatar_url,  // 🆕
  };
});
}

async getHorarioAlumno(alumnoId: number) {
  const matriculaActiva = await this.prisma.matricula.findFirst({
    where: { id_estudiante: alumnoId, estado_matricula: 'Activo' },
    include: { seccion: true },
  });
  if (!matriculaActiva) throw new NotFoundException('No se encontró matrícula activa');

  const horarios = await this.prisma.horario.findMany({
    where: { id_seccion: matriculaActiva.id_seccion },
    orderBy: [{ dia_semana: 'asc' }, { hora_inicio: 'asc' }],
    include: { curso: true, docente: { include: { persona: true } } },
  });

  // Agrupar por día
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

async getTotalMatriculados(anioId: number) {
  return this.prisma.matricula.count({
    where: { id_anio: anioId, estado_matricula: 'Activo' },
  });
}

async getTotalDocentes() {
  return this.prisma.docente.count();
}

async getAnios() {
  return this.prisma.anioLectivo.findMany({
    orderBy: { fecha_inicio: 'desc' },
  });
}

async getUltimasMatriculas() {
  const hoy = new Date();
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const finHoy = new Date(inicioHoy.getTime() + 24 * 60 * 60 * 1000);

  return this.prisma.matricula.findMany({
    where: {
      fecha_matricula: {
        gte: inicioHoy,
        lt: finHoy,
      },
    },
    include: {
      estudiante: { include: { persona: true } },
      seccion: { include: { grado: true } },
    },
    orderBy: { fecha_matricula: 'desc' },
    take: 10,
  });
}

async getDirectorioStaff(usuarioId: number) {
  // Obtener el apoderado
  const usuario = await this.prisma.usuario.findUnique({
    where: { id_usuario: usuarioId },
    include: { persona: { include: { apoderados: true } } },
  });
  const apoderadoId = usuario?.persona?.apoderados?.[0]?.id_persona;
  if (!apoderadoId) throw new NotFoundException('Apoderado no encontrado');

  // Obtener estudiantes del apoderado
  const relaciones = await this.prisma.apoderadoEstudiante.findMany({
    where: { id_apoderado: apoderadoId },
    select: { id_estudiante: true },
  });
  const estudianteIds = relaciones.map(r => r.id_estudiante);

  // Secciones donde están los estudiantes activos
  const matriculas = await this.prisma.matricula.findMany({
    where: {
      id_estudiante: { in: estudianteIds },
      estado_matricula: 'Activo',
    },
    select: { id_seccion: true },
  });
  const seccionIds = [...new Set(matriculas.map(m => m.id_seccion))];

  // Buscar staff asignado a esas secciones (docentes, tutores, auxiliares)
  const staffPorSeccion = await this.prisma.staff.findMany({
    where: {
      OR: [
        { id_seccion: { in: seccionIds } },
        { area: 'administrativa' }, // administrativos visibles para todos
        { area: 'salud' },          // salud visibles para todos
        { area: 'servicios' },      // servicios visibles para todos
        { area: 'academica', id_seccion: null }, // directivos sin sección específica
      ],
    },
    include: {
      persona: true,
      seccion: { include: { grado: { include: { nivel: true } } } },
    },
  });

  // Para docentes/tutores, obtener sus cursos y horarios
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
      avatar_url: `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(staff.persona.nombres)}&backgroundColor=b6e3f4,c0aede,d1d4f9&radius=50`,
    };

    // Si es docente o tutor, obtener cursos y horarios
    if (staff.cargo === 'Docente' || staff.cargo === 'Tutor' || staff.cargo === 'Profesor de Taller' || staff.cargo === 'Auxiliar de Educación') {
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
        item.cursos = [...new Set(docente.asignaciones.map(a => a.curso.nombre_curso))];
        const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
        const horarioPorDia: Record<string, { hora_inicio: string; hora_fin: string; curso: string }[]> = {};
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
              nivel: {
                select: { nombre_nivel: true }
              }
            }
          }
        }
      }
    }
  });
  if (!matricula) throw new NotFoundException('No se encontró matrícula activa');
  return matricula;
}

}