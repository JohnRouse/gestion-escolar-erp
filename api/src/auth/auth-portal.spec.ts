/* eslint-disable */
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { JwtPortalStrategy } from './jwt-portal.strategy';
import { JwtStrategy } from './jwt.strategy';

function persona(withParent = true) {
  return {
    id_persona: 80,
    nombres: 'Carlos',
    apellido_paterno: 'Díaz',
    apellido_materno: 'Ramos',
    correo: 'familia@example.test',
    telefono: '999999999',
    genero: 'M',
    apoderados: withParent ? [{ id_persona: 80, ocupacion: 'Técnico' }] : [],
  };
}

function user(role: string, passwordHash: string, options: any = {}) {
  return {
    id_usuario: 7,
    id_persona: 80,
    username: role === 'Admin' ? 'admin' : 'familia',
    password_hash: passwordHash,
    estado: options.estado ?? true,
    avatar_url: null,
    tema: 'claro',
    notificaciones_activas: true,
    persona: persona(options.withParent ?? true),
    rol: { nombre_rol: role },
  };
}

describe('Auth externo V1', () => {
  let validHash: string;

  beforeAll(async () => {
    validHash = await bcrypt.hash('correcta123', 4);
  });

  function setup(currentUser: any) {
    const prisma: any = {
      usuario: { findUnique: jest.fn().mockResolvedValue(currentUser) },
      persona: { update: jest.fn() },
      apoderado: { update: jest.fn() },
      $transaction: jest.fn(async (callback: any) => callback(prisma)),
    };
    const jwt: any = { sign: jest.fn().mockReturnValue('token-firmado') };
    return { prisma, jwt, service: new AuthService(prisma, jwt) };
  }

  test('1. Apoderado con credenciales correctas entra por el login portal', async () => {
    const { service, jwt } = setup(user('Apoderado', validHash));
    await expect(
      service.loginPortal('familia', 'correcta123'),
    ).resolves.toMatchObject({
      access_token: 'token-firmado',
      user: { id_persona: 80, rol: 'Apoderado', canal: 'portal-padres' },
    });
    expect(jwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({ canal: 'portal-padres', personaId: 80 }),
    );
  });

  test('2. Apoderado no entra por el login interno', async () => {
    const { service } = setup(user('Apoderado', validHash));
    await expect(service.login('familia', 'correcta123')).rejects.toMatchObject(
      {
        response: expect.objectContaining({
          message: 'Esta cuenta debe ingresar desde el portal de apoderados.',
        }),
      },
    );
  });

  test('3. Admin no entra por el login portal', async () => {
    const { service } = setup(user('Admin', validHash));
    await expect(
      service.loginPortal('admin', 'correcta123'),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ message: 'Credenciales inválidas' }),
    });
  });

  test('4. Password incorrecta no revela la existencia o el rol', async () => {
    const { service } = setup(user('Apoderado', validHash));
    await expect(
      service.loginPortal('familia', 'incorrecta'),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ message: 'Credenciales inválidas' }),
    });
    await expect(service.login('familia', 'incorrecta')).rejects.toMatchObject({
      response: expect.objectContaining({ message: 'Credenciales inválidas' }),
    });

    const unknown = setup(null);
    await expect(
      unknown.service.loginPortal('desconocido', 'incorrecta'),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ message: 'Credenciales inválidas' }),
    });
  });

  test('5. Usuario desactivado es rechazado por el portal', async () => {
    const { service } = setup(user('Apoderado', validHash, { estado: false }));
    await expect(
      service.loginPortal('familia', 'correcta123'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  test('6. Rol externo sin registro Apoderado es rechazado', async () => {
    const { service } = setup(
      user('Apoderado', validHash, { withParent: false }),
    );
    await expect(
      service.loginPortal('familia', 'correcta123'),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ message: 'Credenciales inválidas' }),
    });
  });

  test('7. Perfil portal no expone contexto Staff o Docente', async () => {
    const { service } = setup(user('Madre', validHash));
    const profile = await service.getPortalPerfil(7);
    expect(profile).toMatchObject({
      id_usuario: 7,
      id_persona: 80,
      rol: 'Apoderado',
      canal: 'portal-padres',
    });
    expect(profile).not.toHaveProperty('contexto');
    expect(profile).not.toHaveProperty('staff');
    expect(profile).not.toHaveProperty('docente');
  });

  test('8. Admin conserva login interno con claim intranet', async () => {
    const { service, jwt } = setup(user('Admin', validHash));
    jest.spyOn(service, 'getContexto').mockResolvedValue({} as any);
    await expect(service.login('admin', 'correcta123')).resolves.toMatchObject({
      access_token: 'token-firmado',
    });
    expect(jwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({ canal: 'intranet' }),
    );
  });
});

