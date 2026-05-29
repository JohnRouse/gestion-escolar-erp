import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface DashboardParams {
  userId: number;
  rol: string;
  anioId: number;
  bimestreId?: number;
}

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  private formatSeccion(seccion: any) {
    if (!seccion) return 'Sin sección';

    const grado = seccion.grado?.nombre_grado || 'Grado';
    const nivel = seccion.grado?.nivel?.nombre_nivel || 'Nivel';

    return `${grado} "${seccion.letra}" · ${nivel}`;
  }

  private async getBimestreActual(anioId: number, bimestreId?: number) {
    if (bimestreId) {
      const bimestre = await this.prisma.bimestre.findUnique({
        where: { id_bimestre: bimestreId },
      });

      if (bimestre) return bimestre;
    }

    const hoy = new Date();

    const bimestrePorFecha = await this.prisma.bimestre.findFirst({
      where: {
        id_anio: anioId,
        fecha_inicio: { lte: hoy },
        fecha_fin: { gte: hoy },
      },
      orderBy: { numero: 'asc' },
    });

    if (bimestrePorFecha) return bimestrePorFecha;

    return this.prisma.bimestre.findFirst({
      where: { id_anio: anioId },
      orderBy: { numero: 'asc' },
    });
  }

  private async getUnidadActual(anioId: number, bimestreId?: number) {
  const bimestre = await this.getBimestreActual(anioId, bimestreId);

  if (!bimestre) return null;

  const unidadAbierta = await this.prisma.unidad.findFirst({
    where: {
      id_bimestre: bimestre.id_bimestre,
      estado_abierto: true,
    },
    orderBy: { numero: 'asc' },
  });

  if (unidadAbierta) return unidadAbierta;

  return this.prisma.unidad.findFirst({
    where: {
      id_bimestre: bimestre.id_bimestre,
    },
    orderBy: { numero: 'asc' },
  });
}

  private async getEventosProximos(anioId: number) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const eventos = await this.prisma.evento.findMany({
      where: {
        id_anio: anioId,
        fecha: { gte: hoy },
      },
      orderBy: { fecha: 'asc' },
      take: 5,
    });

    return eventos.map((evento) => ({
      id_evento: evento.id_evento,
      titulo: evento.titulo,
      fecha: evento.fecha,
      hora: evento.hora,
      tipo: evento.tipo,
      descripcion: evento.descripcion,
    }));
  }

  private async getContextoBase(userId: number, anioId: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: userId },
      include: {
        rol: true,
        persona: {
          include: {
            docentes: {
              include: {
                asignaciones: {
                  where: { id_anio: anioId },
                  include: {
                    curso: true,
                    seccion: {
                      include: {
                        grado: {
                          include: { nivel: true },
                        },
                      },
                    },
                  },
                },
              },
            },
            staff: {
              include: {
                seccion: {
                  include: {
                    grado: {
                      include: { nivel: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!usuario) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const docente = usuario.persona.docentes?.[0] || null;
    const staff = usuario.persona.staff?.[0] || null;

    const asignaciones = (docente?.asignaciones || []).map((asignacion) => ({
      id_asignacion: asignacion.id_asignacion,
      id_docente: asignacion.id_docente,
      id_curso: asignacion.id_curso,
      id_seccion: asignacion.id_seccion,
      curso: asignacion.curso.nombre_curso,
      seccion: this.formatSeccion(asignacion.seccion),
      grado: asignacion.seccion.grado.nombre_grado,
      nivel: asignacion.seccion.grado.nivel.nombre_nivel,
      letra: asignacion.seccion.letra,
    }));

    const tutoria =
      staff?.es_tutor && staff.seccion
        ? {
            es_tutor: true,
            secciones: [
              {
                id_seccion: staff.seccion.id_seccion,
                seccion: this.formatSeccion(staff.seccion),
                grado: staff.seccion.grado.nombre_grado,
                nivel: staff.seccion.grado.nivel.nombre_nivel,
                letra: staff.seccion.letra,
              },
            ],
          }
        : {
            es_tutor: false,
            secciones: [],
          };

    return {
      usuario,
      docente,
      staff,
      asignaciones,
      tutoria,
    };
  }

  private async getInstitucional(anioId: number, rol: string, bimestreId?: number) {
  const [
    matriculados,
    docentes,
    circulares,
    pagosPendientes,
    secciones,
    eventosProximos,
    avanceCargaDocente,
  ] = await Promise.all([
    this.prisma.matricula.count({
      where: {
        id_anio: anioId,
        estado_matricula: 'Activo',
      },
    }),
    this.prisma.docente.count(),
    this.prisma.circular.count(),
    this.prisma.cronogramaPagos.count({
      where: { estado_pago: 'Pendiente' },
    }),
    this.prisma.seccion.count(),
    this.getEventosProximos(anioId),
    ['Admin', 'Director'].includes(rol)
      ? this.getAvanceCargaDocentes(anioId, bimestreId)
      : Promise.resolve(null),
  ]);

  return {
    kpis: {
      matriculados,
      docentes,
      circulares,
      pagosPendientes,
      secciones,
    },
    eventosProximos,
    avanceCargaDocente,
  };
}

  private async getDocente(
  docenteId: number | null,
  anioId: number,
  asignaciones: any[],
  bimestreId?: number,
) {
  if (!docenteId) {
    return null;
  }

  const idsAsignaciones = asignaciones.map((item) => item.id_asignacion);
  const idsSecciones = Array.from(new Set(asignaciones.map((item) => item.id_seccion)));

  const unidadActual = await this.getUnidadAbierta(anioId, bimestreId);

  const alumnosAsignados = await this.prisma.matricula.count({
    where: {
      id_anio: anioId,
      estado_matricula: 'Activo',
      id_seccion: { in: idsSecciones.length ? idsSecciones : [-1] },
    },
  });

  const seccionesResumen = await Promise.all(
    idsSecciones.map(async (idSeccion) => {
      const seccionInfo = asignaciones.find((item) => item.id_seccion === idSeccion);

      const totalAlumnos = await this.prisma.matricula.count({
        where: {
          id_anio: anioId,
          id_seccion: idSeccion,
          estado_matricula: 'Activo',
        },
      });

      const cursos = asignaciones
        .filter((item) => item.id_seccion === idSeccion)
        .map((item) => item.curso);

      return {
        id_seccion: idSeccion,
        seccion: seccionInfo?.seccion || 'Sección',
        totalAlumnos,
        cursos,
      };
    }),
  );

  if (!unidadActual) {
    return {
      unidadActual: null,
      avanceNotas: {
        totalEsperado: 0,
        registradas: 0,
        pendientes: 0,
        porcentaje: 0,
      },
      avancePorCurso: [],
      kpis: {
        cursos: new Set(asignaciones.map((item) => item.id_curso)).size,
        secciones: idsSecciones.length,
        alumnosAsignados,
        evaluaciones: 0,
        promedio: null,
        notasPendientes: 0,
      },
      asignaciones,
      seccionesResumen,
      ultimasEvaluaciones: [],
    };
  }

  const evaluaciones = await this.prisma.evaluacionDetalle.findMany({
    where: {
      id_asignacion: {
        in: idsAsignaciones.length ? idsAsignaciones : [-1],
      },
      id_unidad: unidadActual.id_unidad,
    },
    include: {
      unidad: true,
      notas: {
        where: {
          matricula: {
            id_anio: anioId,
            estado_matricula: 'Activo',
          },
        },
      },
      asignacion: {
        include: {
          curso: true,
          seccion: {
            include: {
              grado: {
                include: { nivel: true },
              },
            },
          },
        },
      },
    },
    orderBy: { id_evaluacion_det: 'desc' },
  });

  const notas = evaluaciones.flatMap((evaluacion) => evaluacion.notas);

  const promedio =
    notas.length > 0
      ? Math.round(
          (notas.reduce((total, nota) => total + Number(nota.valor_nota), 0) /
            notas.length) *
            10,
        ) / 10
      : null;

  const avancePorCurso = await Promise.all(
    asignaciones.map(async (asignacion) => {
      const totalAlumnos = await this.prisma.matricula.count({
        where: {
          id_anio: anioId,
          id_seccion: asignacion.id_seccion,
          estado_matricula: 'Activo',
        },
      });

      const evaluacionesCurso = evaluaciones.filter(
        (evaluacion) => evaluacion.id_asignacion === asignacion.id_asignacion,
      );

      const registradas = evaluacionesCurso.reduce(
        (total, evaluacion) => total + evaluacion.notas.length,
        0,
      );

      const totalEsperado = totalAlumnos * evaluacionesCurso.length;
      const pendientes = Math.max(0, totalEsperado - registradas);

      const porcentaje =
        totalEsperado > 0 ? Math.round((registradas / totalEsperado) * 100) : 0;

      return {
        id_asignacion: asignacion.id_asignacion,
        curso: asignacion.curso,
        seccion: asignacion.seccion,
        evaluaciones: evaluacionesCurso.length,
        alumnos: totalAlumnos,
        totalEsperado,
        registradas,
        pendientes,
        porcentaje,
      };
    }),
  );

  const totalEsperado = avancePorCurso.reduce(
    (total, item) => total + item.totalEsperado,
    0,
  );

  const registradas = avancePorCurso.reduce(
    (total, item) => total + item.registradas,
    0,
  );

  const pendientes = Math.max(0, totalEsperado - registradas);

  const porcentaje =
    totalEsperado > 0 ? Math.round((registradas / totalEsperado) * 100) : 0;

  const ultimasEvaluaciones = evaluaciones.slice(0, 6).map((evaluacion) => ({
    id_evaluacion_det: evaluacion.id_evaluacion_det,
    descripcion: evaluacion.descripcion_actividad,
    curso: evaluacion.asignacion.curso.nombre_curso,
    seccion: this.formatSeccion(evaluacion.asignacion.seccion),
    notasRegistradas: evaluacion.notas.length,
  }));

  return {
    unidadActual: {
      id_unidad: unidadActual.id_unidad,
      numero: unidadActual.numero,
      id_bimestre: unidadActual.id_bimestre,
      bimestre: unidadActual.bimestre.numero,
      fecha_inicio: unidadActual.fecha_inicio,
      fecha_fin: unidadActual.fecha_fin,
      estado_abierto: unidadActual.estado_abierto,
    },

    avanceNotas: {
      totalEsperado,
      registradas,
      pendientes,
      porcentaje,
    },

    avancePorCurso,

    kpis: {
      cursos: new Set(asignaciones.map((item) => item.id_curso)).size,
      secciones: idsSecciones.length,
      alumnosAsignados,
      evaluaciones: evaluaciones.length,
      promedio,
      notasPendientes: pendientes,
    },

    asignaciones,
    seccionesResumen,
    ultimasEvaluaciones,
  };
}

  private async getTutoria(
    seccionesTutoria: { id_seccion: number; seccion: string }[],
    anioId: number,
    bimestreId?: number,
  ) {
    if (!seccionesTutoria.length) {
      return null;
    }

    const bimestre = await this.getBimestreActual(anioId, bimestreId);

    if (!bimestre) {
      return {
        bimestre: null,
        secciones: [],
      };
    }

    const secciones = await Promise.all(
      seccionesTutoria.map(async (seccionTutor) => {
        const matriculas = await this.prisma.matricula.findMany({
          where: {
            id_anio: anioId,
            id_seccion: seccionTutor.id_seccion,
            estado_matricula: 'Activo',
          },
          include: {
            estudiante: { include: { persona: true } },
            notas: {
              where: {
                evaluacion: {
                  unidad: {
                    id_bimestre: bimestre.id_bimestre,
                  },
                },
              },
            },
            asistencias: true,
            comentariosBimestrales: {
              where: {
                id_bimestre: bimestre.id_bimestre,
              },
            },
          },
        });

        const promedios = matriculas.map((matricula) => {
          if (!matricula.notas.length) return null;

          const promedio =
            matricula.notas.reduce((total, nota) => total + Number(nota.valor_nota), 0) /
            matricula.notas.length;

          return Math.round(promedio * 10) / 10;
        });

        const promediosValidos = promedios.filter(
          (promedio): promedio is number => promedio !== null,
        );

        const promedioGeneral =
          promediosValidos.length > 0
            ? Math.round(
                (promediosValidos.reduce((total, promedio) => total + promedio, 0) /
                  promediosValidos.length) *
                  10,
              ) / 10
            : null;

        const alumnosRiesgo = promediosValidos.filter((promedio) => promedio < 11).length;

        const comentariosRegistrados = matriculas.filter(
          (matricula) => matricula.comentariosBimestrales.length > 0,
        ).length;

        return {
          id_seccion: seccionTutor.id_seccion,
          seccion: seccionTutor.seccion,
          alumnos: matriculas.length,
          promedioGeneral,
          alumnosRiesgo,
          comentariosRegistrados,
          comentariosPendientes: Math.max(0, matriculas.length - comentariosRegistrados),
        };
      }),
    );

    return {
      bimestre: {
        id_bimestre: bimestre.id_bimestre,
        numero: bimestre.numero,
        fecha_inicio: bimestre.fecha_inicio,
        fecha_fin: bimestre.fecha_fin,
      },
      secciones,
    };
  }

  async getResumen(params: DashboardParams) {
    const { userId, rol, anioId, bimestreId } = params;

    const contexto = await this.getContextoBase(userId, anioId);

    const esInstitucional = ['Admin', 'Director', 'Secretaria'].includes(rol);
    const esDocente = rol === 'Profesor' || contexto.asignaciones.length > 0;
    const esTutor = contexto.tutoria.es_tutor;

    const [institucional, docente, tutoria] = await Promise.all([
      esInstitucional ? this.getInstitucional(anioId, rol, bimestreId) : Promise.resolve(null),
      
      esDocente
  ? this.getDocente(
      contexto.docente?.id_persona || null,
      anioId,
      contexto.asignaciones,
      bimestreId,
    )
  : Promise.resolve(null),
      
  esTutor
        ? this.getTutoria(contexto.tutoria.secciones, anioId, bimestreId)
        : Promise.resolve(null),
    ]);

    return {
      rol,
      anioId,
      usuario: {
        id: contexto.usuario.id_usuario,
        nombre: `${contexto.usuario.persona.nombres} ${contexto.usuario.persona.apellido_paterno}`.trim(),
        rol,
        cargo: contexto.staff?.cargo || (contexto.docente ? 'Docente' : rol),
      },
      modulos: {
        institucional,
        docente,
        tutoria,
      },
    };
  }

  private async getUnidadAbierta(anioId: number, bimestreId?: number) {
  return this.prisma.unidad.findFirst({
    where: {
      estado_abierto: true,
      bimestre: {
        id_anio: anioId,
        ...(bimestreId ? { id_bimestre: bimestreId } : {}),
      },
    },
    include: {
      bimestre: true,
    },
    orderBy: {
      numero: 'asc',
    },
  });
}

private async getAvanceCargaDocentes(anioId: number, bimestreId?: number) {
  const unidadActual = await this.getUnidadAbierta(anioId, bimestreId);

  if (!unidadActual) {
    return {
      unidadActual: null,
      resumen: {
        docentes: 0,
        docentesCompletos: 0,
        docentesPendientes: 0,
        porcentajePromedio: 0,
        totalEsperado: 0,
        registradas: 0,
        pendientes: 0,
        sinEvaluaciones: 0,
      },
      docentes: [],
    };
  }

  const asignaciones = await this.prisma.asignacionDocente.findMany({
    where: { id_anio: anioId },
    include: {
      docente: {
        include: { persona: true },
      },
      curso: true,
      seccion: {
        include: {
          grado: {
            include: { nivel: true },
          },
        },
      },
      evaluaciones: {
        where: { id_unidad: unidadActual.id_unidad },
        include: {
          notas: {
            where: {
              matricula: {
                id_anio: anioId,
                estado_matricula: 'Activo',
              },
            },
          },
        },
      },
    },
    orderBy: { id_docente: 'asc' },
  });

  const idsSecciones = Array.from(new Set(asignaciones.map((item) => item.id_seccion)));

  const alumnosPorSeccionRaw = await this.prisma.matricula.groupBy({
    by: ['id_seccion'],
    where: {
      id_anio: anioId,
      estado_matricula: 'Activo',
      id_seccion: {
        in: idsSecciones.length ? idsSecciones : [-1],
      },
    },
    _count: {
      id_matricula: true,
    },
  });

  const alumnosPorSeccion = new Map<number, number>();

  alumnosPorSeccionRaw.forEach((item) => {
    alumnosPorSeccion.set(item.id_seccion, item._count.id_matricula);
  });

  const docentesMap = new Map<
    number,
    {
      id_docente: number;
      docente: string;
      cursos: string[];
      secciones: string[];
      evaluaciones: number;
      totalEsperado: number;
      registradas: number;
      pendientes: number;
      porcentaje: number;
      estado: 'completo' | 'avanzado' | 'en_proceso' | 'pendiente' | 'sin_evaluaciones';
    }
  >();

  for (const asignacion of asignaciones) {
    const idDocente = asignacion.id_docente;
    const docenteNombre = `${asignacion.docente.persona.nombres} ${asignacion.docente.persona.apellido_paterno}`.trim();

    const totalAlumnos = alumnosPorSeccion.get(asignacion.id_seccion) || 0;
    const evaluacionesCurso = asignacion.evaluaciones.length;
    const registradasCurso = asignacion.evaluaciones.reduce(
      (total, evaluacion) => total + evaluacion.notas.length,
      0,
    );

    const totalEsperadoCurso = totalAlumnos * evaluacionesCurso;

    if (!docentesMap.has(idDocente)) {
      docentesMap.set(idDocente, {
        id_docente: idDocente,
        docente: docenteNombre,
        cursos: [],
        secciones: [],
        evaluaciones: 0,
        totalEsperado: 0,
        registradas: 0,
        pendientes: 0,
        porcentaje: 0,
        estado: 'pendiente',
      });
    }

    const item = docentesMap.get(idDocente)!;

    item.cursos.push(asignacion.curso.nombre_curso);
    item.secciones.push(this.formatSeccion(asignacion.seccion));
    item.evaluaciones += evaluacionesCurso;
    item.totalEsperado += totalEsperadoCurso;
    item.registradas += registradasCurso;
  }

  const docentes = Array.from(docentesMap.values()).map((docente) => {
    const pendientes = Math.max(0, docente.totalEsperado - docente.registradas);

    const porcentaje =
      docente.totalEsperado > 0
        ? Math.round((docente.registradas / docente.totalEsperado) * 100)
        : 0;

    let estado: typeof docente.estado = 'pendiente';

    if (docente.evaluaciones === 0) estado = 'sin_evaluaciones';
    else if (porcentaje >= 100) estado = 'completo';
    else if (porcentaje >= 80) estado = 'avanzado';
    else if (porcentaje > 0) estado = 'en_proceso';
    else estado = 'pendiente';

    return {
      ...docente,
      cursos: Array.from(new Set(docente.cursos)),
      secciones: Array.from(new Set(docente.secciones)),
      pendientes,
      porcentaje,
      estado,
    };
  });

  const totalEsperado = docentes.reduce((total, item) => total + item.totalEsperado, 0);
  const registradas = docentes.reduce((total, item) => total + item.registradas, 0);
  const pendientes = Math.max(0, totalEsperado - registradas);

  const porcentajePromedio =
    totalEsperado > 0 ? Math.round((registradas / totalEsperado) * 100) : 0;

  const docentesCompletos = docentes.filter((item) => item.estado === 'completo').length;
  const sinEvaluaciones = docentes.filter((item) => item.estado === 'sin_evaluaciones').length;

  return {
    unidadActual: {
      id_unidad: unidadActual.id_unidad,
      numero: unidadActual.numero,
      id_bimestre: unidadActual.id_bimestre,
      bimestre: unidadActual.bimestre.numero,
      fecha_inicio: unidadActual.fecha_inicio,
      fecha_fin: unidadActual.fecha_fin,
      estado_abierto: unidadActual.estado_abierto,
    },
    resumen: {
      docentes: docentes.length,
      docentesCompletos,
      docentesPendientes: Math.max(0, docentes.length - docentesCompletos),
      porcentajePromedio,
      totalEsperado,
      registradas,
      pendientes,
      sinEvaluaciones,
    },
    docentes: docentes.sort((a, b) => a.porcentaje - b.porcentaje),
  };
}

}