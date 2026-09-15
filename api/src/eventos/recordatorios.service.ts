import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';

@Injectable()
export class RecordatoriosService {
  private readonly logger = new Logger(RecordatoriosService.name);

  constructor(
    private prisma: PrismaService,
    private notificacionesService: NotificacionesService,
  ) {}

  // Se ejecuta todos los días a las 7:00 AM
  @Cron('0 7 * * *')
  async enviarRecordatoriosDeEventos() {
    this.logger.log('🔔 Verificando eventos próximos...');

    const hoy = new Date();
    const dosDiasDespues = new Date(hoy);
    dosDiasDespues.setDate(hoy.getDate() + 2);

    const inicio = new Date(dosDiasDespues.setHours(0, 0, 0, 0));
    const fin = new Date(dosDiasDespues.setHours(23, 59, 59, 999));

    const eventos = await this.prisma.evento.findMany({
      where: {
        fecha: { gte: inicio, lte: fin },
      },
    });

    if (eventos.length === 0) {
      this.logger.log('Ningún evento próximo encontrado');
      return;
    }

    this.logger.log(`Encontrados ${eventos.length} eventos para recordar`);

    for (const evento of eventos) {
      if (!evento.id_tenant) {
        this.logger.warn(
          `Evento ${evento.id_evento} omitido: no tiene contexto institucional seguro.`,
        );
        continue;
      }
      const horaTexto = evento.hora ? ` a las ${evento.hora}` : '';
      const fechaFormateada = evento.fecha.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'short',
      });

      const mensaje = `📅 Faltan 2 días para "${evento.titulo}" – ${fechaFormateada}${horaTexto}${evento.descripcion ? '. ' + evento.descripcion : ''}`;
      const titulo = `Recordatorio: ${evento.titulo}`;

      const niveles = await this.prisma.nivel.findMany();
      await this.notificacionesService.notificarApoderadosDeNivel({
        nivelIds: niveles.map((nivel) => nivel.id_nivel),
        id_tenant: evento.id_tenant,
        id_colegio: evento.id_colegio,
        tipo: 'evento.recordatorio',
        origen: 'eventos',
        referencia_tipo: 'evento',
        referencia_id: evento.id_evento,
        canal: 'padres',
        titulo,
        mensaje,
        url: '/dashboard/calendario',
      });
    }

    this.logger.log('Recordatorios enviados correctamente');
  }

  // Endpoint de prueba
  async ejecutarRecordatoriosPrueba() {
    this.logger.log('Ejecutando recordatorios de prueba...');
    await this.enviarRecordatoriosDeEventos();
    return { message: 'Recordatorios de prueba ejecutados' };
  }
}
