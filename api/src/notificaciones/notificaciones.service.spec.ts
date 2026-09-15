/* eslint-disable */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { NotificacionesService } from './notificaciones.service';

const actor = (tenantIds = [1]) => ({
  estado: true,
  rol: { nombre_rol: 'Admin' },
  tenants: tenantIds.map((id_tenant) => ({ id_tenant })),
  colegios: [
    { id_colegio: 10, colegio: { id_tenant: 1 } },
    { id_colegio: 11, colegio: { id_tenant: 1 } },
    ...(tenantIds.includes(2)
      ? [{ id_colegio: 20, colegio: { id_tenant: 2 } }]
      : []),
  ],
});

function setup() {
  const prisma: any = {
    usuario: { findUnique: jest.fn().mockResolvedValue(actor()) },
    notificacion: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue({ id_notif: 50, id_usuario: 7 }),
      count: jest.fn().mockResolvedValue(0),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      create: jest.fn(),
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    colegio: {
      findFirst: jest.fn().mockResolvedValue({ id_colegio: 10 }),
    },
    matricula: { findMany: jest.fn().mockResolvedValue([]) },
    apoderadoEstudiante: { findMany: jest.fn().mockResolvedValue([]) },
    tokenFCM: { findMany: jest.fn().mockResolvedValue([]) },
  };
  return { prisma, service: new NotificacionesService(prisma) };
}

const schoolQuery = { tenant_id: 1, colegio_id: 10, page: 1, limit: 20 };

function contextBranches(where: any) {
  return where.AND[0].OR;
}

