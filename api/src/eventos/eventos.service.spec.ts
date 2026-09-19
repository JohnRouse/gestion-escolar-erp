/* eslint-disable */
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EventosService } from './eventos.service';

const person = {
  nombres: 'Ana',
  apellido_paterno: 'Pérez',
  apellido_materno: 'Rojas',
};

function actor(role = 'Admin', tenantId = 1, schoolId = 10, schoolRole = role) {
  return {
    id_persona: 70,
    estado: true,
    rol: { nombre_rol: role },
    tenants: [{ id_tenant: tenantId }],
    colegios: [
      {
        id_colegio: schoolId,
        rol_colegio: schoolRole,
        colegio: { id_tenant: tenantId },
      },
    ],
  };
}

function eventFixture(overrides: Record<string, unknown> = {}) {
  return {
    id_evento: 50,
    id_tenant: 1,
    id_colegio: 10,
    id_anio: 100,
    titulo: 'Actuación escolar',
    descripcion: 'Actividad institucional',
    fecha: new Date('2026-09-30T00:00:00.000Z'),
    hora: '09:00',
    hora_inicio: '09:00',
    hora_fin: '10:00',
    tipo: 'actividad escolar',
    estado: 'programado',
    ubicacion: 'Patio central',
    id_usuario_creador: 7,
    id_usuario_actualizador: 7,
    motivo_cancelacion: null,
    cancelado_en: null,
    creado_en: new Date('2026-09-15T12:00:00.000Z'),
    actualizado_en: new Date('2026-09-15T12:00:00.000Z'),
    colegio: { id_colegio: 10, nombre: 'Colegio Uno' },
    anio: { id_anio: 100, nombre_anio: '2026' },
    creado_por: { persona: person },
    actualizado_por: { persona: person },
    destinatarios: [
      {
        id_destinatario: 1,
        id_evento: 50,
        tipo_destino: 'colegio',
        id_nivel: null,
        id_grado: null,
        id_seccion: null,
        nivel: null,
        grado: null,
        seccion: null,
      },
    ],
    movimientos: [],
    ...overrides,
  };
}

function sectionYear(sectionId = 20, gradeId = 30, levelId = 40) {
  return {
    id_seccion: sectionId,
    seccion: { id_grado: gradeId, grado: { id_nivel: levelId } },
  };
}

