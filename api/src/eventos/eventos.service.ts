import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';

@Injectable()
export class EventosService {
  constructor(
    private prisma: PrismaService,
    private notificacionesService: NotificacionesService,
  ) {}

  async obtenerEventos(anioId: number, mes: number) {
    const anio = await this.prisma.anioLectivo.findUnique({
      where: { id_anio: anioId },
    });
    if (!anio) throw new NotFoundException('Año lectivo no encontrado');

    const inicio = new Date(anio.fecha_inicio.getFullYear(), mes - 1, 1);
    const fin = new Date(anio.fecha_inicio.getFullYear(), mes, 0);

    return this.prisma.evento.findMany({
      where: {
        id_anio: anioId,
        fecha: { gte: inicio, lte: fin },
      },
      orderBy: { fecha: 'asc' },
    });
  }

  async crearEvento(data: {
    titulo: string;
    fecha: string;
    hora?: string;
    tipo: string;
    descripcion?: string;
    id_anio: number;
    niveles?: number[];
    secciones?: number[];
    generar_circular?: boolean;
  }) {
    const anio = await this.prisma.anioLectivo.findUnique({
      where: { id_anio: data.id_anio },
      select: {
        id_tenant: true,
        id_colegio: true,
        colegio: { select: { id_tenant: true } },
      },
    });
    if (!anio) throw new NotFoundException('Año lectivo no encontrado');
    const tenantId = anio.id_tenant ?? anio.colegio?.id_tenant ?? null;

    const evento = await this.prisma.evento.create({
      data: {
        id_tenant: tenantId,
        id_colegio: anio.id_colegio,
        titulo: data.titulo,
        fecha: new Date(data.fecha),
        hora: data.hora,
        tipo: data.tipo,
        descripcion: data.descripcion,
        id_anio: data.id_anio,
      },
    });

    const idsNiveles = data.niveles || [];
    const idsSecciones = data.secciones || [];

    // Si no se especifica nada, notificar a todos los niveles
    if (idsNiveles.length === 0 && idsSecciones.length === 0) {
      const todosNiveles = await this.prisma.nivel.findMany({
        select: { id_nivel: true },
      });
      idsNiveles.push(...todosNiveles.map((n) => n.id_nivel));
    }

    const horaTexto = data.hora ? ` a las ${data.hora}` : '';
    const tipoTexto = data.tipo.charAt(0).toUpperCase() + data.tipo.slice(1);

    // La bandeja solo acompaña al evento; Circulares conserva la comunicación masiva.
    await this.notificacionesService.notificarApoderadosDeNivel({
      nivelIds: idsNiveles,
      id_tenant: tenantId,
      id_colegio: anio.id_colegio,
      tipo: 'evento.creado',
      origen: 'eventos',
      referencia_tipo: 'evento',
      referencia_id: evento.id_evento,
      canal: 'padres',
      titulo: `${tipoTexto}: ${data.titulo}`,
      mensaje: `${data.titulo} – ${new Date(data.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}${horaTexto}${data.descripcion ? '. ' + data.descripcion : ''}`,
      url: '/dashboard/calendario',
    });

    // TODO: si data.generar_circular es true, crear circular automática

    return evento;
  }
}
