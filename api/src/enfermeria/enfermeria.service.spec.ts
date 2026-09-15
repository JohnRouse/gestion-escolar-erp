/* eslint-disable */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EnfermeriaService } from './enfermeria.service';

const scope = { tenant_id: 1, colegio_id: 10 };

function actor(role = 'Admin', schoolId = 10, schoolRole = role) {
  return {
    estado: true,
    rol: { nombre_rol: role },
    tenants: [{ id_tenant: 1 }],
    colegios: [{ id_colegio: schoolId, rol_colegio: schoolRole }],
  };
}

function person(name = 'Ana') {
  return {
    nombres: name,
    apellido_paterno: 'Pérez',
    apellido_materno: 'Rojas',
    dni: '12345678',
  };
}

function enrollment(overrides: Record<string, unknown> = {}) {
  return {
    id_matricula: 100,
    codigo_matricula: 'MAT-100',
    id_tenant: 1,
    id_colegio: 10,
    id_estudiante: 200,
    id_seccion: 300,
    estado_matricula: 'Matriculado',
    fecha_matricula: new Date(),
    colegio: { id_colegio: 10, id_tenant: 1, nombre: 'Colegio' },
    seccion: {
      id_colegio: 10,
      letra: 'A',
      grado: {
        nombre_grado: 'Quinto',
        nivel: { nombre_nivel: 'Primaria' },
      },
    },
    estudiante: {
      codigo_estudiante: 'ALU-200',
      persona: person(),
      apoderados: [],
    },
    ...overrides,
  };
}

function attention(overrides: Record<string, unknown> = {}) {
  return {
    id_atencion: 50,
    id_tenant: 1,
    id_colegio: 10,
    id_matricula: 100,
    fecha_hora_ingreso: new Date('2026-09-14T14:00:00Z'),
    motivo: 'Malestar declarado',
    observacion_reportada: 'Dato sensible de prueba',
    acciones_realizadas: null,
    id_autorizacion_medicacion: null,
    medicacion_administrada: false,
    fecha_medicacion: null,
    id_usuario_medicacion: null,
    estado: 'abierta',
    destino: null,
    fecha_hora_cierre: null,
    id_usuario_responsable: 7,
    creado_en: new Date(),
    actualizado_en: new Date(),
    colegio: { id_colegio: 10, nombre: 'Colegio' },
    matricula: enrollment(),
    responsable: { persona: person('Responsable') },
    medicacion_registrada_por: null,
    autorizacion_medicacion: null,
    contactos: [],
    ...overrides,
  };
}

function mockPrisma() {
  const db: any = {
    usuario: { findUnique: jest.fn(), findMany: jest.fn() },
    matricula: { findFirst: jest.fn(), findMany: jest.fn() },
    atencionEnfermeria: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    fichaSalud: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
    autorizacionMedicacion: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    apoderadoEstudiante: { findUnique: jest.fn(), findMany: jest.fn() },
    enfermeriaContacto: { create: jest.fn() },
    enfermeriaMovimiento: { create: jest.fn(), findMany: jest.fn() },
    notificacion: { createMany: jest.fn() },
    $queryRaw: jest.fn().mockResolvedValue([]),
  };
  db.$transaction = jest.fn(async (callback: (tx: any) => unknown) =>
    callback(db),
  );
  return db;
}

function authorizedSetup() {
  const db = mockPrisma();
  db.usuario.findUnique.mockResolvedValue(actor());
  return { db, service: new EnfermeriaService(db) };
}

