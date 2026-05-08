import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AnaliticasService {
  constructor(private prisma: PrismaService) {}

  // ── FINANCIERAS ──
  async getFinancieras() {
    const hoy = new Date();

    // Morosidad vencida
    const morosidad = await this.prisma.$queryRaw<[{ total_vencido: string }]>(
      Prisma.sql`SELECT SUM(con.monto_base) as total_vencido
       FROM CronogramaPagos cp
       JOIN ConceptoPago con ON cp.id_concepto = con.id_concepto
       WHERE cp.estado_pago IN ('Pendiente','Vencido') AND cp.fecha_vencimiento < ${hoy}`
    );
    const totalVencido = Number(morosidad[0]?.total_vencido ?? 0);

    // Ingresos del mes
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const ingresosMes = await this.prisma.$queryRaw<[{ total_ingresado: string }]>(
      Prisma.sql`SELECT SUM(pt.monto_pagado) as total_ingresado
       FROM PagoTransaccion pt
       WHERE pt.fecha_pago >= ${primerDiaMes}`
    );
    const totalIngresado = Number(ingresosMes[0]?.total_ingresado ?? 0);

    // Tasa de cumplimiento
    const tasaCumplimiento = await this.prisma.$queryRaw<[{ porcentaje: string }]>(
      Prisma.sql`SELECT ROUND(SUM(CASE WHEN cp.estado_pago = 'Pagado' THEN 1 ELSE 0 END) / COUNT(*) * 100, 1) as porcentaje
       FROM CronogramaPagos cp`
    );
    const cumplimiento = Number(tasaCumplimiento[0]?.porcentaje ?? 0);

    // Ingresos por nivel
    const ingresosPorNivel = await this.prisma.$queryRaw<{ nivel: string; total: string }[]>(
      Prisma.sql`SELECT n.nombre_nivel as nivel, SUM(pt.monto_pagado) as total
       FROM PagoTransaccion pt
       JOIN CronogramaPagos cp ON pt.id_cronograma = cp.id_cronograma
       JOIN Matricula m ON cp.id_matricula = m.id_matricula
       JOIN Seccion s ON m.id_seccion = s.id_seccion
       JOIN Grado g ON s.id_grado = g.id_grado
       JOIN Nivel n ON g.id_nivel = n.id_nivel
       GROUP BY n.id_nivel`
    );
    const ingresosPorNivelParsed = ingresosPorNivel.map((item) => ({
      nivel: item.nivel,
      total: Number(item.total),
    }));

    // Próximos 5 días
    const dentroDe5Dias = new Date(hoy);
    dentroDe5Dias.setDate(dentroDe5Dias.getDate() + 5);
    const proximosAVencer = await this.prisma.cronogramaPagos.count({
      where: {
        estado_pago: 'Pendiente',
        fecha_vencimiento: { gte: hoy, lte: dentroDe5Dias },
      },
    });

    return {
      morosidadVencida: totalVencido,
      ingresosMes: totalIngresado,
      tasaCumplimiento: cumplimiento,
      ingresosPorNivel: ingresosPorNivelParsed,
      proximosAVencer,
    };
  }

  // ── ACADÉMICAS ──
  async getAcademicas() {
    const capacidad = await this.prisma.$queryRaw<{ nivel: string; matriculados: string; capacidad: string }[]>(
      Prisma.sql`SELECT n.nombre_nivel as nivel,
         COUNT(DISTINCT m.id_matricula) as matriculados,
         SUM(DISTINCT a.capacidad) as capacidad
       FROM Nivel n
       JOIN Grado g ON g.id_nivel = n.id_nivel
       JOIN Seccion s ON s.id_grado = g.id_grado
       JOIN Aula a ON s.id_aula = a.id_aula
       LEFT JOIN Matricula m ON m.id_seccion = s.id_seccion AND m.estado_matricula = 'Activo' AND m.id_anio = 1
       GROUP BY n.id_nivel`
    );
    const capacidadParsed = capacidad.map((item) => ({
      nivel: item.nivel,
      matriculados: Number(item.matriculados),
      capacidad: Number(item.capacidad),
    }));

    const rendimiento = await this.prisma.$queryRaw<[{ promedio: string }]>(
      Prisma.sql`SELECT AVG(na.valor_nota) as promedio
       FROM NotaAlumno na
       JOIN EvaluacionDetalle ed ON na.id_evaluacion_det = ed.id_evaluacion_det
       WHERE ed.id_unidad = 1`
    );
    const promedioGeneral = Math.round(Number(rendimiento[0]?.promedio ?? 0) * 10) / 10;

    const asistenciaPorSemana = await this.prisma.$queryRaw<{ semana: string; porcentaje: string }[]>(
      Prisma.sql`SELECT DATE_FORMAT(a.fecha, '%Y-%u') as semana,
         ROUND(SUM(CASE WHEN a.estado = 'Presente' THEN 1 ELSE 0 END) / COUNT(*) * 100, 1) as porcentaje
       FROM Asistencia a
       GROUP BY semana
       ORDER BY semana DESC
       LIMIT 8`
    );
    const asistenciaParsed = asistenciaPorSemana.reverse().map((item) => ({
      semana: item.semana,
      porcentaje: Number(item.porcentaje),
    }));

    return {
      capacidad: capacidadParsed,
      promedioGeneral,
      asistenciaPorSemana: asistenciaParsed,
    };
  }

  // ── ALERTAS ──
  async getAlertas() {
    const alumnosRiesgo = await this.prisma.$queryRaw<{ nombre: string; promedio: string }[]>(
      Prisma.sql`SELECT CONCAT(p.nombres, ' ', p.apellido_paterno) as nombre,
         AVG(na.valor_nota) as promedio
       FROM NotaAlumno na
       JOIN Matricula m ON na.id_matricula = m.id_matricula
       JOIN Estudiante e ON m.id_estudiante = e.id_persona
       JOIN Persona p ON e.id_persona = p.id_persona
       GROUP BY m.id_estudiante
       HAVING promedio < 11
       LIMIT 5`
    );
    const alumnosRiesgoParsed = alumnosRiesgo.map((a) => ({
      nombre: a.nombre,
      promedio: Number(a.promedio),
    }));

    const riesgoDesercion = await this.prisma.$queryRaw<{ nombre: string; pensionesVencidas: string; faltas: string }[]>(
      Prisma.sql`SELECT CONCAT(p.nombres, ' ', p.apellido_paterno) as nombre,
         COUNT(DISTINCT cp.id_cronograma) as pensionesVencidas,
         (SELECT COUNT(*) FROM Asistencia a WHERE a.id_matricula = m.id_matricula AND a.estado = 'Ausente') as faltas
       FROM Matricula m
       JOIN Estudiante e ON m.id_estudiante = e.id_persona
       JOIN Persona p ON e.id_persona = p.id_persona
       LEFT JOIN CronogramaPagos cp ON cp.id_matricula = m.id_matricula AND cp.estado_pago = 'Vencido'
       WHERE m.estado_matricula = 'Activo'
       GROUP BY m.id_matricula
       HAVING pensionesVencidas >= 2 OR faltas >= 5
       LIMIT 5`
    );
    const riesgoDesercionParsed = riesgoDesercion.map((r) => ({
      nombre: r.nombre,
      pensionesVencidas: Number(r.pensionesVencidas),
      faltas: Number(r.faltas),
    }));

    return { alumnosRiesgo: alumnosRiesgoParsed, riesgoDesercion: riesgoDesercionParsed };
  }

  // ── OPERATIVAS ──
  async getOperativas() {
    const cargaDocentes = await this.prisma.$queryRaw<{ docente: string; porcentaje: string }[]>(
      Prisma.sql`SELECT CONCAT(p.nombres, ' ', p.apellido_paterno) as docente,
         ROUND(COUNT(na.id_nota) / (COUNT(DISTINCT ed.id_evaluacion_det) * (SELECT COUNT(*) FROM Matricula m2 WHERE m2.id_seccion = a.id_seccion AND m2.estado_matricula = 'Activo')) * 100, 1) as porcentaje
       FROM AsignacionDocente a
       JOIN Docente d ON a.id_docente = d.id_persona
       JOIN Persona p ON d.id_persona = p.id_persona
       LEFT JOIN EvaluacionDetalle ed ON ed.id_asignacion = a.id_asignacion AND ed.id_unidad = 1
       LEFT JOIN NotaAlumno na ON na.id_evaluacion_det = ed.id_evaluacion_det
       GROUP BY a.id_asignacion`
    );
    const cargaDocentesParsed = cargaDocentes.map((c) => ({
      docente: c.docente,
      porcentaje: Number(c.porcentaje),
    }));

    const comunicados = await this.prisma.circular.findMany({
      orderBy: { fecha_creacion: 'desc' },
      take: 3,
      include: { destinatarios: { include: { nivel: true } }, remitente: { include: { persona: true } } },
    });

    return { cargaDocentes: cargaDocentesParsed, comunicados };
  }
}