import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegistrarPagoDto } from './dto/registrar-pago.dto';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { Prisma } from '@prisma/client';

interface ScopeParams {
  userId: number;
  rol: string;
  scope?: string;
  colegioId?: number;
}

interface FinanzasScope {
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

@Injectable()
export class FinanzasService {
  constructor(
    private prisma: PrismaService,
    private notificacionesService: NotificacionesService,
  ) {}

  private async resolveScope(params: ScopeParams): Promise<FinanzasScope> {
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

    if (!usuario) throw new UnauthorizedException('Usuario no encontrado');

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

      if (!colegio) throw new UnauthorizedException('No tienes acceso a este colegio');

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

  private colegioWhere(scope: FinanzasScope) {
    return scope.colegioIds.length
      ? { id_colegio: { in: scope.colegioIds } }
      : { id_colegio: -1 };
  }

  private estadosAnioOperativos() {
    return ['Activo', 'Abierto', 'Matrícula abierta', 'En curso', 'Planificación'];
  }

  private normalizarTipoConcepto(value?: string | null) {
    const raw = String(value || '').trim();

    const normalizado = raw
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    const alias: Record<string, string> = {
      MATRICULA: 'MATRICULA',
      PENSION: 'PENSION',
      EXTRAORDINARIO: 'EXTRAORDINARIO',
      OTRO: 'OTRO',
      OTROS: 'OTRO',
    };

    const tipo = alias[normalizado] || '';

    if (!tipo) {
      throw new BadRequestException(
        'Tipo de concepto inválido. Usa MATRICULA, PENSION, EXTRAORDINARIO u OTRO.',
      );
    }

    return tipo;
  }

  private flagsDesdeTipoConcepto(tipoConcepto: string) {
    return {
      es_pension: tipoConcepto === 'PENSION',
      es_extraordinario: tipoConcepto === 'EXTRAORDINARIO',
    };
  }

  // ── NUEVOS HELPERS PARA PENSIONES Y DESCUENTOS ──────
  private readonly mesesEscolares = [
    { mes: 1, nombre: 'Enero' },
    { mes: 2, nombre: 'Febrero' },
    { mes: 3, nombre: 'Marzo' },
    { mes: 4, nombre: 'Abril' },
    { mes: 5, nombre: 'Mayo' },
    { mes: 6, nombre: 'Junio' },
    { mes: 7, nombre: 'Julio' },
    { mes: 8, nombre: 'Agosto' },
    { mes: 9, nombre: 'Setiembre' },
    { mes: 10, nombre: 'Octubre' },
    { mes: 11, nombre: 'Noviembre' },
    { mes: 12, nombre: 'Diciembre' },
  ];

  private getAnioCorte(anio: { fecha_inicio?: Date | string | null; nombre_anio?: string | null }) {
    if (anio.fecha_inicio) {
      const fecha = new Date(anio.fecha_inicio);
      if (!Number.isNaN(fecha.getTime())) return fecha.getFullYear();
    }

    const match = String(anio.nombre_anio || '').match(/\d{4}/);
    return match ? Number(match[0]) : new Date().getFullYear();
  }

  private crearFechaLocal(anio: number, mes: number, dia: number) {
    const ultimoDiaMes = new Date(anio, mes, 0).getDate();
    const diaSeguro = Math.min(Math.max(1, dia), ultimoDiaMes);
    return new Date(anio, mes - 1, diaSeguro);
  }

  private normalizeEmpty(value?: string | null) {
    const clean = value?.trim();
    return clean ? clean : null;
  }

  private montoProgramadoCronograma(cronograma: any) {
    return Number(cronograma.monto_programado ?? cronograma.concepto?.monto_base ?? 0);
  }

  private async calcularDescuentoGeneral(
    tx: Prisma.TransactionClient,
    params: {
      idTenant: number | null;
      idColegio: number | null;
      idAnio: number | null;
      tipoConcepto: string;
      montoBase: number;
      fechaReferencia: Date;
      matricula?: any | null;
    },
  ) {
    const fecha = new Date(
      params.fechaReferencia.getFullYear(),
      params.fechaReferencia.getMonth(),
      params.fechaReferencia.getDate(),
    );

    const campanas = await tx.campanaDescuento.findMany({
      where: {
        estado: 'Activo',
        fecha_inicio: { lte: fecha },
        fecha_fin: { gte: fecha },
        OR: [
          { id_colegio: params.idColegio || undefined },
          { id_colegio: null },
        ],
        AND: [
          {
            OR: [
              { id_anio: params.idAnio || undefined },
              { id_anio: null },
            ],
          },
          {
            OR: [
              { tipo_concepto_aplica: params.tipoConcepto },
              { tipo_concepto_aplica: null },
            ],
          },
        ],
      },
      orderBy: [{ id_colegio: 'desc' }, { id_anio: 'desc' }, { id_campana_descuento: 'desc' }],
    });

    const campana = campanas.find((item) => {
      if (item.solo_alumnos_vigentes && !params.matricula) return false;

      const tipoIngresoAplica = String(item.tipo_ingreso_aplica || '').trim();

      if (!tipoIngresoAplica) return true;

      return tipoIngresoAplica
        .split(',')
        .map((value) => value.trim())
        .includes(params.matricula?.tipo_ingreso || '');
    });

    if (!campana) {
      return {
        montoProgramado: params.montoBase,
        descuentoAplicado: 0,
        idCampanaDescuento: null as number | null,
      };
    }

    let montoProgramado = params.montoBase;

    if (campana.monto_promocional !== null && campana.monto_promocional !== undefined) {
      montoProgramado = Number(campana.monto_promocional);
    } else if (campana.descuento_monto !== null && campana.descuento_monto !== undefined) {
      montoProgramado = Math.max(params.montoBase - Number(campana.descuento_monto), 0);
    } else if (
      campana.descuento_porcentaje !== null &&
      campana.descuento_porcentaje !== undefined
    ) {
      const porcentaje = Number(campana.descuento_porcentaje);
      montoProgramado = Math.max(params.montoBase - (params.montoBase * porcentaje) / 100, 0);
    }

    return {
      montoProgramado,
      descuentoAplicado: Math.max(params.montoBase - montoProgramado, 0),
      idCampanaDescuento: campana.id_campana_descuento,
    };
  }

  // ── FIN NUEVOS HELPERS ────────────────────────────

  private async getAniosActivos(scope: FinanzasScope) {
    if (!scope.colegioIds.length) return [];

    const anios = await this.prisma.anioLectivo.findMany({
      where: {
        id_colegio: { in: scope.colegioIds },
        estado: { in: this.estadosAnioOperativos() },
      },
      orderBy: { id_anio: 'asc' },
    });

    if (anios.length) return anios;

    return this.prisma.anioLectivo.findMany({
      where: { id_colegio: { in: scope.colegioIds } },
      orderBy: { id_anio: 'asc' },
    });
  }

  private async getAnioIds(scope: FinanzasScope) {
    const anios = await this.getAniosActivos(scope);
    return anios.map((anio) => anio.id_anio);
  }

  private anioWhere(anioIds: number[]) {
    return anioIds.length ? { id_anio: { in: anioIds } } : { id_anio: -1 };
  }

  async getTesoreriaKpis(params: ScopeParams) {
    const scope = await this.resolveScope(params);
    const anioIds = await this.getAnioIds(scope);

    const filtroMatricula = {
      ...this.anioWhere(anioIds),
      ...this.colegioWhere(scope),
      estado_matricula: 'Activo',
    };

    const recaudadoHoyRaw = await this.prisma.$queryRaw<{ total: string }[]>(
      Prisma.sql`
        SELECT COALESCE(SUM(pt.monto_pagado), 0) AS total
        FROM PagoTransaccion pt
        JOIN CronogramaPagos cp ON pt.id_cronograma = cp.id_cronograma
        JOIN Matricula m ON cp.id_matricula = m.id_matricula
        WHERE DATE(pt.fecha_pago) = CURDATE()
          AND m.id_anio IN (${Prisma.join(anioIds.length ? anioIds : [-1])})
          AND m.id_colegio IN (${Prisma.join(scope.colegioIds.length ? scope.colegioIds : [-1])})
      `,
    );

    const vencidosRaw = await this.prisma.$queryRaw<{ total: string }[]>(
      Prisma.sql`
        SELECT COALESCE(
          SUM(GREATEST(COALESCE(cp.monto_programado, con.monto_base) - COALESCE(pagos.total_pagado, 0), 0))
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
        WHERE m.id_anio IN (${Prisma.join(anioIds.length ? anioIds : [-1])})
          AND m.id_colegio IN (${Prisma.join(scope.colegioIds.length ? scope.colegioIds : [-1])})
          AND m.estado_matricula = 'Activo'
          AND cp.estado_pago <> 'Pagado'
          AND cp.fecha_vencimiento < CURDATE()
      `,
    );

    const proximos48h = await this.prisma.cronogramaPagos.count({
      where: {
        estado_pago: { not: 'Pagado' },
        matricula: filtroMatricula,
        fecha_vencimiento: {
          gte: new Date(),
          lt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        },
      },
    });

    const pendientes = await this.prisma.cronogramaPagos.count({
      where: {
        estado_pago: { in: ['Pendiente', 'Vencido'] },
        matricula: filtroMatricula,
      },
    });

    return {
      scope: {
        tipo: scope.tipo,
        colegioIds: scope.colegioIds,
      },
      recaudadoHoy: Number(recaudadoHoyRaw[0]?.total ?? 0),
      vencidosDelMes: Number(vencidosRaw[0]?.total ?? 0),
      proximos48h,
      pagosPendientes: pendientes,
    };
  }

  async getEstadoCuenta(matriculaId: number, params?: ScopeParams) {
    const matricula = await this.prisma.matricula.findUnique({
      where: { id_matricula: matriculaId },
      include: {
        colegio: true,
        estudiante: { include: { persona: true } },
        cronogramas: {
          include: { concepto: true, pagos: true },
          orderBy: { fecha_vencimiento: 'asc' },
        },
      },
    });

    if (!matricula) throw new NotFoundException('Matrícula no encontrada');

    if (params) {
      const scope = await this.resolveScope(params);
      if (!scope.colegioIds.includes(matricula.id_colegio || -1)) {
        throw new UnauthorizedException('No tienes acceso a esta matrícula');
      }
    }

    const deudas = matricula.cronogramas.map((cron) => {
      const totalPagado = cron.pagos.reduce(
        (total, pago) => total + Number(pago.monto_pagado),
        0,
      );
      const montoProgramado = this.montoProgramadoCronograma(cron);
      const saldo = Math.max(0, montoProgramado - totalPagado);

      return {
        id_cronograma: cron.id_cronograma,
        concepto: cron.concepto.nombre_concepto,
        fecha_vencimiento: cron.fecha_vencimiento,
        monto_base: Number(cron.concepto.monto_base),
        monto_base_original: cron.monto_base_original ? Number(cron.monto_base_original) : Number(cron.concepto.monto_base),
        descuento_aplicado: Number(cron.descuento_aplicado || 0),
        monto_programado: montoProgramado,
        total_pagado: totalPagado,
        saldo,
        estado: cron.estado_pago,
        estado_publicacion: cron.estado_publicacion,
        visible_apoderado: cron.visible_apoderado,
        fecha_publicacion: cron.fecha_publicacion,
        pagos: cron.pagos.map((p) => ({
          monto: Number(p.monto_pagado),
          fecha: p.fecha_pago,
          metodo: p.metodo_pago,
        })),
      };
    });

    const totalPendiente = deudas
      .filter((d) => d.estado === 'Pendiente' || d.estado === 'Vencido')
      .reduce((sum, d) => sum + d.saldo, 0);

    return {
      id_matricula: matricula.id_matricula,
      id_colegio: matricula.id_colegio,
      colegio: matricula.colegio?.nombre || null,
      alumno: matricula.estudiante
        ? `${matricula.estudiante.persona.nombres} ${matricula.estudiante.persona.apellido_paterno}`.trim()
        : null,
      estado_matricula: matricula.estado_matricula,
      deudas,
      total_pendiente: totalPendiente,
    };
  }

  async registrarPago(dto: RegistrarPagoDto, cajeroId: number, params?: ScopeParams) {
    const matricula = await this.prisma.matricula.findUnique({
      where: { id_matricula: dto.id_matricula },
    });
    if (!matricula) throw new NotFoundException('Matrícula no encontrada');

    if (params) {
      const scope = await this.resolveScope(params);
      if (!scope.colegioIds.includes(matricula.id_colegio || -1)) {
        throw new UnauthorizedException('No tienes acceso a esta matrícula');
      }
    }

    const apoderado = await this.prisma.apoderado.findUnique({
      where: { id_persona: dto.id_apoderado },
    });
    if (!apoderado) throw new NotFoundException('Apoderado no encontrado');

    const resultados: {
      id_transaccion: number;
      concepto: string;
      monto_pagado: number;
      nuevo_estado: string;
    }[] = [];

    for (const pagoItem of dto.pagos) {
      const cronograma = await this.prisma.cronogramaPagos.findUnique({
        where: { id_cronograma: pagoItem.id_cronograma },
        include: { concepto: true, pagos: true },
      });

      if (!cronograma) {
        throw new NotFoundException(`Cronograma con id ${pagoItem.id_cronograma} no encontrado`);
      }
      if (cronograma.id_matricula !== dto.id_matricula) {
        throw new BadRequestException('El cronograma no pertenece a la matrícula indicada');
      }
      if (cronograma.estado_pago === 'Pagado') {
        throw new BadRequestException('La deuda ya está pagada');
      }

      if (cronograma.concepto.es_pension) {
        const conceptoMatricula = await this.prisma.conceptoPago.findFirst({
          where: {
            id_anio: matricula.id_anio,
            id_colegio: matricula.id_colegio,
            es_pension: false,
            es_extraordinario: false,
          },
        });
        if (conceptoMatricula) {
          const matriculaCronograma = await this.prisma.cronogramaPagos.findFirst({
            where: {
              id_matricula: dto.id_matricula,
              id_concepto: conceptoMatricula.id_concepto,
            },
          });
          if (matriculaCronograma && matriculaCronograma.estado_pago !== 'Pagado') {
            throw new BadRequestException('Debe pagar la matrícula antes de registrar otras deudas');
          }
        }
      }

      const totalPagado = cronograma.pagos.reduce(
        (total, pago) => total + Number(pago.monto_pagado),
        0,
      );
      const montoProgramado = this.montoProgramadoCronograma(cronograma);
      const saldo = Math.max(0, montoProgramado - totalPagado);
      const montoAPagar = pagoItem.monto_pagado && pagoItem.monto_pagado > 0 ? pagoItem.monto_pagado : saldo;

      if (montoAPagar <= 0) throw new BadRequestException('Monto debe ser mayor a 0');
      if (montoAPagar > saldo) throw new BadRequestException('Monto excede el saldo pendiente');

      const transaccion = await this.prisma.pagoTransaccion.create({
        data: {
          id_cronograma: pagoItem.id_cronograma,
          id_apoderado: dto.id_apoderado,
          id_usuario_cajero: cajeroId,
          monto_pagado: montoAPagar,
          metodo_pago: dto.metodo_pago,
          nro_operacion: dto.nro_operacion,
          fecha_pago: dto.fecha_pago ? new Date(dto.fecha_pago) : new Date(),
        },
      });

      const nuevoEstado = montoAPagar >= saldo ? 'Pagado' : cronograma.estado_pago;
      await this.prisma.cronogramaPagos.update({
        where: { id_cronograma: pagoItem.id_cronograma },
        data: { estado_pago: nuevoEstado },
      });

      resultados.push({
        id_transaccion: transaccion.id_transaccion,
        concepto: cronograma.concepto.nombre_concepto,
        monto_pagado: montoAPagar,
        nuevo_estado: nuevoEstado,
      });
    }

    return { message: 'Pagos registrados correctamente', pagos: resultados };
  }

  async getEstadoCuentaPadre(estudianteId: number) {
    const matriculaActiva = await this.prisma.matricula.findFirst({
      where: { id_estudiante: estudianteId, estado_matricula: 'Activo' },
      orderBy: { id_matricula: 'desc' },
    });
    if (!matriculaActiva) throw new NotFoundException('No se encontró matrícula activa');

    const estado = await this.getEstadoCuenta(matriculaActiva.id_matricula);

    const deudasVisibles = estado.deudas.filter((deuda: any) => deuda.visible_apoderado);

    return {
      ...estado,
      deudas: deudasVisibles,
      total_pendiente: deudasVisibles
        .filter((deuda: any) => deuda.estado === 'Pendiente' || deuda.estado === 'Vencido')
        .reduce((sum: number, deuda: any) => sum + deuda.saldo, 0),
    };
  }

  async getPagosPendientesCount(params: ScopeParams) {
    const scope = await this.resolveScope(params);
    const anioIds = await this.getAnioIds(scope);

    return this.prisma.cronogramaPagos.count({
      where: {
        estado_pago: { in: ['Pendiente', 'Vencido'] },
        matricula: {
          ...this.anioWhere(anioIds),
          ...this.colegioWhere(scope),
          estado_matricula: 'Activo',
        },
      },
    });
  }

  async getDestinatariosPagoExtraordinario(params: ScopeParams) {
    const scope = await this.resolveScope(params);
    const anioIds = await this.getAnioIds(scope);

    const [colegios, niveles, secciones] = await Promise.all([
      Promise.resolve(scope.colegios),
      this.prisma.nivel.findMany({
        where: {
          colegios: {
            some: {
              id_colegio: { in: scope.colegioIds.length ? scope.colegioIds : [-1] },
            },
          },
        },
        orderBy: { id_nivel: 'asc' },
      }),
      this.prisma.seccion.findMany({
        where: {
          ...this.colegioWhere(scope),
        },
        include: {
          colegio: true,
          aula: true,
          grado: { include: { nivel: true } },
          matriculas: {
            where: {
              ...this.anioWhere(anioIds),
              estado_matricula: 'Activo',
            },
          },
        },
        orderBy: [{ id_colegio: 'asc' }, { id_grado: 'asc' }, { letra: 'asc' }],
      }),
    ]);

    return {
      scope: { tipo: scope.tipo, colegioIds: scope.colegioIds },
      colegios,
      niveles,
      secciones: secciones.map((sec) => ({
        id_seccion: sec.id_seccion,
        id_colegio: sec.id_colegio,
        colegio: sec.colegio,
        letra: sec.letra,
        grado: sec.grado,
        aula: sec.aula,
        matriculas: sec.matriculas,
        capacidad: sec.aula.capacidad,
        matriculados: sec.matriculas.length,
        disponibles: sec.aula.capacidad - sec.matriculas.length,
      })),
    };
  }

  async crearPagoExtraordinario(dto: any, params: ScopeParams) {
    const scope = await this.resolveScope(params);

    const targetColegioIds =
      dto.aplicar_todos || dto.scope === 'all'
        ? scope.colegioIds
        : dto.id_colegio
          ? [Number(dto.id_colegio)]
          : scope.tipo === 'colegio'
            ? scope.colegioIds
            : [];

    if (!targetColegioIds.length) {
      throw new BadRequestException('Selecciona el colegio destino para el cobro');
    }

    for (const idColegio of targetColegioIds) {
      if (!scope.colegioIds.includes(idColegio)) {
        throw new UnauthorizedException('No tienes acceso a uno de los colegios seleccionados');
      }
    }

    if (!dto.nombre_concepto?.trim()) {
      throw new BadRequestException('Ingresa el nombre del concepto');
    }

    const monto = Number(dto.monto);
    if (!Number.isFinite(monto) || monto <= 0) {
      throw new BadRequestException('Ingresa un monto válido');
    }

    const anios = await this.prisma.anioLectivo.findMany({
      where: {
        id_colegio: { in: targetColegioIds },
        estado: { in: this.estadosAnioOperativos() },
      },
      orderBy: { id_anio: 'asc' },
    });

    if (!anios.length) throw new BadRequestException('No hay año lectivo activo');

    const fechaVencimiento = dto.fecha_vencimiento
      ? new Date(dto.fecha_vencimiento)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    let totalCreados = 0;
    const conceptosCreados: number[] = [];

    for (const anio of anios) {
      const idsEstudiantes = new Set<number>();

      if (dto.estudiantes?.length) {
        for (const id of dto.estudiantes) idsEstudiantes.add(Number(id));
      }

      if (dto.niveles?.length) {
        const matriculasNivel = await this.prisma.matricula.findMany({
          where: {
            id_anio: anio.id_anio,
            id_colegio: anio.id_colegio,
            estado_matricula: 'Activo',
            seccion: { grado: { id_nivel: { in: dto.niveles.map(Number) } } },
          },
          select: { id_estudiante: true },
        });
        for (const m of matriculasNivel) idsEstudiantes.add(m.id_estudiante);
      }

      if (dto.secciones?.length) {
        const matriculasSeccion = await this.prisma.matricula.findMany({
          where: {
            id_anio: anio.id_anio,
            id_colegio: anio.id_colegio,
            estado_matricula: 'Activo',
            id_seccion: { in: dto.secciones.map(Number) },
          },
          select: { id_estudiante: true },
        });
        for (const m of matriculasSeccion) idsEstudiantes.add(m.id_estudiante);
      }

      if (idsEstudiantes.size === 0) continue;

      const concepto = await this.prisma.conceptoPago.create({
        data: {
          id_tenant: anio.id_tenant,
          id_colegio: anio.id_colegio,
          nombre_concepto: dto.nombre_concepto.trim(),
          monto_base: monto,
          id_anio: anio.id_anio,
          es_pension: false,
          es_extraordinario: true,
        },
      });
      conceptosCreados.push(concepto.id_concepto);

      const matriculas = await this.prisma.matricula.findMany({
        where: {
          id_estudiante: { in: Array.from(idsEstudiantes) },
          estado_matricula: 'Activo',
          id_anio: anio.id_anio,
          id_colegio: anio.id_colegio,
        },
        select: { id_matricula: true, id_estudiante: true },
      });

      for (const mat of matriculas) {
        const nuevoCronograma = await this.prisma.cronogramaPagos.create({
          data: {
            id_matricula: mat.id_matricula,
            id_concepto: concepto.id_concepto,
            fecha_vencimiento: fechaVencimiento,
            estado_pago: 'Pendiente',
          },
        });
        totalCreados++;

        const estudiante = await this.prisma.estudiante.findUnique({
          where: { id_persona: mat.id_estudiante },
          include: { persona: true },
        });
        const nombreEstudiante = estudiante
          ? `${estudiante.persona.nombres} ${estudiante.persona.apellido_paterno}`
          : 'su hijo';

        await this.notificacionesService.notificarApoderadosDeAlumno(
          mat.id_estudiante,
          'administrativa',
          'Nuevo pago pendiente',
          `Nuevo pago para ${nombreEstudiante}: "${dto.nombre_concepto}" por S/ ${monto.toFixed(2)}.`,
          `/dashboard/pagos?alumno_id=${mat.id_estudiante}&cronograma_id=${nuevoCronograma.id_cronograma}`,
        );
      }
    }

    if (totalCreados === 0) {
      throw new BadRequestException('No se encontraron estudiantes para asignar el cobro');
    }

    return {
      message: `Concepto creado y ${totalCreados} cronogramas generados`,
      conceptos: conceptosCreados,
      total_afectados: totalCreados,
      colegios_afectados: targetColegioIds.length,
    };
  }

  // ── PLAN DE PENSIONES ──────────────────────────────
  async crearPlanPensiones(dto: any, params: ScopeParams) {
    const scope = await this.resolveScope(params);

    if (scope.tipo !== 'colegio' || scope.colegioIds.length !== 1) {
      throw new BadRequestException('Selecciona un colegio específico para crear el cronograma de pensiones.');
    }

    const idColegio = scope.colegioIds[0];
    const idAnio = Number(dto.id_anio);
    const montoMensual = Number(dto.monto_mensual);
    const mesInicio = Number(dto.mes_inicio || 3);
    const mesFin = Number(dto.mes_fin || 12);
    const diaPublicacion = Number(dto.dia_publicacion || 1);
    const diaVencimiento = Number(dto.dia_vencimiento || 5);

    if (!Number.isFinite(montoMensual) || montoMensual <= 0) {
      throw new BadRequestException('Ingresa un monto mensual válido.');
    }

    if (mesInicio < 1 || mesFin > 12 || mesInicio > mesFin) {
      throw new BadRequestException('Rango de meses inválido.');
    }

    const anio = await this.prisma.anioLectivo.findFirst({
      where: { id_anio: idAnio, id_colegio: idColegio },
    });

    if (!anio) {
      throw new BadRequestException('El año lectivo no pertenece al colegio seleccionado.');
    }

    const existente = await this.prisma.planPensiones.findFirst({
      where: {
        id_colegio: idColegio,
        id_anio: idAnio,
        estado: 'Activo',
      },
    });

    if (existente) {
      throw new BadRequestException('Ya existe un cronograma de pensiones activo para este colegio y año.');
    }

    const anioNumero = this.getAnioCorte(anio);
    const colegio = scope.colegios[0];

    return this.prisma.$transaction(async (tx) => {
      const plan = await tx.planPensiones.create({
        data: {
          id_tenant: scope.tenantId,
          id_colegio: idColegio,
          id_anio: idAnio,
          nombre: dto.nombre || `Pensiones ${anioNumero}`,
          monto_mensual: montoMensual,
          mes_inicio: mesInicio,
          mes_fin: mesFin,
          dia_publicacion: diaPublicacion,
          dia_vencimiento: diaVencimiento,
          estado: 'Activo',
        },
      });

      const detalles: any[] = [];

      for (let mes = mesInicio; mes <= mesFin; mes++) {
        const mesInfo = this.mesesEscolares.find((item) => item.mes === mes);
        const nombreMes = mesInfo?.nombre || `Mes ${mes}`;
        const nombreConcepto = `Pensión ${nombreMes} ${anioNumero}`;
        const fechaPublicacion = this.crearFechaLocal(anioNumero, mes, diaPublicacion);
        const fechaVencimiento = this.crearFechaLocal(anioNumero, mes, diaVencimiento);

        const concepto = await tx.conceptoPago.create({
          data: {
            id_tenant: scope.tenantId,
            id_colegio: idColegio,
            id_anio: idAnio,
            nombre_concepto: nombreConcepto,
            monto_base: montoMensual,
            tipo_concepto: 'PENSION',
            es_pension: true,
            es_extraordinario: false,
          },
        });

        const detalle = await tx.planPensionesDetalle.create({
          data: {
            id_plan_pension: plan.id_plan_pension,
            id_concepto: concepto.id_concepto,
            mes,
            nombre_mes: nombreMes,
            fecha_publicacion: fechaPublicacion,
            fecha_vencimiento: fechaVencimiento,
            monto_base: montoMensual,
            estado: 'Programado',
          },
          include: { concepto: true },
        });

        detalles.push(detalle);
      }

      return {
        message: 'Cronograma base de pensiones creado correctamente.',
        colegio,
        anio,
        plan,
        detalles,
      };
    });
  }

  // ── CONCEPTOS ──────────────────────────────────────
  async getConceptos(params: ScopeParams) {
    const scope = await this.resolveScope(params);
    const anioIds = await this.getAnioIds(scope);

    return this.prisma.conceptoPago.findMany({
      where: {
        ...this.anioWhere(anioIds),
        ...this.colegioWhere(scope),
      },
      include: { colegio: true, anio: true },
      orderBy: [{ id_colegio: 'asc' }, { nombre_concepto: 'asc' }],
    });
  }

  async createConcepto(body: any, params: ScopeParams) {
    const scope = await this.resolveScope(params);

    const colegioId = body.id_colegio
      ? Number(body.id_colegio)
      : scope.tipo === 'colegio'
        ? scope.colegioIds[0]
        : null;

    if (!colegioId || !scope.colegioIds.includes(colegioId)) {
      throw new BadRequestException('Selecciona un colegio válido');
    }

    const anioId = body.id_anio ? Number(body.id_anio) : null;

    if (!anioId) {
      throw new BadRequestException('Selecciona el año lectivo del concepto.');
    }

    const anio = await this.prisma.anioLectivo.findFirst({
      where: {
        id_anio: anioId,
        id_colegio: colegioId,
        estado: { in: this.estadosAnioOperativos() },
      },
    });

    if (!anio) {
      throw new BadRequestException(
        'El año lectivo seleccionado no está disponible para registrar conceptos.',
      );
    }

    const nombre = String(body.nombre_concepto || '').trim();
    const monto = Number(body.monto_base);

    if (!nombre) {
      throw new BadRequestException('Ingresa el nombre del concepto.');
    }

    if (!Number.isFinite(monto) || monto <= 0) {
      throw new BadRequestException('Ingresa un monto válido mayor a cero.');
    }

    const tipoConcepto = this.normalizarTipoConcepto(
      body.tipo_concepto ||
        (body.es_extraordinario
          ? 'EXTRAORDINARIO'
          : body.es_pension
            ? 'PENSION'
            : 'MATRICULA'),
    );

    const flags = this.flagsDesdeTipoConcepto(tipoConcepto);

    const duplicado = await this.prisma.conceptoPago.findFirst({
      where: {
        id_anio: anio.id_anio,
        id_colegio: colegioId,
        tipo_concepto: tipoConcepto,
        nombre_concepto: nombre,
      },
    });

    if (duplicado) {
      throw new BadRequestException(
        'Ya existe un concepto con ese nombre para el colegio y año lectivo seleccionado.',
      );
    }

    return this.prisma.conceptoPago.create({
      data: {
        id_tenant: anio.id_tenant,
        id_colegio: colegioId,
        nombre_concepto: nombre,
        monto_base: monto,
        id_anio: anio.id_anio,
        es_pension: flags.es_pension,
        es_extraordinario: flags.es_extraordinario,
        tipo_concepto: tipoConcepto,
      },
      include: {
        colegio: true,
        anio: true,
      },
    });
  }

  async updateConcepto(id: number, body: any) {
    const concepto = await this.prisma.conceptoPago.findUnique({
      where: { id_concepto: id },
    });

    if (!concepto) {
      throw new NotFoundException('Concepto no encontrado');
    }

    const data: any = {};

    let tipoConceptoFinal: string | undefined;

    if (body.nombre_concepto !== undefined) {
      const nombre = String(body.nombre_concepto || '').trim();

      if (!nombre) {
        throw new BadRequestException('Ingresa el nombre del concepto.');
      }

      data.nombre_concepto = nombre;
    }

    if (body.monto_base !== undefined) {
      const monto = Number(body.monto_base);

      if (!Number.isFinite(monto) || monto <= 0) {
        throw new BadRequestException('Ingresa un monto válido mayor a cero.');
      }

      data.monto_base = monto;
    }

    if (body.es_pension !== undefined) data.es_pension = Boolean(body.es_pension);
    if (body.es_extraordinario !== undefined) data.es_extraordinario = Boolean(body.es_extraordinario);

    if (body.tipo_concepto !== undefined) {
      tipoConceptoFinal = this.normalizarTipoConcepto(body.tipo_concepto);
      const flags = this.flagsDesdeTipoConcepto(tipoConceptoFinal);

      data.tipo_concepto = tipoConceptoFinal;
      data.es_pension = flags.es_pension;
      data.es_extraordinario = flags.es_extraordinario;
    }

    if (body.id_colegio !== undefined) data.id_colegio = Number(body.id_colegio);
    if (body.id_anio !== undefined) data.id_anio = Number(body.id_anio);

    const colegioFinal = data.id_colegio ?? concepto.id_colegio;
    const anioFinal = data.id_anio ?? concepto.id_anio;
    const nombreFinal = data.nombre_concepto ?? concepto.nombre_concepto;
    const tipoFinal =
      data.tipo_concepto ??
      (concepto as any).tipo_concepto ??
      (concepto.es_extraordinario
        ? 'EXTRAORDINARIO'
        : concepto.es_pension
          ? 'PENSION'
          : 'MATRICULA');

    const duplicado = await this.prisma.conceptoPago.findFirst({
      where: {
        id_concepto: { not: id },
        id_anio: anioFinal,
        id_colegio: colegioFinal,
        tipo_concepto: tipoFinal,
        nombre_concepto: nombreFinal,
      },
    });

    if (duplicado) {
      throw new BadRequestException(
        'Ya existe un concepto con ese nombre para el colegio y año lectivo seleccionado.',
      );
    }

    return this.prisma.conceptoPago.update({
      where: { id_concepto: id },
      data,
      include: {
        colegio: true,
        anio: true,
      },
    });
  }

  async deleteConcepto(id: number) {
    return this.prisma.conceptoPago.delete({ where: { id_concepto: id } });
  }

  async procesarPagoExterno(data: any) {
    return { message: 'Pago externo procesado (simulación)' };
  }

  // ── MÉTODOS ADICIONALES PARA PLANES Y DESCUENTOS ──
  async listarPlanesPensiones(params: ScopeParams & { idAnio?: number }) {
    const scope = await this.resolveScope(params);

    return this.prisma.planPensiones.findMany({
      where: {
        ...this.colegioWhere(scope),
        ...(params.idAnio ? { id_anio: params.idAnio } : {}),
      },
      include: {
        colegio: true,
        anio: true,
        detalles: {
          include: { concepto: true },
          orderBy: { mes: 'asc' },
        },
      },
      orderBy: [{ id_anio: 'desc' }, { id_plan_pension: 'desc' }],
    });
  }

  async generarCronogramaPensionesMatricula(
    matriculaId: number,
    params: ScopeParams,
  ) {
    const scope = await this.resolveScope(params);

    const matricula = await this.prisma.matricula.findFirst({
      where: {
        id_matricula: matriculaId,
        ...this.colegioWhere(scope),
      },
      include: {
        anio: true,
        colegio: true,
      },
    });

    if (!matricula) throw new NotFoundException('Matrícula no encontrada.');

    if (!['Activo', 'Pre-matriculado'].includes(matricula.estado_matricula)) {
      throw new BadRequestException('Solo puedes generar cronograma para matrículas activas o pre-matriculadas.');
    }

    const plan = await this.prisma.planPensiones.findFirst({
      where: {
        id_colegio: matricula.id_colegio || undefined,
        id_anio: matricula.id_anio,
        estado: 'Activo',
      },
      include: {
        detalles: {
          include: { concepto: true },
          orderBy: { mes: 'asc' },
        },
      },
    });

    if (!plan) {
      throw new BadRequestException('No existe cronograma base de pensiones para este colegio y año.');
    }

    const hoy = new Date();

    return this.prisma.$transaction(async (tx) => {
      let creados = 0;

      for (const detalle of plan.detalles) {
        const existe = await tx.cronogramaPagos.findFirst({
          where: {
            id_matricula: matricula.id_matricula,
            id_concepto: detalle.id_concepto,
          },
        });

        if (existe) continue;

        const publicado = detalle.fecha_publicacion <= hoy;
        const descuento = await this.calcularDescuentoGeneral(tx, {
          idTenant: matricula.id_tenant || scope.tenantId,
          idColegio: matricula.id_colegio,
          idAnio: matricula.id_anio,
          tipoConcepto: 'PENSION',
          montoBase: Number(detalle.monto_base),
          fechaReferencia: detalle.fecha_publicacion,
          matricula,
        });

        await tx.cronogramaPagos.create({
          data: {
            id_matricula: matricula.id_matricula,
            id_concepto: detalle.id_concepto,
            id_plan_pension_detalle: detalle.id_plan_detalle,
            fecha_vencimiento: detalle.fecha_vencimiento,
            estado_pago: publicado
              ? detalle.fecha_vencimiento < hoy
                ? 'Vencido'
                : 'Pendiente'
              : 'Programado',
            monto_base_original: Number(detalle.monto_base),
            descuento_aplicado: descuento.descuentoAplicado,
            monto_programado: descuento.montoProgramado,
            id_campana_descuento: descuento.idCampanaDescuento,
            estado_publicacion: publicado ? 'Publicado' : 'Programado',
            fecha_publicacion: detalle.fecha_publicacion,
            fecha_publicado: publicado ? new Date() : null,
            visible_apoderado: publicado,
          },
        });

        creados += 1;
      }

      return {
        message: 'Cronograma de pensiones generado para la matrícula.',
        id_matricula: matricula.id_matricula,
        total_creados: creados,
      };
    });
  }

  async publicarPensionesMes(
    params: ScopeParams & {
      idAnio: number;
      mes: number;
    },
  ) {
    const scope = await this.resolveScope(params);

    if (scope.tipo !== 'colegio' || scope.colegioIds.length !== 1) {
      throw new BadRequestException('Selecciona un colegio específico para publicar pensiones.');
    }

    const idColegio = scope.colegioIds[0];

    const plan = await this.prisma.planPensiones.findFirst({
      where: {
        id_colegio: idColegio,
        id_anio: params.idAnio,
        estado: 'Activo',
      },
      include: {
        detalles: {
          where: { mes: params.mes },
          include: { concepto: true },
        },
      },
    });

    if (!plan || !plan.detalles.length) {
      throw new BadRequestException('No existe pensión programada para ese mes.');
    }

    const detalle = plan.detalles[0];
    const matriculas = await this.prisma.matricula.findMany({
      where: {
        id_colegio: idColegio,
        id_anio: params.idAnio,
        estado_matricula: 'Activo',
      },
    });

    const hoy = new Date();

    return this.prisma.$transaction(async (tx) => {
      let creados = 0;
      let publicados = 0;

      for (const matricula of matriculas) {
        let cronograma = await tx.cronogramaPagos.findFirst({
          where: {
            id_matricula: matricula.id_matricula,
            id_concepto: detalle.id_concepto,
          },
        });

        if (!cronograma) {
          const descuento = await this.calcularDescuentoGeneral(tx, {
            idTenant: matricula.id_tenant || scope.tenantId,
            idColegio: matricula.id_colegio,
            idAnio: matricula.id_anio,
            tipoConcepto: 'PENSION',
            montoBase: Number(detalle.monto_base),
            fechaReferencia: hoy,
            matricula,
          });

          await tx.cronogramaPagos.create({
            data: {
              id_matricula: matricula.id_matricula,
              id_concepto: detalle.id_concepto,
              id_plan_pension_detalle: detalle.id_plan_detalle,
              fecha_vencimiento: detalle.fecha_vencimiento,
              estado_pago: detalle.fecha_vencimiento < hoy ? 'Vencido' : 'Pendiente',
              monto_base_original: Number(detalle.monto_base),
              descuento_aplicado: descuento.descuentoAplicado,
              monto_programado: descuento.montoProgramado,
              id_campana_descuento: descuento.idCampanaDescuento,
              estado_publicacion: 'Publicado',
              fecha_publicacion: detalle.fecha_publicacion,
              fecha_publicado: new Date(),
              visible_apoderado: true,
            },
          });

          creados += 1;
        } else if (cronograma.estado_publicacion !== 'Publicado') {
          await tx.cronogramaPagos.update({
            where: { id_cronograma: cronograma.id_cronograma },
            data: {
              estado_publicacion: 'Publicado',
              visible_apoderado: true,
              fecha_publicado: new Date(),
              estado_pago: detalle.fecha_vencimiento < hoy ? 'Vencido' : 'Pendiente',
            },
          });

          publicados += 1;
        }
      }

      await tx.planPensionesDetalle.update({
        where: { id_plan_detalle: detalle.id_plan_detalle },
        data: { estado: 'Publicado' },
      });

      return {
        message: 'Pensiones publicadas correctamente.',
        mes: detalle.nombre_mes,
        total_matriculas: matriculas.length,
        creados,
        publicados,
      };
    });
  }

  async crearCampanaDescuento(dto: any, params: ScopeParams) {
    const scope = await this.resolveScope(params);

    const idColegio =
      dto.id_colegio || (scope.tipo === 'colegio' ? scope.colegioIds[0] : null);

    if (idColegio && !scope.colegioIds.includes(Number(idColegio))) {
      throw new UnauthorizedException('No tienes acceso al colegio seleccionado.');
    }

    const fechaInicio = new Date(`${dto.fecha_inicio}T00:00:00`);
    const fechaFin = new Date(`${dto.fecha_fin}T00:00:00`);

    if (Number.isNaN(fechaInicio.getTime()) || Number.isNaN(fechaFin.getTime())) {
      throw new BadRequestException('Las fechas no son válidas.');
    }

    if (fechaFin < fechaInicio) {
      throw new BadRequestException('La fecha fin no puede ser anterior a la fecha inicio.');
    }

    if (
      dto.monto_promocional === undefined &&
      dto.descuento_monto === undefined &&
      dto.descuento_porcentaje === undefined
    ) {
      throw new BadRequestException('Ingresa monto promocional, descuento fijo o porcentaje.');
    }

    return this.prisma.campanaDescuento.create({
      data: {
        id_tenant: scope.tenantId,
        id_colegio: idColegio ? Number(idColegio) : null,
        id_anio: dto.id_anio ? Number(dto.id_anio) : null,
        nombre: dto.nombre,
        descripcion: this.normalizeEmpty(dto.descripcion),
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        tipo_concepto_aplica: dto.tipo_concepto_aplica
          ? this.normalizarTipoConcepto(dto.tipo_concepto_aplica)
          : null,
        tipo_ingreso_aplica: this.normalizeEmpty(dto.tipo_ingreso_aplica),
        monto_promocional:
          dto.monto_promocional !== undefined ? Number(dto.monto_promocional) : undefined,
        descuento_monto:
          dto.descuento_monto !== undefined ? Number(dto.descuento_monto) : undefined,
        descuento_porcentaje:
          dto.descuento_porcentaje !== undefined ? Number(dto.descuento_porcentaje) : undefined,
        solo_alumnos_vigentes: dto.solo_alumnos_vigentes ?? false,
        estado: dto.estado || 'Activo',
      },
      include: {
        colegio: true,
        anio: true,
      },
    });
  }

  async listarCampanasDescuento(params: ScopeParams & { idAnio?: number }) {
    const scope = await this.resolveScope(params);

    return this.prisma.campanaDescuento.findMany({
      where: {
        OR: [
          { id_colegio: { in: scope.colegioIds } },
          { id_colegio: null, id_tenant: scope.tenantId },
        ],
        ...(params.idAnio ? { id_anio: params.idAnio } : {}),
      },
      include: {
        colegio: true,
        anio: true,
      },
      orderBy: [{ fecha_inicio: 'desc' }, { id_campana_descuento: 'desc' }],
    });
  }
}