import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ColegiosService {
  constructor(private readonly prisma: PrismaService) {}

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
}