import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AnaliticasService {
  constructor(private prisma: PrismaService) {}

  private async getAnioActivoId() {
  const anioActivo = await this.prisma.anioLectivo.findFirst({
    where: { estado: 'Activo' },
    orderBy: { id_anio: 'desc' },
  });

  return anioActivo?.id_anio || 1;
}

private async getUnidadAbierta(idAnio: number) {
  return this.prisma.unidad.findFirst({
    where: {
      estado_abierto: true,
      bimestre: {
        id_anio: idAnio,
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

  // ── FINANCIERAS ──
  async getFinancieras() {
  const idAnio = await this.getAnioActivoId();

  const morosidad = await this.prisma.$queryRaw<{ total_vencido: string }[]>(
    Prisma.sql`
      SELECT 
        COALESCE(
          SUM(
            GREATEST(con.monto_base - COALESCE(pagos.total_pagado, 0), 0)
          ), 
          0
        ) AS total_vencido
      FROM CronogramaPagos cp
      JOIN ConceptoPago con ON cp.id_concepto = con.id_concepto
      JOIN Matricula m ON cp.id_matricula = m.id_matricula
      LEFT JOIN (
        SELECT 
          id_cronograma,
          SUM(monto_pagado) AS total_pagado
        FROM PagoTransaccion
        GROUP BY id_cronograma
      ) pagos ON pagos.id_cronograma = cp.id_cronograma
      WHERE m.id_anio = ${idAnio}
        AND m.estado_matricula = 'Activo'
        AND cp.estado_pago <> 'Pagado'
        AND cp.fecha_vencimiento < CURDATE()
        AND GREATEST(con.monto_base - COALESCE(pagos.total_pagado, 0), 0) > 0
    `
  );

  const totalVencido = Number(morosidad[0]?.total_vencido ?? 0);

  const morosidadDetalle = await this.prisma.$queryRaw<
  { concepto: string; cantidad: bigint; total: string }[]
>(
  Prisma.sql`
    SELECT 
      con.nombre_concepto AS concepto,
      COUNT(*) AS cantidad,
      COALESCE(
        SUM(
          GREATEST(con.monto_base - COALESCE(pagos.total_pagado, 0), 0)
        ), 
        0
      ) AS total
    FROM CronogramaPagos cp
    JOIN ConceptoPago con ON cp.id_concepto = con.id_concepto
    JOIN Matricula m ON cp.id_matricula = m.id_matricula
    LEFT JOIN (
      SELECT 
        id_cronograma,
        SUM(monto_pagado) AS total_pagado
      FROM PagoTransaccion
      GROUP BY id_cronograma
    ) pagos ON pagos.id_cronograma = cp.id_cronograma
    WHERE m.id_anio = ${idAnio}
      AND m.estado_matricula = 'Activo'
      AND cp.estado_pago <> 'Pagado'
      AND cp.fecha_vencimiento < CURDATE()
      AND GREATEST(con.monto_base - COALESCE(pagos.total_pagado, 0), 0) > 0
    GROUP BY con.id_concepto, con.nombre_concepto
    ORDER BY total DESC
  `
);

  const ingresosMes = await this.prisma.$queryRaw<{ total_ingresado: string }[]>(
    Prisma.sql`
      SELECT COALESCE(SUM(pt.monto_pagado), 0) AS total_ingresado
      FROM PagoTransaccion pt
      JOIN CronogramaPagos cp ON pt.id_cronograma = cp.id_cronograma
      JOIN Matricula m ON cp.id_matricula = m.id_matricula
      WHERE m.id_anio = ${idAnio}
        AND MONTH(pt.fecha_pago) = MONTH(CURRENT_DATE())
        AND YEAR(pt.fecha_pago) = YEAR(CURRENT_DATE())
    `
  );

  const totalIngresado = Number(ingresosMes[0]?.total_ingresado ?? 0);

  const tasa = await this.prisma.$queryRaw<{ porcentaje: number }[]>(
    Prisma.sql`
      SELECT 
        COALESCE(
          ROUND(
            (
              SUM(CASE WHEN cp.estado_pago = 'Pagado' THEN 1 ELSE 0 END) 
              / NULLIF(COUNT(*), 0)
            ) * 100, 
            1
          ), 
          0
        ) AS porcentaje
      FROM CronogramaPagos cp
      JOIN Matricula m ON cp.id_matricula = m.id_matricula
      WHERE m.estado_matricula = 'Activo'
        AND m.id_anio = ${idAnio}
    `
  );

  const tasaCumplimiento = Number(tasa[0]?.porcentaje ?? 0);

  const ingresosPorNivel = await this.prisma.$queryRaw<{ nivel: string; total: string }[]>(
    Prisma.sql`
      SELECT 
        n.nombre_nivel AS nivel, 
        COALESCE(SUM(pt.monto_pagado), 0) AS total
      FROM PagoTransaccion pt
      JOIN CronogramaPagos cp ON pt.id_cronograma = cp.id_cronograma
      JOIN Matricula m ON cp.id_matricula = m.id_matricula
      JOIN Seccion s ON m.id_seccion = s.id_seccion
      JOIN Grado g ON s.id_grado = g.id_grado
      JOIN Nivel n ON g.id_nivel = n.id_nivel
      WHERE m.id_anio = ${idAnio}
      GROUP BY n.id_nivel, n.nombre_nivel
    `
  );

  const proximos = await this.prisma.cronogramaPagos.count({
    where: {
      estado_pago: { not: 'Pagado' },
      matricula: {
        id_anio: idAnio,
        estado_matricula: 'Activo',
      },
      fecha_vencimiento: {
        gte: new Date(),
        lt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      },
    },
  });

  return {
  morosidadVencida: totalVencido,
  morosidadDetalle: morosidadDetalle.map((item) => ({
    concepto: item.concepto,
    cantidad: Number(item.cantidad),
    total: Number(item.total),
  })),
  ingresosMes: totalIngresado,
  tasaCumplimiento,
  ingresosPorNivel: ingresosPorNivel.map((i) => ({
    nivel: i.nivel,
    total: Number(i.total),
  })),
  proximosAVencer: proximos,
};
}

  async getTesoreriaKpis() {
  // Recaudado hoy (basado en la fecha de la base de datos)
  const recaudadoHoyRaw = await this.prisma.$queryRaw<{ total: string }[]>(
    Prisma.sql`
      SELECT COALESCE(SUM(pt.monto_pagado), 0) as total
      FROM PagoTransaccion pt
      WHERE DATE(pt.fecha_pago) = CURDATE()
    `
  );
  const recaudadoHoy = Number(recaudadoHoyRaw[0]?.total ?? 0);

  // Todos los vencidos pendientes (sin límite de mes, para mostrar datos reales)
  const vencidosRaw = await this.prisma.$queryRaw<{ total: string }[]>(
    Prisma.sql`
      SELECT COALESCE(SUM(con.monto_base), 0) as total
      FROM CronogramaPagos cp
      JOIN ConceptoPago con ON cp.id_concepto = con.id_concepto
      WHERE cp.estado_pago IN ('Pendiente', 'Vencido')
        AND cp.fecha_vencimiento < CURDATE()
    `
  );
  const vencidosDelMes = Number(vencidosRaw[0]?.total ?? 0);

  // Próximos 48h
  const proximos48h = await this.prisma.cronogramaPagos.count({
    where: {
      estado_pago: 'Pendiente',
      fecha_vencimiento: {
        gte: new Date(),
        lt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
    },
  });

  return {
    recaudadoHoy,
    vencidosDelMes,
    proximos48h,
  };
}

async getMatriculaTendencia() {
  // Matrículas por mes del año activo (id_anio = 1)
  const tendencia = await this.prisma.$queryRaw<{ mes: string; total: number }[]>(
    Prisma.sql`
      SELECT DATE_FORMAT(m.fecha_matricula, '%Y-%m') as mes, COUNT(*) as total
      FROM Matricula m
      WHERE m.id_anio = 1 AND m.estado_matricula = 'Activo'
      GROUP BY mes
      ORDER BY mes
    `
  );
  return tendencia.map((t) => ({ mes: t.mes, total: Number(t.total) }));
}

async getDistribucionPorNivel() {
  const distribucion = await this.prisma.$queryRaw<{ nivel: string; total: number }[]>(
    Prisma.sql`
      SELECT n.nombre_nivel as nivel, COUNT(DISTINCT m.id_matricula) as total
      FROM Matricula m
      JOIN Seccion s ON m.id_seccion = s.id_seccion
      JOIN Grado g ON s.id_grado = g.id_grado
      JOIN Nivel n ON g.id_nivel = n.id_nivel
      WHERE m.estado_matricula = 'Activo' AND m.id_anio = 1
      GROUP BY n.id_nivel
    `
  );
  return distribucion.map((d) => ({ nivel: d.nivel, total: Number(d.total) }));
}

  // ── ACADÉMICAS ──
  async getAcademicas() {
  // Capacidad por nivel – usando agregación de Prisma, sin SQL crudo
  const niveles = await this.prisma.nivel.findMany({
    include: {
      grados: {
        include: {
          secciones: {
            include: {
              aula: true,
              matriculas: {
                where: { estado_matricula: 'Activo', id_anio: 1 },
              },
            },
          },
        },
      },
    },
  });

  const capacidad = niveles.map((nivel) => {
    let matriculados = 0;
    const aulasSet = new Set<number>();
    for (const grado of nivel.grados) {
      for (const seccion of grado.secciones) {
        matriculados += seccion.matriculas.length;
        aulasSet.add(seccion.id_aula);
      }
    }
    const capacidadTotal = Array.from(aulasSet).reduce((sum, idAula) => {
      const aula = nivel.grados
        .flatMap((g) => g.secciones)
        .find((s) => s.id_aula === idAula)?.aula;
      return sum + (aula?.capacidad ?? 0);
    }, 0);
    return {
      nivel: nivel.nombre_nivel,
      matriculados,
      capacidad: capacidadTotal,
    };
  });

  // Promedio general – obtener todas las notas de la unidad 1
  const idAnio = await this.getAnioActivoId();
const unidadAbierta = await this.getUnidadAbierta(idAnio);

const notas = unidadAbierta
  ? await this.prisma.notaAlumno.findMany({
      where: {
        evaluacion: {
          id_unidad: unidadAbierta.id_unidad,
        },
      },
      select: { valor_nota: true },
    })
  : [];
  const promedioGeneral =
  notas.length > 0
    ? Math.round(
        notas.reduce((a, b) => a + Number(b.valor_nota), 0) / notas.length
      )
    : 0;

  // Asistencia por semana – con Prisma, agrupando con JS
  const asistencias = await this.prisma.asistencia.findMany({
    select: { fecha: true, estado: true },
    orderBy: { fecha: 'asc' },
  });

  // Agrupar manualmente por semana
  const semanasMap = new Map<string, { presentes: number; total: number }>();
  for (const a of asistencias) {
    const d = new Date(a.fecha);
    const year = d.getFullYear();
    const week = Math.ceil(
      ((d.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + new Date(year, 0, 1).getDay() + 1) / 7
    );
    const key = `${year}-${week.toString().padStart(2, '0')}`;
    const entry = semanasMap.get(key) || { presentes: 0, total: 0 };
    entry.total++;
    if (a.estado === 'Presente') entry.presentes++;
    semanasMap.set(key, entry);
  }

  const asistenciaPorSemana = Array.from(semanasMap.entries())
    .map(([semana, data]) => ({
      semana,
      porcentaje: Math.round((data.presentes / data.total) * 1000) / 10,
    }))
    .sort((a, b) => a.semana.localeCompare(b.semana))
    .slice(-8);

  return {
    capacidad,
    promedioGeneral,
    asistenciaPorSemana,
  };
}

  // ── ALERTAS ──
  async getAlertas() {
  // Alumnos en riesgo académico (promedio general < 11 considerando todas las unidades del año activo)
  const alumnosRiesgoRaw = await this.prisma.$queryRaw<{ nombre: string; promedio: number }[]>(
    Prisma.sql`
      SELECT CONCAT(p.nombres, ' ', p.apellido_paterno) as nombre,
             ROUND(AVG(na.valor_nota), 1) as promedio
      FROM NotaAlumno na
      JOIN Matricula m ON na.id_matricula = m.id_matricula
      JOIN Estudiante e ON m.id_estudiante = e.id_persona
      JOIN Persona p ON e.id_persona = p.id_persona
      WHERE m.estado_matricula = 'Activo' AND m.id_anio = 1
      GROUP BY m.id_estudiante
      HAVING AVG(na.valor_nota) < 11
      LIMIT 5
    `
  );

  const alumnosRiesgo = alumnosRiesgoRaw.map((a) => ({
    nombre: a.nombre,
    promedio: Number(a.promedio),
  }));

  // Riesgo de deserción (2+ pensiones vencidas o 5+ faltas)
  const riesgoDesercionRaw = await this.prisma.$queryRaw<
    { nombre: string; pensionesVencidas: bigint; faltas: bigint }[]
  >(
    Prisma.sql`
      SELECT CONCAT(p.nombres, ' ', p.apellido_paterno) as nombre,
             SUM(CASE WHEN cp.estado_pago = 'Vencido' THEN 1 ELSE 0 END) as pensionesVencidas,
             (SELECT COUNT(*) FROM Asistencia a WHERE a.id_matricula = m.id_matricula AND a.estado = 'Ausente') as faltas
      FROM Matricula m
      JOIN Estudiante e ON m.id_estudiante = e.id_persona
      JOIN Persona p ON e.id_persona = p.id_persona
      LEFT JOIN CronogramaPagos cp ON cp.id_matricula = m.id_matricula
      WHERE m.estado_matricula = 'Activo'
      GROUP BY m.id_matricula
      HAVING pensionesVencidas >= 2 OR faltas >= 5
      LIMIT 5
    `
  );

  const riesgoDesercion = riesgoDesercionRaw.map((r) => ({
    nombre: r.nombre,
    pensionesVencidas: Number(r.pensionesVencidas),
    faltas: Number(r.faltas),
  }));

  return { alumnosRiesgo, riesgoDesercion };
}

  // ── OPERATIVAS ──
  async getOperativas() {
  const anioActivo = await this.prisma.anioLectivo.findFirst({
    where: { estado: 'Activo' },
    orderBy: { id_anio: 'desc' },
  });

  const idAnio = anioActivo?.id_anio || 1;

  const unidadAbierta = await this.prisma.unidad.findFirst({
    where: {
      estado_abierto: true,
      bimestre: {
        id_anio: idAnio,
      },
    },
    include: {
      bimestre: true,
    },
    orderBy: {
      numero: 'asc',
    },
  });

  if (!unidadAbierta) {
    const comunicados = await this.prisma.circular.findMany({
      orderBy: { fecha_creacion: 'desc' },
      take: 3,
      select: {
        id_circular: true,
        titulo: true,
        contenido: true,
        fecha_creacion: true,
        remitente: {
          select: {
            username: true,
            persona: {
              select: {
                nombres: true,
                apellido_paterno: true,
                apellido_materno: true,
              },
            },
          },
        },
        destinatarios: {
          select: {
            nivel: {
              select: {
                nombre_nivel: true,
              },
            },
          },
        },
      },
    });

    return {
      unidadActual: null,
      cargaDocentes: [],
      comunicados,
    };
  }

  const asignaciones = await this.prisma.asignacionDocente.findMany({
    where: {
      id_anio: idAnio,
    },
    include: {
      docente: {
        include: {
          persona: true,
        },
      },
      curso: true,
      seccion: {
        include: {
          grado: {
            include: {
              nivel: true,
            },
          },
        },
      },
      evaluaciones: {
        where: {
          id_unidad: unidadAbierta.id_unidad,
        },
        include: {
          notas: {
            where: {
              matricula: {
                id_anio: idAnio,
                estado_matricula: 'Activo',
              },
            },
          },
        },
      },
    },
    orderBy: {
      id_docente: 'asc',
    },
  });

  const idsSecciones = Array.from(
    new Set(asignaciones.map((asignacion) => asignacion.id_seccion)),
  );

  const alumnosPorSeccionRaw = await this.prisma.matricula.groupBy({
    by: ['id_seccion'],
    where: {
      id_anio: idAnio,
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
    const totalEvaluaciones = asignacion.evaluaciones.length;

    const registradasAsignacion = asignacion.evaluaciones.reduce(
      (total, evaluacion) => total + evaluacion.notas.length,
      0,
    );

    const totalEsperadoAsignacion = totalAlumnos * totalEvaluaciones;

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

    const docente = docentesMap.get(idDocente)!;

    docente.cursos.push(asignacion.curso.nombre_curso);

    const grado = asignacion.seccion.grado?.nombre_grado || 'Grado';
    const nivel = asignacion.seccion.grado?.nivel?.nombre_nivel || 'Nivel';
    docente.secciones.push(`${grado} "${asignacion.seccion.letra}" · ${nivel}`);

    docente.evaluaciones += totalEvaluaciones;
    docente.totalEsperado += totalEsperadoAsignacion;
    docente.registradas += registradasAsignacion;
  }

  const cargaDocentes = Array.from(docentesMap.values())
    .map((docente) => {
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
    })
    .sort((a, b) => a.porcentaje - b.porcentaje);

  const comunicados = await this.prisma.circular.findMany({
    orderBy: { fecha_creacion: 'desc' },
    take: 3,
    select: {
      id_circular: true,
      titulo: true,
      contenido: true,
      fecha_creacion: true,
      remitente: {
        select: {
          username: true,
          persona: {
            select: {
              nombres: true,
              apellido_paterno: true,
              apellido_materno: true,
            },
          },
        },
      },
      destinatarios: {
        select: {
          nivel: {
            select: {
              nombre_nivel: true,
            },
          },
        },
      },
    },
  });

  return {
    unidadActual: {
      id_unidad: unidadAbierta.id_unidad,
      numero: unidadAbierta.numero,
      id_bimestre: unidadAbierta.id_bimestre,
      bimestre: unidadAbierta.bimestre.numero,
      fecha_inicio: unidadAbierta.fecha_inicio,
      fecha_fin: unidadAbierta.fecha_fin,
      estado_abierto: unidadAbierta.estado_abierto,
    },
    cargaDocentes,
    comunicados,
  };
}
}