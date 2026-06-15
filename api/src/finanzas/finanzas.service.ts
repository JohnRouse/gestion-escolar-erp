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

  // ── HELPERS PARA PENSIONES Y DESCUENTOS ──────
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
      const esAlumnoVigente =
        Boolean(params.matricula?.id_matricula_origen) ||
        Boolean(params.matricula?.id_colegio_origen) ||
        Boolean(params.matricula?.id_anio_origen) ||
        Boolean(params.matricula?.tipo_proceso_matricula);

      if (item.solo_alumnos_vigentes && !esAlumnoVigente) return false;

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

  // ── NUEVOS HELPERS PARA REFERENCIAS DE PAGO ──────────
  private getPrefijoColegioPago(colegio?: { codigo?: string | null; nombre_corto?: string | null; id_colegio?: number } | null) {
    const raw = colegio?.codigo || colegio?.nombre_corto || (colegio?.id_colegio ? `COL${colegio.id_colegio}` : 'COL');
    return String(raw).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'COL';
  }

  private async generarReferenciaPago(tx: Prisma.TransactionClient, params: { colegio?: any | null; anio: number }) {
    const prefijo = `${this.getPrefijoColegioPago(params.colegio)}-PG-${params.anio}`;
    const existentes = await tx.cronogramaPagos.count({ where: { referencia_pago: { startsWith: `${prefijo}-` } } });

    for (let offset = 1; offset <= 1000; offset += 1) {
      const referencia = `${prefijo}-${String(existentes + offset).padStart(6, '0')}`;
      const existe = await tx.cronogramaPagos.findUnique({ where: { referencia_pago: referencia }, select: { id_cronograma: true } });
      if (!existe) return referencia;
    }

    throw new BadRequestException('No se pudo generar una referencia de pago disponible.');
  }

  private saldoCronograma(cronograma: any) {
    const monto = this.montoProgramadoCronograma(cronograma);
    const pagado = (cronograma.pagos || []).reduce((sum: number, pago: any) => sum + Number(pago.monto_pagado || 0), 0);
    return { monto, pagado, saldo: Math.max(monto - pagado, 0) };
  }

  private async asegurarReferenciaPagoCronograma(tx: Prisma.TransactionClient, idCronograma: number) {
    const cronograma = await tx.cronogramaPagos.findUnique({
      where: { id_cronograma: idCronograma },
      include: { matricula: { include: { anio: true, colegio: true } } },
    });

    if (!cronograma) throw new NotFoundException('Cronograma no encontrado.');
    if (cronograma.referencia_pago) return cronograma.referencia_pago;

    const anio = this.getAnioCorte(cronograma.matricula.anio);
    const referencia = await this.generarReferenciaPago(tx, { colegio: cronograma.matricula.colegio, anio });

    await tx.cronogramaPagos.update({
      where: { id_cronograma: idCronograma },
      data: { referencia_pago: referencia },
    });

    return referencia;
  }

  private getColegioIdFromScope(scope: FinanzasScope, params: ScopeParams) {
    const colegioId = params.colegioId ? Number(params.colegioId) : scope.colegioIds?.[0];

    if (!colegioId || !scope.colegioIds.includes(colegioId)) {
      throw new BadRequestException('Selecciona un colegio válido.');
    }

    return colegioId;
  }

  private async registrarHistorialPagoRecibido(
    db: any,
    params: {
      idPagoRecibido: number;
      accion: string;
      estadoAnterior?: string | null;
      estadoNuevo?: string | null;
      observacion?: string | null;
      metadata?: any;
      userId?: number | null;
      origen?: string;
    },
  ) {
    return db.pagoRecibidoHistorial.create({
      data: {
        id_pago_recibido: params.idPagoRecibido,
        accion: params.accion,
        estado_anterior: params.estadoAnterior || null,
        estado_nuevo: params.estadoNuevo || null,
        observacion: this.normalizeEmpty(params.observacion),
        metadata_json: params.metadata ?? undefined,
        id_usuario: params.userId || null,
        origen: params.origen || 'Interno',
      },
    });
  }

  // ── FIN HELPERS ────────────────────────────

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
      estado_matricula: { in: ['Activo', 'Pre-matriculado', 'Reserva'] },
    };

    const recaudadoHoyRaw = await this.prisma.$queryRaw<{ total: string }[]>(
      Prisma.sql`
        SELECT COALESCE(SUM(pt.monto_pagado), 0) AS total
        FROM PagoTransaccion pt
        JOIN CronogramaPagos cp ON pt.id_cronograma = cp.id_cronograma
        JOIN Matricula m ON cp.id_matricula = m.id_matricula
        WHERE DATE(pt.fecha_pago) = CURDATE()
          AND m.id_colegio IN (${Prisma.join(scope.colegioIds.length ? scope.colegioIds : [-1])})
      `,
    );

    const vencidosRaw = await this.prisma.$queryRaw<{ total: string }[]>(
      Prisma.sql`
        SELECT COALESCE(
          SUM(GREATEST(COALESCE(cp.monto_programado, con.monto_base) - COALESCE(pagos.total_pagado, 0), 0)),
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
          AND m.estado_matricula IN ('Activo', 'Pre-matriculado', 'Reserva')
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
        estado_pago: { in: ['Pendiente', 'Parcial', 'Vencido'] },
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
        anio: true,
        estudiante: { include: { persona: true } },
        seccion: {
          include: {
            grado: {
              include: {
                nivel: true,
              },
            },
          },
        },
        cronogramas: {
          where: {
            NOT: {
              estado_publicacion: 'Anulado',
            },
          },
          include: {
            concepto: true,
            pagos: {
              orderBy: { fecha_pago: 'desc' },
              include: {
                cajero: {
                  select: {
                    id_usuario: true,
                    username: true,
                    persona: {
                      select: {
                        nombres: true,
                        apellido_paterno: true,
                      },
                    },
                  },
                },
              },
            },
            pagos_recibidos: {
              orderBy: { created_at: 'desc' },
              take: 1,
            },
          },
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

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const deudas = matricula.cronogramas.map((cron) => {
      const totalPagado = cron.pagos.reduce(
        (total, pago) => total + Number(pago.monto_pagado),
        0,
      );
      const montoProgramado = this.montoProgramadoCronograma(cron);
      const saldo = Math.max(0, montoProgramado - totalPagado);
      const ultimoPago = cron.pagos?.[0] || null;
      const ultimoReporte = cron.pagos_recibidos?.[0] || null;
      const vencimiento = new Date(cron.fecha_vencimiento);
      vencimiento.setHours(0, 0, 0, 0);

      const estadoCalculado =
        saldo <= 0
          ? 'Pagado'
          : vencimiento < hoy
            ? 'Vencido'
            : cron.estado_pago || 'Pendiente';

      return {
        id_cronograma: cron.id_cronograma,
        referencia_pago: cron.referencia_pago,
        concepto: cron.concepto.nombre_concepto,
        tipo_concepto: cron.concepto.tipo_concepto,
        fecha_vencimiento: cron.fecha_vencimiento,
        monto_base: Number(cron.concepto.monto_base),
        monto_base_original: cron.monto_base_original ? Number(cron.monto_base_original) : Number(cron.concepto.monto_base),
        descuento_aplicado: Number(cron.descuento_aplicado || 0),
        monto_programado: montoProgramado,
        total_pagado: totalPagado,
        saldo,
        estado: estadoCalculado,
        estado_pago: cron.estado_pago,
        estado_publicacion: cron.estado_publicacion,
        visible_apoderado: cron.visible_apoderado,
        fecha_publicacion: cron.fecha_publicacion,
        ultimo_pago: ultimoPago
          ? {
              id_transaccion: ultimoPago.id_transaccion,
              monto_pagado: Number(ultimoPago.monto_pagado || 0),
              fecha_pago: ultimoPago.fecha_pago,
              metodo_pago: ultimoPago.metodo_pago,
              nro_operacion: ultimoPago.nro_operacion,
              cajero: ultimoPago.cajero,
              codigo_recibo: `REC-${new Date(ultimoPago.fecha_pago).getFullYear()}-${String(
                ultimoPago.id_transaccion,
              ).padStart(6, '0')}`,
            }
          : null,
        ultimo_reporte: ultimoReporte
          ? {
              id_pago_recibido: ultimoReporte.id_pago_recibido,
              estado: ultimoReporte.estado,
              monto_recibido: Number(ultimoReporte.monto_recibido || 0),
              medio_pago: ultimoReporte.medio_pago,
              numero_operacion: ultimoReporte.numero_operacion,
              nombre_pagador: ultimoReporte.nombre_pagador,
              created_at: ultimoReporte.created_at,
              observacion: ultimoReporte.observacion,
              origen_reporte: ultimoReporte.origen_reporte,
            }
          : null,
        pagos: cron.pagos.map((p) => ({
          id_transaccion: p.id_transaccion,
          monto: Number(p.monto_pagado),
          fecha: p.fecha_pago,
          metodo: p.metodo_pago,
          nro_operacion: p.nro_operacion,
          cajero: p.cajero,
        })),
      };
    });

    const totalProgramado = deudas.reduce((sum, item) => sum + Number(item.monto_programado || 0), 0);
    const totalPagado = deudas.reduce((sum, item) => sum + Number(item.total_pagado || 0), 0);
    const totalPendiente = deudas.reduce((sum, item) => sum + Number(item.saldo || 0), 0);
    const vencidos = deudas.filter((item) => item.saldo > 0 && item.estado === 'Vencido');
    const pendientes = deudas.filter((item) => item.saldo > 0 && item.estado !== 'Vencido');
    const pagados = deudas.filter((item) => item.saldo <= 0);
    const enRevision = deudas.filter((item) =>
      ['Pendiente', 'Identificado'].includes(item.ultimo_reporte?.estado || ''),
    );
    const observados = deudas.filter((item) => item.ultimo_reporte?.estado === 'Observado');

    const persona = matricula.estudiante?.persona;

    return {
      id_matricula: matricula.id_matricula,
      id_colegio: matricula.id_colegio,
      colegio: matricula.colegio
        ? {
            id_colegio: matricula.colegio.id_colegio,
            nombre: matricula.colegio.nombre,
            nombre_corto: matricula.colegio.nombre_corto,
            codigo: matricula.colegio.codigo,
            logo_url: matricula.colegio.logo_url,
          }
        : null,
      alumno: persona
        ? {
            id_persona: persona.id_persona,
            dni: persona.dni,
            nombres: persona.nombres,
            apellido_paterno: persona.apellido_paterno,
            apellido_materno: persona.apellido_materno,
          }
        : null,
      matricula: {
        id_matricula: matricula.id_matricula,
        codigo_matricula: matricula.codigo_matricula,
        estado_matricula: matricula.estado_matricula,
        fecha_matricula: matricula.fecha_matricula,
        anio: matricula.anio?.nombre_anio || null,
        nivel: matricula.seccion?.grado?.nivel?.nombre_nivel || null,
        grado: matricula.seccion?.grado?.nombre_grado || null,
        seccion: matricula.seccion?.letra || null,
        aula: matricula.seccion
          ? `${matricula.seccion.grado?.nombre_grado || ''} ${matricula.seccion.letra || ''}`.trim()
          : null,
      },
      deudas,
      resumen: {
        total_programado: totalProgramado,
        total_pagado: totalPagado,
        total_pendiente: totalPendiente,
        cantidad_total: deudas.length,
        cantidad_pagados: pagados.length,
        cantidad_pendientes: pendientes.length,
        cantidad_vencidos: vencidos.length,
        cantidad_en_revision: enRevision.length,
        cantidad_observados: observados.length,
      },
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
        estado_pago: { in: ['Pendiente', 'Parcial', 'Vencido'] },
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
        // Asegurar referencia de pago para el nuevo cronograma
        await this.asegurarReferenciaPagoCronograma(this.prisma, nuevoCronograma.id_cronograma);
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

  async aplicarPromocionMatricula(
    matriculaIdOCodigo: string,
    params: ScopeParams,
  ) {
    const scope = await this.resolveScope(params);
    const idNumerico = Number(matriculaIdOCodigo);
    const whereMatricula = Number.isInteger(idNumerico) && idNumerico > 0
      ? { id_matricula: idNumerico }
      : { codigo_matricula: matriculaIdOCodigo };

    return this.prisma.$transaction(async (tx) => {
      const matricula = await tx.matricula.findFirst({
        where: {
          ...whereMatricula,
          id_colegio: { in: scope.colegioIds },
        },
        include: {
          anio: true,
          colegio: true,
          estudiante: { include: { persona: true } },
          cronogramas: {
            include: {
              concepto: true,
              pagos: true,
            },
          },
        },
      });

      if (!matricula) {
        throw new NotFoundException('No se encontró la matrícula seleccionada.');
      }

      const cronogramaMatricula = matricula.cronogramas.find(
        (item) => item.concepto?.tipo_concepto === 'MATRICULA',
      );

      if (!cronogramaMatricula) {
        throw new BadRequestException(
          'La matrícula todavía no tiene un cobro de matrícula generado.',
        );
      }

      if (cronogramaMatricula.pagos.length > 0) {
        throw new BadRequestException(
          'No se puede aplicar una promoción porque este cobro ya tiene pagos registrados.',
        );
      }

      if (cronogramaMatricula.estado_pago === 'Pagado') {
        throw new BadRequestException(
          'No se puede aplicar una promoción porque la matrícula ya está pagada.',
        );
      }

      const montoBase = Number(
        cronogramaMatricula.monto_base_original ??
          cronogramaMatricula.concepto.monto_base,
      );

      const descuento = await this.calcularDescuentoGeneral(tx, {
        idTenant: scope.tenantId,
        idColegio: matricula.id_colegio,
        idAnio: matricula.id_anio,
        tipoConcepto: 'MATRICULA',
        montoBase,
        fechaReferencia: new Date(),
        matricula,
      });

      if (!descuento.idCampanaDescuento || descuento.descuentoAplicado <= 0) {
        throw new BadRequestException(
          'No hay una campaña/descuento vigente aplicable para esta matrícula.',
        );
      }

      const actualizado = await tx.cronogramaPagos.update({
        where: { id_cronograma: cronogramaMatricula.id_cronograma },
        data: {
          monto_base_original: montoBase,
          descuento_aplicado: descuento.descuentoAplicado,
          monto_programado: descuento.montoProgramado,
          id_campana_descuento: descuento.idCampanaDescuento,
        },
        include: {
          concepto: true,
          campana_descuento: true,
        },
      });

      return {
        message: `Promoción aplicada correctamente. Nuevo monto de matrícula: S/ ${Number(
          actualizado.monto_programado,
        ).toFixed(2)}.`,
        codigo_matricula: matricula.codigo_matricula,
        id_matricula: matricula.id_matricula,
        monto_base_original: actualizado.monto_base_original,
        descuento_aplicado: actualizado.descuento_aplicado,
        monto_programado: actualizado.monto_programado,
        campana: actualizado.campana_descuento,
      };
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
      throw new BadRequestException(
        'Solo puedes generar cronograma para matrículas activas o pre-matriculadas.',
      );
    }

    const cronogramaMatricula = await this.prisma.cronogramaPagos.findFirst({
      where: {
        id_matricula: matricula.id_matricula,
        concepto: {
          tipo_concepto: 'MATRICULA',
        },
      },
      include: {
        concepto: true,
        pagos: true,
      },
    });

    if (!cronogramaMatricula) {
      throw new BadRequestException(
        'No se encontró el cobro de matrícula. Primero genera o registra el pago de matrícula antes de crear las pensiones.',
      );
    }

    const totalMatricula = this.montoProgramadoCronograma(cronogramaMatricula);
    const totalPagadoMatricula = cronogramaMatricula.pagos.reduce(
      (sum, pago) => sum + Number(pago.monto_pagado),
      0,
    );

    const matriculaPagada =
      cronogramaMatricula.estado_pago === 'Pagado' ||
      totalPagadoMatricula + 0.01 >= totalMatricula;

    if (!matriculaPagada) {
      throw new BadRequestException(
        `No puedes generar el cronograma de pensiones porque la matrícula aún no está pagada. Monto matrícula: S/ ${totalMatricula.toFixed(
          2,
        )}. Pagado: S/ ${totalPagadoMatricula.toFixed(2)}.`,
      );
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
      let existentes = 0;

      for (const detalle of plan.detalles) {
        const existe = await tx.cronogramaPagos.findFirst({
          where: {
            id_matricula: matricula.id_matricula,
            id_concepto: detalle.id_concepto,
          },
        });

        if (existe) {
          existentes += 1;
          continue;
        }

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

        const nuevoCronograma = await tx.cronogramaPagos.create({
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

        // Asegurar referencia de pago para la pensión creada
        await this.asegurarReferenciaPagoCronograma(tx, nuevoCronograma.id_cronograma);

        creados += 1;
      }

      return {
        message:
          creados > 0
            ? `Cronograma de pensiones generado. Nuevos creados: ${creados}. Ya existentes: ${existentes}.`
            : `Cronograma revisado correctamente. No se crearon duplicados. Ya existentes: ${existentes}.`,
        id_matricula: matricula.id_matricula,
        total_creados: creados,
        total_existentes: existentes,
        total_planificados: plan.detalles.length,
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

  // ── NUEVOS MÉTODOS PARA GESTIÓN DE PAGOS Y REFERENCIAS ──
  async generarReferenciasPagoFaltantes(params: ScopeParams) {
    const scope = await this.resolveScope(params);

    const pendientes = await this.prisma.cronogramaPagos.findMany({
      where: {
        referencia_pago: null,
        matricula: { id_colegio: { in: scope.colegioIds } },
      },
      select: { id_cronograma: true },
      orderBy: { id_cronograma: 'asc' },
    });

    let generadas = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const item of pendientes) {
        await this.asegurarReferenciaPagoCronograma(tx, item.id_cronograma);
        generadas += 1;
      }
    });

    return { message: `Referencias de pago generadas: ${generadas}.`, total_generadas: generadas };
  }

  async buscarDeudaPorReferencia(referencia: string, params: ScopeParams) {
    const scope = await this.resolveScope(params);

    const cronograma = await this.prisma.cronogramaPagos.findFirst({
      where: {
        referencia_pago: referencia.trim(),
        matricula: { id_colegio: { in: scope.colegioIds } },
      },
      include: {
        concepto: true,
        pagos: true,
        matricula: {
          include: {
            colegio: true,
            anio: true,
            estudiante: {
              include: {
                persona: true,
                apoderados: { include: { apoderado: { include: { persona: true } } } },
              },
            },
            seccion: { include: { grado: { include: { nivel: true } } } },
          },
        },
      },
    });

    if (!cronograma) throw new NotFoundException('No se encontró una deuda con esa referencia de pago.');

    const saldo = this.saldoCronograma(cronograma);

    return {
      referencia_pago: cronograma.referencia_pago,
      id_cronograma: cronograma.id_cronograma,
      concepto: cronograma.concepto,
      estado_pago: cronograma.estado_pago,
      monto: saldo.monto,
      pagado: saldo.pagado,
      saldo: saldo.saldo,
      fecha_vencimiento: cronograma.fecha_vencimiento,
      matricula: cronograma.matricula,
    };
  }

  async listarDeudasPendientes(params: ScopeParams & {
    q?: string;
    estado?: string;
    anioId?: number;
    concepto?: string;
    limit?: number;
  }) {
    const scope = await this.resolveScope(params);
    const q = this.normalizeEmpty(params.q);
    const limit = Math.min(Number(params.limit || 100), 300);

    const where: any = {
      matricula: {
        id_colegio: { in: scope.colegioIds },
      },
    };

    if (params.estado && params.estado !== 'Todos') {
      where.estado_pago = { in: [params.estado] };
    } else if (!params.estado) {
      where.estado_pago = { in: ['Pendiente', 'Parcial'] };
    }

    if (params.anioId) where.matricula.id_anio = Number(params.anioId);

    if (params.concepto) {
      where.concepto = {
        nombre_concepto: { contains: params.concepto },
      };
    }

    if (q) {
      where.OR = [
        { referencia_pago: { contains: q } },
        { matricula: { codigo_matricula: { contains: q } } },
        {
          matricula: {
            estudiante: {
              persona: {
                OR: [
                  { dni: { contains: q } },
                  { nombres: { contains: q } },
                  { apellido_paterno: { contains: q } },
                  { apellido_materno: { contains: q } },
                ],
              },
            },
          },
        },
      ];
    }

    const deudas = await this.prisma.cronogramaPagos.findMany({
      where,
      include: {
        concepto: true,
        pagos: {
          orderBy: {
            fecha_pago: 'desc',
          },
        },
        matricula: {
          include: {
            colegio: true,
            anio: true,
            estudiante: {
              include: {
                persona: true,
                apoderados: {
                  include: {
                    apoderado: { include: { persona: true } },
                  },
                },
              },
            },
            seccion: { include: { grado: { include: { nivel: true } } } },
          },
        },
      },
      orderBy: [{ fecha_vencimiento: 'asc' }, { id_cronograma: 'asc' }],
      take: limit,
    });

    const rows = deudas.map((deuda) => {
      const saldo = this.saldoCronograma(deuda);
      const persona = deuda.matricula.estudiante.persona;
      const apoderadoPrincipal =
        deuda.matricula.estudiante.apoderados?.[0]?.apoderado?.persona || null;
      const ultimoPago = deuda.pagos?.[0] || null;

      return {
        id_cronograma: deuda.id_cronograma,
        referencia_pago: deuda.referencia_pago,
        concepto: deuda.concepto?.nombre_concepto,
        tipo_concepto: deuda.concepto?.tipo_concepto,
        estado_pago: deuda.estado_pago,
        fecha_vencimiento: deuda.fecha_vencimiento,
        monto: saldo.monto,
        pagado: saldo.pagado,
        saldo: saldo.saldo,
        monto_visible: deuda.estado_pago === 'Pagado' ? saldo.pagado : saldo.saldo,
        matricula: {
          id_matricula: deuda.matricula.id_matricula,
          codigo_matricula: deuda.matricula.codigo_matricula,
          estado_matricula: deuda.matricula.estado_matricula,
          colegio: deuda.matricula.colegio,
          anio: deuda.matricula.anio,
          seccion: deuda.matricula.seccion,
        },
        alumno: {
          id_persona: persona.id_persona,
          dni: persona.dni,
          nombres: persona.nombres,
          apellido_paterno: persona.apellido_paterno,
          apellido_materno: persona.apellido_materno,
        },
        apoderado: apoderadoPrincipal
          ? {
              dni: apoderadoPrincipal.dni,
              nombres: apoderadoPrincipal.nombres,
              apellido_paterno: apoderadoPrincipal.apellido_paterno,
              apellido_materno: apoderadoPrincipal.apellido_materno,
              telefono: apoderadoPrincipal.telefono,
              correo: apoderadoPrincipal.correo,
            }
          : null,
        ultimo_pago: ultimoPago
          ? {
              id_transaccion: ultimoPago.id_transaccion,
              monto_pagado: ultimoPago.monto_pagado,
              metodo_pago: ultimoPago.metodo_pago,
              nro_operacion: ultimoPago.nro_operacion,
              fecha_pago: ultimoPago.fecha_pago,
            }
          : null,
      };
    });

    if (params.estado === 'Pagado') {
      return rows.sort((a, b) => {
        const fa = a.ultimo_pago?.fecha_pago ? new Date(a.ultimo_pago.fecha_pago).getTime() : 0;
        const fb = b.ultimo_pago?.fecha_pago ? new Date(b.ultimo_pago.fecha_pago).getTime() : 0;
        return fb - fa;
      });
    }

    if (params.estado === 'Todos') {
      return rows.sort((a, b) => {
        const getRank = (item: any) => {
          if (item.estado_pago === 'Pagado') return 3;
          if (item.estado_pago === 'Parcial') return 2;
          return 1;
        };

        const rankDiff = getRank(b) - getRank(a);
        if (rankDiff !== 0) return rankDiff;

        const fa = a.ultimo_pago?.fecha_pago ? new Date(a.ultimo_pago.fecha_pago).getTime() : 0;
        const fb = b.ultimo_pago?.fecha_pago ? new Date(b.ultimo_pago.fecha_pago).getTime() : 0;
        return fb - fa;
      });
    }

    return rows;
  }

  async registrarPagoRecibido(body: any, params: ScopeParams) {
    const scope = await this.resolveScope(params);
    const referencia = this.normalizeEmpty(body.referencia_escrita);
    const monto = Number(body.monto_recibido);

    if (!Number.isFinite(monto) || monto <= 0) throw new BadRequestException('Ingresa un monto recibido válido.');

    let cronograma: any = null;

    if (referencia) {
      cronograma = await this.prisma.cronogramaPagos.findFirst({
        where: { referencia_pago: referencia, matricula: { id_colegio: { in: scope.colegioIds } } },
        include: { matricula: { include: { estudiante: { include: { apoderados: true } } } } },
      });
    }

    const idColegio = cronograma?.matricula?.id_colegio || body.id_colegio || scope.colegioIds[0] || null;
    const idApoderado = body.id_apoderado || cronograma?.matricula?.estudiante?.apoderados?.[0]?.id_apoderado || null;

    const pago = await this.prisma.pagoRecibido.create({
      data: {
        id_tenant: scope.tenantId,
        id_colegio: idColegio,
        medio_pago: body.medio_pago || 'Yape',
        monto_recibido: monto,
        fecha_pago_reportada: body.fecha_pago_reportada ? new Date(body.fecha_pago_reportada) : new Date(),
        nombre_pagador: this.normalizeEmpty(body.nombre_pagador),
        telefono_pagador: this.normalizeEmpty(body.telefono_pagador),
        numero_operacion: this.normalizeEmpty(body.numero_operacion),
        referencia_escrita: referencia,
        captura_url: this.normalizeEmpty(body.captura_url),
        estado: cronograma ? 'Identificado' : 'Pendiente',
        id_cronograma: cronograma?.id_cronograma || null,
        id_matricula: cronograma?.matricula?.id_matricula || null,
        id_estudiante: cronograma?.matricula?.id_estudiante || null,
        id_apoderado: idApoderado,
        observacion: this.normalizeEmpty(body.observacion),
        id_usuario_registro: params.userId,
      },
      include: { cronograma: { include: { concepto: true, matricula: { include: { estudiante: { include: { persona: true } } } } } } },
    });

    await this.registrarHistorialPagoRecibido(this.prisma, {
      idPagoRecibido: pago.id_pago_recibido,
      accion: 'REGISTRO_MANUAL',
      estadoAnterior: null,
      estadoNuevo: pago.estado,
      observacion: pago.observacion,
      userId: params.userId,
      origen: 'ERP',
      metadata: {
        medio_pago: pago.medio_pago,
        monto_recibido: Number(pago.monto_recibido || 0),
        numero_operacion: pago.numero_operacion,
      },
    });

    return { message: cronograma ? 'Pago recibido registrado e identificado por referencia.' : 'Pago recibido registrado como pendiente de identificar.', pago };
  }

  async aplicarPagoRecibido(idPagoRecibido: number, body: any, params: ScopeParams) {
    const scope = await this.resolveScope(params);

    return this.prisma.$transaction(async (tx) => {
      const pagoRecibido = await tx.pagoRecibido.findFirst({
        where: { id_pago_recibido: idPagoRecibido, OR: [{ id_colegio: { in: scope.colegioIds } }, { id_colegio: null }] },
      });

      if (!pagoRecibido) throw new NotFoundException('No se encontró el pago recibido.');
      if (pagoRecibido.estado === 'Aplicado') throw new BadRequestException('Este pago recibido ya fue aplicado.');

      const idCronograma = Number(body.id_cronograma || pagoRecibido.id_cronograma);
      if (!idCronograma) throw new BadRequestException('Selecciona la deuda a la que se aplicará el pago.');

      const cronograma = await tx.cronogramaPagos.findFirst({
        where: { id_cronograma: idCronograma, matricula: { id_colegio: { in: scope.colegioIds } } },
        include: {
          concepto: true,
          pagos: true,
          matricula: { include: { estudiante: { include: { apoderados: true } } } },
        },
      });

      if (!cronograma) throw new NotFoundException('No se encontró la deuda seleccionada.');

      const idApoderado = body.id_apoderado || pagoRecibido.id_apoderado || cronograma.matricula.estudiante.apoderados?.[0]?.id_apoderado;
      if (!idApoderado) throw new BadRequestException('Selecciona un apoderado para registrar el pago.');

      const montoAplicar = Number(body.monto_aplicar || pagoRecibido.monto_recibido);
      if (!Number.isFinite(montoAplicar) || montoAplicar <= 0) throw new BadRequestException('Ingresa un monto válido para aplicar.');

      const saldo = this.saldoCronograma(cronograma);
      if (montoAplicar > saldo.saldo + 0.01) throw new BadRequestException(`El monto excede el saldo pendiente. Saldo: S/ ${saldo.saldo.toFixed(2)}.`);

      await tx.pagoTransaccion.create({
        data: {
          id_cronograma: cronograma.id_cronograma,
          id_apoderado: Number(idApoderado),
          id_usuario_cajero: params.userId,
          monto_pagado: montoAplicar,
          metodo_pago: pagoRecibido.medio_pago,
          nro_operacion: pagoRecibido.numero_operacion || pagoRecibido.referencia_escrita || undefined,
        },
      });

      const totalPagadoNuevo = saldo.pagado + montoAplicar;
      const nuevoEstado = totalPagadoNuevo + 0.01 >= saldo.monto ? 'Pagado' : 'Parcial';

      await tx.cronogramaPagos.update({ where: { id_cronograma: cronograma.id_cronograma }, data: { estado_pago: nuevoEstado } });

      const actualizado = await tx.pagoRecibido.update({
        where: { id_pago_recibido: idPagoRecibido },
        data: {
          estado: 'Aplicado',
          id_cronograma: cronograma.id_cronograma,
          id_matricula: cronograma.matricula.id_matricula,
          id_estudiante: cronograma.matricula.id_estudiante,
          id_apoderado: Number(idApoderado),
          id_usuario_validacion: params.userId,
          fecha_validacion: new Date(),
        },
      });

      await this.registrarHistorialPagoRecibido(tx, {
        idPagoRecibido,
        accion: 'APLICAR',
        estadoAnterior: pagoRecibido.estado,
        estadoNuevo: 'Aplicado',
        observacion: body.observacion || pagoRecibido.observacion,
        userId: params.userId,
        origen: 'ERP',
        metadata: {
          id_cronograma: cronograma.id_cronograma,
          monto_aplicado: montoAplicar,
          estado_deuda: nuevoEstado,
        },
      });

      return { message: `Pago aplicado correctamente. Estado de deuda: ${nuevoEstado}.`, pago_recibido: actualizado, estado_pago: nuevoEstado };
    });
  }

  // ── NUEVOS MÉTODOS PARA GESTIÓN DE PAGOS RECIBIDOS ──

  async listarPagosRecibidos(params: ScopeParams & {
    q?: string;
    estado?: string;
    medio?: string;
    limit?: number;
  }) {
    const scope = await this.resolveScope(params);
    const q = this.normalizeEmpty(params.q);
    const limit = Math.min(Number(params.limit || 100), 300);

    const where: any = {
      OR: [{ id_colegio: { in: scope.colegioIds } }, { id_colegio: null }],
    };

    if (params.estado && params.estado !== 'Todos') where.estado = params.estado;
    if (params.medio && params.medio !== 'Todos') where.medio_pago = params.medio;

    if (q) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { referencia_escrita: { contains: q } },
            { numero_operacion: { contains: q } },
            { nombre_pagador: { contains: q } },
            { telefono_pagador: { contains: q } },
            { cronograma: { referencia_pago: { contains: q } } },
            { matricula: { codigo_matricula: { contains: q } } },
            {
              estudiante: {
                persona: {
                  OR: [
                    { dni: { contains: q } },
                    { nombres: { contains: q } },
                    { apellido_paterno: { contains: q } },
                    { apellido_materno: { contains: q } },
                  ],
                },
              },
            },
          ],
        },
      ];
    }

    const pagosRecibidos = await this.prisma.pagoRecibido.findMany({
      where,
      include: {
        colegio: true,
        cronograma: {
          include: {
            concepto: true,
            pagos: true,
            matricula: {
              include: {
                estudiante: { include: { persona: true } },
              },
            },
          },
        },
        matricula: {
          include: {
            colegio: true,
            anio: true,
            seccion: { include: { grado: { include: { nivel: true } } } },
          },
        },
        estudiante: { include: { persona: true } },
        apoderado: { include: { persona: true } },
        registrado_por: {
          select: {
            id_usuario: true,
            username: true,
            persona: { select: { nombres: true, apellido_paterno: true } },
          },
        },
        validado_por: {
          select: {
            id_usuario: true,
            username: true,
            persona: { select: { nombres: true, apellido_paterno: true } },
          },
        },
      },
      orderBy: [{ created_at: 'desc' }, { id_pago_recibido: 'desc' }],
      take: limit,
    });

    const operaciones = pagosRecibidos
      .map((item) => this.normalizeEmpty(item.numero_operacion))
      .filter(Boolean) as string[];

    const conteosOperacion = new Map<string, number>();

    if (operaciones.length) {
      const agrupados = await this.prisma.pagoRecibido.groupBy({
        by: ['numero_operacion'],
        where: {
          numero_operacion: { in: operaciones },
          OR: [{ id_colegio: { in: scope.colegioIds } }, { id_colegio: null }],
          estado: { notIn: ['Rechazado', 'Reemplazado'] },
        },
        _count: { numero_operacion: true },
      });

      agrupados.forEach((item) => {
        if (item.numero_operacion) {
          conteosOperacion.set(item.numero_operacion, item._count.numero_operacion);
        }
      });
    }

    return pagosRecibidos.map((item) => {
      const saldo = item.cronograma ? this.saldoCronograma(item.cronograma) : null;
      const montoReportado = Number(item.monto_recibido || 0);
      const saldoActual = saldo?.saldo ?? null;
      const esAplicado = item.estado === 'Aplicado';
      const esFinalizado = ['Aplicado', 'Reemplazado', 'Rechazado'].includes(item.estado);

      const montoReferencia =
        saldoActual === null ? null : esAplicado ? montoReportado : saldoActual;

      const diferencia =
        montoReferencia === null
          ? null
          : Number((montoReportado - montoReferencia).toFixed(2));

      const cantidadOperaciones = item.numero_operacion
        ? conteosOperacion.get(item.numero_operacion) || 0
        : 0;

      return {
        ...item,
        validacion: {
          monto_esperado: saldo?.monto ?? null,
          pagado_actual: saldo?.pagado ?? null,
          saldo_actual: saldoActual,
          monto_validacion: montoReferencia,
          monto_reportado: montoReportado,
          diferencia,
          monto_coincide:
            montoReferencia !== null ? Math.abs(montoReportado - montoReferencia) <= 0.01 : null,
          excede_saldo:
            !esFinalizado && saldoActual !== null ? montoReportado > saldoActual + 0.01 : false,
          finalizado: esFinalizado,
          operacion_duplicada: !esAplicado && cantidadOperaciones > 1,
          cantidad_operaciones_similares: cantidadOperaciones,
        },
      };
    });
  }

  async identificarPagoRecibido(idPagoRecibido: number, body: any, params: ScopeParams) {
    const scope = await this.resolveScope(params);
    const referencia = this.normalizeEmpty(body.referencia_pago || body.referencia_escrita);

    if (!referencia) {
      throw new BadRequestException('Ingresa el código de pago para identificar este pago recibido.');
    }

    return this.prisma.$transaction(async (tx) => {
      const pagoRecibido = await tx.pagoRecibido.findFirst({
        where: {
          id_pago_recibido: idPagoRecibido,
          OR: [{ id_colegio: { in: scope.colegioIds } }, { id_colegio: null }],
        },
      });

      if (!pagoRecibido) throw new NotFoundException('No se encontró el pago recibido.');
      if (pagoRecibido.estado === 'Aplicado') {
        throw new BadRequestException('Este pago ya fue aplicado y no puede modificarse.');
      }

      const cronograma = await tx.cronogramaPagos.findFirst({
        where: {
          referencia_pago: referencia,
          matricula: { id_colegio: { in: scope.colegioIds } },
        },
        include: {
          concepto: true,
          pagos: true,
          matricula: {
            include: { estudiante: { include: { apoderados: true } } },
          },
        },
      });

      if (!cronograma) throw new NotFoundException('No se encontró una deuda con ese código de pago.');

      const idApoderado =
        body.id_apoderado ||
        pagoRecibido.id_apoderado ||
        cronograma.matricula.estudiante.apoderados?.[0]?.id_apoderado ||
        null;

      const actualizado = await tx.pagoRecibido.update({
        where: { id_pago_recibido: idPagoRecibido },
        data: {
          estado: 'Identificado',
          referencia_escrita: referencia,
          id_cronograma: cronograma.id_cronograma,
          id_matricula: cronograma.matricula.id_matricula,
          id_estudiante: cronograma.matricula.id_estudiante,
          id_apoderado: idApoderado,
          observacion: this.normalizeEmpty(body.observacion) || pagoRecibido.observacion,
        },
        include: {
          cronograma: { include: { concepto: true } },
          matricula: true,
          estudiante: { include: { persona: true } },
          apoderado: { include: { persona: true } },
        },
      });

      await this.registrarHistorialPagoRecibido(tx, {
        idPagoRecibido,
        accion: 'IDENTIFICAR',
        estadoAnterior: pagoRecibido.estado,
        estadoNuevo: 'Identificado',
        observacion: actualizado.observacion,
        userId: params.userId,
        origen: 'ERP',
        metadata: {
          referencia_pago: referencia,
          id_cronograma: cronograma.id_cronograma,
        },
      });

      return { message: 'Pago identificado correctamente. Ahora puedes confirmarlo.', pago: actualizado };
    });
  }

  async actualizarEstadoPagoRecibido(
  idPagoRecibido: number,
  body: any,
  params: ScopeParams,
) {
  const scope = await this.resolveScope(params);
  const estado = this.normalizeEmpty(body.estado) || '';

  if (!['Pendiente', 'Identificado', 'Observado', 'Rechazado'].includes(estado)) {
    throw new BadRequestException('Estado no válido para el pago recibido.');
  }

  const pago = await this.prisma.pagoRecibido.findFirst({
    where: {
      id_pago_recibido: idPagoRecibido,
      OR: [{ id_colegio: { in: scope.colegioIds } }, { id_colegio: null }],
    },
  });

  if (!pago) {
    throw new NotFoundException('No se encontró el pago recibido.');
  }

  if (pago.estado === 'Aplicado') {
    throw new BadRequestException(
      'Un pago aplicado no puede cambiarse desde esta opción.',
    );
  }

  const actualizado = await this.prisma.pagoRecibido.update({
    where: { id_pago_recibido: idPagoRecibido },
    data: {
      estado,
      observacion: this.normalizeEmpty(body.observacion) || pago.observacion,
    },
  });

  await this.registrarHistorialPagoRecibido(this.prisma, {
    idPagoRecibido,
    accion: estado === 'Observado' ? 'OBSERVAR' : estado === 'Rechazado' ? 'RECHAZAR' : 'CAMBIO_ESTADO',
    estadoAnterior: pago.estado,
    estadoNuevo: estado,
    observacion: actualizado.observacion,
    userId: params.userId,
    origen: 'ERP',
  });

  return {
    message: `Pago marcado como ${estado}.`,
    pago: actualizado,
  };
}

  // ── MÉTODO PARA COMPROBANTE DE PAGO ──
  async obtenerComprobantePago(idTransaccion: number, params: ScopeParams) {
    const scope = await this.resolveScope(params);

    const pago = await this.prisma.pagoTransaccion.findFirst({
      where: {
        id_transaccion: idTransaccion,
        cronograma: {
          matricula: {
            id_colegio: { in: scope.colegioIds },
          },
        },
      },
      include: {
        cronograma: {
          include: {
            concepto: true,
            pagos: true,
            matricula: {
              include: {
                colegio: true,
                anio: true,
                estudiante: {
                  include: {
                    persona: true,
                  },
                },
                seccion: {
                  include: {
                    grado: {
                      include: {
                        nivel: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        apoderado: {
          include: {
            persona: true,
          },
        },
        cajero: {
          select: {
            id_usuario: true,
            username: true,
          },
        },
      },
    });

    if (!pago) {
      throw new NotFoundException('No se encontró el comprobante de pago.');
    }

    const cronograma = pago.cronograma;
    const totalPagado = cronograma.pagos.reduce(
      (sum, item) => sum + Number(item.monto_pagado || 0),
      0,
    );

    const montoTotal = this.montoProgramadoCronograma(cronograma);
    const saldo = Math.max(montoTotal - totalPagado, 0);

    const fecha = new Date(pago.fecha_pago);
    const year = fecha.getFullYear();

    return {
      codigo_comprobante: `REC-${year}-${String(pago.id_transaccion).padStart(6, '0')}`,
      pago: {
        id_transaccion: pago.id_transaccion,
        monto_pagado: pago.monto_pagado,
        metodo_pago: pago.metodo_pago,
        nro_operacion: pago.nro_operacion,
        fecha_pago: pago.fecha_pago,
      },
      deuda: {
        id_cronograma: cronograma.id_cronograma,
        referencia_pago: cronograma.referencia_pago,
        concepto: cronograma.concepto,
        estado_pago: cronograma.estado_pago,
        monto_total: montoTotal,
        total_pagado: totalPagado,
        saldo,
      },
      matricula: cronograma.matricula,
      colegio: cronograma.matricula.colegio,
      alumno: cronograma.matricula.estudiante.persona,
      apoderado: pago.apoderado?.persona || null,
      cajero: pago.cajero || null,
    };
  }

  // ── MÉTODO PARA LINK PÚBLICO DE PAGO ──
  async obtenerPagoPublicoPorReferencia(referencia: string) {
    const ref = referencia.trim();

    const cronograma = await this.prisma.cronogramaPagos.findFirst({
      where: { referencia_pago: ref },
      include: {
        concepto: true,
        pagos: true,
        matricula: {
          include: {
            colegio: {
              include: {
                datos_cobro: true,
              },
            },
            anio: true,
            estudiante: { include: { persona: true } },
            seccion: { include: { grado: { include: { nivel: true } } } },
          },
        },
      },
    });

    if (!cronograma) {
      throw new NotFoundException('No se encontró un pago con ese código.');
    }

    const monto = this.montoProgramadoCronograma(cronograma);
    const pagado = cronograma.pagos.reduce(
      (sum, pago) => sum + Number(pago.monto_pagado || 0),
      0,
    );
    const saldo = Math.max(monto - pagado, 0);
    const alumno = cronograma.matricula.estudiante.persona;
    const datosCobro = cronograma.matricula.colegio?.datos_cobro;

    const datosCobroPublicos =
      datosCobro && datosCobro.activo
        ? {
            nombre_destinatario: datosCobro.nombre_destinatario,
            numero_yape: datosCobro.numero_yape,
            numero_plin: datosCobro.numero_plin,
            banco_1: datosCobro.banco_1,
            cuenta_1: datosCobro.cuenta_1,
            cci_1: datosCobro.cci_1,
            banco_2: datosCobro.banco_2,
            cuenta_2: datosCobro.cuenta_2,
            cci_2: datosCobro.cci_2,
            qr_yape_url: datosCobro.qr_yape_url,
            qr_plin_url: datosCobro.qr_plin_url,
            instrucciones: datosCobro.instrucciones,
          }
        : null;

    return {
      referencia_pago: cronograma.referencia_pago,
      estado_pago: cronograma.estado_pago,
      fecha_vencimiento: cronograma.fecha_vencimiento,
      concepto: {
        nombre_concepto: cronograma.concepto?.nombre_concepto,
        tipo_concepto: cronograma.concepto?.tipo_concepto,
      },
      monto,
      pagado,
      saldo,
      colegio: {
        nombre: cronograma.matricula.colegio?.nombre,
        nombre_corto: cronograma.matricula.colegio?.nombre_corto,
      },
      alumno: {
        nombres: alumno.nombres,
        apellido_paterno: alumno.apellido_paterno,
        apellido_materno: alumno.apellido_materno,
      },
      matricula: {
        codigo_matricula: cronograma.matricula.codigo_matricula,
        aula: cronograma.matricula.seccion
          ? `${cronograma.matricula.seccion.grado?.nombre_grado || ''} ${cronograma.matricula.seccion.letra || ''}`.trim()
          : null,
        anio: cronograma.matricula.anio?.nombre_anio,
      },
      datos_cobro: datosCobroPublicos,
      instrucciones: {
        mensaje:
          datosCobroPublicos?.instrucciones ||
          'Realiza el pago por Yape, Plin o transferencia y coloca el código de pago en la descripción para identificarlo correctamente.',
      },
    };
  }

  // ── MÉTODOS PARA DATOS DE COBRO DEL COLEGIO ──
  async obtenerDatosCobroColegio(params: ScopeParams) {
    const scope = await this.resolveScope(params);
    const idColegio = this.getColegioIdFromScope(scope, params);

    const colegio = await this.prisma.colegio.findFirst({
      where: {
        AND: [
          { id_colegio: idColegio },
          { id_colegio: { in: scope.colegioIds } },
        ],
      },
      select: {
        id_colegio: true,
        nombre: true,
        nombre_corto: true,
        codigo: true,
        datos_cobro: true,
      },
    });

    if (!colegio) {
      throw new NotFoundException('No se encontró el colegio.');
    }

    return {
      colegio: {
        id_colegio: colegio.id_colegio,
        nombre: colegio.nombre,
        nombre_corto: colegio.nombre_corto,
        codigo: colegio.codigo,
      },
      datos_cobro:
        colegio.datos_cobro || {
          id_datos_cobro: null,
          id_colegio: idColegio,
          nombre_destinatario: '',
          numero_yape: '',
          numero_plin: '',
          banco_1: '',
          cuenta_1: '',
          cci_1: '',
          banco_2: '',
          cuenta_2: '',
          cci_2: '',
          qr_yape_url: '',
          qr_plin_url: '',
          instrucciones:
            'Coloca el código de pago en la descripción del Yape, Plin o transferencia.',
          activo: true,
        },
    };
  }

  async guardarDatosCobroColegio(body: any, params: ScopeParams) {
    const scope = await this.resolveScope(params);
    const idColegio = this.getColegioIdFromScope(scope, params);

    const nombreDestinatario = this.normalizeEmpty(body.nombre_destinatario);

    if (!nombreDestinatario) {
      throw new BadRequestException('Ingresa el nombre del destinatario.');
    }

    const data = {
      nombre_destinatario: nombreDestinatario,
      numero_yape: this.normalizeEmpty(body.numero_yape),
      numero_plin: this.normalizeEmpty(body.numero_plin),
      banco_1: this.normalizeEmpty(body.banco_1),
      cuenta_1: this.normalizeEmpty(body.cuenta_1),
      cci_1: this.normalizeEmpty(body.cci_1),
      banco_2: this.normalizeEmpty(body.banco_2),
      cuenta_2: this.normalizeEmpty(body.cuenta_2),
      cci_2: this.normalizeEmpty(body.cci_2),
      qr_yape_url: this.normalizeEmpty(body.qr_yape_url),
      qr_plin_url: this.normalizeEmpty(body.qr_plin_url),
      instrucciones:
        this.normalizeEmpty(body.instrucciones) ||
        'Coloca el código de pago en la descripción del Yape, Plin o transferencia.',
      activo: body.activo === false ? false : true,
    };

    const datos = await this.prisma.datosCobroColegio.upsert({
      where: { id_colegio: idColegio },
      create: {
        id_colegio: idColegio,
        ...data,
      },
      update: data,
    });

    return {
      message: 'Datos de cobro guardados correctamente.',
      datos_cobro: datos,
    };
  }

  // ── PORTAL PÚBLICO: LISTA DE COLEGIOS ──
  async listarColegiosPublicos() {
    const colegios = await this.prisma.colegio.findMany({
      where: { estado: 'Activo' },
      select: {
        id_colegio: true,
        nombre: true,
        nombre_corto: true,
        codigo: true,
        logo_url: true,
        color_principal: true,
      },
      orderBy: { nombre: 'asc' },
    });

    return colegios;
  }

  // ── PORTAL PÚBLICO: CONSULTA DE PAGOS POR DNI ──
  async consultarPagosPublicosPorDni(colegioId: number, dni: string) {
    const dniLimpio = String(dni || '').replace(/\D/g, '');

    if (!colegioId) {
      throw new BadRequestException('Selecciona el colegio.');
    }

    if (dniLimpio.length !== 8) {
      throw new BadRequestException('Ingresa un DNI válido de 8 dígitos.');
    }

    const colegio = await this.prisma.colegio.findFirst({
      where: { id_colegio: colegioId, estado: 'Activo' },
      include: { datos_cobro: true },
    });

    if (!colegio) {
      throw new NotFoundException('No se encontró el colegio seleccionado.');
    }

    const matriculas = await this.prisma.matricula.findMany({
      where: {
        id_colegio: colegioId,
        estudiante: {
          persona: { dni: dniLimpio },
        },
      },
      include: {
        anio: true,
        estudiante: { include: { persona: true } },
        seccion: {
          include: {
            grado: { include: { nivel: true } },
          },
        },
        cronogramas: {
          where: {
            NOT: {
              estado_publicacion: 'Anulado',
            },
          },
          include: {
            concepto: true,
            pagos: {
              orderBy: {
                fecha_pago: 'desc',
              },
            },
            pagos_recibidos: {
              where: {
                estado: {
                  in: ['Pendiente', 'Identificado', 'Observado', 'Rechazado'],
                },
              },
              orderBy: {
                created_at: 'desc',
              },
              take: 1,
            },
          },
          orderBy: {
            fecha_vencimiento: 'asc',
          },
        },
      },
      orderBy: [{ id_anio: 'desc' }, { id_matricula: 'desc' }],
    });

    if (!matriculas.length) {
      throw new NotFoundException(
        'No encontramos pagos para ese DNI en el colegio seleccionado.',
      );
    }

    const alumno = matriculas[0].estudiante.persona;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const diasAnticipacionPortal = 5;
    const limiteVisibilidadAutomatica = new Date(hoy);
    limiteVisibilidadAutomatica.setDate(hoy.getDate() + diasAnticipacionPortal);
    limiteVisibilidadAutomatica.setHours(23, 59, 59, 999);

    const pagos = matriculas.flatMap((matricula) => {
      return matricula.cronogramas.map((cronograma) => {
        const monto = this.montoProgramadoCronograma(cronograma);
        const pagado = cronograma.pagos.reduce(
          (sum, pago) => sum + Number(pago.monto_pagado || 0),
          0,
        );
        const saldo = Math.max(Number(monto || 0) - pagado, 0);
        const ultimoPago = cronograma.pagos?.[0] || null;
        const reporteReciente = cronograma.pagos_recibidos?.[0] || null;
        const estadoReporte = reporteReciente?.estado || null;
        const enRevision =
          !!estadoReporte && ['Pendiente', 'Identificado'].includes(estadoReporte);
        const reporteObservado = estadoReporte === 'Observado';
        const reporteRechazado = estadoReporte === 'Rechazado';
        const puedeReportarPago =
          !reporteReciente || reporteObservado || reporteRechazado;

        const vencimiento = cronograma.fecha_vencimiento
          ? new Date(cronograma.fecha_vencimiento)
          : null;
        if (vencimiento) vencimiento.setHours(0, 0, 0, 0);

        const esPagado = saldo <= 0 || cronograma.estado_pago === 'Pagado';
        const visiblePorFecha =
          !!vencimiento && vencimiento <= limiteVisibilidadAutomatica;
        const visibleManual = Boolean(cronograma.visible_apoderado);

        const visiblePortal = esPagado || visibleManual || visiblePorFecha;

        const motivoVisibilidad = esPagado
          ? 'PAGADO'
          : visibleManual
            ? 'MANUAL'
            : visiblePorFecha
              ? 'VENTANA_5_DIAS'
              : 'OCULTO';

        return {
          id_cronograma: cronograma.id_cronograma,
          referencia_pago: cronograma.referencia_pago,
          concepto: cronograma.concepto?.nombre_concepto || 'Pago escolar',
          tipo_concepto: cronograma.concepto?.tipo_concepto || null,
          estado_pago: cronograma.estado_pago,
          fecha_vencimiento: cronograma.fecha_vencimiento,
          monto: Number(monto || 0),
          pagado,
          saldo,
          requiere_pago: saldo > 0 && cronograma.estado_pago !== 'Pagado',
          estado_publicacion: cronograma.estado_publicacion,
          visible_apoderado: cronograma.visible_apoderado,
          fecha_publicacion: cronograma.fecha_publicacion,
          visible_portal: visiblePortal,
          motivo_visibilidad: motivoVisibilidad,
          dias_anticipacion_portal: diasAnticipacionPortal,
          ultimo_pago: ultimoPago
            ? {
                id_transaccion: ultimoPago.id_transaccion,
                monto_pagado: ultimoPago.monto_pagado,
                metodo_pago: ultimoPago.metodo_pago,
                nro_operacion: ultimoPago.nro_operacion,
                fecha_pago: ultimoPago.fecha_pago,
                codigo_recibo: `REC-${new Date(ultimoPago.fecha_pago).getFullYear()}-${String(
                  ultimoPago.id_transaccion,
                ).padStart(6, '0')}`,
              }
            : null,
          en_revision: enRevision,
          reporte_observado: reporteObservado,
          reporte_rechazado: reporteRechazado,
          puede_reportar_pago: puedeReportarPago,
          reporte_pago: reporteReciente
            ? {
                id_pago_recibido: reporteReciente.id_pago_recibido,
                estado: reporteReciente.estado,
                monto_recibido: reporteReciente.monto_recibido,
                medio_pago: reporteReciente.medio_pago,
                banco_destino: reporteReciente.banco_destino,
                numero_operacion: reporteReciente.numero_operacion,
                nombre_pagador: reporteReciente.nombre_pagador,
                captura_url: reporteReciente.captura_url,
                fecha_reporte: reporteReciente.created_at,
                observacion: reporteReciente.observacion,
              }
            : null,
          matricula: {
            id_matricula: matricula.id_matricula,
            codigo_matricula: matricula.codigo_matricula,
            estado_matricula: matricula.estado_matricula,
            anio: matricula.anio?.nombre_anio,
            aula: matricula.seccion
              ? `${matricula.seccion.grado?.nombre_grado || ''} ${matricula.seccion.letra || ''}`.trim()
              : null,
            nivel: matricula.seccion?.grado?.nivel?.nombre_nivel || null,
          },
        };
      });
    });

    const pagosOrdenados = pagos.sort((a, b) => {
      if (a.requiere_pago !== b.requiere_pago) {
        return a.requiere_pago ? -1 : 1;
      }

      const fa = a.fecha_vencimiento
        ? new Date(a.fecha_vencimiento).getTime()
        : 0;
      const fb = b.fecha_vencimiento
        ? new Date(b.fecha_vencimiento).getTime()
        : 0;

      return fa - fb;
    });

    const pagosVisiblesPortal = pagosOrdenados.filter((pago) => pago.visible_portal);

    const pagosParaPagar = pagosVisiblesPortal.filter((pago) => {
      if (!pago.requiere_pago) return false;
      if (!pago.fecha_vencimiento) return true;

      const vencimiento = new Date(pago.fecha_vencimiento);
      vencimiento.setHours(0, 0, 0, 0);

      return vencimiento <= hoy;
    });

    const proximosPagos = pagosVisiblesPortal.filter((pago) => {
      if (!pago.requiere_pago) return false;
      if (!pago.fecha_vencimiento) return false;

      const vencimiento = new Date(pago.fecha_vencimiento);
      vencimiento.setHours(0, 0, 0, 0);

      return vencimiento > hoy;
    });

    const pagosCubiertos = pagosOrdenados.filter((pago) => !pago.requiere_pago);

    const pagosVencidos = pagosOrdenados.filter((pago) => {
      if (!pago.requiere_pago || !pago.fecha_vencimiento) return false;
      const vencimiento = new Date(pago.fecha_vencimiento);
      return vencimiento < hoy;
    });

    const pagosEnRevision = pagosOrdenados.filter((pago) => pago.en_revision);
    const pagosObservados = pagosOrdenados.filter((pago) => pago.reporte_observado);
    const pagosRechazados = pagosOrdenados.filter((pago) => pago.reporte_rechazado);

    const totalProgramado = pagosOrdenados.reduce(
      (sum, pago) => sum + Number(pago.monto || 0),
      0,
    );

    const totalPagado = pagosOrdenados.reduce(
      (sum, pago) => sum + Number(pago.pagado || 0),
      0,
    );

    const saldoPendiente = pagosOrdenados.reduce(
      (sum, pago) => sum + Number(pago.saldo || 0),
      0,
    );

    const aniosEstadoCuenta = Array.from(
      new Set(pagosOrdenados.map((pago) => pago.matricula?.anio).filter(Boolean)),
    );

    const estadoCuenta = {
      total_programado: totalProgramado,
      total_pagado: totalPagado,
      saldo_pendiente: saldoPendiente,
      cantidad_total: pagosOrdenados.length,
      cantidad_pagados: pagosCubiertos.length,
      cantidad_pendientes: pagosOrdenados.filter((pago) => pago.requiere_pago).length,
      cantidad_vencidos: pagosVencidos.length,
      cantidad_proximos: proximosPagos.length,
      cantidad_en_revision: pagosEnRevision.length,
      cantidad_observados: pagosObservados.length,
      cantidad_rechazados: pagosRechazados.length,
      anios: aniosEstadoCuenta,
      generado_en: new Date(),
    };

    const totalPorPagar = pagosParaPagar.reduce(
      (sum, pago) => sum + Number(pago.saldo || 0),
      0,
    );

    const totalPendienteProgramado = pagosOrdenados
      .filter((pago) => pago.requiere_pago)
      .reduce((sum, pago) => sum + Number(pago.saldo || 0), 0);

    const datosCobro = colegio.datos_cobro;
    const datosCobroPublicos =
      datosCobro && datosCobro.activo
        ? {
            nombre_destinatario: datosCobro.nombre_destinatario,
            numero_yape: datosCobro.numero_yape,
            numero_plin: datosCobro.numero_plin,
            banco_1: datosCobro.banco_1,
            cuenta_1: datosCobro.cuenta_1,
            cci_1: datosCobro.cci_1,
            banco_2: datosCobro.banco_2,
            cuenta_2: datosCobro.cuenta_2,
            cci_2: datosCobro.cci_2,
            qr_yape_url: datosCobro.qr_yape_url,
            qr_plin_url: datosCobro.qr_plin_url,
            instrucciones: datosCobro.instrucciones,
          }
        : null;

    return {
      colegio: {
        id_colegio: colegio.id_colegio,
        nombre: colegio.nombre,
        nombre_corto: colegio.nombre_corto,
        codigo: colegio.codigo,
        logo_url: colegio.logo_url,
        color_principal: colegio.color_principal,
      },
      alumno: {
        dni: alumno.dni,
        nombres: alumno.nombres,
        apellido_paterno: alumno.apellido_paterno,
        apellido_materno: alumno.apellido_materno,
      },
      estado_cuenta: estadoCuenta,
      resumen: {
        total_por_pagar: totalPorPagar,
        total_pendiente_programado: totalPendienteProgramado,
        cantidad_por_pagar: pagosParaPagar.length,
        cantidad_proximos: proximosPagos.length,
        cantidad_pagados: pagosCubiertos.length,
        cantidad_total: pagosVisiblesPortal.length,
        cantidad_total_cronograma: pagosOrdenados.length,
      },
      matriculas: matriculas.map((matricula) => ({
        id_matricula: matricula.id_matricula,
        codigo_matricula: matricula.codigo_matricula,
        estado_matricula: matricula.estado_matricula,
        anio: matricula.anio?.nombre_anio,
        aula: matricula.seccion
          ? `${matricula.seccion.grado?.nombre_grado || ''} ${matricula.seccion.letra || ''}`.trim()
          : null,
        nivel: matricula.seccion?.grado?.nivel?.nombre_nivel || null,
      })),
      pagos: pagosOrdenados,
      pagos_visibles: pagosVisiblesPortal,
      pagos_para_pagar: pagosParaPagar,
      proximos_pagos: proximosPagos,
      pagos_cubiertos: pagosCubiertos,
      datos_cobro: datosCobroPublicos,
      instrucciones: {
        mensaje:
          datosCobroPublicos?.instrucciones ||
          'Coloca el código de pago en la descripción del Yape, Plin o transferencia.',
      },
    };
  }

  async actualizarVisibilidadCronogramaApoderado(
    idCronograma: number,
    body: { visible_apoderado?: boolean },
    params: ScopeParams,
  ) {
    const scope = await this.resolveScope(params);

    const cronograma = await this.prisma.cronogramaPagos.findFirst({
      where: {
        id_cronograma: idCronograma,
        matricula: {
          id_colegio: { in: scope.colegioIds },
        },
      },
      include: {
        concepto: true,
        matricula: {
          include: {
            estudiante: { include: { persona: true } },
            colegio: true,
          },
        },
      },
    });

    if (!cronograma) {
      throw new NotFoundException('No se encontró el cronograma.');
    }

    const visible = body.visible_apoderado === true;

    const actualizado = await this.prisma.cronogramaPagos.update({
      where: { id_cronograma: idCronograma },
      data: {
        visible_apoderado: visible,
        estado_publicacion: visible ? 'Publicado' : 'Programado',
        fecha_publicacion: visible ? new Date() : null,
      },
      include: {
        concepto: true,
      },
    });

    return {
      message: visible
        ? 'El concepto ahora es visible para el apoderado.'
        : 'El concepto fue ocultado del listado público normal.',
      cronograma: actualizado,
    };
  }

  // ── MÉTODO PÚBLICO: REPORTAR PAGO ──
  async reportarPagoPublico(body: any, capturaUrl?: string | null) {
    const colegioId = Number(body.colegio_id);
    const idCronograma = Number(body.id_cronograma);
    const dni = String(body.dni || '').replace(/\D/g, '');
    const referencia = this.normalizeEmpty(body.referencia_pago);
    const medioPago = this.normalizeEmpty(body.medio_pago) || 'Yape';
    const bancoDestino = this.normalizeEmpty(body.banco_destino);
    const monto = Number(body.monto_recibido);
    const numeroOperacion = this.normalizeEmpty(body.numero_operacion);
    const nombrePagador = this.normalizeEmpty(body.nombre_pagador);

    if (!colegioId) throw new BadRequestException('Selecciona el colegio.');
    if (!idCronograma) throw new BadRequestException('No se identificó el pago escolar.');
    if (dni.length !== 8) throw new BadRequestException('Ingresa un DNI válido.');
    if (!Number.isFinite(monto) || monto <= 0) throw new BadRequestException('Ingresa un monto válido.');
    if (!numeroOperacion) throw new BadRequestException('Ingresa el número de operación.');
    if (!nombrePagador) throw new BadRequestException('Ingresa el nombre del pagador.');
    if (medioPago === 'Transferencia' && !bancoDestino) {
      throw new BadRequestException('Selecciona el banco destino.');
    }
    if (!capturaUrl) throw new BadRequestException('Adjunta la captura del comprobante.');

    const cronograma = await this.prisma.cronogramaPagos.findFirst({
      where: {
        id_cronograma: idCronograma,
        referencia_pago: referencia || undefined,
        matricula: {
          id_colegio: colegioId,
          estudiante: {
            persona: { dni },
          },
        },
      },
      include: {
        concepto: true,
        pagos: true,
        matricula: {
          include: {
            colegio: true,
            estudiante: {
              include: {
                persona: true,
                apoderados: true,
              },
            },
          },
        },
      },
    });

    if (!cronograma) {
      throw new NotFoundException('No se encontró el pago escolar para los datos ingresados.');
    }

    const reportesAReemplazar = await this.prisma.pagoRecibido.findMany({
      where: {
        id_cronograma: cronograma.id_cronograma,
        estado: { in: ['Observado', 'Rechazado'] },
      },
      select: {
        id_pago_recibido: true,
        estado: true,
        observacion: true,
      },
    });

    const duplicado = await this.prisma.pagoRecibido.findFirst({
      where: {
        id_cronograma: cronograma.id_cronograma,
        numero_operacion: numeroOperacion,
        estado: { in: ['Pendiente', 'Identificado', 'Aplicado'] },
      },
    });

    if (duplicado) {
      throw new BadRequestException('Ya existe un reporte con ese número de operación para este pago.');
    }

    await this.prisma.pagoRecibido.updateMany({
      where: {
        id_cronograma: cronograma.id_cronograma,
        estado: { in: ['Observado', 'Rechazado'] },
      },
      data: {
        estado: 'Reemplazado',
      },
    });

    await Promise.all(
      reportesAReemplazar.map((item) =>
        this.registrarHistorialPagoRecibido(this.prisma, {
          idPagoRecibido: item.id_pago_recibido,
          accion: 'REEMPLAZAR_REPORTE',
          estadoAnterior: item.estado,
          estadoNuevo: 'Reemplazado',
          observacion: item.observacion,
          userId: null,
          origen: 'Portal público',
        }),
      ),
    );

    const idApoderado = cronograma.matricula.estudiante.apoderados?.[0]?.id_apoderado || null;

    const pago = await this.prisma.pagoRecibido.create({
      data: {
        id_tenant: cronograma.matricula.colegio?.id_tenant || null,
        id_colegio: cronograma.matricula.id_colegio,
        medio_pago: medioPago,
        banco_destino: bancoDestino,
        monto_recibido: monto,
        fecha_pago_reportada: new Date(),
        nombre_pagador: nombrePagador,
        telefono_pagador: this.normalizeEmpty(body.telefono_pagador),
        numero_operacion: numeroOperacion,
        referencia_escrita: cronograma.referencia_pago,
        captura_url: capturaUrl,
        estado: 'Identificado',
        id_cronograma: cronograma.id_cronograma,
        id_matricula: cronograma.matricula.id_matricula,
        id_estudiante: cronograma.matricula.id_estudiante,
        id_apoderado: idApoderado,
        observacion: 'Reportado desde portal público de pagos.',
        origen_reporte: 'Portal público',
        id_usuario_registro: null,
      },
      include: {
        cronograma: { include: { concepto: true } },
        matricula: true,
        estudiante: { include: { persona: true } },
        apoderado: { include: { persona: true } },
      },
    });

    await this.registrarHistorialPagoRecibido(this.prisma, {
      idPagoRecibido: pago.id_pago_recibido,
      accion: 'REPORTE_PUBLICO',
      estadoAnterior: null,
      estadoNuevo: pago.estado,
      observacion: 'Comprobante enviado desde portal público.',
      userId: null,
      origen: 'Portal público',
      metadata: {
        medio_pago: pago.medio_pago,
        monto_recibido: Number(pago.monto_recibido || 0),
        numero_operacion: pago.numero_operacion,
        captura_url: pago.captura_url,
      },
    });

    return {
      message: 'Comprobante enviado correctamente. El colegio revisará y confirmará el pago.',
      pago,
    };
  }

  // ── MÉTODO PARA CONSULTAR HISTORIAL DE PAGO RECIBIDO ──
  async listarHistorialPagoRecibido(idPagoRecibido: number, params: ScopeParams) {
    const scope = await this.resolveScope(params);

    const pago = await this.prisma.pagoRecibido.findFirst({
      where: {
        id_pago_recibido: idPagoRecibido,
        OR: [{ id_colegio: { in: scope.colegioIds } }, { id_colegio: null }],
      },
      select: { id_pago_recibido: true },
    });

    if (!pago) {
      throw new NotFoundException('No se encontró el pago recibido.');
    }

    return this.prisma.pagoRecibidoHistorial.findMany({
      where: { id_pago_recibido: idPagoRecibido },
      include: {
        usuario: {
          select: {
            id_usuario: true,
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
      },
      orderBy: { created_at: 'desc' },
    });
  }
}