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

      // Notificar al apoderado que realizó el pago
      const usuarioApoderado = await this.prisma.usuario.findFirst({
        where: { persona: { id_persona: dto.id_apoderado } },
      });
      if (usuarioApoderado) {
        await this.notificacionesService.crearNotificacion({
          id_usuario: usuarioApoderado.id_usuario,
          tipo: 'administrativa',
          titulo: 'Pago registrado',
          mensaje: `Se ha registrado un pago por S/ ${montoAPagar.toFixed(2)} para "${cronograma.concepto.nombre_concepto}".`,
          url: '/dashboard/pagos',
        });
      }
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
}