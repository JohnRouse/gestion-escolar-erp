/* eslint-disable */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  CitasService,
  canTransition,
  parseCitaDate,
  validateCitaSchedule,
} from './citas.service';

const ESTADOS_MATRICULA_ACTIVA_ESPERADOS = [
  'Activo',
  'Matriculado',
  'Pre-matriculado',
];

const person = (id: number, nombres = 'Persona') => ({
  id_persona: id,
  nombres,
  apellido_paterno: 'Prueba',
  apellido_materno: null,
  dni:
    id === 400
      ? '47516239'
      : id === 800
        ? '12345678'
        : id === 801
          ? '87654310'
          : null,
});

const enrollment = (parentIds = [800]) => ({
  id_matricula: 300,
  codigo_matricula: 'SMV-2027-0004',
  id_estudiante: 400,
  id_colegio: 10,
  id_tenant: 1,
  id_seccion: 20,
  id_anio: 2026,
  colegio: { id_colegio: 10, id_tenant: 1, nombre: 'Colegio' },
  seccion: {
    id_seccion: 20,
    id_colegio: 10,
    letra: 'A',
    colegio: { id_colegio: 10, id_tenant: 1, nombre: 'Colegio' },
    grado: { nombre_grado: 'Quinto', nivel: { nombre_nivel: 'Primaria' } },
  },
  anio: { id_anio: 2026, nombre_anio: '2026' },
  estudiante: {
    codigo_estudiante: 'EST-1',
    persona: person(400, 'Estudiante'),
    apoderados: parentIds.map((id) => ({
      id_apoderado: id,
      parentesco: 'Madre',
      apoderado: { id_persona: id, persona: person(id, 'Apoderado') },
    })),
  },
});

const enrollmentWithParents = () => {
  const item = enrollment([800, 801]) as any;
  item.estudiante.apoderados = [
    {
      id_apoderado: 800,
      parentesco: 'Padre',
      apoderado: {
        id_persona: 800,
        persona: {
          ...person(800, 'Carlos Alberto'),
          apellido_paterno: 'Díaz',
          apellido_materno: 'Ramos',
        },
      },
    },
    {
      id_apoderado: 801,
      parentesco: 'Madre',
      apoderado: {
        id_persona: 801,
        persona: {
          ...person(801, 'Rosa Milagros'),
          apellido_paterno: 'Pardo',
          apellido_materno: 'Salazar',
        },
      },
    },
  ];
  return item;
};

const cita = (overrides: Record<string, unknown> = {}) => ({
  id_cita: 77,
  tipo: 'individual',
  id_tenant: 1,
  id_colegio: 10,
  id_staff: null,
  id_docente: 501,
  id_apoderado: 800,
  id_matricula: 300,
  id_seccion: null,
  contexto_destinatario: 'docente',
  funcion_destinatario: 'Docente · Matemática',
  fecha: new Date('2030-09-20T00:00:00.000Z'),
  hora_inicio: '10:00',
  hora_fin: '10:30',
  motivo: 'Seguimiento académico',
  estado: 'confirmada',
  creado_en: new Date('2030-09-01T12:00:00.000Z'),
  actualizado_en: new Date('2030-09-01T12:00:00.000Z'),
  colegio: { id_colegio: 10, nombre: 'Colegio' },
  staff: null,
  docente: { id_persona: 501, persona: person(501, 'Docente') },
  apoderado: {
    id_persona: 800,
    persona: { ...person(800, 'Apoderado'), telefono: '999999999' },
  },
  seccion: null,
  matricula: {
    id_matricula: 300,
    id_estudiante: 400,
    id_colegio: 10,
    estudiante: {
      codigo_estudiante: 'EST-1',
      persona: person(400, 'Estudiante'),
    },
    seccion: enrollment().seccion,
    anio: enrollment().anio,
  },
  movimientos: [],
  ...overrides,
});

const section = () => ({
  id_seccion: 20,
  id_tenant: 1,
  id_colegio: 10,
  letra: 'A',
  colegio: { id_colegio: 10, id_tenant: 1, nombre: 'Colegio' },
  grado: { nombre_grado: '5.º', nivel: { nombre_nivel: 'Primaria' } },
});

const sectionMeeting = (overrides: Record<string, unknown> = {}) =>
  cita({
    tipo: 'seccion',
    id_apoderado: null,
    id_matricula: null,
    id_seccion: 20,
    apoderado: null,
    matricula: null,
    seccion: section(),
    motivo: 'Reunión con padres de familia',
    ...overrides,
  });