describe('Estrategias JWT aisladas', () => {
  const portalUser = {
    id_usuario: 7,
    id_persona: 80,
    username: 'familia',
    estado: true,
    rol: { nombre_rol: 'Apoderado' },
    persona: { apoderados: [{ id_persona: 80 }] },
  };
  const internalUser = {
    id_usuario: 1,
    id_persona: 10,
    username: 'admin',
    estado: true,
    rol: { nombre_rol: 'Admin' },
  };

  test('9. Token interno no pasa jwt-portal', async () => {
    const prisma: any = { usuario: { findUnique: jest.fn() } };
    const strategy = new JwtPortalStrategy(prisma);
    await expect(
      strategy.validate({
        sub: 1,
        username: 'admin',
        rol: 'Admin',
        canal: 'intranet',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.usuario.findUnique).not.toHaveBeenCalled();
  });

  test('10. Token portal no pasa jwt interno', async () => {
    const prisma: any = { usuario: { findUnique: jest.fn() } };
    const strategy = new JwtStrategy(prisma);
    await expect(
      strategy.validate({
        sub: 7,
        username: 'familia',
        rol: 'Apoderado',
        canal: 'portal-padres',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.usuario.findUnique).not.toHaveBeenCalled();
  });

  test('11. jwt-portal relee Usuario, Rol y Apoderado desde DB', async () => {
    const prisma: any = {
      usuario: { findUnique: jest.fn().mockResolvedValue(portalUser) },
    };
    const strategy = new JwtPortalStrategy(prisma);
    await expect(
      strategy.validate({
        sub: 7,
        username: 'alterado',
        rol: 'Admin',
        personaId: 999,
        canal: 'portal-padres',
      }),
    ).resolves.toEqual({
      userId: 7,
      personaId: 80,
      username: 'familia',
      rol: 'Apoderado',
      canal: 'portal-padres',
    });
  });

  test('12. Apoderado continúa rechazado por jwt interno aun con claim intranet', async () => {
    const prisma: any = {
      usuario: { findUnique: jest.fn().mockResolvedValue(portalUser) },
    };
    const strategy = new JwtStrategy(prisma);
    await expect(
      strategy.validate({
        sub: 7,
        username: 'familia',
        rol: 'Apoderado',
        canal: 'intranet',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  test('13. jwt interno acepta al Admin activo con claim intranet', async () => {
    const prisma: any = {
      usuario: { findUnique: jest.fn().mockResolvedValue(internalUser) },
    };
    const strategy = new JwtStrategy(prisma);
    await expect(
      strategy.validate({
        sub: 1,
        username: 'admin',
        rol: 'Admin',
        canal: 'intranet',
      }),
    ).resolves.toMatchObject({ userId: 1, rol: 'Admin', canal: 'intranet' });
  });

  test('14. Tutor académico no se interpreta como rol familiar', async () => {
    const tutor = { ...portalUser, rol: { nombre_rol: 'Tutor' } };
    const prisma: any = {
      usuario: { findUnique: jest.fn().mockResolvedValue(tutor) },
    };
    const strategy = new JwtPortalStrategy(prisma);

    await expect(
      strategy.validate({
        sub: 7,
        username: 'tutor',
        rol: 'Tutor',
        canal: 'portal-padres',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
