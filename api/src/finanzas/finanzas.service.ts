import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegistrarPagoDto } from './dto/registrar-pago.dto';

@Injectable()
export class FinanzasService {
  constructor(private prisma: PrismaService) {}

  /**
   * Obtiene el estado de cuenta de una matrícula:
   * - Deudas (cronograma de pagos) con su estado y concepto.
   * - Pagos realizados (transacciones).
   */
  async getEstadoCuenta(matriculaId: number) {
    const matricula = await this.prisma.matricula.findUnique({
      where: { id_matricula: matriculaId },
      include: {
        cronogramas: {
          include: {
            concepto: true,
            pagos: true,
          },
          orderBy: { fecha_vencimiento: 'asc' },
        },
      },
    });

    if (!matricula) {
      throw new NotFoundException('Matrícula no encontrada');
    }

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

  /**
   * Registra uno o varios pagos para deudas de una matrícula.
   * Valida que las deudas existan, estén pendientes/vencidas y que el monto pagado no exceda el pendiente.
   */
  async registrarPago(dto: RegistrarPagoDto, cajeroId: number) {
    // Validar que la matrícula exista
    const matricula = await this.prisma.matricula.findUnique({
      where: { id_matricula: dto.id_matricula },
    });
    if (!matricula) {
      throw new NotFoundException('Matrícula no encontrada');
    }

    // Validar que el apoderado exista
    const apoderado = await this.prisma.apoderado.findUnique({
      where: { id_persona: dto.id_apoderado },
    });
    if (!apoderado) {
      throw new NotFoundException('Apoderado no encontrado');
    }

    // Procesar cada pago
    const resultados: Array<{
  id_transaccion: number;
  concepto: string;
  monto_pagado: number;
  nuevo_estado: string;
    }> = [];
    for (const pagoItem of dto.pagos) {
      const cronograma = await this.prisma.cronogramaPagos.findUnique({
        where: { id_cronograma: pagoItem.id_cronograma },
        include: { concepto: true },
      });

      if (!cronograma) {
        throw new NotFoundException(`Cronograma con id ${pagoItem.id_cronograma} no encontrado`);
      }

      if (cronograma.estado_pago === 'Pagado') {
        throw new BadRequestException(`La deuda '${cronograma.concepto.nombre_concepto}' ya está pagada`);
      }

      const montoAPagar = pagoItem.monto_pagado ?? Number(cronograma.concepto.monto_base);

      if (montoAPagar <= 0) {
        throw new BadRequestException('El monto a pagar debe ser mayor a 0');
      }

      if (montoAPagar > Number(cronograma.concepto.monto_base)) {
        throw new BadRequestException(
          `El monto pagado (${montoAPagar}) excede el monto base (${cronograma.concepto.monto_base})`,
        );
      }

      // Crear la transacción de pago
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

      // Actualizar el estado de la deuda (si el monto pagado es igual al monto base, se marca como pagado)
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
    }

    return {
      message: 'Pagos registrados correctamente',
      pagos: resultados,
    };
  }

  /**
   * Endpoint para el padre: estado de cuenta de un alumno.
   * Como un alumno puede tener múltiples matrículas (años diferentes), usualmente se filtra por la matrícula activa.
   * Aquí simplificamos recibiendo el id del estudiante y buscando su matrícula activa.
   */
  async getEstadoCuentaPadre(estudianteId: number) {
    const matriculaActiva = await this.prisma.matricula.findFirst({
      where: {
        id_estudiante: estudianteId,
        estado_matricula: 'Activo',
      },
      orderBy: { id_matricula: 'desc' },
    });

    if (!matriculaActiva) {
      throw new NotFoundException('No se encontró matrícula activa para este estudiante');
    }

    return this.getEstadoCuenta(matriculaActiva.id_matricula);
  }

  async getPagosPendientesCount() {
  return this.prisma.cronogramaPagos.count({
    where: { estado_pago: { in: ['Pendiente', 'Vencido'] } },
  });
}
}