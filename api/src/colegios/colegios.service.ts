import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class ColegiosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService:
      StorageService,
  ) {}

  async getMisColegios(userId: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: userId },
      include: {
        rol: true,
        persona: true,
        tenants: {
          where: { estado: 'Activo' },
          include: {
            tenant: true,
          },
        },
        colegios: {
          where: { estado: 'Activo' },
          include: {
            colegio: {
              include: {
                tenant: true,
                niveles: {
                  include: {
                    nivel: true,
                  },
                },
              },
            },
          },
          orderBy: {
            es_principal: 'desc',
          },
        },
      },
    });

    if (!usuario) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const colegios = usuario.colegios.map((acceso) => ({
      id_colegio: acceso.colegio.id_colegio,
      id_tenant: acceso.colegio.id_tenant,
      nombre: acceso.colegio.nombre,
      nombre_corto: acceso.colegio.nombre_corto,
      codigo: acceso.colegio.codigo,
      logo_url: acceso.colegio.logo_url,
      color_principal: acceso.colegio.color_principal,
      rol_colegio: acceso.rol_colegio,
      es_principal: acceso.es_principal,
      niveles: acceso.colegio.niveles.map((item) => ({
        id_nivel: item.nivel.id_nivel,
        nombre_nivel: item.nivel.nombre_nivel,
      })),
    }));

    const tenantPrincipal =
      usuario.tenants[0]?.tenant || usuario.colegios[0]?.colegio.tenant || null;

    const puedeVerConsolidado =
      ['Admin', 'Director'].includes(usuario.rol.nombre_rol) && colegios.length > 1;

    const colegioPrincipal =
      colegios.find((colegio) => colegio.es_principal) || colegios[0] || null;

    return {
      usuario: {
        id_usuario: usuario.id_usuario,
        nombre: `${usuario.persona.nombres} ${usuario.persona.apellido_paterno}`.trim(),
        rol: usuario.rol.nombre_rol,
      },
      tenant: tenantPrincipal
        ? {
            id_tenant: tenantPrincipal.id_tenant,
            nombre: tenantPrincipal.nombre,
            slug: tenantPrincipal.slug,
            plan: tenantPrincipal.plan,
            estado: tenantPrincipal.estado,
          }
        : null,
      colegios,
      puedeVerConsolidado,
      contexto_default: puedeVerConsolidado
        ? {
            tipo: 'todos',
            id_colegio: null,
          }
        : {
            tipo: 'colegio',
            id_colegio: colegioPrincipal?.id_colegio || null,
          },
    };
  }

  private async validarPermisoLogo(
    userId: number,
    rol: string,
    colegioId: number,
  ) {
    if (
      !['Admin', 'Director'].includes(
        String(rol || ''),
      )
    ) {
      throw new ForbiddenException(
        'No tienes permisos para modificar la identidad visual.',
      );
    }

    const colegio =
      await this.prisma.colegio.findUnique({
        where: {
          id_colegio: colegioId,
        },
      });

    if (!colegio) {
      throw new NotFoundException(
        'El colegio no existe.',
      );
    }

    const accesoColegio =
      await this.prisma.usuarioColegio.findFirst({
        where: {
          id_usuario: userId,
          id_colegio: colegioId,
          estado: 'Activo',
        },
      });

    const accesoTenant =
      await this.prisma.usuarioTenant.findFirst({
        where: {
          id_usuario: userId,
          id_tenant: colegio.id_tenant,
          estado: 'Activo',
        },
      });

    if (!accesoColegio && !accesoTenant) {
      throw new ForbiddenException(
        'No tienes acceso a este colegio.',
      );
    }

    return colegio;
  }

  async actualizarLogo(
    userId: number,
    rol: string,
    colegioId: number,
    file: any,
  ) {
    await this.validarPermisoLogo(
      userId,
      rol,
      colegioId,
    );

    const saved =
      await this.storageService.saveFile(
        file,
        {
          folder: 'colegios',
          prefix: 'logo',
          entityId: colegioId,
          filenameBase:
            `colegio-${colegioId}`,
          allowedMimeExtensions: {
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/webp': '.webp',
          },
        },
      );

    return this.prisma.colegio.update({
      where: {
        id_colegio: colegioId,
      },
      data: {
        logo_url: saved.url,
      },
      select: {
        id_colegio: true,
        nombre: true,
        logo_url: true,
        color_principal: true,
      },
    });
  }

  async quitarLogo(
    userId: number,
    rol: string,
    colegioId: number,
  ) {
    await this.validarPermisoLogo(
      userId,
      rol,
      colegioId,
    );

    return this.prisma.colegio.update({
      where: {
        id_colegio: colegioId,
      },
      data: {
        logo_url: null,
      },
      select: {
        id_colegio: true,
        nombre: true,
        logo_url: true,
        color_principal: true,
      },
    });
  }

}