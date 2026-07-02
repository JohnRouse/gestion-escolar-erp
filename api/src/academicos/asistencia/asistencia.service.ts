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
      .map((docente: any) => docente.id_docente)
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
      }));
  }

  async saveAsistencia(
    user: JwtUser,
    seccionId: number,
    fecha: string,
    asistencias: { id_matricula: number; estado: string }[],
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

      return {
        id_matricula: a.id_matricula,
        fecha: fechaAsistencia,
        estado: a.estado,
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
