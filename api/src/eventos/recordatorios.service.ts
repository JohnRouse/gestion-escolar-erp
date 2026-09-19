import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { PrismaService } from '../prisma/prisma.service';

function bogotaDateParts(value: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const get = (type: string) =>
    Number(parts.find((item) => item.type === type)?.value);
  return { year: get('year'), month: get('month'), day: get('day') };
}

@Injectable()
export class RecordatoriosService {
  private readonly logger = new Logger(RecordatoriosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacionesService: NotificacionesService,
  ) {}

  @Cron('0 7 * * *', { timeZone: 'America/Bogota' })
  async enviarRecordatoriosDeEventos(now = new Date()) {
    const base = bogotaDateParts(now);
    const target = new Date(Date.UTC(base.year, base.month - 1, base.day + 2));
    const start = target;
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

    const events = await this.prisma.evento.findMany({
      where: {
        estado: 'programado',
        id_tenant: { not: null },
        id_colegio: { not: null },
        fecha: { gte: start, lt: end },
      },
      include: { destinatarios: true },
    });

    for (const event of events) {
      if (!event.id_tenant || !event.id_colegio) continue;
      const type = event.destinatarios[0]?.tipo_destino as
        | 'colegio'
        | 'niveles'
        | 'grados'
        | 'secciones'
        | undefined;
      if (!type) {
        this.logger.warn(
          `Evento ${event.id_evento} omitido: no tiene audiencia estructurada.`,
        );
        continue;
      }
      const ids = event.destinatarios
        .map((item) =>
          type === 'niveles'
            ? item.id_nivel
            : type === 'grados'
              ? item.id_grado
              : type === 'secciones'
                ? item.id_seccion
                : null,
        )
        .filter((id): id is number => id !== null);
      const time = event.hora_inicio ?? event.hora;
      await this.notificacionesService.notificarApoderadosDeAudienciaEvento({
        id_tenant: event.id_tenant,
        id_colegio: event.id_colegio,
        id_anio: event.id_anio,
        audiencia: { tipo: type, ids },
        tipo: 'evento.recordatorio',
        origen: 'eventos',
        referencia_tipo: 'evento',
        referencia_id: event.id_evento,
        canal: 'padres',
        titulo: `Recordatorio: ${event.titulo}`,
        mensaje: `Faltan 2 días para ${event.titulo}${time ? ` a las ${time}` : ''}.`,
        url: '/dashboard/calendario',
        deduplicar_existentes: true,
      });
    }

    this.logger.log(`Recordatorios procesados: ${events.length} evento(s).`);
    return { procesados: events.length };
  }
}
