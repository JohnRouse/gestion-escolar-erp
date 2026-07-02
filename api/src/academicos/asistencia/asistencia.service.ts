import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type JwtUser = {
  userId: number;
  username?: string;
  rol: string;
};

type ScopeQuery = {
  scope?: string;
  colegioId?: string;
};

const ESTADOS_MATRICULA_ACTIVA = ['Activo', 'Matriculado', 'Pre-matriculado'];
const ESTADOS_ASISTENCIA = ['Presente', 'Ausente', 'Tardanza', 'Justificado'];

@Injectable()
export class AsistenciaService {
  constructor(private prisma: PrismaService) {}

  private validarFecha(fecha: string) {
    const parsed = new Date(`${fecha}T00:00:00`);

    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('La fecha de asistencia no es válida.');
    }

    return parsed;
  }

  private formatAlumno(matricula: any) {
    const persona = matricula?.estudiante?.persona;

    return [
      persona?.apellido_paterno,
      persona?.apellido_materno,
      persona?.nombres,
    ]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim() || 'Alumno';
  }

  private formatSeccion(seccion: any) {
    const grado = seccion?.grado?.nombre_grado || 'Grado';
    const letra = seccion?.letra ? ` "${seccion.letra}"` : '';
    const nivel = seccion?.grado?.nivel?.nombre_nivel || '';

    return [grado ? `${grado}${letra}` : null, nivel].filter(Boolean).join(' · ');
  }

  private async getUsuario(userId: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: userId },
      include: {
        persona: {
          include: {
            docentes: true,
          },
        },
        colegios: {
          where: { estado: 'Activo' },
          include: { colegio: true },
        },
      },
    });

    if (!usuario) {
      throw new ForbiddenException('Usuario no encontrado.');
    }

    return usuario;
  }

  private colegioIdsPermitidos(usuario: any) {
    return (usuario.colegios || [])
      .map((item: any) => item.id_colegio)
      .filter(Boolean);
  }

  private async resolveColegioIds(user: JwtUser, query: ScopeQuery) {
    const usuario = await this.getUsuario(user.userId);
    const permitidoIds = this.colegioIdsPermitidos(usuario);

    if (!permitidoIds.length) {
      throw new ForbiddenException('No tienes colegios asignados.');
    }

    if (query.colegioId) {
      const idColegio = Number(query.colegioId);

      if (!permitidoIds.includes(idColegio)) {
        throw new ForbiddenException('No tienes acceso al colegio seleccionado.');
      }

      return { usuario, colegioIds: [idColegio], permitidoIds };
    }

    if (query.scope === 'all' && ['Admin', 'Director'].includes(user.rol)) {
      return { usuario, colegioIds: permitidoIds, permitidoIds };
    }

    return { usuario, colegioIds: [permitidoIds[0]], permitidoIds };
  }

  private toSeccionOption(seccion: any) {
    return {
      id_seccion: seccion.id_seccion,
      label: this.formatSeccion(seccion),
      colegio: seccion.colegio?.nombre || null,
      id_colegio: seccion.id_colegio,
      grado: seccion.grado?.nombre_grado || null,
      nivel: seccion.grado?.nivel?.nombre_nivel || null,
      letra: seccion.letra || null,
    };
  }

  async getSeccionesDisponibles(user: JwtUser, query: ScopeQuery) {
    const { usuario, colegioIds } = await this.resolveColegioIds(user, query);

    if (['Admin', 'Director'].includes(user.rol)) {
      const secciones = await this.prisma.seccion.findMany({
        where: {
          id_colegio: { in: colegioIds },
        },
        include: {
          colegio: true,
          grado: {
            include: {
              nivel: true,
            },
          },
        },
        orderBy: [
          { id_colegio: 'asc' },
          { id_grado: 'asc' },
          { letra: 'asc' },
        ],
      });

      return secciones.map((seccion) => this.toSeccionOption(seccion));
    }

    if (user.rol !== 'Profesor') {
      return [];
    }

    const docenteIds = (usuario.persona?.docentes || [])
      .map((docente: any) => docente.id_persona)
      .filter(Boolean);

    if (!docenteIds.length) {
      return [];
    }

    const asignaciones = await this.prisma.asignacionDocente.findMany({
      where: {
        id_docente: { in: docenteIds },
        seccion: {
          id_colegio: { in: colegioIds },
        },
      },
      distinct: ['id_seccion'],
      include: {
        seccion: {
          include: {
            colegio: true,
            grado: {
              include: {
                nivel: true,
              },
            },
          },
        },
      },
      orderBy: [
        { id_seccion: 'asc' },
      ],
    });

    return asignaciones
      .map((asignacion: any) => asignacion.seccion)
      .filter(Boolean)
      .map((seccion: any) => this.toSeccionOption(seccion));
  }

  private async assertCanAccessSeccion(user: JwtUser, seccionId: number, query: ScopeQuery) {
    if (!Number.isInteger(seccionId) || seccionId <= 0) {
      throw new BadRequestException('La sección seleccionada no es válida.');
    }

    const secciones = await this.getSeccionesDisponibles(user, query);
    const seccion = secciones.find((item) => item.id_seccion === seccionId);

    if (!seccion) {
      throw new ForbiddenException('No tienes acceso a la sección seleccionada.');
    }

    return seccion;
  }

  async getCalendarioAsistencia(user: JwtUser, seccionId: number, mes: string, query: ScopeQuery) {
    await this.assertCanAccessSeccion(user, seccionId, query);

    const cleanMes = String(mes || '').trim();

    if (!/^\d{4}-\d{2}$/.test(cleanMes)) {
      throw new BadRequestException('Mes inválido. Usa el formato YYYY-MM.');
    }

    const [yearRaw, monthRaw] = cleanMes.split('-').map(Number);
    const year = Number(yearRaw);
    const monthIndex = Number(monthRaw) - 1;

    if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || monthIndex < 0 || monthIndex > 11) {
      throw new BadRequestException('Mes inválido.');
    }

    const desde = new Date(year, monthIndex, 1);
    const hasta = new Date(year, monthIndex + 1, 0);

    const matriculas = await this.prisma.matricula.findMany({
      where: {
        id_seccion: seccionId,
        estado_matricula: { in: ESTADOS_MATRICULA_ACTIVA },
      },
      select: {
        id_matricula: true,
      },
    });

    const matriculaIds = matriculas.map((item) => item.id_matricula);
    const totalAlumnos = matriculaIds.length;

    const asistencias = matriculaIds.length
      ? await this.prisma.asistencia.findMany({
          where: {
            id_matricula: { in: matriculaIds },
            fecha: {
              gte: desde,
              lte: hasta,
            },
          },
          orderBy: {
            fecha: 'asc',
          },
        })
      : [];

    const dateKey = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    const registrosPorFecha = new Map<string, typeof asistencias>();

    for (const row of asistencias) {
      const key = dateKey(row.fecha);
      const current = registrosPorFecha.get(key) || [];
      current.push(row);
      registrosPorFecha.set(key, current);
    }

    const dias: any[] = [];

    for (let day = 1; day <= hasta.getDate(); day += 1) {
      const currentDate = new Date(year, monthIndex, day);
      const fecha = dateKey(currentDate);
      const dayOfWeek = currentDate.getDay();
      const lectivo = dayOfWeek !== 0 && dayOfWeek !== 6;
      const registros = registrosPorFecha.get(fecha) || [];
      const registrados = registros.length;
      const pendientesJustificacion = registros.filter(
        (row: any) =>
          row.estado === 'Justificado' &&
          !String(row.justificacion_motivo || '').trim(),
      ).length;
      const avanceBase = Math.max(0, registrados - pendientesJustificacion);
      const avance = totalAlumnos > 0 ? Math.round((avanceBase / totalAlumnos) * 100) : 0;
      const pendientesRegistro = Math.max(0, totalAlumnos - registrados);

      let estado = 'no_lectivo';

      if (lectivo) {
        if (totalAlumnos === 0) estado = 'sin_alumnos';
        else if (registrados === 0) estado = 'sin_registro';
        else if (avance === 100) estado = 'completo';
        else estado = 'parcial';
      }

      dias.push({
        fecha,
        dia: day,
        dia_semana: dayOfWeek,
        lectivo,
        total_alumnos: totalAlumnos,
        registrados,
        pendientes_registro: pendientesRegistro,
        pendientes_justificacion: pendientesJustificacion,
        avance,
        estado,
      });
    }

    const lectivos = dias.filter((dia) => dia.lectivo);

    return {
      mes: cleanMes,
      total_alumnos: totalAlumnos,
      resumen: {
        completos: lectivos.filter((dia) => dia.estado === 'completo').length,
        parciales: lectivos.filter((dia) => dia.estado === 'parcial').length,
        sin_registro: lectivos.filter((dia) => dia.estado === 'sin_registro').length,
        pendientes_justificacion: lectivos.reduce(
          (sum, dia) => sum + dia.pendientes_justificacion,
          0,
        ),
      },
      dias,
    };
  }

  async getAsistencia(user: JwtUser, seccionId: number, fecha: string, query: ScopeQuery) {
    await this.assertCanAccessSeccion(user, seccionId, query);
    const fechaAsistencia = this.validarFecha(fecha);

    const matriculas = await this.prisma.matricula.findMany({
      where: {
        id_seccion: seccionId,
        estado_matricula: { in: ESTADOS_MATRICULA_ACTIVA },
      },
      include: {
        estudiante: {
          include: {
            persona: true,
          },
        },
        asistencias: {
          where: {
            fecha: fechaAsistencia,
          },
        },
      },
    });

    return matriculas
      .sort((a, b) => this.formatAlumno(a).localeCompare(this.formatAlumno(b)))
      .map((m) => ({
        id_matricula: m.id_matricula,
        id_estudiante: m.id_estudiante,
        alumno: this.formatAlumno(m),
        codigo: m.estudiante?.codigo_estudiante || null,
        estado: m.asistencias.length > 0 ? m.asistencias[0].estado : 'Presente',
        registrado: m.asistencias.length > 0,
        justificacion_motivo: m.asistencias[0]?.justificacion_motivo || '',
        justificacion_observacion: m.asistencias[0]?.justificacion_observacion || '',
        fecha_justificacion: m.asistencias[0]?.fecha_justificacion || null,
        requiere_justificacion:
          m.asistencias[0]?.estado === 'Justificado' &&
          !m.asistencias[0]?.justificacion_motivo,
      }));
  }

  async saveAsistencia(
    user: JwtUser,
    seccionId: number,
    fecha: string,
    asistencias: {
      id_matricula: number;
      estado: string;
      justificacion_motivo?: string;
      justificacion_observacion?: string;
    }[],
    query: ScopeQuery,
  ) {
    await this.assertCanAccessSeccion(user, seccionId, query);
    const fechaAsistencia = this.validarFecha(fecha);

    if (fechaAsistencia.getDay() === 0 || fechaAsistencia.getDay() === 6) {
      throw new BadRequestException(
        'No se puede registrar asistencia en fines de semana',
      );
    }

    const matriculas = await this.prisma.matricula.findMany({
      where: {
        id_seccion: seccionId,
        estado_matricula: { in: ESTADOS_MATRICULA_ACTIVA },
      },
      select: {
        id_matricula: true,
      },
    });

    const permitidas = new Set(matriculas.map((item) => item.id_matricula));

    const data = asistencias.map((a) => {
      if (!permitidas.has(a.id_matricula)) {
        throw new ForbiddenException('Una matrícula no pertenece a la sección seleccionada.');
      }

      if (!ESTADOS_ASISTENCIA.includes(a.estado)) {
        throw new BadRequestException('Estado de asistencia inválido.');
      }

      const motivo = String(a.justificacion_motivo || '').trim();
      const observacion = String(a.justificacion_observacion || '').trim();

      const justificacion =
        a.estado === 'Justificado'
          ? {
              justificacion_motivo: motivo || null,
              justificacion_observacion: observacion || null,
              justificado_por: motivo ? user.userId : null,
              fecha_justificacion: motivo ? new Date() : null,
            }
          : {
              justificacion_motivo: null,
              justificacion_observacion: null,
              justificado_por: null,
              fecha_justificacion: null,
            };

      return {
        id_matricula: a.id_matricula,
        fecha: fechaAsistencia,
        estado: a.estado,
        ...justificacion,
      };
    });

    for (const item of data) {
      await this.prisma.asistencia.upsert({
        where: {
          id_matricula_fecha: {
            id_matricula: item.id_matricula,
            fecha: item.fecha,
          },
        },
        update: {
          estado: item.estado,
          justificacion_motivo: item.justificacion_motivo,
          justificacion_observacion: item.justificacion_observacion,
          justificado_por: item.justificado_por,
          fecha_justificacion: item.fecha_justificacion,
        },
        create: item,
      });
    }

    return { message: 'Asistencia guardada correctamente', total: data.length };
  }

  async getAsistenciaAlumno(estudianteId: number, desde: string, hasta: string) {
    const matriculas = await this.prisma.matricula.findMany({
      where: {
        id_estudiante: estudianteId,
        estado_matricula: { in: ESTADOS_MATRICULA_ACTIVA },
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
}
