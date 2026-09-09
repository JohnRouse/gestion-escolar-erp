import { INestApplication, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Server } from 'http';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { StaffModule } from './staff.module';
import { StaffService } from './staff.service';
import { StaffListDto, StaffWriteDto } from './staff.dto';
import {
  requireStaffTestDatabase,
  staffFixture,
  staffTestPassword,
} from '../../test/staff-fixture';

// A real transaction fails after all five entities were written.
class FailingStaffService extends StaffService {
  protected async ensureAccess(
    ...args: Parameters<StaffService['ensureAccess']>
  ): Promise<never> {
    await super.ensureAccess(...args);
    throw new Error('Injected failure after memberships');
  }
}

describe('Staff HTTP + isolated database', () => {
  let app: INestApplication;
  let server: Server;
  let db: PrismaService;
  let service: StaffService;
  let f: Awaited<ReturnType<typeof staffFixture>>;
  const tokens: Record<string, string> = {};
  let created: { id_staff: number; id_persona: number };
  let seq = 100;
  const audit = jest
    .spyOn(Logger.prototype, 'log')
    .mockImplementation(() => undefined);
  const query = () => ({ tenant_id: f.tenant.id_tenant, scope: 'all' });
  const body = (overrides: Partial<StaffWriteDto> = {}): StaffWriteDto => ({
    id_colegio: f.school.id_colegio,
    cargo: 'Auxiliar',
    area: 'Bienestar',
    permite_citas: true,
    motivo: 'Alta de prueba aislada',
    persona: {
      dni: String(93000000 + ++seq),
      nombres: 'Nuevo',
      apellido_paterno: 'Miembro',
      apellido_materno: 'Staff',
      fecha_nacimiento: '1990-03-10',
    },
    ...overrides,
  });
  const get = (path: string, rol = 'Admin') =>
    request(server)
      .get(path)
      .auth(tokens[rol], { type: 'bearer' })
      .query(query());
  const post = (data: object, rol = 'Admin') =>
    request(server)
      .post('/staff')
      .auth(tokens[rol], { type: 'bearer' })
      .query(query())
      .send(data);
  const put = (id: number, data: object) =>
    request(server)
      .put(`/staff/${id}`)
      .auth(tokens.Admin, { type: 'bearer' })
      .query(query())
      .send(data);
  beforeAll(async () => {
    requireStaffTestDatabase();
    const module = await Test.createTestingModule({
      imports: [PrismaModule, AuthModule, StaffModule],
    }).compile();
    app = module.createNestApplication();
    await app.init();
    server = app.getHttpServer() as Server;
    db = app.get(PrismaService);
    service = app.get(StaffService);
    f = await staffFixture(db);
    for (const rol of ['Admin', 'Director', 'Profesor', 'Secretaria']) {
      const res = await request(server)
        .post('/auth/login')
        .send({
          username: `staff.${rol.toLowerCase()}`,
          password: staffTestPassword,
        })
        .expect(200);
      tokens[rol] = (res.body as { access_token: string }).access_token;
    }
  }, 60000);
  afterAll(async () => {
    audit.mockRestore();
    if (app) await app.close();
  });

  it('lists only authorized schools, supports legacy school ownership and has no secrets', async () => {
    const res = await get('/staff').expect(200);
    const data = res.body as { data: { id_staff: number }[] };
    expect(data.data.map((x) => x.id_staff)).toEqual([f.legacy.id_staff]);
    expect(JSON.stringify(res.body)).not.toMatch(/password_hash|password/);
    await get('/staff', 'Director').expect(200);
  });
  it.each(['Profesor', 'Secretaria'])(
    '%s cannot read, create, edit or look up identities',
    async (rol) => {
      await get('/staff', rol).expect(403);
      await post(body(), rol).expect(403);
      await request(server)
        .put(`/staff/${f.legacy.id_staff}`)
        .auth(tokens[rol], { type: 'bearer' })
        .query(query())
        .send(body())
        .expect(403);
      await get('/staff/personas/92000001', rol).expect(403);
    },
  );
  it('rejects foreign tenant and school IDs on reads and writes', async () => {
    await request(server)
      .get('/staff')
      .auth(tokens.Admin, { type: 'bearer' })
      .query({ tenant_id: f.otherTenant.id_tenant, scope: 'all' })
      .expect(403);
    for (const target of [f.foreignStaff, f.forbidden]) {
      await get(`/staff/${target.id_staff}`).expect(404);
      await put(target.id_staff, body({ persona: undefined })).expect(404);
    }
    await post(body({ id_colegio: f.foreign.id_colegio })).expect(403);
    await post(body({ id_colegio: f.denied.id_colegio })).expect(403);
    await request(server)
      .post('/staff')
      .auth(tokens.Admin, { type: 'bearer' })
      .query({ tenant_id: f.tenant.id_tenant, colegio_id: f.school.id_colegio })
      .send(body({ id_colegio: f.second.id_colegio }))
      .expect(403);
  });
  it('requires unambiguous context and validates DTOs including unknown fields', async () => {
    await post({ ...body(), id_colegio: undefined }).expect(400);
    await post({ ...body(), permite_citas: 'false' }).expect(400);
    await post({ ...body(), estado: false }).expect(400);
    await post(body({ persona: { ...body().persona!, dni: 'bad' } })).expect(
      400,
    );
    await request(server)
      .get('/staff')
      .auth(tokens.Admin, { type: 'bearer' })
      .query({ tenant_id: f.tenant.id_tenant })
      .expect(400);
    await get('/staff').query({ page: -1 }).expect(400);
  });
  it('creates Persona + Staff + Usuario + both memberships and login works', async () => {
    const input = body({
      acceso: {
        username: 'staff.new',
        rol: 'Secretaria',
        password: staffTestPassword,
      },
    });
    const res = await post(input).expect(201);
    created = res.body as typeof created;
    const user = await db.usuario.findUniqueOrThrow({
      where: { username: 'staff.new' },
      include: { tenants: true, colegios: true },
    });
    expect(user.id_persona).toBe(created.id_persona);
    expect(user.tenants[0].estado).toBe('Activo');
    expect(user.colegios[0].estado).toBe('Activo');
    expect(user.password_hash).not.toBe(staffTestPassword);
    await request(server)
      .post('/auth/login')
      .send({ username: 'staff.new', password: staffTestPassword })
      .expect(200);
    expect(JSON.stringify(res.body)).not.toContain(user.password_hash);
  });
  it('edits institutional fields and appointment availability, preserving identity and tutor flags', async () => {
    await db.staff.update({
      where: { id_staff: created.id_staff },
      data: { es_tutor: true },
    });
    await put(
      created.id_staff,
      body({
        persona: undefined,
        cargo: 'Coordinador',
        area: 'Soporte',
        permite_citas: false,
      }),
    ).expect(200);
    const saved = await db.staff.findUniqueOrThrow({
      where: { id_staff: created.id_staff },
    });
    expect(saved).toMatchObject({
      cargo: 'Coordinador',
      area: 'Soporte',
      permite_citas: false,
      es_tutor: true,
      id_persona: created.id_persona,
    });
    await put(
      created.id_staff,
      body({ persona: undefined, permite_citas: true }),
    ).expect(200);
    await put(created.id_staff, body()).expect(400);
    await put(
      created.id_staff,
      body({ persona: undefined, id_colegio: f.second.id_colegio }),
    ).expect(400);
  });
  it('searches name/document/cargo/area, filters appointments, paginates and returns empty', async () => {
    for (const q of ['Nuevo Miembro', 'Auxiliar', 'Bienestar']) {
      const res = await get('/staff').query({ q }).expect(200);
      expect(
        (res.body as { meta: { total: number } }).meta.total,
      ).toBeGreaterThan(0);
    }
    const empty = await get('/staff')
      .query({ q: 'zzzz-no-result' })
      .expect(200);
    expect((empty.body as { data: object[] }).data).toEqual([]);
    const page = await get('/staff')
      .query({ limit: 1, page: 1, citas: 'si' })
      .expect(200);
    expect((page.body as { data: object[] }).data).toHaveLength(1);
  });
  it('reuses a standalone Persona without overwriting it or duplicating DNI', async () => {
    const persona = await db.persona.create({
      data: {
        dni: '94000001',
        nombres: 'Existente',
        apellido_paterno: 'Persona',
        apellido_materno: 'Prueba',
        fecha_nacimiento: new Date('1980-01-01'),
      },
    });
    await get('/staff/personas/94000001').expect(200);
    const input = body({
      persona: {
        ...body().persona!,
        dni: persona.dni,
        nombres: 'No sobrescribir',
      },
    });
    const res = await post(input).expect(201);
    expect((res.body as { id_persona: number }).id_persona).toBe(
      persona.id_persona,
    );
    expect(
      (await db.persona.findUniqueOrThrow({ where: { dni: persona.dni } }))
        .nombres,
    ).toBe('Existente');
    await post(input).expect(409);
    expect(await db.persona.count({ where: { dni: persona.dni } })).toBe(1);
  });
  it('associates an existing internal account without changing its password or global role', async () => {
    const persona = await db.persona.create({
      data: {
        dni: '94000002',
        nombres: 'Cuenta',
        apellido_paterno: 'Existente',
        apellido_materno: 'Prueba',
        fecha_nacimiento: new Date('1980-01-01'),
      },
    });
    const rol = await db.rol.findUniqueOrThrow({
      where: { nombre_rol: 'Profesor' },
    });
    const user = await db.usuario.create({
      data: {
        id_persona: persona.id_persona,
        id_rol: rol.id_rol,
        username: 'staff.existing',
        password_hash: 'unchanged',
      },
    });
    await db.usuarioTenant.create({
      data: { id_usuario: user.id_usuario, id_tenant: f.tenant.id_tenant },
    });
    await db.usuarioColegio.create({
      data: {
        id_usuario: user.id_usuario,
        id_colegio: f.school.id_colegio,
        rol_colegio: 'Profesor',
        es_principal: true,
      },
    });
    await post(
      body({
        id_colegio: f.second.id_colegio,
        persona: { ...body().persona!, dni: persona.dni },
        acceso: { username: user.username, rol: 'Profesor' },
      }),
    ).expect(201);
    const after = await db.usuario.findUniqueOrThrow({
      where: { id_usuario: user.id_usuario },
      include: { colegios: true },
    });
    expect(after.password_hash).toBe('unchanged');
    expect(after.id_rol).toBe(rol.id_rol);
    expect(after.colegios).toHaveLength(2);
    expect(after.colegios.filter((c) => c.es_principal)).toHaveLength(1);
  });
  it('associates an existing account with no memberships and ensures both', async () => {
    const persona = await db.persona.create({
      data: {
        dni: '94000003',
        nombres: 'Sin Membresías',
        apellido_paterno: 'Prueba',
        apellido_materno: 'Staff',
        fecha_nacimiento: new Date('1980-01-01'),
      },
    });
    const rol = await db.rol.findUniqueOrThrow({
      where: { nombre_rol: 'Profesor' },
    });
    const user = await db.usuario.create({
      data: {
        id_persona: persona.id_persona,
        id_rol: rol.id_rol,
        username: 'staff.unlinked',
        password_hash: 'unchanged',
      },
    });
    await post(
      body({
        persona: { ...body().persona!, dni: persona.dni },
        acceso: { username: user.username, rol: 'Profesor' },
      }),
    ).expect(201);
    expect(
      await db.usuarioTenant.count({
        where: { id_usuario: user.id_usuario, estado: 'Activo' },
      }),
    ).toBe(1);
    expect(
      await db.usuarioColegio.count({
        where: { id_usuario: user.id_usuario, estado: 'Activo' },
      }),
    ).toBe(1);
  });
  it('never discloses a foreign identity on document lookup or creation', async () => {
    await get('/staff/personas/92000003').expect(409);
    await post(
      body({ persona: { ...body().persona!, dni: '92000003' } }),
    ).expect(409);
  });
  it('inactive actor membership invalidates an already issued token', async () => {
    await db.usuarioTenant.update({
      where: {
        id_usuario_id_tenant: {
          id_usuario: f.actors.Admin,
          id_tenant: f.tenant.id_tenant,
        },
      },
      data: { estado: 'Inactivo' },
    });
    await get('/staff').expect(403);
    await post(body()).expect(403);
    await db.usuarioTenant.update({
      where: {
        id_usuario_id_tenant: {
          id_usuario: f.actors.Admin,
          id_tenant: f.tenant.id_tenant,
        },
      },
      data: { estado: 'Activo' },
    });
    await db.usuarioColegio.update({
      where: {
        id_usuario_id_colegio: {
          id_usuario: f.actors.Admin,
          id_colegio: f.school.id_colegio,
        },
      },
      data: { estado: 'Inactivo' },
    });
    await post(body()).expect(403);
    await get(`/staff/${created.id_staff}`).expect(404);
    await db.usuarioColegio.update({
      where: {
        id_usuario_id_colegio: {
          id_usuario: f.actors.Admin,
          id_colegio: f.school.id_colegio,
        },
      },
      data: { estado: 'Activo' },
    });
  });
  it('does not reactivate target memberships, replace passwords or create a second account for the role', async () => {
    const user = await db.usuario.findUniqueOrThrow({
      where: { username: 'staff.new' },
    });
    await db.usuarioColegio.update({
      where: {
        id_usuario_id_colegio: {
          id_usuario: user.id_usuario,
          id_colegio: f.school.id_colegio,
        },
      },
      data: { estado: 'Inactivo' },
    });
    const input = body({
      persona: undefined,
      acceso: { username: user.username, rol: 'Secretaria' },
    });
    await put(created.id_staff, input).expect(409);
    await put(created.id_staff, {
      ...input,
      acceso: {
        ...input.acceso,
        username: 'staff.duplicate',
        password: staffTestPassword,
      },
    }).expect(409);
    await db.usuarioColegio.update({
      where: {
        id_usuario_id_colegio: {
          id_usuario: user.id_usuario,
          id_colegio: f.school.id_colegio,
        },
      },
      data: { estado: 'Activo' },
    });
    await put(created.id_staff, {
      ...input,
      acceso: { ...input.acceso, password: staffTestPassword },
    }).expect(400);
    const after = await db.usuario.findUniqueOrThrow({
      where: { id_usuario: user.id_usuario },
    });
    expect(after.password_hash).toBe(user.password_hash);
  });
  it('Director can create Staff but cannot create Admin credentials', async () => {
    await post(body(), 'Director').expect(201);
    await post(
      body({
        acceso: {
          username: 'staff.elevation',
          rol: 'Admin',
          password: staffTestPassword,
        },
      }),
      'Director',
    ).expect(403);
  });
  it('rolls back new Persona and Staff when username conflicts', async () => {
    const input = body({
      acceso: {
        username: 'staff.admin',
        rol: 'Admin',
        password: staffTestPassword,
      },
    });
    const count = await db.staff.count();
    await post(input).expect(409);
    expect(
      await db.persona.findUnique({ where: { dni: input.persona!.dni } }),
    ).toBeNull();
    expect(await db.staff.count()).toBe(count);
  });
  it('rolls back all five entities on a late failure', async () => {
    const input = body({
      acceso: {
        username: 'staff.rollback',
        rol: 'Profesor',
        password: staffTestPassword,
      },
    });
    const counts = await Promise.all([
      db.persona.count(),
      db.staff.count(),
      db.usuario.count(),
      db.usuarioTenant.count(),
      db.usuarioColegio.count(),
    ]);
    await expect(
      new FailingStaffService(db).save(f.actors.Admin, query(), input),
    ).rejects.toThrow('Injected failure');
    expect(
      await Promise.all([
        db.persona.count(),
        db.staff.count(),
        db.usuario.count(),
        db.usuarioTenant.count(),
        db.usuarioColegio.count(),
      ]),
    ).toEqual(counts);
  });
  it('concurrent duplicate DNI requests produce one record', async () => {
    const input = body();
    const results = await Promise.all([post(input), post(input)]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await db.persona.count({ where: { dni: input.persona!.dni } })).toBe(
      1,
    );
  });
  it('audits actor, date, institution, before/after and motive without secrets', () => {
    const entries = audit.mock.calls
      .map((call) => String(call[0]))
      .filter((x) => x.includes('staff.editar'));
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.join()).toContain('anterior');
    expect(entries.join()).toContain('posterior');
    expect(entries.join()).toContain('motivo');
    expect(entries.join()).not.toMatch(/password_hash|Staff-fixture/);
  });
  it('service itself rejects a professor even without the HTTP role guard', async () => {
    await expect(
      service.list(
        f.actors.Profesor,
        Object.assign(new StaffListDto(), query()),
      ),
    ).rejects.toThrow('No tienes permiso');
  });
});