describe('EnfermeriaService', () => {
  it('permite a Admin autorizado', async () => {
    const { service } = authorizedSetup();
    await expect(
      service.resolveScope((service as any).prisma, 7, scope),
    ).resolves.toEqual({
      tenantId: 1,
      schoolIds: [10],
    });
  });

  it('permite a Director autorizado operar una atención', async () => {
    const db = mockPrisma();
    db.usuario.findUnique.mockResolvedValue(actor('Director'));
    db.matricula.findFirst.mockResolvedValue(enrollment());
    db.atencionEnfermeria.create.mockResolvedValue(attention());
    db.atencionEnfermeria.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(attention());
    db.enfermeriaMovimiento.findMany.mockResolvedValue([]);
    await expect(
      new EnfermeriaService(db).create(7, scope, {
        id_matricula: 100,
        motivo: 'Malestar',
      }),
    ).resolves.toMatchObject({ estado: 'abierta' });
  });

  it.each(['Profesor', 'Secretaria'])(
    'rechaza el rol %s aunque esté autenticado',
    async (role) => {
      const db = mockPrisma();
      db.usuario.findUnique.mockResolvedValue(actor(role));
      await expect(
        new EnfermeriaService(db).resolveScope(db, 7, scope),
      ).rejects.toBeInstanceOf(ForbiddenException);
    },
  );

  it('rechaza un colegio fuera del alcance efectivo', async () => {
    const db = mockPrisma();
    db.usuario.findUnique.mockResolvedValue(actor('Admin', 20));
    await expect(
      new EnfermeriaService(db).resolveScope(db, 7, scope),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it.each(['Activo', 'Matriculado', 'Pre-matriculado'])(
    'la búsqueda incluye la matrícula %s',
    async (status) => {
      const { db, service } = authorizedSetup();
      db.matricula.findMany.mockResolvedValue([]);
      await service.students(7, { ...scope, q: 'Ana' });
      expect(
        db.matricula.findMany.mock.calls[0][0].where.estado_matricula.in,
      ).toContain(status);
    },
  );

  it.each(['Inactivo', 'Reserva'])(
    'la búsqueda excluye la matrícula %s',
    async (status) => {
      const { db, service } = authorizedSetup();
      db.matricula.findMany.mockResolvedValue([]);
      await service.students(7, { ...scope, q: 'Ana' });
      expect(
        db.matricula.findMany.mock.calls[0][0].where.estado_matricula.in,
      ).not.toContain(status);
    },
  );

  it('busca por persona, DNI, código de alumno y código de matrícula sin unir apoderados', async () => {
    const { db, service } = authorizedSetup();
    db.matricula.findMany.mockResolvedValue([]);
    await service.students(7, { ...scope, q: 'ABC' });
    const query = db.matricula.findMany.mock.calls[0][0];
    expect(JSON.stringify(query.where)).toContain('codigo_matricula');
    expect(JSON.stringify(query.where)).toContain('codigo_estudiante');
    expect(JSON.stringify(query.where)).toContain('dni');
    expect(JSON.stringify(query.where)).not.toContain('apoderados');
    expect(query.take).toBe(25);
  });

  it('rechaza al crear una matrícula de otro tenant', async () => {
    const { db, service } = authorizedSetup();
    db.matricula.findFirst.mockResolvedValue(
      enrollment({ id_tenant: 2, colegio: { id_tenant: 2, nombre: 'Otro' } }),
    );
    await expect(
      service.create(7, scope, { id_matricula: 100, motivo: 'Malestar' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rechaza al crear una matrícula de otro colegio autorizado no seleccionado', async () => {
    const { db, service } = authorizedSetup();
    db.matricula.findFirst.mockResolvedValue(
      enrollment({
        id_colegio: 20,
        colegio: { id_colegio: 20, id_tenant: 1, nombre: 'Otro' },
        seccion: {
          id_colegio: 20,
          letra: 'A',
          grado: {
            nombre_grado: 'Quinto',
            nivel: { nombre_nivel: 'Primaria' },
          },
        },
      }),
    );
    await expect(
      service.create(7, scope, { id_matricula: 100, motivo: 'Malestar' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('abre una atención propia y registra al actor', async () => {
    const { db, service } = authorizedSetup();
    db.matricula.findFirst.mockResolvedValue(enrollment());
    db.atencionEnfermeria.create.mockResolvedValue(attention());
    db.atencionEnfermeria.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(attention());
    db.enfermeriaMovimiento.findMany.mockResolvedValue([]);
    const result = await service.create(7, scope, {
      id_matricula: 100,
      motivo: 'Malestar',
    });
    expect(result.estado).toBe('abierta');
    expect(db.atencionEnfermeria.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ id_usuario_responsable: 7 }),
      }),
    );
    expect(db.enfermeriaMovimiento.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id_usuario_actor: 7,
          accion: 'apertura',
        }),
      }),
    );
    expect(db.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('rechaza con 409 una segunda atención abierta para la misma matrícula', async () => {
    const { db, service } = authorizedSetup();
    db.matricula.findFirst.mockResolvedValue(enrollment());
    db.atencionEnfermeria.findFirst.mockResolvedValue({ id_atencion: 50 });

    let error: unknown;
    try {
      await service.create(7, scope, {
        id_matricula: 100,
        motivo: 'Nuevo malestar',
      });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getStatus()).toBe(409);
    expect((error as ConflictException).getResponse()).toEqual({
      code: 'ENFERMERIA_ATENCION_ABIERTA',
      message:
        'Este alumno ya tiene una atención abierta. Continúa registrando la información en esa atención.',
      atencion_abierta_id: 50,
    });
    expect(db.atencionEnfermeria.create).not.toHaveBeenCalled();
    expect(db.enfermeriaMovimiento.create).not.toHaveBeenCalled();
  });

  it('permite abrir una nueva atención después de cerrar la anterior', async () => {
    const { db, service } = authorizedSetup();
    db.matricula.findFirst.mockResolvedValue(enrollment());
    db.atencionEnfermeria.findFirst
      .mockResolvedValueOnce(attention())
      .mockResolvedValueOnce(
        attention({ estado: 'cerrada', destino: 'regresa_aula' }),
      )
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(attention({ id_atencion: 51 }));
    db.atencionEnfermeria.create.mockResolvedValue(
      attention({ id_atencion: 51 }),
    );
    db.enfermeriaMovimiento.findMany.mockResolvedValue([]);

    await service.close(7, scope, 50, {
      destino: 'regresa_aula',
      notificar_apoderado: false,
    });
    const created = await service.create(7, scope, {
      id_matricula: 100,
      motivo: 'Malestar posterior',
    });

    expect(created.id_atencion).toBe(51);
    expect(db.atencionEnfermeria.create).toHaveBeenCalledTimes(1);
  });

  it('permite que otro alumno tenga su propia atención abierta', async () => {
    const { db, service } = authorizedSetup();
    db.matricula.findFirst.mockResolvedValue(
      enrollment({ id_matricula: 101, id_estudiante: 201 }),
    );
    db.atencionEnfermeria.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(
        attention({ id_atencion: 51, id_matricula: 101 }),
      );
    db.atencionEnfermeria.create.mockResolvedValue(
      attention({ id_atencion: 51, id_matricula: 101 }),
    );
    db.enfermeriaMovimiento.findMany.mockResolvedValue([]);

    await expect(
      service.create(7, scope, {
        id_matricula: 101,
        motivo: 'Dolor observado',
      }),
    ).resolves.toMatchObject({ id_atencion: 51, id_matricula: 101 });
  });

  it('mantiene una ficha única por alumno y colegio mediante upsert compuesto', async () => {
    const { db, service } = authorizedSetup();
    db.matricula.findFirst.mockResolvedValue(enrollment());
    db.fichaSalud.findUnique.mockResolvedValue(null);
    db.fichaSalud.upsert.mockResolvedValue({
      id_ficha: 1,
      id_tenant: 1,
      id_colegio: 10,
      id_estudiante: 200,
      grupo_sanguineo: null,
      alergias_declaradas: 'Polen',
      condiciones_declaradas: null,
      medicacion_habitual_declarada: null,
      seguro_centro_atencion: null,
      contacto_emergencia: null,
      telefono_emergencia: null,
      observaciones_relevantes: null,
    });
    db.autorizacionMedicacion.findMany.mockResolvedValue([]);
    db.atencionEnfermeria.findMany.mockResolvedValue([]);
    db.apoderadoEstudiante.findMany.mockResolvedValue([]);
    await service.saveRecord(7, scope, 200, {
      alergias_declaradas: 'Polen',
    });
    expect(db.fichaSalud.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id_colegio_id_estudiante: { id_colegio: 10, id_estudiante: 200 },
        },
      }),
    );
  });

  it('no permite autorización con apoderado ajeno', async () => {
    const { db, service } = authorizedSetup();
    db.matricula.findFirst.mockResolvedValue(enrollment());
    db.apoderadoEstudiante.findUnique.mockResolvedValue(null);
    await expect(
      service.authorization(7, scope, 200, {
        id_apoderado: 999,
        medicamento: 'Medicamento declarado',
        dosis_instruccion: 'Instrucción familiar',
        fecha_inicio: '2026-09-14',
        fecha_fin: '2026-09-15',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([
    ['revocada', new Date('2026-12-31')],
    ['activa', new Date('2020-01-01')],
  ])(
    'rechaza medicación con autorización %s o vencida',
    async (status, end) => {
      const { db, service } = authorizedSetup();
      db.atencionEnfermeria.findFirst.mockResolvedValue(attention());
      db.autorizacionMedicacion.findFirst.mockResolvedValue(
        status === 'revocada'
          ? null
          : {
              id_autorizacion: 8,
              estado: status,
              fecha_inicio: new Date('2019-01-01'),
              fecha_fin: end,
            },
      );
      await expect(
        service.medication(7, scope, 50, { id_autorizacion: 8 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it('rechaza medicación sin autorización activa seleccionada', async () => {
    const { db, service } = authorizedSetup();
    db.atencionEnfermeria.findFirst.mockResolvedValue(attention());
    db.autorizacionMedicacion.findFirst.mockResolvedValue(null);
    await expect(
      service.medication(7, scope, 50, { id_autorizacion: 9 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('registra medicación solo con autorización activa vigente y actor', async () => {
    const { db, service } = authorizedSetup();
    db.atencionEnfermeria.findFirst.mockResolvedValue(attention());
    db.autorizacionMedicacion.findFirst.mockResolvedValue({
      id_autorizacion: 8,
      estado: 'activa',
      fecha_inicio: new Date('2020-01-01'),
      fecha_fin: new Date('2030-12-31'),
    });
    db.enfermeriaMovimiento.findMany.mockResolvedValue([]);
    await service.medication(7, scope, 50, { id_autorizacion: 8 });
    expect(db.atencionEnfermeria.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id_autorizacion_medicacion: 8,
          medicacion_administrada: true,
          id_usuario_medicacion: 7,
        }),
      }),
    );
    expect(db.enfermeriaMovimiento.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          accion: 'medicacion_administrada',
          id_usuario_actor: 7,
        }),
      }),
    );
  });

  it('cierra una atención abierta sin eliminarla y registra destino', async () => {
    const { db, service } = authorizedSetup();
    db.atencionEnfermeria.findFirst
      .mockResolvedValueOnce(attention())
      .mockResolvedValueOnce(
        attention({ estado: 'cerrada', destino: 'regresa_aula' }),
      );
    db.enfermeriaMovimiento.findMany.mockResolvedValue([]);
    const result = await service.close(7, scope, 50, {
      destino: 'regresa_aula',
      notificar_apoderado: false,
    });
    expect(result.estado).toBe('cerrada');
    expect(db.atencionEnfermeria.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          estado: 'cerrada',
          destino: 'regresa_aula',
        }),
      }),
    );
  });

  it('una atención cerrada no se sobrescribe sin motivo de corrección', async () => {
    const { db, service } = authorizedSetup();
    db.atencionEnfermeria.findFirst.mockResolvedValue(
      attention({ estado: 'cerrada' }),
    );
    await expect(
      service.update(7, scope, 50, { observacion_reportada: 'Corrección' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('actualiza observaciones y cuidados de una atención abierta con actor', async () => {
    const { db, service } = authorizedSetup();
    db.atencionEnfermeria.findFirst
      .mockResolvedValueOnce(attention())
      .mockResolvedValueOnce(
        attention({
          observacion_reportada: 'Refiere mejoría',
          acciones_realizadas: 'Reposo y control de temperatura',
        }),
      );
    db.enfermeriaMovimiento.findMany.mockResolvedValue([]);

    const result = await service.update(7, scope, 50, {
      observacion_reportada: 'Refiere mejoría',
      acciones_realizadas: 'Reposo y control de temperatura',
    });

    expect(result.acciones_realizadas).toBe(
      'Reposo y control de temperatura',
    );
    expect(db.enfermeriaMovimiento.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          accion: 'actualizacion',
          id_usuario_actor: 7,
        }),
      }),
    );
  });

  it('contacta únicamente a un apoderado vinculado', async () => {
    const { db, service } = authorizedSetup();
    db.atencionEnfermeria.findFirst.mockResolvedValue(attention());
    db.apoderadoEstudiante.findUnique.mockResolvedValue(null);
    await expect(
      service.contact(7, scope, 50, {
        id_apoderado: 999,
        medio: 'telefono',
        notificar: false,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deduplica usuarios y emite texto mínimo sin detalle sensible', async () => {
    const { db, service } = authorizedSetup();
    db.atencionEnfermeria.findFirst.mockResolvedValue(attention());
    db.apoderadoEstudiante.findUnique.mockResolvedValue({
      id_apoderado: 400,
      id_estudiante: 200,
    });
    db.enfermeriaContacto.create.mockResolvedValue({ id_contacto: 70 });
    db.usuario.findMany.mockResolvedValue([
      { id_usuario: 90 },
      { id_usuario: 90 },
    ]);
    db.notificacion.createMany.mockResolvedValue({ count: 1 });
    db.enfermeriaMovimiento.findMany.mockResolvedValue([]);
    await service.contact(7, scope, 50, {
      id_apoderado: 400,
      medio: 'telefono',
      observacion: 'Detalle de contacto',
      notificar: true,
    });
    const notifications = db.notificacion.createMany.mock.calls[0][0].data;
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      id_usuario: 90,
      id_tenant: 1,
      id_colegio: 10,
      origen: 'enfermeria',
      canal: 'portal',
      url: null,
    });
    expect(notifications[0].mensaje).not.toContain('Dato sensible');
    expect(notifications[0].mensaje).not.toContain('medicamento');
  });

  it('un ID directo de atención ajena responde no encontrado', async () => {
    const { db, service } = authorizedSetup();
    db.atencionEnfermeria.findFirst.mockResolvedValue(null);
    await expect(service.detail(7, scope, 999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(db.atencionEnfermeria.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id_atencion: 999,
          id_tenant: 1,
          id_colegio: { in: [10] },
        }),
      }),
    );
  });
});
