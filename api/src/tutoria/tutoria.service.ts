import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type JwtUser = { userId: number; username: string; rol: string };
type TipoCriterio = 'CONDUCTA' | 'PARTICIPACION_FAMILIAR';

const ESTADOS_MATRICULA_ACTIVA = ['Activo', 'Matriculado', 'Pre-matriculado'];
const CRITERIOS_BASE: Record<TipoCriterio, string[]> = {
  CONDUCTA: [
    'Orden y presentación personal',
    'Asistencia y puntualidad en clases',
    'Responsabilidad en tareas, trabajos y exposiciones',
    'Comportamiento ético durante clases y actividades',
    'Participación en actividades académicas y extracurriculares',
  ],
  PARTICIPACION_FAMILIAR: [
    'Asiste a reuniones, talleres, actividades formativas y recojo de libretas oportunamente',
    'Participa en las diferentes actividades programadas por la institución',
    'Acompaña y supervisa el cumplimiento de actividades académicas de su hijo',
  ],
};

@Injectable()
export class TutoriaService {
  constructor(private prisma: PrismaService) {}

  private toNumber(value: any) {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private formatAlumno(persona: any) {
    return [
      `${persona?.apellido_paterno || ''} ${persona?.apellido_materno || ''}`.trim(),
      persona?.nombres,
    ].filter(Boolean).join(', ').replace(/\s+/g, ' ').trim() || 'Alumno';
  }

  private formatSeccion(seccion: any, includeColegio = true) {
    const grado = seccion?.grado?.nombre_grado || 'Grado';
    const nivel = seccion?.grado?.nivel?.nombre_nivel || 'Nivel';
    const letra = seccion?.letra || '';
    const colegio = includeColegio && seccion?.colegio?.nombre ? ` · ${seccion.colegio.nombre}` : '';
    return `${grado} "${letra}" · ${nivel}${colegio}`;
  }

  private getGrupoEvaluacionTutoria(evaluacion: { grupo_evaluacion?: string | null; descripcion_actividad?: string | null; tipo?: { nombre_tipo?: string | null } | null }) {
    const texto = `${evaluacion.grupo_evaluacion || ''} ${evaluacion.descripcion_actividad || ''} ${evaluacion.tipo?.nombre_tipo || ''}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();

    if (texto.includes('PRACTICA')) return 'PRÁCTICAS';
    if (texto.includes('EXAMEN')) return 'EXAMEN';
    return 'TRABAJO EN CLASE';
  }

  private async getUsuario(userId: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: userId },
      include: {
        persona: {
          include: {
            docentes: true,
            staff: { include: { seccion: { include: { colegio: true, grado: { include: { nivel: true } } } } } },
          },
        },
        colegios: { where: { estado: 'Activo' }, include: { colegio: true } },
      },
    });
    if (!usuario) throw new ForbiddenException('Usuario no encontrado.');
    return usuario;
  }

  private colegioIdsPermitidos(usuario: any) {
    return (usuario.colegios || []).map((item) => item.id_colegio).filter(Boolean);
  }

  private async resolveScope(user: JwtUser, query: { scope?: string; colegioId?: string }) {
    const usuario = await this.getUsuario(user.userId);
    const permitidos = this.colegioIdsPermitidos(usuario);
    if (!permitidos.length) throw new ForbiddenException('No tienes colegios asignados.');

    if (query.colegioId) {
      const id = Number(query.colegioId);
      if (!permitidos.includes(id)) throw new ForbiddenException('No tienes acceso al colegio seleccionado.');
      return { usuario, colegioIds: [id], permitidoIds: permitidos };
    }

    if (query.scope === 'all' && ['Admin', 'Director'].includes(user.rol)) {
      return { usuario, colegioIds: permitidos, permitidoIds: permitidos };
    }

    return { usuario, colegioIds: [permitidos[0]], permitidoIds: permitidos };
  }

  private async asegurarCriterios(idColegio?: number | null, idTenant?: number | null) {
    if (!idColegio) return [];

    const existentes = await this.prisma.criterioTutoria.findMany({
      where: { id_colegio: idColegio, activo: true },
      orderBy: [{ tipo: 'asc' }, { orden: 'asc' }, { id_criterio: 'asc' }],
    });

    const faltantes: { tipo: TipoCriterio; descripcion: string; orden: number }[] = [];
    (Object.keys(CRITERIOS_BASE) as TipoCriterio[]).forEach((tipo) => {
      CRITERIOS_BASE[tipo].forEach((descripcion, index) => {
        const exists = existentes.some((item) => item.tipo === tipo && item.descripcion.toLowerCase() === descripcion.toLowerCase());
        if (!exists) faltantes.push({ tipo, descripcion, orden: index + 1 });
      });
    });

    if (faltantes.length) {
      await this.prisma.criterioTutoria.createMany({
        data: faltantes.map((item) => ({
          id_tenant: idTenant || undefined,
          id_colegio: idColegio,
          tipo: item.tipo,
          descripcion: item.descripcion,
          orden: item.orden,
          activo: true,
        })),
      });
    }

    return this.prisma.criterioTutoria.findMany({
      where: { id_colegio: idColegio, activo: true },
      orderBy: [{ tipo: 'asc' }, { orden: 'asc' }, { id_criterio: 'asc' }],
    });
  }

  private async assertSeccionAccess(user: JwtUser, idSeccion: number, idColegio?: number | null) {
    const usuario = await this.getUsuario(user.userId);
    const permitidos = this.colegioIdsPermitidos(usuario);
    if (idColegio && !permitidos.includes(idColegio)) throw new ForbiddenException('No tienes acceso al colegio de este salón.');
    if (['Admin', 'Director'].includes(user.rol)) return usuario;

    const esTutor = (usuario.persona?.staff || []).some((staff) => staff.es_tutor && staff.id_seccion === idSeccion);
    if (!esTutor) throw new ForbiddenException('Solo puedes revisar salones donde fuiste asignado como tutor.');
    return usuario;
  }

  private async getSalones(user: JwtUser, usuario: any, anio: any) {
    if (!anio) return [];
    const include = { colegio: true, aula: true, grado: { include: { nivel: true } } };
    let secciones: any[] = [];

    if (['Admin', 'Director'].includes(user.rol)) {
      secciones = await this.prisma.seccion.findMany({
        where: { id_colegio: anio.id_colegio },
        include,
        orderBy: [{ id_grado: 'asc' }, { letra: 'asc' }],
      });
    } else {
      const ids = (usuario.persona?.staff || []).filter((s) => s.es_tutor && s.id_seccion).map((s) => s.id_seccion);
      if (ids.length) {
        secciones = await this.prisma.seccion.findMany({
          where: { id_seccion: { in: ids }, id_colegio: anio.id_colegio },
          include,
          orderBy: [{ id_grado: 'asc' }, { letra: 'asc' }],
        });
      }
    }

    const counts = await this.prisma.matricula.groupBy({
      by: ['id_seccion'],
      where: { id_anio: anio.id_anio, id_seccion: { in: secciones.map((s) => s.id_seccion) }, estado_matricula: { in: ESTADOS_MATRICULA_ACTIVA } },
      _count: { id_matricula: true },
    });
    const countMap = new Map(counts.map((item) => [item.id_seccion, item._count.id_matricula]));

    return secciones.map((s) => ({
      id_seccion: s.id_seccion,
      label: this.formatSeccion(s),
      grado: s.grado?.nombre_grado || '',
      nivel: s.grado?.nivel?.nombre_nivel || '',
      letra: s.letra,
      colegio: s.colegio?.nombre || 'Colegio',
      id_colegio: s.id_colegio,
      matriculados: countMap.get(s.id_seccion) || 0,
    }));
  }

  async getPanel(user: JwtUser, query: { scope?: string; colegioId?: string; anioId?: string }) {
    const { usuario, colegioIds } = await this.resolveScope(user, query);
    const anios = await this.prisma.anioLectivo.findMany({
      where: { id_colegio: { in: colegioIds } },
      include: { colegio: true },
      orderBy: [{ fecha_inicio: 'desc' }, { id_anio: 'desc' }],
    });

    const requested = query.anioId ? Number(query.anioId) : null;
    const selected = (requested ? anios.find((a) => a.id_anio === requested) : null)
      || anios.find((a) => ['Matrícula abierta', 'En curso', 'Planificación'].includes(a.estado))
      || anios[0]
      || null;

    const periodos = selected ? await this.prisma.bimestre.findMany({
      where: { id_anio: selected.id_anio },
      orderBy: { numero: 'asc' },
    }) : [];

    return {
      anios: anios.map((a) => ({ id_anio: a.id_anio, nombre_anio: a.nombre_anio, estado: a.estado, colegio: a.colegio?.nombre || 'Colegio', id_colegio: a.id_colegio })),
      selected_anio_id: selected?.id_anio || null,
      periodos: periodos.map((p) => ({ id_bimestre: p.id_bimestre, numero: p.numero, label: p.nombre || `Periodo ${p.numero}` })),
      salones: selected ? await this.getSalones(user, usuario, selected) : [],
      permisos: {
        puede_exportar: ['Admin', 'Director'].includes(user.rol),
        puede_editar_cierre: ['Admin', 'Director'].includes(user.rol) || Boolean((usuario.persona?.staff || []).some((s) => s.es_tutor)),
        es_tutor: Boolean((usuario.persona?.staff || []).some((s) => s.es_tutor)),
      },
    };
  }

  private async promedioMatricula(idMatricula: number, idBimestre: number) {
    const matricula = await this.prisma.matricula.findUnique({ where: { id_matricula: idMatricula }, select: { id_matricula: true, id_seccion: true, id_anio: true } });
    if (!matricula) return { promedio: null, cursosDesaprobados: 0, puntaje: 0 };

    const bimestre = await this.prisma.bimestre.findUnique({ where: { id_bimestre: idBimestre }, include: { unidades: true } });
    const unidadIds = (bimestre?.unidades || []).map((u) => u.id_unidad);
    if (!unidadIds.length) return { promedio: null, cursosDesaprobados: 0, puntaje: 0 };

    const asignaciones = await this.prisma.asignacionDocente.findMany({
      where: { id_seccion: matricula.id_seccion, id_anio: matricula.id_anio },
      include: { evaluaciones: { where: { id_unidad: { in: unidadIds } }, include: { notas: { where: { id_matricula: idMatricula } } } } },
    });

    const promedios = asignaciones.map((asig) => {
      if (!asig.evaluaciones.length) return null;
      const total = asig.evaluaciones.reduce((sum, ev) => sum + this.toNumber(ev.notas[0]?.valor_nota), 0);
      return Math.round(total / asig.evaluaciones.length);
    }).filter((p): p is number => p !== null);

    if (!promedios.length) return { promedio: null, cursosDesaprobados: 0, puntaje: 0 };
    const puntaje = promedios.reduce((sum, p) => sum + p, 0);
    return { promedio: Math.round(puntaje / promedios.length), cursosDesaprobados: promedios.filter((p) => p <= 10).length, puntaje };
  }

  async getAlumnosSalon(user: JwtUser, params: { idSeccion: number; idAnio: number; idBimestre: number }) {
    const seccion = await this.prisma.seccion.findUnique({ where: { id_seccion: params.idSeccion }, include: { colegio: true } });
    if (!seccion) throw new NotFoundException('Salón no encontrado.');
    await this.assertSeccionAccess(user, params.idSeccion, seccion.id_colegio);

    const matriculas = await this.prisma.matricula.findMany({
      where: { id_seccion: params.idSeccion, id_anio: params.idAnio, estado_matricula: { in: ESTADOS_MATRICULA_ACTIVA } },
      include: { estudiante: { include: { persona: true } } },
    });

    const criterios = await this.asegurarCriterios(seccion.id_colegio, seccion.id_tenant);
    const conductaIds = criterios.filter((c) => c.tipo === 'CONDUCTA').map((c) => c.id_criterio);
    const familiaIds = criterios.filter((c) => c.tipo === 'PARTICIPACION_FAMILIAR').map((c) => c.id_criterio);

    const rows = await Promise.all(matriculas.sort((a, b) => this.formatAlumno(a.estudiante.persona).localeCompare(this.formatAlumno(b.estudiante.persona), 'es-PE')).map(async (mat) => {
      const [prom, comentario, calificaciones] = await Promise.all([
        this.promedioMatricula(mat.id_matricula, params.idBimestre),
        this.prisma.comentarioBimestral.findUnique({ where: { id_matricula_id_bimestre: { id_matricula: mat.id_matricula, id_bimestre: params.idBimestre } } }),
        this.prisma.calificacionTutoria.findMany({ where: { id_matricula: mat.id_matricula, id_bimestre: params.idBimestre } }),
      ]);
      const calificados = new Set(calificaciones.filter((c) => c.valor && c.valor.trim()).map((c) => c.id_criterio));
      const completo = comentario?.comentario && conductaIds.every((id) => calificados.has(id)) && familiaIds.every((id) => calificados.has(id));
      return {
        id_matricula: mat.id_matricula,
        codigo: mat.codigo_matricula || mat.estudiante.codigo_estudiante || `MAT-${mat.id_matricula}`,
        alumno: this.formatAlumno(mat.estudiante.persona),
        promedio: prom.promedio,
        cursos_desaprobados: prom.cursosDesaprobados,
        conducta_pendiente: conductaIds.filter((id) => !calificados.has(id)).length,
        familia_pendiente: familiaIds.filter((id) => !calificados.has(id)).length,
        comentario_pendiente: !comentario?.comentario,
        estado_cierre: completo ? 'Completo' : 'Pendiente',
      };
    }));

    return rows;
  }

  private async assertMatriculaAccess(user: JwtUser, idMatricula: number) {
    const matricula = await this.prisma.matricula.findUnique({
      where: { id_matricula: idMatricula },
      include: {
        colegio: true,
        anio: true,
        seccion: { include: { colegio: true, aula: true, grado: { include: { nivel: true } } } },
        estudiante: { include: { persona: true } },
      },
    });
    if (!matricula) throw new NotFoundException('Matrícula no encontrada.');
    await this.assertSeccionAccess(user, matricula.id_seccion, matricula.id_colegio || matricula.seccion?.id_colegio);
    return matricula;
  }

  private async merito(idSeccion: number, idAnio: number, idBimestre: number, idMatricula: number) {
    const mats = await this.prisma.matricula.findMany({ where: { id_seccion: idSeccion, id_anio: idAnio, estado_matricula: { in: ESTADOS_MATRICULA_ACTIVA } }, select: { id_matricula: true } });
    const rows = await Promise.all(mats.map(async (m) => ({ id_matricula: m.id_matricula, ...(await this.promedioMatricula(m.id_matricula, idBimestre)) })));
    const ordenados = rows.filter((r) => r.promedio !== null).sort((a, b) => Number(b.promedio) - Number(a.promedio) || b.puntaje - a.puntaje);
    const index = ordenados.findIndex((r) => r.id_matricula === idMatricula);
    const orden = index >= 0 ? index + 1 : null;
    const total = ordenados.length;
    let tercio = 'Sin datos';
    if (orden && total) {
      if (orden <= Math.ceil(total / 3)) tercio = 'Superior';
      else if (orden <= Math.ceil((total * 2) / 3)) tercio = 'Medio';
      else tercio = 'Inferior';
    }
    return { orden_merito: orden, total_alumnos: total, tercio };
  }

  async getResumenAlumno(user: JwtUser, idMatricula: number, idBimestre: number) {
    const matricula = await this.assertMatriculaAccess(user, idMatricula);
    const bimestre = await this.prisma.bimestre.findUnique({ where: { id_bimestre: idBimestre }, include: { unidades: true } });
    if (!bimestre) throw new NotFoundException('Periodo no encontrado.');
    const unidadIds = bimestre.unidades.map((u) => u.id_unidad);

    const asignaciones = await this.prisma.asignacionDocente.findMany({
      where: { id_seccion: matricula.id_seccion, id_anio: matricula.id_anio },
      include: {
        curso: { include: { area: true } },
        docente: { include: { persona: true } },
        evaluaciones: { where: { id_unidad: { in: unidadIds } }, include: { tipo: true, notas: { where: { id_matricula: idMatricula } } }, orderBy: [{ orden: 'asc' }, { id_evaluacion_det: 'asc' }] },
      },
      orderBy: [{ id_curso: 'asc' }],
    });

    const cursos = asignaciones.map((asig) => {
      const evaluaciones = asig.evaluaciones.map((ev) => ({
        id_evaluacion_det: ev.id_evaluacion_det,
        descripcion: ev.descripcion_actividad || ev.tipo?.nombre_tipo || 'Evaluación',
        grupo: this.getGrupoEvaluacionTutoria(ev),
        nota: this.toNumber(ev.notas[0]?.valor_nota),
      }));
      const promedio = evaluaciones.length ? Math.round(evaluaciones.reduce((s, ev) => s + ev.nota, 0) / evaluaciones.length) : null;
      return {
        id_asignacion: asig.id_asignacion,
        curso: asig.curso?.nombre_curso || 'Curso',
        area: asig.curso?.area?.nombre_area || 'Área',
        docente: asig.docente?.persona ? `${asig.docente.persona.nombres} ${asig.docente.persona.apellido_paterno}`.trim() : '',
        promedio,
        evaluaciones,
      };
    });

    const resumen = await this.promedioMatricula(idMatricula, idBimestre);
    const merito = await this.merito(matricula.id_seccion, matricula.id_anio, idBimestre, idMatricula);
    const criterios = await this.asegurarCriterios(matricula.id_colegio, matricula.id_tenant);
    const calificaciones = await this.prisma.calificacionTutoria.findMany({ where: { id_matricula: idMatricula, id_bimestre: idBimestre } });
    const calMap = new Map(calificaciones.map((c) => [c.id_criterio, c.valor || '']));
    const comentario = await this.prisma.comentarioBimestral.findUnique({ where: { id_matricula_id_bimestre: { id_matricula: idMatricula, id_bimestre: idBimestre } } });
    const mapCriterios = (tipo: TipoCriterio) => criterios.filter((c) => c.tipo === tipo).map((c) => ({ id_criterio: c.id_criterio, descripcion: c.descripcion, tipo: c.tipo, valor: calMap.get(c.id_criterio) || '' }));

    return {
      alumno: {
        id_matricula: matricula.id_matricula,
        codigo: matricula.codigo_matricula || matricula.estudiante.codigo_estudiante || `MAT-${matricula.id_matricula}`,
        nombre: this.formatAlumno(matricula.estudiante.persona),
        colegio: matricula.colegio?.nombre || matricula.seccion?.colegio?.nombre || 'Colegio',
        anio: matricula.anio?.nombre_anio || '',
        salon: this.formatSeccion(matricula.seccion),
      },
      estadistica: { promedio_general: resumen.promedio, puntaje: resumen.puntaje, cursos_desaprobados: resumen.cursosDesaprobados, ...merito },
      cursos,
      conducta: mapCriterios('CONDUCTA'),
      participacion_familiar: mapCriterios('PARTICIPACION_FAMILIAR'),
      comentario: comentario?.comentario || '',
    };
  }

  async guardarCierreAlumno(user: JwtUser, idMatricula: number, body: { id_bimestre: number; comentario?: string; conducta?: { id_criterio: number; valor?: string | null }[]; participacion_familiar?: { id_criterio: number; valor?: string | null }[] }) {
    if (!body.id_bimestre) throw new BadRequestException('Periodo obligatorio.');
    const matricula = await this.assertMatriculaAccess(user, idMatricula);
    const usuario = await this.getUsuario(user.userId);
    const docenteId = usuario.persona?.docentes?.[0]?.id_persona || null;
    const criterios = await this.asegurarCriterios(matricula.id_colegio, matricula.id_tenant);
    const criterioIds = new Set(criterios.map((c) => c.id_criterio));
    const values = [...(body.conducta || []), ...(body.participacion_familiar || [])].filter((c) => criterioIds.has(Number(c.id_criterio)));
    const normalizar = (valor?: string | null) => {
      const v = String(valor || '').toUpperCase().trim();
      return ['AD', 'A', 'B', 'C'].includes(v) ? v : null;
    };

    await this.prisma.$transaction(async (tx) => {
      for (const item of values) {
        await tx.calificacionTutoria.upsert({
          where: { uq_calificacion_tutoria: { id_matricula: idMatricula, id_bimestre: Number(body.id_bimestre), id_criterio: Number(item.id_criterio) } },
          update: { valor: normalizar(item.valor), id_usuario_registro: user.userId },
          create: { id_matricula: idMatricula, id_bimestre: Number(body.id_bimestre), id_criterio: Number(item.id_criterio), valor: normalizar(item.valor), id_usuario_registro: user.userId },
        });
      }
      const comentarioPayload = {
        comentario: body.comentario || '',
        id_usuario_registro: user.userId,
        ...(docenteId ? { id_docente: docenteId } : {}),
      };

      await tx.comentarioBimestral.upsert({
        where: { id_matricula_id_bimestre: { id_matricula: idMatricula, id_bimestre: Number(body.id_bimestre) } },
        update: comentarioPayload,
        create: {
          id_matricula: idMatricula,
          id_bimestre: Number(body.id_bimestre),
          ...comentarioPayload,
        },
      });
    });

    return { message: 'Cierre de tutoría guardado correctamente.' };
  }
}
