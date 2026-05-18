import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegistrarPagoDto } from './dto/registrar-pago.dto';
import { NotificacionesService } from '../notificaciones/notificaciones.service';

@Injectable()
export class FinanzasService {
  constructor(
    private prisma: PrismaService,
    private notificacionesService: NotificacionesService,
  ) {}

  async getEstadoCuenta(matriculaId: number) {
    const matricula = await this.prisma.matricula.findUnique({
      where: { id_matricula: matriculaId },
      include: {
        cronogramas: {
          include: { concepto: true, pagos: true },
          orderBy: { fecha_vencimiento: 'asc' },
        },
      },
    });

    if (!matricula) throw new NotFoundException('Matrícula no encontrada');

    const deudas = matricula.cronogramas.map((cron) => ({
      id_cronograma: cron.id_cronograma,
      concepto: cron.concepto.nombre_concepto,
      fecha_vencimiento: cron.fecha_vencimiento,
      monto_base: cron.concepto.monto_base,
      estado: cron.estado_pago,
      pagos: cron.pagos.map((p) => ({
        monto: p.monto_pagado,
        fecha: p.fecha_pago,
        metodo: p.metodo_pago,
      })),
    }));

    const totalPendiente = deudas
      .filter((d) => d.estado === 'Pendiente' || d.estado === 'Vencido')
      .reduce((sum, d) => sum + Number(d.monto_base), 0);

    return {
      id_matricula: matricula.id_matricula,
      estado_matricula: matricula.estado_matricula,
      deudas,
      total_pendiente: totalPendiente,
    };
  }

  async registrarPago(dto: RegistrarPagoDto, cajeroId: number) {
  const matricula = await this.prisma.matricula.findUnique({
    where: { id_matricula: dto.id_matricula },
  });
  if (!matricula) throw new NotFoundException('Matrícula no encontrada');

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
      include: { concepto: true },
    });

    if (!cronograma) throw new NotFoundException(`Cronograma con id ${pagoItem.id_cronograma} no encontrado`);
    if (cronograma.estado_pago === 'Pagado') throw new BadRequestException('La deuda ya está pagada');

    // ✅ Validación: si el concepto NO es matrícula (es_pension = true),
    // verificar que la matrícula de esta matrícula esté pagada
    if (cronograma.concepto.es_pension) {
      const conceptoMatricula = await this.prisma.conceptoPago.findFirst({
        where: { id_anio: matricula.id_anio, es_pension: false },
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

    const montoAPagar = pagoItem.monto_pagado ?? Number(cronograma.concepto.monto_base);
    if (montoAPagar <= 0) throw new BadRequestException('Monto debe ser mayor a 0');
    if (montoAPagar > Number(cronograma.concepto.monto_base)) throw new BadRequestException('Monto excede el valor de la deuda');

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

    const nuevoEstado = montoAPagar >= Number(cronograma.concepto.monto_base) ? 'Pagado' : cronograma.estado_pago;
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

    // Sin notificación al apoderado (solo se refleja en Actividad Reciente)
  }

  return { message: 'Pagos registrados correctamente', pagos: resultados };
}

  async getEstadoCuentaPadre(estudianteId: number) {
    const matriculaActiva = await this.prisma.matricula.findFirst({
      where: { id_estudiante: estudianteId, estado_matricula: 'Activo' },
      orderBy: { id_matricula: 'desc' },
    });
    if (!matriculaActiva) throw new NotFoundException('No se encontró matrícula activa');
    return this.getEstadoCuenta(matriculaActiva.id_matricula);
  }

  async getPagosPendientesCount() {
    return this.prisma.cronogramaPagos.count({
      where: { estado_pago: { in: ['Pendiente', 'Vencido'] } },
    });
  }

  async crearPagoExtraordinario(dto: any) {
  const anioActivo = await this.prisma.anioLectivo.findFirst({
    where: { estado: 'Abierto' },
    orderBy: { fecha_inicio: 'desc' },
  });
  if (!anioActivo) throw new BadRequestException('No hay año lectivo activo');

  // 1. Crear el concepto
  const concepto = await this.prisma.conceptoPago.create({
    data: {
      nombre_concepto: dto.nombre_concepto,
      monto_base: dto.monto,
      id_anio: anioActivo.id_anio,
      es_pension: false,
      es_extraordinario: true,
    },
  });

  const fechaVencimiento = dto.fecha_vencimiento
    ? new Date(dto.fecha_vencimiento)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // por defecto +7 días

  // 2. Determinar los estudiantes
  const idsEstudiantes = new Set<number>();

  if (dto.estudiantes?.length) {
    for (const id of dto.estudiantes) idsEstudiantes.add(id);
  }

  if (dto.niveles?.length) {
    const matriculasNivel = await this.prisma.matricula.findMany({
      where: {
        estado_matricula: 'Activo',
        id_anio: anioActivo.id_anio,
        seccion: { grado: { id_nivel: { in: dto.niveles } } },
      },
      select: { id_estudiante: true },
    });
    for (const m of matriculasNivel) idsEstudiantes.add(m.id_estudiante);
  }

  if (dto.secciones?.length) {
    const matriculasSeccion = await this.prisma.matricula.findMany({
      where: {
        estado_matricula: 'Activo',
        id_anio: anioActivo.id_anio,
        id_seccion: { in: dto.secciones },
      },
      select: { id_estudiante: true },
    });
    for (const m of matriculasSeccion) idsEstudiantes.add(m.id_estudiante);
  }

  if (idsEstudiantes.size === 0) {
    throw new BadRequestException('No se encontraron estudiantes para asignar el cobro');
  }

  // 3. Crear cronograma para cada estudiante
  const matriculas = await this.prisma.matricula.findMany({
    where: {
      id_estudiante: { in: Array.from(idsEstudiantes) },
      estado_matricula: 'Activo',
      id_anio: anioActivo.id_anio,
    },
    select: { id_matricula: true, id_estudiante: true },
  });

  let totalCreados = 0;

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

  // Obtener el nombre del estudiante
  const estudiante = await this.prisma.estudiante.findUnique({
    where: { id_persona: mat.id_estudiante },
    include: { persona: true },
  });
  const nombreEstudiante = estudiante
    ? `${estudiante.persona.nombres} ${estudiante.persona.apellido_paterno}`
    : 'su hijo';

  // Notificar al apoderado
  await this.notificacionesService.notificarApoderadosDeAlumno(
    mat.id_estudiante,
    'administrativa',
    'Nuevo pago pendiente',
    `Nuevo pago para ${nombreEstudiante}: "${dto.nombre_concepto}" por S/ ${dto.monto.toFixed(2)}.`,
    `/dashboard/pagos?alumno_id=${mat.id_estudiante}&cronograma_id=${nuevoCronograma.id_cronograma}`,
  );
}

  return {
    message: `Concepto creado y ${totalCreados} cronogramas generados`,
    id_concepto: concepto.id_concepto,
    total_afectados: totalCreados,
  };
}
}