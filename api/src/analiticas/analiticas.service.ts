import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface AnaliticasParams {
  userId: number;
  rol: string;
  scope?: string;
  colegioId?: number;
}

interface AnaliticasScope {
  tipo: 'todos' | 'colegio';
  tenantId: number | null;
  colegioIds: number[];
  colegios: {
    id_colegio: number;
    id_tenant: number;
    nombre: string;
    nombre_corto: string | null;
    codigo: string | null;
    color_principal: string | null;
  }[];
  puedeVerConsolidado: boolean;
}

type EstadoCarga =
  | 'completo'
  | 'avanzado'
  | 'en_proceso'
  | 'pendiente'
  | 'sin_evaluaciones';

@Injectable()
export class AnaliticasService {
  constructor(private prisma: PrismaService) {}

  private async resolveScope(params: AnaliticasParams): Promise<AnaliticasScope> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: params.userId },
      include: {
        colegios: {
          where: { estado: 'Activo' },
          include: { colegio: true },
          orderBy: { es_principal: 'desc' },
        },
      },
    });

    if (!usuario) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const colegiosPermitidos = usuario.colegios.map((acceso) => ({
      id_colegio: acceso.colegio.id_colegio,
      id_tenant: acceso.colegio.id_tenant,
      nombre: acceso.colegio.nombre,
      nombre_corto: acceso.colegio.nombre_corto,
      codigo: acceso.colegio.codigo,
      color_principal: acceso.colegio.color_principal,
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
      ['Admin', 'Director'].includes(params.rol) && colegiosPermitidos.length > 1;

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

  private colegioWhere(scope: AnaliticasScope) {
    return scope.colegioIds.length
      ? { id_colegio: { in: scope.colegioIds } }
      : { id_colegio: -1 };
  }

  private anioWhere(anioIds: number[]) {
    return anioIds.length ? { id_anio: { in: anioIds } } : { id_anio: -1 };
  }

  private colegioSql(scope: AnaliticasScope, alias: string) {
    if (!scope.colegioIds.length) return Prisma.sql`${Prisma.raw(alias)}.id_colegio = -1`;
    return Prisma.sql`${Prisma.raw(alias)}.id_colegio IN (${Prisma.join(scope.colegioIds)})`;
  }

  private anioSql(anioIds: number[], alias: string) {
    if (!anioIds.length) return Prisma.sql`${Prisma.raw(alias)}.id_anio = -1`;
    return Prisma.sql`${Prisma.raw(alias)}.id_anio IN (${Prisma.join(anioIds)})`;
  }

  private async resolveAnioIds(scope: AnaliticasScope) {
    if (!scope.colegioIds.length) return [];

    const activos = await this.prisma.anioLectivo.findMany({
      where: {
        ...this.colegioWhere(scope),
        estado: 'Activo',
      },
      orderBy: { id_anio: 'asc' },
    });

    if (activos.length) return activos.map((item) => item.id_anio);

    const anios = await this.prisma.anioLectivo.findMany({
      where: this.colegioWhere(scope),
      orderBy: { id_anio: 'asc' },
    });

    return anios.map((item) => item.id_anio);
  }

  private async getUnidadContext(anioIds: number[]) {
    if (!anioIds.length) {
      return { unidadActual: null, idsUnidades: [] as number[] };
    }

    const abierta = await this.prisma.unidad.findFirst({
      where: {
        estado_abierto: true,
        bimestre: { id_anio: { in: anioIds } },
      },
      include: { bimestre: true },
      orderBy: { numero: 'asc' },
    });

    const base =
      abierta ||
      (await this.prisma.unidad.findFirst({
        where: { bimestre: { id_anio: { in: anioIds } } },
        include: { bimestre: true },
        orderBy: { numero: 'asc' },
      }));

    if (!base) {
      return { unidadActual: null, idsUnidades: [] as number[] };
    }

    const equivalentes = await this.prisma.unidad.findMany({
      where: {
        numero: base.numero,
        bimestre: {
          numero: base.bimestre.numero,
          id_anio: { in: anioIds },
        },
      },
      select: { id_unidad: true },
    });

    return {
      unidadActual: base,
      idsUnidades: equivalentes.map((item) => item.id_unidad),
    };
  }

  private formatSeccion(seccion: any) {
    if (!seccion) return 'Sin sección';
    const grado = seccion.grado?.nombre_grado || 'Grado';
    const nivel = seccion.grado?.nivel?.nombre_nivel || 'Nivel';
    return `${grado} "${seccion.letra}" · ${nivel}`;
  }

  async getFinancieras(params: AnaliticasParams) {
    const scope = await this.resolveScope(params);
    const anioIds = await this.resolveAnioIds(scope);

    const morosidad = await this.prisma.$queryRaw<{ total_vencido: string }[]>(
      Prisma.sql`
        SELECT 
          COALESCE(
            SUM(GREATEST(con.monto_base - COALESCE(pagos.total_pagado, 0), 0)),
            0
          ) AS total_vencido
        FROM CronogramaPagos cp
        JOIN ConceptoPago con ON cp.id_concepto = con.id_concepto
        JOIN Matricula m ON cp.id_matricula = m.id_matricula
        LEFT JOIN (
          SELECT id_cronograma, SUM(monto_pagado) AS total_pagado
          FROM PagoTransaccion
          GROUP BY id_cronograma
        ) pagos ON pagos.id_cronograma = cp.id_cronograma
        WHERE ${this.anioSql(anioIds, 'm')}
          AND ${this.colegioSql(scope, 'm')}
          AND m.estado_matricula = 'Activo'
          AND cp.estado_pago <> 'Pagado'
          AND cp.fecha_vencimiento < CURDATE()
          AND GREATEST(con.monto_base - COALESCE(pagos.total_pagado, 0), 0) > 0
      `,
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
            SUM(GREATEST(con.monto_base - COALESCE(pagos.total_pagado, 0), 0)),
            0
          ) AS total
        FROM CronogramaPagos cp
        JOIN ConceptoPago con ON cp.id_concepto = con.id_concepto
        JOIN Matricula m ON cp.id_matricula = m.id_matricula
        LEFT JOIN (
          SELECT id_cronograma, SUM(monto_pagado) AS total_pagado
          FROM PagoTransaccion
          GROUP BY id_cronograma
        ) pagos ON pagos.id_cronograma = cp.id_cronograma
        WHERE ${this.anioSql(anioIds, 'm')}
          AND ${this.colegioSql(scope, 'm')}
          AND m.estado_matricula = 'Activo'
          AND cp.estado_pago <> 'Pagado'
          AND cp.fecha_vencimiento < CURDATE()
          AND GREATEST(con.monto_base - COALESCE(pagos.total_pagado, 0), 0) > 0
        GROUP BY con.id_concepto, con.nombre_concepto
        ORDER BY total DESC
      `,
    );

    const ingresosMes = await this.prisma.$queryRaw<{ total_ingresado: string }[]>(
      Prisma.sql`
        SELECT COALESCE(SUM(pt.monto_pagado), 0) AS total_ingresado
        FROM PagoTransaccion pt
        JOIN CronogramaPagos cp ON pt.id_cronograma = cp.id_cronograma
        JOIN Matricula m ON cp.id_matricula = m.id_matricula
        WHERE ${this.anioSql(anioIds, 'm')}
          AND ${this.colegioSql(scope, 'm')}
          AND MONTH(pt.fecha_pago) = MONTH(CURRENT_DATE())
          AND YEAR(pt.fecha_pago) = YEAR(CURRENT_DATE())
      `,
    );

    const totalIngresado = Number(ingresosMes[0]?.total_ingresado ?? 0);

    const tasa = await this.prisma.$queryRaw<{ porcentaje: number }[]>(
      Prisma.sql`
        SELECT 
          COALESCE(
            ROUND(
              (SUM(CASE WHEN cp.estado_pago = 'Pagado' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0)) * 100,
              1
            ),
            0
          ) AS porcentaje
        FROM CronogramaPagos cp
        JOIN Matricula m ON cp.id_matricula = m.id_matricula
        WHERE ${this.anioSql(anioIds, 'm')}
          AND ${this.colegioSql(scope, 'm')}
          AND m.estado_matricula = 'Activo'
      `,
    );

    const tasaCumplimiento = Number(tasa[0]?.porcentaje ?? 0);

    const ingresosPorNivel = await this.prisma.$queryRaw<
      { nivel: string; total: string }[]
    >(
      Prisma.sql`
        SELECT n.nombre_nivel AS nivel, COALESCE(SUM(pt.monto_pagado), 0) AS total
        FROM PagoTransaccion pt
        JOIN CronogramaPagos cp ON pt.id_cronograma = cp.id_cronograma
        JOIN Matricula m ON cp.id_matricula = m.id_matricula
        JOIN Seccion s ON m.id_seccion = s.id_seccion
        JOIN Grado g ON s.id_grado = g.id_grado
        JOIN Nivel n ON g.id_nivel = n.id_nivel
        WHERE ${this.anioSql(anioIds, 'm')}
          AND ${this.colegioSql(scope, 'm')}
        GROUP BY n.id_nivel, n.nombre_nivel
        ORDER BY n.id_nivel
      `,
    );

    const proximos = await this.prisma.cronogramaPagos.count({
      where: {
        estado_pago: { not: 'Pagado' },
        matricula: {
          ...this.anioWhere(anioIds),
          ...this.colegioWhere(scope),
          estado_matricula: 'Activo',
        },
        fecha_vencimiento: {
          gte: new Date(),
          lt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        },
      },
    });

    return {
      scope: {
        tipo: scope.tipo,
        colegioIds: scope.colegioIds,
      },
      morosidadVencida: totalVencido,
      morosidadDetalle: morosidadDetalle.map((item) => ({
        concepto: item.concepto,
        cantidad: Number(item.cantidad),
        total: Number(item.total),
      })),
      ingresosMes: totalIngresado,
      tasaCumplimiento,
      ingresosPorNivel: ingresosPorNivel.map((item) => ({
        nivel: item.nivel,
        total: Number(item.total),
      })),
      proximosAVencer: proximos,
    };
  }

  async getTesoreriaKpis(params: AnaliticasParams) {
    const scope = await this.resolveScope(params);
    const anioIds = await this.resolveAnioIds(scope);

    const recaudadoHoyRaw = await this.prisma.$queryRaw<{ total: string }[]>(
      Prisma.sql`
        SELECT COALESCE(SUM(pt.monto_pagado), 0) AS total
        FROM PagoTransaccion pt
        JOIN CronogramaPagos cp ON pt.id_cronograma = cp.id_cronograma
        JOIN Matricula m ON cp.id_matricula = m.id_matricula
        WHERE ${this.anioSql(anioIds, 'm')}
          AND ${this.colegioSql(scope, 'm')}
          AND DATE(pt.fecha_pago) = CURDATE()
      `,
    );

    const vencidosRaw = await this.prisma.$queryRaw<{ total: string }[]>(
      Prisma.sql`
        SELECT COALESCE(SUM(GREATEST(con.monto_base - COALESCE(pagos.total_pagado, 0), 0)), 0) AS total
        FROM CronogramaPagos cp
        JOIN ConceptoPago con ON cp.id_concepto = con.id_concepto
        JOIN Matricula m ON cp.id_matricula = m.id_matricula
        LEFT JOIN (
          SELECT id_cronograma, SUM(monto_pagado) AS total_pagado
          FROM PagoTransaccion
          GROUP BY id_cronograma
        ) pagos ON pagos.id_cronograma = cp.id_cronograma
        WHERE ${this.anioSql(anioIds, 'm')}
          AND ${this.colegioSql(scope, 'm')}
          AND m.estado_matricula = 'Activo'
          AND cp.estado_pago <> 'Pagado'
          AND cp.fecha_vencimiento < CURDATE()
      `,
    );

    const proximos48h = await this.prisma.cronogramaPagos.count({
      where: {
        estado_pago: 'Pendiente',
        matricula: {
          ...this.anioWhere(anioIds),
          ...this.colegioWhere(scope),
          estado_matricula: 'Activo',
        },
        fecha_vencimiento: {
          gte: new Date(),
          lt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        },
      },
    });

    return {
      recaudadoHoy: Number(recaudadoHoyRaw[0]?.total ?? 0),
      vencidosDelMes: Number(vencidosRaw[0]?.total ?? 0),
      proximos48h,
    };
  }

  async getMatriculaTendencia(params: AnaliticasParams) {
    const scope = await this.resolveScope(params);
    const anioIds = await this.resolveAnioIds(scope);

    const tendencia = await this.prisma.$queryRaw<{ mes: string; total: bigint }[]>(
      Prisma.sql`
        SELECT DATE_FORMAT(m.fecha_matricula, '%Y-%m') AS mes, COUNT(*) AS total
        FROM Matricula m
        WHERE ${this.anioSql(anioIds, 'm')}
          AND ${this.colegioSql(scope, 'm')}
          AND m.estado_matricula = 'Activo'
        GROUP BY mes
        ORDER BY mes
      `,
    );

    return tendencia.map((item) => ({ mes: item.mes, total: Number(item.total) }));
  }

  async getDistribucionPorNivel(params: AnaliticasParams) {
    const scope = await this.resolveScope(params);
    const anioIds = await this.resolveAnioIds(scope);

    const distribucion = await this.prisma.$queryRaw<
      { nivel: string; total: bigint }[]
    >(
      Prisma.sql`
        SELECT n.nombre_nivel AS nivel, COUNT(DISTINCT m.id_matricula) AS total
        FROM Matricula m
        JOIN Seccion s ON m.id_seccion = s.id_seccion
        JOIN Grado g ON s.id_grado = g.id_grado
        JOIN Nivel n ON g.id_nivel = n.id_nivel
        WHERE ${this.anioSql(anioIds, 'm')}
          AND ${this.colegioSql(scope, 'm')}
          AND m.estado_matricula = 'Activo'
        GROUP BY n.id_nivel, n.nombre_nivel
        ORDER BY n.id_nivel
      `,
    );

    return distribucion.map((item) => ({
      nivel: item.nivel,
      total: Number(item.total),
    }));
  }

  async getAcademicas(params: AnaliticasParams) {
    const scope = await this.resolveScope(params);
    const anioIds = await this.resolveAnioIds(scope);
    const unidadContext = await this.getUnidadContext(anioIds);

    const secciones = await this.prisma.seccion.findMany({
      where: this.colegioWhere(scope),
      include: {
        aula: true,
        grado: { include: { nivel: true } },
        matriculas: {
          where: {
            ...this.anioWhere(anioIds),
            estado_matricula: 'Activo',
          },
        },
      },
    });

    const capacidadMap = new Map<
      string,
      { nivel: string; matriculados: number; capacidad: number; aulas: Set<number> }
    >();

    for (const seccion of secciones) {
      const nivel = seccion.grado.nivel.nombre_nivel;
      if (!capacidadMap.has(nivel)) {
        capacidadMap.set(nivel, {
          nivel,
          matriculados: 0,
          capacidad: 0,
          aulas: new Set<number>(),
        });
      }

      const item = capacidadMap.get(nivel)!;
      item.matriculados += seccion.matriculas.length;

      if (!item.aulas.has(seccion.id_aula)) {
        item.aulas.add(seccion.id_aula);
        item.capacidad += Number(seccion.aula?.capacidad || 0);
      }
    }

    const capacidad = Array.from(capacidadMap.values()).map((item) => ({
      nivel: item.nivel,
      matriculados: item.matriculados,
      capacidad: item.capacidad,
    }));

    const notas = unidadContext.idsUnidades.length
      ? await this.prisma.notaAlumno.findMany({
          where: {
            evaluacion: {
              id_unidad: { in: unidadContext.idsUnidades },
            },
            matricula: {
              ...this.anioWhere(anioIds),
              ...this.colegioWhere(scope),
              estado_matricula: 'Activo',
            },
          },
          select: { valor_nota: true },
        })
      : [];

    const promedioGeneral = notas.length
      ? Math.round(
          notas.reduce((total, nota) => total + Number(nota.valor_nota), 0) /
            notas.length,
        )
      : 0;

    const asistencias = await this.prisma.asistencia.findMany({
      where: {
        matricula: {
          ...this.anioWhere(anioIds),
          ...this.colegioWhere(scope),
          estado_matricula: 'Activo',
        },
      },
      select: { fecha: true, estado: true },
      orderBy: { fecha: 'asc' },
    });

    const semanasMap = new Map<string, { presentes: number; total: number }>();

    for (const asistencia of asistencias) {
      const fecha = new Date(asistencia.fecha);
      const year = fecha.getFullYear();
      const week = Math.ceil(
        ((fecha.getTime() - new Date(year, 0, 1).getTime()) / 86400000 +
          new Date(year, 0, 1).getDay() +
          1) /
          7,
      );
      const key = `${year}-${week.toString().padStart(2, '0')}`;
      const item = semanasMap.get(key) || { presentes: 0, total: 0 };
      item.total += 1;
      if (asistencia.estado === 'Presente') item.presentes += 1;
      semanasMap.set(key, item);
    }

    const asistenciaPorSemana = Array.from(semanasMap.entries())
      .map(([semana, item]) => ({
        semana,
        porcentaje: item.total
          ? Math.round((item.presentes / item.total) * 1000) / 10
          : 0,
      }))
      .sort((a, b) => a.semana.localeCompare(b.semana))
      .slice(-8);

    return {
      capacidad,
      promedioGeneral,
      asistenciaPorSemana,
    };
  }

  async getAlertas(params: AnaliticasParams) {
    const scope = await this.resolveScope(params);
    const anioIds = await this.resolveAnioIds(scope);

    const alumnosRiesgoRaw = await this.prisma.$queryRaw<
      { nombre: string; promedio: number }[]
    >(
      Prisma.sql`
        SELECT CONCAT(p.nombres, ' ', p.apellido_paterno) AS nombre,
               ROUND(AVG(na.valor_nota), 1) AS promedio
        FROM NotaAlumno na
        JOIN Matricula m ON na.id_matricula = m.id_matricula
        JOIN Estudiante e ON m.id_estudiante = e.id_persona
        JOIN Persona p ON e.id_persona = p.id_persona
        WHERE ${this.anioSql(anioIds, 'm')}
          AND ${this.colegioSql(scope, 'm')}
          AND m.estado_matricula = 'Activo'
        GROUP BY m.id_estudiante, p.nombres, p.apellido_paterno
        HAVING AVG(na.valor_nota) < 11
        ORDER BY promedio ASC
        LIMIT 5
      `,
    );

    const riesgoDesercionRaw = await this.prisma.$queryRaw<
      { nombre: string; pensionesVencidas: bigint; faltas: bigint }[]
    >(
      Prisma.sql`
        SELECT CONCAT(p.nombres, ' ', p.apellido_paterno) AS nombre,
               SUM(
                 CASE
                   WHEN cp.estado_pago <> 'Pagado' AND cp.fecha_vencimiento < CURDATE() THEN 1
                   ELSE 0
                 END
               ) AS pensionesVencidas,
               (
                 SELECT COUNT(*)
                 FROM Asistencia a
                 WHERE a.id_matricula = m.id_matricula
                   AND a.estado = 'Ausente'
               ) AS faltas
        FROM Matricula m
        JOIN Estudiante e ON m.id_estudiante = e.id_persona
        JOIN Persona p ON e.id_persona = p.id_persona
        LEFT JOIN CronogramaPagos cp ON cp.id_matricula = m.id_matricula
        WHERE ${this.anioSql(anioIds, 'm')}
          AND ${this.colegioSql(scope, 'm')}
          AND m.estado_matricula = 'Activo'
        GROUP BY m.id_matricula, p.nombres, p.apellido_paterno
        HAVING pensionesVencidas >= 2 OR faltas >= 5
        ORDER BY pensionesVencidas DESC, faltas DESC
        LIMIT 5
      `,
    );

    return {
      alumnosRiesgo: alumnosRiesgoRaw.map((item) => ({
        nombre: item.nombre,
        promedio: Number(item.promedio),
      })),
      riesgoDesercion: riesgoDesercionRaw.map((item) => ({
        nombre: item.nombre,
        pensionesVencidas: Number(item.pensionesVencidas),
        faltas: Number(item.faltas),
      })),
    };
  }

  async getOperativas(params: AnaliticasParams) {
    const scope = await this.resolveScope(params);
    const anioIds = await this.resolveAnioIds(scope);
    const unidadContext = await this.getUnidadContext(anioIds);
    const unidadActual = unidadContext.unidadActual;
    const idsUnidades = unidadContext.idsUnidades;

    const comunicados = await this.prisma.circular.findMany({
      where: this.colegioWhere(scope),
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
            nivel: { select: { nombre_nivel: true } },
          },
        },
      },
    });

    if (!unidadActual) {
      return {
        unidadActual: null,
        cargaDocentes: [],
        comunicados,
      };
    }

    const asignaciones = await this.prisma.asignacionDocente.findMany({
      where: {
        ...this.anioWhere(anioIds),
        ...this.colegioWhere(scope),
      },
      include: {
        docente: { include: { persona: true } },
        curso: true,
        colegio: true,
        seccion: {
          include: {
            colegio: true,
            grado: { include: { nivel: true } },
          },
        },
        evaluaciones: {
          where: {
            id_unidad: { in: idsUnidades.length ? idsUnidades : [-1] },
          },
          include: {
            notas: {
              where: {
                matricula: {
                  ...this.anioWhere(anioIds),
                  ...this.colegioWhere(scope),
                  estado_matricula: 'Activo',
                },
              },
            },
          },
        },
      },
      orderBy: { id_docente: 'asc' },
    });

    const idsSecciones = Array.from(new Set(asignaciones.map((a) => a.id_seccion)));

    const alumnosPorSeccionRaw = await this.prisma.matricula.groupBy({
      by: ['id_seccion'],
      where: {
        ...this.anioWhere(anioIds),
        ...this.colegioWhere(scope),
        estado_matricula: 'Activo',
        id_seccion: { in: idsSecciones.length ? idsSecciones : [-1] },
      },
      _count: { id_matricula: true },
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
        colegios: string[];
        evaluaciones: number;
        totalEsperado: number;
        registradas: number;
        pendientes: number;
        porcentaje: number;
        estado: EstadoCarga;
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
          colegios: [],
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
      docente.secciones.push(this.formatSeccion(asignacion.seccion));

      const colegioNombre =
        asignacion.colegio?.nombre || asignacion.seccion?.colegio?.nombre || null;
      if (colegioNombre) docente.colegios.push(colegioNombre);

      docente.evaluaciones += totalEvaluaciones;
      docente.totalEsperado += totalEsperadoAsignacion;
      docente.registradas += registradasAsignacion;
    }

    const cargaDocentes = Array.from(docentesMap.values())
      .map((docente) => {
        const pendientes = Math.max(0, docente.totalEsperado - docente.registradas);
        const porcentaje = docente.totalEsperado
          ? Math.round((docente.registradas / docente.totalEsperado) * 100)
          : 0;

        let estado: EstadoCarga = 'pendiente';
        if (docente.evaluaciones === 0) estado = 'sin_evaluaciones';
        else if (porcentaje >= 100) estado = 'completo';
        else if (porcentaje >= 80) estado = 'avanzado';
        else if (porcentaje > 0) estado = 'en_proceso';
        else estado = 'pendiente';

        return {
          ...docente,
          cursos: Array.from(new Set(docente.cursos)),
          secciones: Array.from(new Set(docente.secciones)),
          colegios: Array.from(new Set(docente.colegios)),
          pendientes,
          porcentaje,
          estado,
        };
      })
      .sort((a, b) => a.porcentaje - b.porcentaje);

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
      cargaDocentes,
      comunicados,
    };
  }
}
