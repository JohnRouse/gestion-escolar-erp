/* eslint-disable */
import { RecordatoriosService } from './recordatorios.service';

function setup(events: any[] = []) {
  const prisma: any = {
    evento: { findMany: jest.fn().mockResolvedValue(events) },
  };
  const notifications: any = {
    notificarApoderadosDeAudienciaEvento: jest
      .fn()
      .mockResolvedValue({ creadas: 1 }),
  };
  return {
    prisma,
    notifications,
    service: new RecordatoriosService(prisma, notifications),
  };
}

describe('RecordatoriosService de Eventos V1', () => {
  test('1. nunca selecciona eventos cancelados o realizados', async () => {
    const { prisma, notifications, service } = setup();
    await service.enviarRecordatoriosDeEventos(
      new Date('2026-09-15T12:00:00.000Z'),
    );
    expect(prisma.evento.findMany.mock.calls[0][0].where.estado).toBe(
      'programado',
    );
    expect(
      notifications.notificarApoderadosDeAudienciaEvento,
    ).not.toHaveBeenCalled();
  });

  test('2. usa tenant, colegio, año y audiencia persistida del evento', async () => {
    const event = {
      id_evento: 50,
      id_tenant: 1,
      id_colegio: 10,
      id_anio: 100,
      titulo: 'Actuación',
      fecha: new Date('2026-09-17T00:00:00.000Z'),
      hora: '09:00',
      hora_inicio: '09:00',
      destinatarios: [
        {
          tipo_destino: 'secciones',
          id_nivel: null,
          id_grado: null,
          id_seccion: 20,
        },
      ],
    };
    const { notifications, service } = setup([event]);
    await service.enviarRecordatoriosDeEventos(
      new Date('2026-09-15T12:00:00.000Z'),
    );
    expect(
      notifications.notificarApoderadosDeAudienciaEvento,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        id_tenant: 1,
        id_colegio: 10,
        id_anio: 100,
        audiencia: { tipo: 'secciones', ids: [20] },
        url: '/dashboard/calendario?anio_id=100&mes=9&dia=17&evento_id=50',
        deduplicar_existentes: true,
      }),
    );
  });
});
