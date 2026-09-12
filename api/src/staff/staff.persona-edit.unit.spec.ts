import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StaffWriteDto } from './staff.dto';
import { StaffService } from './staff.service';

const personaBefore = {
  id_persona: 20,
  dni: '12345678',
  nombres: 'Persona',
  apellido_paterno: 'Compartida',
  apellido_materno: 'Prueba',
  fecha_nacimiento: new Date('1980-01-01'),
  direccion: 'Dirección anterior',
  departamento: 'Lima',
  provincia: 'Lima',
  distrito: 'Lima',
  telefono: '900000000',
  correo: 'persona@example.test',
};
const staffRecord = {
  id_staff: 30,
  id_persona: 20,
  id_tenant: 1,
  id_colegio: 10,
  cargo: 'Coordinación',
  area: 'Administración',
  permite_citas: true,
  es_miembro_staff: true,
  persona: personaBefore,
  colegio: { id_colegio: 10, nombre: 'Colegio autorizado' },
  seccion: null,
};

function actor(role: 'Admin' | 'Director') {
  return {
    estado: true,
    rol: { nombre_rol: role },
    tenants: [{ id_tenant: 1 }],
    colegios: [
      {
        id_colegio: 10,
        rol_colegio: role,
        estado: 'Activo',
      },
    ],
  };
}

function contextPersona(extra: Record<string, unknown> = {}) {
  return {
    staff: [
      {
        id_tenant: 1,
        id_colegio: 10,
        colegio: { id_tenant: 1 },
        seccion: null,
      },
    ],
    usuarios: [],
    docentes: [],
    estudiantes: [],
    apoderados: [],
    ...extra,
  };
}

function payload(overrides: Partial<StaffWriteDto> = {}): StaffWriteDto {
  return {
    id_colegio: 10,
    cargo: 'Coordinación',
    area: 'Administración',
    permite_citas: true,
    persona: {
      dni: '12345678',
      nombres: 'Persona',
      apellido_paterno: 'Compartida',
      apellido_materno: 'Prueba',
      fecha_nacimiento: '1980-01-01',
      telefono: '999111222',
      direccion: 'Nueva dirección 456',
      departamento: 'Lima',
      provincia: 'Lima',
      distrito: 'Miraflores',
      correo: 'actualizada@example.test',
    },
    ...overrides,
  };
}

function setup(
  role: 'Admin' | 'Director',
  personaContext = contextPersona(),
  duplicate: { id_persona: number } | null = { id_persona: 20 },
) {
  const personaUpdate = jest.fn(
    (input: { where: { id_persona: number }; data: Record<string, unknown> }) =>
      Promise.resolve(input),
  );
  const staffUpdate = jest.fn(({ data }: { data: Record<string, unknown> }) =>
    Promise.resolve({
      ...staffRecord,
      ...data,
      persona: {
        ...personaBefore,
        ...(personaUpdate.mock.calls.at(-1)?.[0].data ?? {}),
      },
    }),
  );
  const db = {
    usuario: { findUnique: jest.fn().mockResolvedValue(actor(role)) },
    staff: {
      findFirst: jest.fn().mockResolvedValue(staffRecord),
      update: staffUpdate,
    },
    persona: {
      findUnique: jest.fn(
        ({ where }: { where: { id_persona?: number; dni?: string } }) =>
          Promise.resolve('id_persona' in where ? personaContext : duplicate),
      ),
      update: personaUpdate,
    },
  };
  const prisma = {
    $transaction: (callback: (tx: typeof db) => Promise<unknown>) =>
      callback(db),
  } as unknown as PrismaService;
  return { service: new StaffService(prisma), personaUpdate, staffUpdate };
}

describe('Staff Persona canonical edition', () => {
  it('Admin updates phone and address on the existing Persona', async () => {
    const { service, personaUpdate } = setup('Admin');

    await service.save(
      1,
      { tenant_id: 1, scope: 'all' },
      payload(),
      staffRecord.id_staff,
    );

    expect(personaUpdate).toHaveBeenCalledTimes(1);
    const update = personaUpdate.mock.calls[0][0];
    expect(update.where).toEqual({ id_persona: personaBefore.id_persona });
    expect(update.data).toMatchObject({
      telefono: '999111222',
      direccion: 'Nueva dirección 456',
    });
  });

  it('Director updates a Persona inside the authorized school', async () => {
    const { service, personaUpdate } = setup('Director');

    await expect(
      service.save(
        1,
        { tenant_id: 1, colegio_id: 10 },
        payload(),
        staffRecord.id_staff,
      ),
    ).resolves.toMatchObject({ id_persona: personaBefore.id_persona });
    expect(personaUpdate).toHaveBeenCalledTimes(1);
  });

  it('rejects Director when the Persona also belongs to a school outside the authorized context', async () => {
    const { service, personaUpdate } = setup(
      'Director',
      contextPersona({
        usuarios: [
          {
            tenants: [{ id_tenant: 1 }],
            colegios: [{ id_colegio: 99, colegio: { id_tenant: 1 } }],
          },
        ],
      }),
    );

    await expect(
      service.save(
        1,
        { tenant_id: 1, colegio_id: 10 },
        payload(),
        staffRecord.id_staff,
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(personaUpdate).not.toHaveBeenCalled();
  });

  it('returns a conflict when the corrected DNI belongs to another Persona', async () => {
    const { service, personaUpdate } = setup('Admin', contextPersona(), {
      id_persona: 999,
    });

    await expect(
      service.save(
        1,
        { tenant_id: 1, scope: 'all' },
        payload({
          persona: { ...payload().persona!, dni: '87654321' },
        }),
        staffRecord.id_staff,
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(personaUpdate).not.toHaveBeenCalled();
  });

  it('updates a shared Docente and Staff identity exactly once without creating Persona', async () => {
    const shared = contextPersona({
      docentes: [
        {
          asignaciones: [],
          especialidades: [
            {
              area: {
                id_tenant: 1,
                id_colegio: 10,
                colegio: { id_tenant: 1 },
              },
            },
          ],
        },
      ],
    });
    const { service, personaUpdate } = setup('Admin', shared);

    await service.save(
      1,
      { tenant_id: 1, scope: 'all' },
      payload(),
      staffRecord.id_staff,
    );

    expect(personaUpdate).toHaveBeenCalledTimes(1);
    const update = personaUpdate.mock.calls[0][0];
    expect(update.where).toEqual({ id_persona: 20 });
  });

  it('audits the previous and corrected DNI without requiring a routine motive', async () => {
    const audit = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    const { service } = setup('Admin', contextPersona(), null);

    await service.save(
      1,
      { tenant_id: 1, scope: 'all' },
      payload({
        persona: { ...payload().persona!, dni: '87654321' },
      }),
      staffRecord.id_staff,
    );

    const entries = audit.mock.calls.map((call) => String(call[0])).join();
    expect(entries).toContain('12345678');
    expect(entries).toContain('87654321');
    expect(entries).toContain('Actualización rutinaria de Staff');
    audit.mockRestore();
  });
});