describe('NotificacionesService V1: propiedad y alcance', () => {
  test('1. el usuario lista únicamente sus propias notificaciones', async () => {
    const { prisma, service } = setup();
    await service.getNotificaciones(7, schoolQuery);
    expect(prisma.notificacion.findMany.mock.calls[0][0].where.id_usuario).toBe(
      7,
    );
  });

  test('2. marcar una notificación ajena responde 404 seguro', async () => {
    const { prisma, service } = setup();
    prisma.notificacion.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.marcarLectura(7, 999, true, schoolQuery),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.notificacion.updateMany.mock.calls[0][0].where).toMatchObject(
      {
        id_notif: 999,
        id_usuario: 7,
      },
    );
  });

  test('3. count cuenta solo las no leídas propias', async () => {
    const { prisma, service } = setup();
    prisma.notificacion.count.mockResolvedValue(3);
    await expect(service.getCountNoLeidas(7, schoolQuery)).resolves.toBe(3);
    expect(prisma.notificacion.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ id_usuario: 7, leida: false }),
    });
  });

  test('4. marcar una propia como leída conserva actor y fecha de lectura', async () => {
    const { prisma, service } = setup();
    await service.marcarLectura(7, 50, true, schoolQuery);
    const call = prisma.notificacion.updateMany.mock.calls[0][0];
    expect(call.where).toMatchObject({ id_notif: 50, id_usuario: 7 });
    expect(call.data.leida).toBe(true);
    expect(call.data.fecha_lectura).toBeInstanceOf(Date);
  });

  test('5. marcar todas afecta solo al actor y alcance solicitado', async () => {
    const { prisma, service } = setup();
    await service.marcarTodasLeidas(7, schoolQuery);
    const where = prisma.notificacion.updateMany.mock.calls[0][0].where;
    expect(where).toMatchObject({ id_usuario: 7, leida: false });
    expect(contextBranches(where)).toEqual(
      expect.arrayContaining([
        { id_tenant: 1, id_colegio: 10 },
        { id_tenant: 1, id_colegio: null },
      ]),
    );
  });

  test('6. filtra no leídas en base de datos', async () => {
    const { prisma, service } = setup();
    await service.getNotificaciones(7, { ...schoolQuery, leida: false });
    expect(prisma.notificacion.findMany.mock.calls[0][0].where.leida).toBe(
      false,
    );
  });

  test('7. filtra por origen estructurado', async () => {
    const { prisma, service } = setup();
    await service.getNotificaciones(7, { ...schoolQuery, origen: 'citas' });
    expect(prisma.notificacion.findMany.mock.calls[0][0].where.origen).toBe(
      'citas',
    );
  });

  test('8. búsqueda consulta título y mensaje', async () => {
    const { prisma, service } = setup();
    await service.getNotificaciones(7, { ...schoolQuery, q: 'reunión' });
    expect(prisma.notificacion.findMany.mock.calls[0][0].where.OR).toEqual([
      { titulo: { contains: 'reunión' } },
      { mensaje: { contains: 'reunión' } },
    ]);
  });

  test('9. el tenant A no incorpora contexto del tenant B', async () => {
    const { prisma, service } = setup();
    prisma.usuario.findUnique.mockResolvedValue(actor([1, 2]));
    await service.getNotificaciones(7, {
      tenant_id: 1,
      scope: 'all',
      page: 1,
      limit: 20,
    });
    const branches = contextBranches(
      prisma.notificacion.findMany.mock.calls[0][0].where,
    );
    expect(branches).toEqual([
      { id_tenant: 1, id_colegio: null },
      { id_tenant: 1, id_colegio: { in: [10, 11] } },
    ]);
    expect(JSON.stringify(branches)).not.toContain('20');
  });

  test('10. colegio específico incluye colegio y avisos globales del tenant', async () => {
    const { prisma, service } = setup();
    await service.getNotificaciones(7, schoolQuery);
    const branches = contextBranches(
      prisma.notificacion.findMany.mock.calls[0][0].where,
    );
    expect(branches).toEqual(
      expect.arrayContaining([
        { id_tenant: 1, id_colegio: null },
        { id_tenant: 1, id_colegio: 10 },
      ]),
    );
    expect(JSON.stringify(branches)).not.toContain('11');
  });

  test('11. rechaza un colegio sin membresía activa', async () => {
    const { service } = setup();
    await expect(
      service.getNotificaciones(7, {
        tenant_id: 1,
        colegio_id: 99,
        page: 1,
        limit: 20,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  test('12. permite volver una notificación propia a no leída', async () => {
    const { prisma, service } = setup();
    await service.marcarLectura(7, 50, false, schoolQuery);
    expect(prisma.notificacion.updateMany.mock.calls[0][0].data).toEqual({
      leida: false,
      fecha_lectura: null,
    });
  });

  test('13. helper familiar admite Activo, Matriculado y Pre-matriculado', async () => {
    const { prisma, service } = setup();
    await service.notificarApoderadosDeAlumno({
      alumnoId: 40,
      tipo: 'academico.aviso',
      origen: 'academico',
      canal: 'padres',
      titulo: 'Aviso',
      mensaje: 'Contenido',
      url: '/dashboard/actividad',
    });
    expect(
      prisma.matricula.findMany.mock.calls[0][0].where.estado_matricula,
    ).toEqual({ in: ['Activo', 'Matriculado', 'Pre-matriculado'] });
  });

  test('14. helper familiar excluye Inactivo y Reserva', async () => {
    const { prisma, service } = setup();
    await service.notificarApoderadosDeAlumno({
      alumnoId: 40,
      tipo: 'academico.aviso',
      origen: 'academico',
      canal: 'padres',
      titulo: 'Aviso',
      mensaje: 'Contenido',
    });
    const states =
      prisma.matricula.findMany.mock.calls[0][0].where.estado_matricula.in;
    expect(states).not.toContain('Inactivo');
    expect(states).not.toContain('Reserva');
  });

  test('15. legacy se incluye con tenant único y se excluye si es ambiguo', async () => {
    const unique = setup();
    await unique.service.getNotificaciones(7, schoolQuery);
    expect(
      contextBranches(
        unique.prisma.notificacion.findMany.mock.calls[0][0].where,
      ),
    ).toContainEqual({ id_tenant: null, id_colegio: null });

    const multiple = setup();
    multiple.prisma.usuario.findUnique.mockResolvedValue(actor([1, 2]));
    await multiple.service.getNotificaciones(7, {
      tenant_id: 1,
      scope: 'all',
      page: 1,
      limit: 20,
    });
    expect(
      contextBranches(
        multiple.prisma.notificacion.findMany.mock.calls[0][0].where,
      ),
    ).not.toContainEqual({ id_tenant: null, id_colegio: null });
  });

  test('16. rechaza URLs externas o de un canal distinto', async () => {
    const { service } = setup();
    await expect(
      service.crearNotificacion({
        id_usuario: 7,
        tipo: 'cita.creada',
        origen: 'citas',
        canal: 'padres',
        titulo: 'Cita',
        mensaje: 'Nueva cita',
        url: '/citas',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
