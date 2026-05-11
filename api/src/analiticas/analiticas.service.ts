import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AnaliticasService {
  constructor(private prisma: PrismaService) {}

  // ── FINANCIERAS ──
  async getFinancieras() {
    // Morosidad vencida
    const morosidad = await this.prisma.$queryRaw<{ total_vencido: string }[]>(
      Prisma.sql`
        SELECT COALESCE(SUM(con.monto_base), 0) as total_vencido
        FROM CronogramaPagos cp
        JOIN ConceptoPago con ON cp.id_concepto = con.id_concepto
        WHERE cp.estado_pago IN ('Pendiente','Vencido') AND cp.fecha_vencimiento < NOW()
      `
    );
    const totalVencido = Number(morosidad[0]?.total_vencido ?? 0);

    // Ingresos del mes actual
    const ingresosMes = await this.prisma.$queryRaw<{ total_ingresado: string }[]>(
      Prisma.sql`
        SELECT COALESCE(SUM(pt.monto_pagado), 0) as total_ingresado
        FROM PagoTransaccion pt
        WHERE MONTH(pt.fecha_pago) = MONTH(CURRENT_DATE()) AND YEAR(pt.fecha_pago) = YEAR(CURRENT_DATE())
      `
    );
    const totalIngresado = Number(ingresosMes[0]?.total_ingresado ?? 0);

    // Tasa de cumplimiento (porcentaje de cronogramas pagados)
    const tasa = await this.prisma.$queryRaw<{ porcentaje: number }[]>(
  Prisma.sql`
    SELECT ROUND(
      (SUM(CASE WHEN cp.estado_pago = 'Pagado' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 1
    ) as porcentaje
    FROM CronogramaPagos cp
    JOIN Matricula m ON cp.id_matricula = m.id_matricula
    WHERE m.estado_matricula = 'Activo'
  `
);
    const tasaCumplimiento = Number(tasa[0]?.porcentaje ?? 0);

    // Ingresos por nivel
    const ingresosPorNivel = await this.prisma.$queryRaw<{ nivel: string; total: string }[]>(
      Prisma.sql`
        SELECT n.nombre_nivel as nivel, COALESCE(SUM(pt.monto_pagado), 0) as total
        FROM PagoTransaccion pt
        JOIN CronogramaPagos cp ON pt.id_cronograma = cp.id_cronograma
        JOIN Matricula m ON cp.id_matricula = m.id_matricula
        JOIN Seccion s ON m.id_seccion = s.id_seccion
        JOIN Grado g ON s.id_grado = g.id_grado
        JOIN Nivel n ON g.id_nivel = n.id_nivel
        GROUP BY n.id_nivel
      `
    );

    // Próximos 5 días
    const proximos = await this.prisma.cronogramaPagos.count({
      where: {
        estado_pago: 'Pendiente',
        fecha_vencimiento: {
          gte: new Date(),
          lt: new Date(new Date().setDate(new Date().getDate() + 5)),
        },
      },
    });

    return {
      morosidadVencida: totalVencido,
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
  const notas = await this.prisma.notaAlumno.findMany({
    where: { evaluacion: { id_unidad: 1 } },
    select: { valor_nota: true },
  });
  const promedioGeneral =
    notas.length > 0
      ? Math.round((notas.reduce((a, b) => a + Number(b.valor_nota), 0) / notas.length) * 10) / 10
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
    // Carga de notas por docente (unidad 1)
    const cargaDocentes = await this.prisma.$queryRaw<{ docente: string; porcentaje: number }[]>(
      Prisma.sql`
        SELECT CONCAT(p.nombres, ' ', p.apellido_paterno) as docente,
               ROUND(
                 COUNT(na.id_nota) * 100.0 / 
                 (COUNT(DISTINCT ed.id_evaluacion_det) * 
                  (SELECT COUNT(*) FROM Matricula m2 WHERE m2.id_seccion = a.id_seccion AND m2.estado_matricula = 'Activo')
                 ), 1
               ) as porcentaje
        FROM AsignacionDocente a
        JOIN Docente d ON a.id_docente = d.id_persona
        JOIN Persona p ON d.id_persona = p.id_persona
        LEFT JOIN EvaluacionDetalle ed ON ed.id_asignacion = a.id_asignacion AND ed.id_unidad = 1
        LEFT JOIN NotaAlumno na ON na.id_evaluacion_det = ed.id_evaluacion_det
        GROUP BY a.id_asignacion
      `
    );

    // Comunicados recientes
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

    return { cargaDocentes, comunicados };
  }
}