function setup() {
  const created = eventFixture();
  const prisma: any = {
    usuario: { findUnique: jest.fn().mockResolvedValue(actor()) },
    anioLectivo: {
      findFirst: jest.fn().mockResolvedValue({
        id_anio: 100,
        nombre_anio: '2026',
        fecha_inicio: new Date('2026-03-01T00:00:00.000Z'),
        fecha_fin: new Date('2026-12-20T00:00:00.000Z'),
        estado: 'Abierto',
      }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    seccionAnio: { findMany: jest.fn().mockResolvedValue([sectionYear()]) },
    asignacionDocente: { findMany: jest.fn().mockResolvedValue([]) },
    evento: {
      create: jest.fn().mockResolvedValue(created),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      findUnique: jest.fn().mockResolvedValue(created),
      findUniqueOrThrow: jest.fn().mockResolvedValue(created),
      update: jest.fn().mockResolvedValue(created),
    },
    eventoMovimiento: { create: jest.fn().mockResolvedValue({}) },
    matricula: { findMany: jest.fn().mockResolvedValue([]) },
  };
  prisma.$transaction = jest.fn(async (callback: (tx: any) => unknown) =>
    callback(prisma),
  );
  const notifications: any = {
    notificarApoderadosDeAudienciaEvento: jest
      .fn()
      .mockResolvedValue({ creadas: 1 }),
  };
  return {
    prisma,
    notifications,
    service: new EventosService(prisma, notifications),
  };
}

const createDto = {
  id_tenant: 1,
  id_colegio: 10,
  id_anio: 100,
  titulo: 'Actuación escolar',
  tipo: 'actividad escolar',
  descripcion: 'Actividad institucional',
  fecha: '2026-09-30',
  hora_inicio: '09:00',
  hora_fin: '10:00',
  ubicacion: 'Patio central',
  audiencia: { tipo: 'colegio' as const, ids: [] },
};

describe('EventosService V1: autorización, scope y trazabilidad', () => {
  test('1. Admin crea un evento del colegio propio con actor y estado programado', async () => {
    const { prisma, service } = setup();
    await service.crearEvento(7, createDto);
    const data = prisma.evento.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      id_tenant: 1,
      id_colegio: 10,
      id_usuario_creador: 7,
      estado: 'programado',
    });
    expect(data.movimientos.create.id_usuario_actor).toBe(7);
  });

  test.each(['Director', 'Secretaria'])(
    '2. %s puede crear en un colegio donde conserva ese rol efectivo',
    async (role) => {
      const { prisma, service } = setup();
      prisma.usuario.findUnique.mockResolvedValue(actor(role));
      await expect(service.crearEvento(7, createDto)).resolves.toBeDefined();
    },
  );

  test.each(['Director', 'Secretaria'])(
    '3. %s puede editar un evento programado y registra el actor',
    async (role) => {
      const { prisma, service } = setup();
      prisma.usuario.findUnique.mockResolvedValue(actor(role));
      prisma.evento.findUniqueOrThrow.mockResolvedValue(
        eventFixture({ titulo: 'Nuevo título' }),
      );
      await service.actualizarEvento(7, 50, { titulo: 'Nuevo título' });
      expect(prisma.eventoMovimiento.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          accion: 'editado',
          id_usuario_actor: 7,
        }),
      });
    },
  );

  test('4. Profesor no puede crear aunque esté autenticado', async () => {
    const { prisma, service } = setup();
    prisma.usuario.findUnique.mockResolvedValue(actor('Profesor'));
    await expect(service.crearEvento(7, createDto)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  test('5. Profesor consulta un evento dirigido a su sección asignada', async () => {
    const { prisma, service } = setup();
    prisma.usuario.findUnique.mockResolvedValue(actor('Profesor'));
    prisma.asignacionDocente.findMany.mockResolvedValue([sectionYear()]);
    prisma.evento.findUnique.mockResolvedValue(
      eventFixture({
        destinatarios: [
          {
            ...eventFixture().destinatarios[0],
            tipo_destino: 'secciones',
            id_seccion: 20,
          },
        ],
      }),
    );
    await expect(service.obtenerEvento(7, 50)).resolves.toMatchObject({
      id_evento: 50,
    });
  });

  test('6. rechaza tenant ajeno sin revelar el recurso', async () => {
    const { service } = setup();
    await expect(
      service.crearEvento(7, { ...createDto, id_tenant: 2 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  test('7. rechaza colegio ajeno', async () => {
    const { service } = setup();
    await expect(
      service.crearEvento(7, { ...createDto, id_colegio: 99 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  test('8. rechaza año que no pertenece al mismo tenant y colegio', async () => {
    const { prisma, service } = setup();
    prisma.anioLectivo.findFirst.mockResolvedValue(null);
    await expect(service.crearEvento(7, createDto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  test('9. rechaza una sección ajena al colegio/año', async () => {
    const { prisma, service } = setup();
    prisma.seccionAnio.findMany.mockResolvedValue([]);
    await expect(
      service.crearEvento(7, {
        ...createDto,
        audiencia: { tipo: 'secciones', ids: [999] },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  test('10. todo el colegio se persiste como un destino único sin consultar niveles', async () => {
    const { prisma, service } = setup();
    await service.crearEvento(7, createDto);
    const destination =
      prisma.evento.create.mock.calls[0][0].data.destinatarios.create;
    expect(destination).toEqual([{ tipo_destino: 'colegio' }]);
    expect(prisma.seccionAnio.findMany).not.toHaveBeenCalled();
  });

  test('11. audiencia por sección se persiste de forma estructurada', async () => {
    const { prisma, service } = setup();
    await service.crearEvento(7, {
      ...createDto,
      audiencia: { tipo: 'secciones', ids: [20] },
    });
    expect(
      prisma.evento.create.mock.calls[0][0].data.destinatarios.create,
    ).toEqual([{ tipo_destino: 'secciones', id_seccion: 20 }]);
  });

  test('12. audiencia por nivel se valida contra la estructura del año', async () => {
    const { prisma, service } = setup();
    await service.crearEvento(7, {
      ...createDto,
      audiencia: { tipo: 'niveles', ids: [40] },
    });
    expect(
      prisma.evento.create.mock.calls[0][0].data.destinatarios.create,
    ).toEqual([{ tipo_destino: 'niveles', id_nivel: 40 }]);
  });

  test('13. cancelar conserva el evento y registra motivo, actor y estado', async () => {
    const { prisma, service } = setup();
    prisma.evento.findUniqueOrThrow.mockResolvedValue(
      eventFixture({ estado: 'cancelado', motivo_cancelacion: 'Lluvia' }),
    );
    await service.cancelarEvento(7, 50, { motivo: 'Lluvia' });
    expect(prisma.evento.update).toHaveBeenCalledWith({
      where: { id_evento: 50 },
      data: expect.objectContaining({
        estado: 'cancelado',
        motivo_cancelacion: 'Lluvia',
        id_usuario_actualizador: 7,
      }),
    });
    expect(prisma.evento.delete).toBeUndefined();
  });

  test('14. un ID directo de otro tenant se responde como no encontrado', async () => {
    const { prisma, service } = setup();
    prisma.evento.findUnique.mockResolvedValue(
      eventFixture({ id_tenant: 2, id_colegio: 20 }),
    );
    await expect(service.obtenerEvento(7, 50)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  test('15. portal deriva la consulta solo de hijos vinculados y matrículas operativas', async () => {
    const { prisma, service } = setup();
    prisma.usuario.findUnique.mockResolvedValue({
      id_persona: 80,
      estado: true,
      rol: { nombre_rol: 'Apoderado' },
    });
    prisma.matricula.findMany.mockResolvedValue([
      {
        id_tenant: 1,
        id_colegio: 10,
        id_anio: 100,
        id_seccion: 20,
        seccion: { id_grado: 30, grado: { id_nivel: 40 } },
        anio: { fecha_inicio: new Date('2026-03-01T00:00:00.000Z') },
      },
    ]);
    await service.obtenerEventosPadres(7, { anio_id: 100, mes: 9 });
    expect(prisma.matricula.findMany.mock.calls[0][0].where).toMatchObject({
      estado_matricula: {
        in: ['Activo', 'Matriculado', 'Pre-matriculado'],
      },
      estudiante: { apoderados: { some: { id_apoderado: 80 } } },
    });
    const eventWhere = prisma.evento.findMany.mock.calls[0][0].where;
    expect(JSON.stringify(eventWhere)).toContain('"id_seccion":{"in":[20]}');
    expect(JSON.stringify(eventWhere)).toContain('"id_colegio":10');
  });

  test('16. el contrato de creación excluye Cerrado y mantiene Planificación', async () => {
    const { prisma, service } = setup();
    prisma.anioLectivo.findMany.mockResolvedValue([
      {
        id_anio: 102,
        nombre_anio: 'Año Escolar 2027',
        fecha_inicio: new Date('2027-03-01T00:00:00.000Z'),
        fecha_fin: new Date('2027-12-20T00:00:00.000Z'),
        estado: 'Planificación',
      },
      {
        id_anio: 101,
        nombre_anio: 'Año Escolar 2026',
        fecha_inicio: new Date('2026-03-01T00:00:00.000Z'),
        fecha_fin: new Date('2026-12-20T00:00:00.000Z'),
        estado: 'Abierto',
      },
      {
        id_anio: 100,
        nombre_anio: 'Año Escolar 2025',
        fecha_inicio: new Date('2025-03-01T00:00:00.000Z'),
        fecha_fin: new Date('2025-12-20T00:00:00.000Z'),
        estado: 'Cerrado',
      },
    ]);

    const result = await service.obtenerOpciones(7, {
      tenant_id: 1,
      colegio_id: 10,
    });

    expect(result.anios.map((year) => year.id_anio)).toEqual([102, 101]);
    expect(result.anio_predeterminado_id).toBe(101);
  });

  test('17. rechaza crear en un año Cerrado aunque se manipule el contrato', async () => {
    const { prisma, service } = setup();
    prisma.anioLectivo.findFirst.mockResolvedValue({
      id_anio: 100,
      nombre_anio: 'Año Escolar 2025',
      fecha_inicio: new Date('2025-03-01T00:00:00.000Z'),
      fecha_fin: new Date('2025-12-20T00:00:00.000Z'),
      estado: 'Cerrado',
    });

    await expect(service.crearEvento(7, createDto)).rejects.toThrow(
      'El año lectivo seleccionado no está disponible para crear eventos.',
    );
    expect(prisma.evento.create).not.toHaveBeenCalled();
  });

  test('18. permite una fecha dentro del rango del año lectivo', async () => {
    const { service } = setup();
    await expect(service.crearEvento(7, createDto)).resolves.toBeDefined();
  });

  test('19. rechaza en backend una fecha fuera del rango del año lectivo', async () => {
    const { prisma, service } = setup();

    await expect(
      service.crearEvento(7, { ...createDto, fecha: '2027-09-17' }),
    ).rejects.toThrow(
      'La fecha del evento no corresponde al año lectivo seleccionado.',
    );
    expect(prisma.evento.create).not.toHaveBeenCalled();
  });

  test('20. rechaza Año Escolar 2027 con una fecha calendario 2026', async () => {
    const { prisma, service } = setup();
    prisma.anioLectivo.findFirst.mockResolvedValue({
      id_anio: 102,
      nombre_anio: 'Año Escolar 2027',
      fecha_inicio: new Date('2027-03-01T00:00:00.000Z'),
      fecha_fin: new Date('2027-12-20T00:00:00.000Z'),
      estado: 'Planificación',
    });

    await expect(
      service.crearEvento(7, {
        ...createDto,
        id_anio: 102,
        fecha: '2026-09-17',
      }),
    ).rejects.toThrow(
      'La fecha del evento no corresponde al año lectivo seleccionado.',
    );
  });

  test('21. deriva nivel, grado y sección solo de SeccionAnio del tenant, colegio y año', async () => {
    const { prisma, service } = setup();
    prisma.anioLectivo.findMany.mockResolvedValue([
      {
        id_anio: 100,
        nombre_anio: 'Año Escolar 2026',
        fecha_inicio: new Date('2026-03-01T00:00:00.000Z'),
        fecha_fin: new Date('2026-12-20T00:00:00.000Z'),
        estado: 'Abierto',
      },
    ]);
    prisma.seccionAnio.findMany.mockResolvedValue([
      {
        seccion: {
          id_seccion: 20,
          letra: 'A',
          grado: {
            id_grado: 30,
            nombre_grado: 'Quinto',
            nivel: { id_nivel: 40, nombre_nivel: 'Primaria' },
          },
        },
      },
      {
        seccion: {
          id_seccion: 21,
          letra: 'B',
          grado: {
            id_grado: 30,
            nombre_grado: 'Quinto',
            nivel: { id_nivel: 40, nombre_nivel: 'Primaria' },
          },
        },
      },
    ]);

    const result = await service.obtenerOpciones(7, {
      tenant_id: 1,
      colegio_id: 10,
      anio_id: 100,
    });

    expect(result.niveles).toEqual([
      { id_nivel: 40, nombre_nivel: 'Primaria' },
    ]);
    expect(result.grados).toEqual([
      { id_grado: 30, nombre_grado: 'Quinto', id_nivel: 40 },
    ]);
    expect(result.secciones).toHaveLength(2);
    expect(prisma.seccionAnio.findMany.mock.calls[0][0].where).toMatchObject({
      id_tenant: 1,
      id_colegio: 10,
      id_anio: 100,
      estado: 'Activo',
      anio: { id_tenant: 1, id_colegio: 10 },
      seccion: { id_tenant: 1, id_colegio: 10 },
    });
  });

  test('22. rechaza una sección existente que no está activa en ese colegio y año', async () => {
    const { prisma, service } = setup();
    prisma.seccionAnio.findMany.mockResolvedValue([]);

    await expect(
      service.crearEvento(7, {
        ...createDto,
        audiencia: { tipo: 'secciones', ids: [20] },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.seccionAnio.findMany.mock.calls[0][0].where).toMatchObject({
      id_tenant: 1,
      id_colegio: 10,
      id_anio: 100,
    });
  });

  test('23. rechaza estructura de otro colegio aunque el ID de sección exista', async () => {
    const { prisma, service } = setup();
    prisma.seccionAnio.findMany.mockResolvedValue([]);

    await expect(
      service.crearEvento(7, {
        ...createDto,
        audiencia: { tipo: 'secciones', ids: [99] },
      }),
    ).rejects.toThrow(
      'La audiencia contiene un nivel, grado o sección ajeno al colegio y año seleccionados.',
    );
    expect(prisma.evento.create).not.toHaveBeenCalled();
  });

  test('24. sin estructura permite todo el colegio pero bloquea una audiencia específica vacía', async () => {
    const { prisma, service } = setup();
    prisma.seccionAnio.findMany.mockResolvedValue([]);

    await expect(service.crearEvento(7, createDto)).resolves.toBeDefined();
    await expect(
      service.crearEvento(7, {
        ...createDto,
        audiencia: { tipo: 'niveles', ids: [] },
      }),
    ).rejects.toThrow('Selecciona al menos un destino para la audiencia.');
  });

  test('25. rechaza editar un evento con una fecha fuera de su año lectivo', async () => {
    const { prisma, service } = setup();

    await expect(
      service.actualizarEvento(7, 50, { fecha: '2027-01-15' }),
    ).rejects.toThrow(
      'La fecha del evento no corresponde al año lectivo seleccionado.',
    );
    expect(prisma.evento.update).not.toHaveBeenCalled();
  });
});