function actor(
  role: string,
  schools: Array<{ id_colegio: number; rol_colegio: string }>,
) {
  return {
    id_persona: 501,
    estado: true,
    rol: { nombre_rol: role },
    tenants: [{ id_tenant: 1 }],
    colegios: schools,
  };
}

function setup() {
  const prisma: any = {
    usuario: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    cita: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      update: jest.fn(),
    },
    citaMovimiento: { create: jest.fn() },
    matricula: {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    seccion: {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    asignacionDocente: {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    staff: {
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
  prisma.$transaction = jest.fn(async (callback: (tx: any) => unknown) =>
    callback(prisma),
  );
  const notifications = { crearNotificacion: jest.fn() } as any;
  return {
    prisma,
    service: new CitasService(prisma, notifications),
    notifications,
  };
}

describe('CitasService V1: autorización, destinatarios y trazabilidad', () => {
  test('1. Admin limita su agenda a los colegios donde es autoridad', async () => {
    const { prisma, service } = setup();
    prisma.usuario.findUnique.mockResolvedValue(
      actor('Admin', [
        { id_colegio: 10, rol_colegio: 'Admin' },
        { id_colegio: 11, rol_colegio: 'Profesor' },
      ]),
    );
    const scope = await service.resolveScope(prisma, 1, {
      tenant_id: 1,
      scope: 'all',
    });
    expect(scope.schoolIds).toEqual([10]);
  });

  test('2. Director no puede usar un colegio ajeno aunque conozca su id', async () => {
    const { prisma, service } = setup();
    prisma.usuario.findUnique.mockResolvedValue(
      actor('Director', [{ id_colegio: 10, rol_colegio: 'Director' }]),
    );
    await expect(
      service.resolveScope(prisma, 1, { tenant_id: 1, colegio_id: 99 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  test('3. Secretaria opera el colegio asignado, pero no un alcance consolidado', async () => {
    const { prisma, service } = setup();
    prisma.usuario.findUnique.mockResolvedValue(
      actor('Secretaria', [{ id_colegio: 10, rol_colegio: 'Secretaria' }]),
    );
    await expect(
      service.resolveScope(prisma, 1, { tenant_id: 1, colegio_id: 10 }),
    ).resolves.toMatchObject({ schoolIds: [10], managerSchoolIds: [10] });
    await expect(
      service.resolveScope(prisma, 1, { tenant_id: 1, scope: 'all' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  test('4. Destinatario con acceso intranet consulta solo citas propias', async () => {
    const { prisma, service } = setup();
    prisma.usuario.findUnique.mockResolvedValue(
      actor('Profesor', [{ id_colegio: 10, rol_colegio: 'Profesor' }]),
    );
    await service.list(1, {
      tenant_id: 1,
      colegio_id: 10,
      page: 1,
      limit: 20,
    });
    const where = prisma.cita.findMany.mock.calls[0][0].where;
    expect(JSON.stringify(where)).toContain('"id_docente":501');
    expect(JSON.stringify(where)).toContain('"id_persona":501');
  });

  test('5. Apoderado lista únicamente sus propias citas', async () => {
    const { prisma, service } = setup();
    prisma.usuario.findUnique.mockResolvedValue({
      estado: true,
      persona: { apoderados: [{ id_persona: 800 }] },
    });
    await service.parentAppointments(1);
    expect(
      JSON.stringify(prisma.cita.findMany.mock.calls[0][0].where),
    ).toContain('"id_apoderado":800');
  });

  test('6. Un apoderado no obtiene destinatarios de una matrícula ajena', async () => {
    const { prisma, service } = setup();
    prisma.usuario.findUnique.mockResolvedValue({
      estado: true,
      persona: { apoderados: [{ id_persona: 900 }] },
    });
    prisma.matricula.findFirst.mockResolvedValue(enrollment([800]));
    await expect(service.parentRecipients(1, 300)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  test('7. Solo expone docentes asignados al curso actual del hijo', async () => {
    const { prisma, service } = setup();
    prisma.asignacionDocente.findMany.mockResolvedValue([
      {
        id_docente: 501,
        docente: { persona: person(501, 'Docente') },
        curso: { nombre_curso: 'Matemática' },
      },
    ]);
    prisma.staff.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const options = await (service as any).recipientOptions(
      prisma,
      enrollment(),
    );
    expect(options).toEqual([
      expect.objectContaining({
        tipo: 'docente',
        id_destinatario: 501,
        contexto: 'docente',
      }),
    ]);
    expect(prisma.asignacionDocente.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id_seccion: 20, id_anio: 2026 }),
      }),
    );
  });

  test('8. El tutor se representa como Docente aunque su asignación legacy use Staff', async () => {
    const { prisma, service } = setup();
    prisma.staff.findMany
      .mockResolvedValueOnce([
        {
          id_staff: 70,
          id_persona: 501,
          persona: { ...person(501, 'Tutor'), docentes: [{ id_persona: 501 }] },
        },
      ])
      .mockResolvedValueOnce([]);
    const options = await (service as any).recipientOptions(
      prisma,
      enrollment(),
    );
    expect(options[0]).toMatchObject({
      tipo: 'docente',
      id_destinatario: 501,
      contexto: 'tutor',
    });
    expect(options[0].id_destinatario).not.toBe(70);
  });

  test('9. Staff sin permite_citas no entra al conjunto elegible', async () => {
    const { prisma, service } = setup();
    prisma.staff.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const options = await (service as any).recipientOptions(
      prisma,
      enrollment(),
    );
    expect(options).toEqual([]);
    expect(prisma.staff.findMany.mock.calls[1][0].where).toMatchObject({
      es_miembro_staff: true,
      permite_citas: true,
    });
  });

  test('10. Una Persona dual conserva opciones Docente y Staff distintas', async () => {
    const { prisma, service } = setup();
    prisma.asignacionDocente.findMany.mockResolvedValue([
      {
        id_docente: 501,
        docente: { persona: person(501, 'Persona dual') },
        curso: { nombre_curso: 'Ciencia' },
      },
    ]);
    prisma.staff.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        id_staff: 70,
        id_persona: 501,
        cargo: 'Directora',
        area: 'Dirección',
        persona: person(501, 'Persona dual'),
      },
    ]);
    const options = await (service as any).recipientOptions(
      prisma,
      enrollment(),
    );
    expect(options.map((item: any) => item.key).sort()).toEqual([
      'docente:501:docente',
      'staff:70:staff',
    ]);
  });

  test('11. Rechaza fecha inexistente y hora inicial no anterior', () => {
    expect(() => parseCitaDate('2030-02-30')).toThrow(BadRequestException);
    expect(() => validateCitaSchedule('2030-09-20', '10:00', '10:00')).toThrow(
      BadRequestException,
    );
  });

  test('12. Detecta solapamiento solo contra citas activas del destinatario', async () => {
    const { prisma, service } = setup();
    prisma.cita.findFirst.mockResolvedValue({ id_cita: 4 });
    await expect(
      (service as any).assertNoOverlap(
        prisma,
        null,
        501,
        501,
        new Date('2030-09-20T00:00:00.000Z'),
        '10:00',
        '10:30',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.cita.findFirst.mock.calls[0][0].where.estado).toEqual({
      in: ['pendiente', 'confirmada'],
    });
    expect(prisma.cita.findFirst.mock.calls[0][0].where.OR).toEqual(
      expect.arrayContaining([
        { id_docente: 501 },
        { staff: { id_persona: 501 } },
      ]),
    );
  });

  test('13. La máquina de estados impide transiciones arbitrarias', () => {
    expect(canTransition('pendiente', 'confirmada')).toBe(true);
    expect(canTransition('pendiente', 'realizada')).toBe(false);
    expect(canTransition('rechazada', 'confirmada')).toBe(false);
    expect(canTransition('realizada', 'cancelada')).toBe(false);
  });

  test('14. Reprogramar conserva fecha/horas anteriores y devuelve a pendiente', async () => {
    const { prisma, service } = setup();
    const previous = cita();
    (service as any).authorizedInternalRecord = jest
      .fn()
      .mockResolvedValue({ cita: previous });
    prisma.cita.findFirst.mockResolvedValue(null);
    prisma.cita.findUniqueOrThrow.mockResolvedValue(
      cita({
        fecha: new Date('2030-09-21T00:00:00.000Z'),
        hora_inicio: '11:00',
        hora_fin: '11:30',
        estado: 'pendiente',
      }),
    );
    await service.reprogram(9, { tenant_id: 1, colegio_id: 10 }, 77, {
      fecha: '2030-09-21',
      hora_inicio: '11:00',
      hora_fin: '11:30',
      comentario: 'Cambio solicitado',
    });
    expect(prisma.citaMovimiento.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id_usuario_actor: 9,
        accion: 'reprogramada',
        estado_anterior: 'confirmada',
        estado_nuevo: 'pendiente',
        fecha_anterior: previous.fecha,
        hora_inicio_anterior: '10:00',
        hora_inicio_nueva: '11:00',
      }),
    });
  });

  test('15. Los acuerdos son movimientos append-only con actor', async () => {
    const { prisma, service } = setup();
    (service as any).authorizedInternalRecord = jest
      .fn()
      .mockResolvedValue({ cita: cita() });
    prisma.cita.findUniqueOrThrow.mockResolvedValue(cita());
    await service.addAgreement(9, { tenant_id: 1, colegio_id: 10 }, 77, {
      acuerdos: 'Revisar avances en cuatro semanas.',
    });
    expect(prisma.citaMovimiento.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id_usuario_actor: 9,
        accion: 'acuerdos',
        comentario: 'Revisar avances en cuatro semanas.',
      }),
    });
    expect(prisma.cita.update).not.toHaveBeenCalled();
  });

  test('16. Un id arbitrario fuera del alcance responde como no disponible', async () => {
    const { prisma, service } = setup();
    prisma.usuario.findUnique.mockResolvedValue(
      actor('Director', [{ id_colegio: 10, rol_colegio: 'Director' }]),
    );
    prisma.cita.findFirst.mockResolvedValue(null);
    await expect(
      service.detail(1, { tenant_id: 1, colegio_id: 10 }, 999),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  test('17. Una cita legacy propia sigue siendo legible sin matrícula/colegio nuevo', async () => {
    const { prisma, service } = setup();
    prisma.usuario.findUnique.mockResolvedValue({
      estado: true,
      persona: { apoderados: [{ id_persona: 800 }] },
    });
    prisma.cita.findMany.mockResolvedValue([
      cita({
        id_tenant: null,
        id_colegio: null,
        id_matricula: null,
        colegio: null,
        matricula: null,
      }),
    ]);
    const result = await service.parentAppointments(1);
    expect(result[0]).toMatchObject({ legacy: true, estudiante: null });
  });
});

describe('Citas V1.1: búsqueda y reuniones de sección', () => {
  async function searchWhere(
    q: string,
    enrollmentState = 'Activo',
    records: any[] = [enrollment()],
  ) {
    const { prisma, service } = setup();
    prisma.usuario.findUnique.mockResolvedValue(
      actor('Admin', [{ id_colegio: 10, rol_colegio: 'Admin' }]),
    );
    prisma.matricula.findMany.mockImplementation(({ where }: any) =>
      Promise.resolve(
        where.estado_matricula?.in?.includes(enrollmentState) ? records : [],
      ),
    );
    const result = await service.participants(1, {
      tenant_id: 1,
      colegio_id: 10,
      q,
    });
    return {
      prisma,
      result,
      where: prisma.matricula.findMany.mock.calls[0][0].where,
    };
  }

  test('1. alumno con padre y madre aparece una sola vez al buscar al estudiante', async () => {
    const { result, where } = await searchWhere('Estu', 'Activo', [
      enrollmentWithParents(),
    ]);
    expect(JSON.stringify(where)).toContain('"nombres":{"contains":"Estu"}');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id_matricula: 300,
      apoderados: [
        { id_apoderado: 800, parentesco: 'Padre' },
        { id_apoderado: 801, parentesco: 'Madre' },
      ],
    });
    expect(result[0].apoderado_coincidente).toBeUndefined();
  });

  test('2. busca por DNI parcial del estudiante', async () => {
    const { result, where } = await searchWhere('47516239');
    expect(where.AND[1].OR[2]).toMatchObject({
      estudiante: {
        persona: {
          AND: [
            {
              OR: expect.arrayContaining([{ dni: { contains: '47516239' } }]),
            },
          ],
        },
      },
    });
    expect(result).toHaveLength(1);
  });

  test('3. busca por código de matrícula', async () => {
    const { result, where } = await searchWhere('SMV-2027-0004');
    expect(JSON.stringify(where)).toContain(
      '"codigo_matricula":{"contains":"SMV-2027-0004"}',
    );
    expect(result[0].codigo_matricula).toBe('SMV-2027-0004');
  });

  test('4. busca por nombres o apellidos del apoderado vinculado', async () => {
    const { where } = await searchWhere('Apoderado Prueba');
    const serialized = JSON.stringify(where);
    expect(serialized).toContain('"apoderados"');
    expect(serialized).toContain('"apellido_paterno":{"contains":"Prueba"}');
  });

  test('5. el DNI del padre devuelve cada hijo una vez y lo identifica como coincidencia', async () => {
    const { result, where } = await searchWhere('12345678', 'Activo', [
      enrollmentWithParents(),
    ]);
    expect(where.AND[1].OR[3]).toMatchObject({
      estudiante: {
        apoderados: {
          some: {
            apoderado: {
              persona: {
                AND: [
                  {
                    OR: expect.arrayContaining([
                      { dni: { contains: '12345678' } },
                    ]),
                  },
                ],
              },
            },
          },
        },
      },
    });
    expect(result).toHaveLength(1);
    expect(result[0].apoderado_coincidente).toBe(800);
  });

  test('6. el DNI de la madre devuelve cada hijo una vez y permite preseleccionarla', async () => {
    const { result } = await searchWhere('87654310', 'Activo', [
      enrollmentWithParents(),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].apoderado_coincidente).toBe(801);
  });

  test('7. el resultado contiene únicamente la lista de apoderados vinculados', async () => {
    const { result } = await searchWhere('SMV-2027-0004', 'Activo', [
      enrollmentWithParents(),
    ]);
    expect(result[0].apoderados).toEqual([
      expect.objectContaining({
        id_apoderado: 800,
        nombre: 'Carlos Alberto Díaz Ramos',
        parentesco: 'Padre',
      }),
      expect.objectContaining({
        id_apoderado: 801,
        nombre: 'Rosa Milagros Pardo Salazar',
        parentesco: 'Madre',
      }),
    ]);
  });

  test('8. una coincidencia simultánea de alumno y apoderado no duplica la matrícula', async () => {
    const { result } = await searchWhere('Prueba', 'Activo', [
      enrollmentWithParents(),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].id_matricula).toBe(300);
  });

  test('9. la búsqueda queda limitada al colegio autorizado', async () => {
    const { prisma, where } = await searchWhere('SMV');
    expect(where.AND[0].OR).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id_tenant: 1,
          id_colegio: { in: [10] },
        }),
      ]),
    );
    expect(prisma.matricula.findMany.mock.calls[0][0].take).toBe(25);
  });

  test.each(['Matriculado', 'Pre-matriculado'])(
    '10. la matrícula %s aparece en la búsqueda individual',
    async (estado) => {
      const { result, where } = await searchWhere('47516239', estado);
      expect(where.estado_matricula).toEqual({
        in: ESTADOS_MATRICULA_ACTIVA_ESPERADOS,
      });
      expect(result).toHaveLength(1);
    },
  );

  test('11. una matrícula Inactivo no aparece en la búsqueda individual', async () => {
    const { result, where } = await searchWhere('47516239', 'Inactivo');
    expect(where.estado_matricula.in).not.toContain('Inactivo');
    expect(where.estado_matricula.in).not.toContain('Reserva');
    expect(result).toEqual([]);
  });

  test('12. una matrícula de otro colegio no entra en el alcance de búsqueda', async () => {
    const { result, where } = await searchWhere('47516239');
    const directScope = where.AND[0].OR[0];
    expect(directScope).toMatchObject({
      id_tenant: 1,
      id_colegio: { in: [10] },
    });
    expect(directScope.id_colegio.in).not.toContain(11);
    expect(result[0].id_colegio).toBe(10);
  });

  async function createMeetingAs(
    role: 'Admin' | 'Director' | 'Secretaria' | 'Profesor',
    schoolRole: 'Admin' | 'Director' | 'Secretaria' | 'Profesor',
    access: 'manager' | 'assignment' | 'tutor' = 'manager',
  ) {
    const { prisma, service } = setup();
    prisma.usuario.findUnique.mockResolvedValue(
      actor(role, [{ id_colegio: 10, rol_colegio: schoolRole }]),
    );
    prisma.seccion.findFirst.mockResolvedValue(section());
    prisma.asignacionDocente.findFirst.mockResolvedValue(
      access === 'assignment' ? { id_asignacion: 50 } : null,
    );
    prisma.staff.findFirst.mockResolvedValue(
      access === 'tutor' ? { id_staff: 70 } : null,
    );
    const responsibleAssignment = {
      id_docente: 501,
      docente: { persona: person(501, 'Juan') },
      curso: { nombre_curso: 'Comunicación' },
    };
    const tutor = {
      id_staff: 70,
      id_persona: 501,
      persona: { ...person(501, 'Juan'), docentes: [{ id_persona: 501 }] },
    };
    prisma.asignacionDocente.findMany.mockResolvedValue(
      access === 'tutor' ? [] : [responsibleAssignment],
    );
    prisma.staff.findMany
      .mockResolvedValueOnce(access === 'tutor' ? [tutor] : [])
      .mockResolvedValueOnce([]);
    prisma.cita.findFirst.mockResolvedValue(null);
    prisma.cita.create.mockResolvedValue({ id_cita: 77 });
    prisma.cita.findUniqueOrThrow.mockResolvedValue(
      sectionMeeting({
        contexto_destinatario: access === 'tutor' ? 'tutor' : 'docente',
        funcion_destinatario:
          access === 'tutor'
            ? 'Tutor · 5.º Primaria "A"'
            : 'Docente · Comunicación',
      }),
    );

    const result = await service.createInternal(
      1,
      { tenant_id: 1, colegio_id: 10 },
      {
        tipo: 'seccion',
        id_colegio: 10,
        id_seccion: 20,
        tipo_destinatario: 'docente',
        id_destinatario: 501,
        contexto_destinatario: access === 'tutor' ? 'tutor' : 'docente',
        fecha: '2030-09-20',
        hora_inicio: '15:00',
        hora_fin: '16:00',
        motivo: 'Reunión con padres de familia',
      },
    );
    return { prisma, result, service };
  }

  test('10. Admin crea una reunión en una sección de su colegio', async () => {
    const { prisma, result } = await createMeetingAs('Admin', 'Admin');
    expect(result.tipo).toBe('seccion');
    expect(prisma.cita.create).toHaveBeenCalled();
  });

  test('11. Director crea una reunión en su colegio', async () => {
    const { result } = await createMeetingAs('Director', 'Director');
    expect(result.tipo).toBe('seccion');
  });

  test('12. Secretaria crea una reunión en su colegio', async () => {
    const { result } = await createMeetingAs('Secretaria', 'Secretaria');
    expect(result.tipo).toBe('seccion');
  });

  test('13. Profesor crea una reunión en una sección con asignación real', async () => {
    const { result } = await createMeetingAs(
      'Profesor',
      'Profesor',
      'assignment',
    );
    expect(result.tipo).toBe('seccion');
  });

  test('14. Profesor intenta crear en otra sección y recibe 403', async () => {
    const { prisma, service } = setup();
    prisma.usuario.findUnique.mockResolvedValue(
      actor('Profesor', [{ id_colegio: 10, rol_colegio: 'Profesor' }]),
    );
    prisma.seccion.findFirst.mockResolvedValue(section());
    prisma.asignacionDocente.findFirst.mockResolvedValue(null);
    prisma.staff.findFirst.mockResolvedValue(null);
    await expect(
      service.createInternal(
        1,
        { tenant_id: 1, colegio_id: 10 },
        {
          tipo: 'seccion',
          id_colegio: 10,
          id_seccion: 20,
          tipo_destinatario: 'docente',
          id_destinatario: 501,
          contexto_destinatario: 'docente',
          fecha: '2030-09-20',
          hora_inicio: '15:00',
          hora_fin: '16:00',
          motivo: 'Reunión con padres de familia',
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  test('15. Tutor crea una reunión en su sección como contexto Docente', async () => {
    const { prisma, result } = await createMeetingAs(
      'Profesor',
      'Profesor',
      'tutor',
    );
    expect(result.destinatario.contexto).toBe('tutor');
    expect(prisma.cita.create.mock.calls[0][0].data).toMatchObject({
      id_docente: 501,
      id_staff: null,
      contexto_destinatario: 'tutor',
    });
  });

  test('16. La reunión no exige ni persiste apoderado o matrícula individual', async () => {
    const { prisma } = await createMeetingAs('Admin', 'Admin');
    expect(prisma.cita.create.mock.calls[0][0].data).toMatchObject({
      tipo: 'seccion',
      id_seccion: 20,
      id_apoderado: null,
      id_matricula: null,
    });
  });

  test('17. La cita individual sí exige matrícula y apoderado', async () => {
    const { service } = setup();
    await expect(
      service.createInternal(
        1,
        { tenant_id: 1, colegio_id: 10 },
        {
          tipo: 'individual',
          id_colegio: 10,
          tipo_destinatario: 'docente',
          id_destinatario: 501,
          contexto_destinatario: 'docente',
          fecha: '2030-09-20',
          hora_inicio: '15:00',
          hora_fin: '16:00',
          motivo: 'Seguimiento académico',
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  test('18. Una reunión aparece diferenciada en la agenda', async () => {
    const { prisma, service } = setup();
    prisma.usuario.findUnique.mockResolvedValue(
      actor('Admin', [{ id_colegio: 10, rol_colegio: 'Admin' }]),
    );
    prisma.cita.findMany
      .mockResolvedValueOnce([sectionMeeting()])
      .mockResolvedValueOnce([]);
    const result = await service.list(1, {
      tenant_id: 1,
      colegio_id: 10,
      page: 1,
      limit: 25,
    });
    expect(result.data[0]).toMatchObject({
      tipo: 'seccion',
      seccion: { id_seccion: 20 },
    });
  });

  test('19. El detalle grupal no expone campos individuales vacíos', () => {
    const { service } = setup();
    expect(service.formatCita(sectionMeeting() as any)).toMatchObject({
      tipo: 'seccion',
      apoderado: null,
      estudiante: null,
      seccion: { id_seccion: 20 },
    });
  });

  test('20. Reprogramar una reunión conserva horario anterior en historial', async () => {
    const { prisma, service } = setup();
    const previous = sectionMeeting();
    (service as any).authorizedInternalRecord = jest
      .fn()
      .mockResolvedValue({ cita: previous });
    prisma.cita.findFirst.mockResolvedValue(null);
    prisma.cita.findUniqueOrThrow.mockResolvedValue(
      sectionMeeting({
        fecha: new Date('2030-09-21T00:00:00.000Z'),
        hora_inicio: '16:00',
        hora_fin: '17:00',
        estado: 'pendiente',
      }),
    );
    await service.reprogram(9, { tenant_id: 1, colegio_id: 10 }, 77, {
      fecha: '2030-09-21',
      hora_inicio: '16:00',
      hora_fin: '17:00',
      comentario: 'Cambio coordinado',
    });
    expect(prisma.citaMovimiento.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        accion: 'reprogramada',
        hora_inicio_anterior: '10:00',
        hora_inicio_nueva: '16:00',
      }),
    });
  });

  test('21. Cancelar una reunión conserva transición y motivo', async () => {
    const { prisma, service } = setup();
    (service as any).authorizedInternalRecord = jest
      .fn()
      .mockResolvedValue({ cita: sectionMeeting({ estado: 'confirmada' }) });
    prisma.cita.findUniqueOrThrow.mockResolvedValue(
      sectionMeeting({ estado: 'cancelada' }),
    );
    await service.changeState(9, { tenant_id: 1, colegio_id: 10 }, 77, {
      estado: 'cancelada',
      comentario: 'Actividad institucional suspendida',
    });
    expect(prisma.citaMovimiento.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        accion: 'cancelada',
        estado_anterior: 'confirmada',
        estado_nuevo: 'cancelada',
        comentario: 'Actividad institucional suspendida',
      }),
    });
  });

  test('22. El solapamiento del responsable cubre citas y reuniones', async () => {
    const { prisma, service } = setup();
    prisma.cita.findFirst.mockResolvedValue({ id_cita: 90 });
    await expect(
      (service as any).assertNoOverlap(
        prisma,
        null,
        501,
        501,
        new Date('2030-09-20T00:00:00.000Z'),
        '15:00',
        '16:00',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.cita.findFirst.mock.calls[0][0].where.estado).toEqual({
      in: ['pendiente', 'confirmada'],
    });
  });

  test('23. Profesor solo recibe sus secciones reales y las deduplica', async () => {
    const { prisma, service } = setup();
    prisma.usuario.findUnique.mockResolvedValue(
      actor('Profesor', [{ id_colegio: 10, rol_colegio: 'Profesor' }]),
    );
    prisma.asignacionDocente.findMany.mockResolvedValue([
      {
        id_seccion: 20,
        curso: { nombre_curso: 'Comunicación' },
        seccion: section(),
      },
      {
        id_seccion: 20,
        curso: { nombre_curso: 'Matemática' },
        seccion: section(),
      },
    ]);
    prisma.staff.findMany.mockResolvedValue([
      { id_seccion: 20, seccion: section() },
    ]);

    const result = await service.sections(1, {
      tenant_id: 1,
      colegio_id: 10,
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id_seccion: 20,
      relaciones: expect.arrayContaining([
        'Comunicación',
        'Matemática',
        'Tutor',
      ]),
    });
    expect(
      prisma.asignacionDocente.findMany.mock.calls[0][0].where.anio.estado.in,
    ).toContain('En curso');
  });
});

describe('Citas: contrato de matrícula operativa', () => {
  test('la creación individual y sus destinatarios validan los tres estados operativos', async () => {
    const { prisma, service } = setup();
    prisma.usuario.findUnique.mockResolvedValue(
      actor('Admin', [{ id_colegio: 10, rol_colegio: 'Admin' }]),
    );
    prisma.matricula.findFirst.mockResolvedValue(enrollment());
    prisma.asignacionDocente.findMany.mockResolvedValue([
      {
        id_docente: 501,
        docente: { persona: person(501, 'Docente') },
        curso: { nombre_curso: 'Matemática' },
      },
    ]);
    prisma.cita.findFirst.mockResolvedValue(null);
    prisma.cita.create.mockResolvedValue({ id_cita: 77 });
    prisma.cita.findUniqueOrThrow.mockResolvedValue(cita());

    await service.createInternal(
      1,
      { tenant_id: 1, colegio_id: 10 },
      {
        tipo: 'individual',
        id_colegio: 10,
        id_matricula: 300,
        id_apoderado: 800,
        tipo_destinatario: 'docente',
        id_destinatario: 501,
        contexto_destinatario: 'docente',
        fecha: '2030-09-20',
        hora_inicio: '15:00',
        hora_fin: '16:00',
        motivo: 'Seguimiento académico',
      },
    );

    expect(prisma.matricula.findFirst.mock.calls[0][0].where).toMatchObject({
      id_matricula: 300,
      estado_matricula: { in: ESTADOS_MATRICULA_ACTIVA_ESPERADOS },
    });
    expect(prisma.asignacionDocente.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id_seccion: 20, id_anio: 2026 }),
      }),
    );
    expect(prisma.cita.create).toHaveBeenCalled();
  });

  test('rechaza con 400 crear una cita con un apoderado no vinculado', async () => {
    const { prisma, service } = setup();
    prisma.usuario.findUnique.mockResolvedValue(
      actor('Admin', [{ id_colegio: 10, rol_colegio: 'Admin' }]),
    );
    prisma.matricula.findFirst.mockResolvedValue(enrollment([800]));

    await expect(
      service.createInternal(
        1,
        { tenant_id: 1, colegio_id: 10 },
        {
          tipo: 'individual',
          id_colegio: 10,
          id_matricula: 300,
          id_apoderado: 999,
          tipo_destinatario: 'docente',
          id_destinatario: 501,
          contexto_destinatario: 'docente',
          fecha: '2030-09-20',
          hora_inicio: '15:00',
          hora_fin: '16:00',
          motivo: 'Seguimiento académico',
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.cita.create).not.toHaveBeenCalled();
  });

  test('la lectura futura del apoderado conserva vínculo y estados operativos', async () => {
    const { prisma, service } = setup();
    prisma.usuario.findUnique.mockResolvedValue({
      estado: true,
      persona: { apoderados: [{ id_persona: 800 }] },
    });

    await service.parentChildren(1);
    expect(prisma.matricula.findMany.mock.calls[0][0].where).toMatchObject({
      estado_matricula: { in: ESTADOS_MATRICULA_ACTIVA_ESPERADOS },
      estudiante: {
        apoderados: { some: { id_apoderado: 800 } },
      },
    });

    await service.parentAppointments(1);
    expect(
      prisma.cita.findMany.mock.calls[0][0].where.OR[1].seccion.matriculas.some,
    ).toMatchObject({
      estado_matricula: { in: ESTADOS_MATRICULA_ACTIVA_ESPERADOS },
      estudiante: {
        apoderados: { some: { id_apoderado: 800 } },
      },
    });
  });

  test('la audiencia de sección usa la misma definición y excluye Inactivo/Reserva', async () => {
    const { prisma, service } = setup();
    await (service as any).sectionAudience(prisma, 20);
    const where = prisma.matricula.findMany.mock.calls[0][0].where;
    expect(where).toEqual({
      id_seccion: 20,
      estado_matricula: { in: ESTADOS_MATRICULA_ACTIVA_ESPERADOS },
    });
    expect(where.estado_matricula.in).not.toEqual(
      expect.arrayContaining(['Inactivo', 'Reserva']),
    );
  });
});

describe('Citas: integración dirigida con Notificaciones V1', () => {
  test('avisa al usuario responsable con contexto y referencia de la cita', async () => {
    const { prisma, service, notifications } = setup();
    prisma.usuario.findMany.mockResolvedValue([{ id_usuario: 91 }]);

    await (service as any).notifyRecipient(cita());

    expect(notifications.crearNotificacion).toHaveBeenCalledWith(
      expect.objectContaining({
        id_usuario: 91,
        id_tenant: 1,
        id_colegio: 10,
        origen: 'citas',
        referencia_tipo: 'cita',
        referencia_id: 77,
        canal: 'intranet',
        url: '/citas?cita=77',
      }),
    );
  });

  test('no duplica al mismo usuario responsable durante una operación', async () => {
    const { prisma, service, notifications } = setup();
    prisma.usuario.findMany.mockResolvedValue([
      { id_usuario: 91 },
      { id_usuario: 91 },
    ]);

    await (service as any).notifyRecipient(cita());

    expect(notifications.crearNotificacion).toHaveBeenCalledTimes(1);
  });
});
