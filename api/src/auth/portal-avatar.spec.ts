/* eslint-disable */
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const portalUser = () => ({
  id_usuario: 7,
  id_persona: 80,
  username: 'familia',
  estado: true,
  avatar_url: null as string | null,
  tema: 'claro',
  notificaciones_activas: true,
  persona: {
    id_persona: 80,
    nombres: 'Carlos',
    apellido_paterno: 'Díaz',
    apellido_materno: 'Ramos',
    correo: 'familia@example.test',
    telefono: '999999999',
    genero: 'M',
    apoderados: [{ id_persona: 80, ocupacion: 'Técnico' }],
  },
  rol: { nombre_rol: 'Apoderado' },
});

describe('Avatar propio del apoderado en Portal', () => {
  function setup() {
    const current = portalUser();
    const prisma: any = {
      usuario: {
        findUnique: jest.fn(async () => current),
        update: jest.fn(async ({ data }: any) => {
          current.avatar_url = data.avatar_url;
          return current;
        }),
      },
    };
    const service = new AuthService(prisma, { sign: jest.fn() } as any);
    return { current, prisma, service };
  }

  test('usuario portal actualiza solo Usuario.avatar_url y GET devuelve la nueva referencia', async () => {
    const { prisma, service } = setup();

    await expect(
      service.updatePortalAvatar(7, '/uploads/usuarios/avatar-portal-item.webp'),
    ).resolves.toMatchObject({
      id_usuario: 7,
      avatar_url: '/uploads/usuarios/avatar-portal-item.webp',
    });
    expect(prisma.usuario.update).toHaveBeenCalledWith({
      where: { id_usuario: 7 },
      data: { avatar_url: '/uploads/usuarios/avatar-portal-item.webp' },
    });
    await expect(service.getPortalPerfil(7)).resolves.toMatchObject({
      avatar_url: '/uploads/usuarios/avatar-portal-item.webp',
    });
  });

  test('DELETE limpia la referencia del mismo usuario autenticado', async () => {
    const { current, prisma, service } = setup();
    current.avatar_url = '/uploads/usuarios/anterior.webp';

    await expect(service.removePortalAvatar(7)).resolves.toMatchObject({
      id_usuario: 7,
      avatar_url: null,
    });
    expect(prisma.usuario.update).toHaveBeenCalledWith({
      where: { id_usuario: 7 },
      data: { avatar_url: null },
    });
  });

  test('controller deriva el usuario de req.user y no recibe id_usuario del cliente', async () => {
    const authService: any = {
      updatePortalAvatar: jest.fn().mockResolvedValue({ avatar_url: '/uploads/usuarios/nueva.webp' }),
      removePortalAvatar: jest.fn().mockResolvedValue({ avatar_url: null }),
    };
    const storage: any = {
      saveImage: jest.fn().mockResolvedValue({ url: '/uploads/usuarios/nueva.webp' }),
    };
    const controller = new AuthController(authService, {} as any, storage);
    const request = { user: { userId: 7, personaId: 80, rol: 'Apoderado', canal: 'portal-padres' } } as any;
    const file = { buffer: Buffer.from('webp'), mimetype: 'image/webp', size: 4 } as Express.Multer.File;

    await controller.subirAvatarPerfilPortal(request, file);
    await controller.quitarAvatarPerfilPortal(request);

    expect(storage.saveImage).toHaveBeenCalledWith(file, {
      folder: 'usuarios',
      prefix: 'avatar-portal',
    });
    expect(authService.updatePortalAvatar).toHaveBeenCalledWith(7, '/uploads/usuarios/nueva.webp');
    expect(authService.removePortalAvatar).toHaveBeenCalledWith(7);
  });
});
