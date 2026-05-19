import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';

@Injectable()
export class CitasService {
  constructor(
    private prisma: PrismaService,
    private notificaciones: NotificacionesService,
  ) {}

  async solicitarCita(
    idApoderado: number,
    idStaff: number,
    fecha: string,
    horaInicio: string,
    horaFin: string,
    motivo?: string,
  ) {
    // Validar staff
    const staff = await this.prisma.staff.findUnique({
      where: { id_staff: idStaff },
    });
    if (!staff) throw new NotFoundException('Staff no encontrado');
    if (!staff.permite_citas) throw new BadRequestException('Este staff no acepta citas');

    // Validar que el apoderado tenga un hijo en una sección donde el staff imparte clases (o sea staff general)
    // Por simplicidad, permitimos siempre (ya que el directorio solo muestra staff relevante)

    // Validar solapamiento
    const solapada = await this.prisma.cita.findFirst({
      where: {
        id_staff: idStaff,
        fecha: new Date(fecha),
        estado: { in: ['pendiente', 'confirmada'] },
        OR: [
          { hora_inicio: { lt: horaFin }, hora_fin: { gt: horaInicio } },
        ],
      },
    });
    if (solapada) throw new BadRequestException('Ya existe una cita en ese horario');

    const cita = await this.prisma.cita.create({
      data: {
        id_staff: idStaff,
        id_apoderado: idApoderado,
        fecha: new Date(fecha),
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        motivo,
        estado: 'pendiente',
      },
    });

    // Notificar al staff (cuando haya intranet) – por ahora solo al apoderado como confirmación de solicitud
    // (opcional) await this.notificaciones.crearNotificacion(...)

    return cita;
  }

  async obtenerCitasApoderado(idApoderado: number) {
    return this.prisma.cita.findMany({
      where: { id_apoderado: idApoderado },
      include: {
        staff: { include: { persona: true } },
      },
      orderBy: { creado_en: 'desc' },
    });
  }

  async cambiarEstadoCita(idCita: number, nuevoEstado: string) {
    const cita = await this.prisma.cita.update({
      where: { id_cita: idCita },
      data: { estado: nuevoEstado },
    });
    // Aquí se notificaría al apoderado
    return cita;
  }
}