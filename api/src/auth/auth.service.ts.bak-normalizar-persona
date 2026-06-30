import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  private formatSeccion(seccion: any) {
    if (!seccion) return null;

    const grado = seccion.grado?.nombre_grado || 'Grado';
    const nivel = seccion.grado?.nivel?.nombre_nivel || 'Nivel';
    const letra = seccion.letra || '';

    return `${grado} "${letra}" · ${nivel}`;
  }

  private formatNombrePersona(persona: any) {
    if (!persona) return 'Usuario';

    return `${persona.nombres || ''} ${persona.apellido_paterno || ''} ${
      persona.apellido_materno || ''
    }`
      .replace(/\s+/g, ' ')
      .trim();
  }

  private formatNombreCorto(persona: any) {
    if (!persona) return 'Usuario';

    return `${persona.nombres || ''} ${persona.apellido_paterno || ''}`
      .replace(/\s+/g, ' ')
      .trim();
  }

  private async getSaasContext(userId: number, rol: string) {
    const accesosColegio = await this.prisma.usuarioColegio.findMany({
      where: {
        id_usuario: userId,
        estado: 'Activo',
      },
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
    });

    const accesoTenant = await this.prisma.usuarioTenant.findFirst({
      where: {
        id_usuario: userId,
        estado: 'Activo',
      },
      include: {
        tenant: true,
      },
    });

    const colegios = accesosColegio.map((acceso) => ({
      id_colegio: acceso.colegio.id_colegio,
      id_tenant: acceso.colegio.id_tenant,
      nombre: acceso.colegio.nombre,
      nombre_corto: acceso.colegio.nombre_corto,
      codigo: acceso.colegio.codigo,
      logo_url: acceso.colegio.logo_url,
      color_principal: acceso.colegio.color_principal,
      estado: acceso.colegio.estado,
      rol_colegio: acceso.rol_colegio,
      es_principal: acceso.es_principal,
      niveles: acceso.colegio.niveles.map((item) => ({
        id_nivel: item.nivel.id_nivel,
        nombre_nivel: item.nivel.nombre_nivel,
      })),
    }));

    const tenant =
      accesoTenant?.tenant || accesosColegio[0]?.colegio?.tenant || null;

    const colegioPrincipal =
      colegios.find((colegio) => colegio.es_principal) || colegios[0] || null;

    const puedeVerConsolidado =
      ['Admin', 'Director'].includes(rol) && colegios.length > 1;

    return {
      tenant: tenant
        ? {
            id_tenant: tenant.id_tenant,
            nombre: tenant.nombre,
            slug: tenant.slug,
            ruc: tenant.ruc,
            logo_url: tenant.logo_url,
            plan: tenant.plan,
            estado: tenant.estado,
          }
        : null,

      colegios,

      colegios_permitidos: colegios.map((colegio) => colegio.id_colegio),

      colegio_principal: colegioPrincipal,

      puedeVerConsolidado,

      contexto_default: puedeVerConsolidado
        ? {
            tipo: 'todos',
            id_tenant: tenant?.id_tenant || null,
            id_colegio: null,
          }
        : {
            tipo: 'colegio',
            id_tenant: tenant?.id_tenant || colegioPrincipal?.id_tenant || null,
            id_colegio: colegioPrincipal?.id_colegio || null,
          },
    };
  }

  async login(username: string, password: string) {
    const user = await this.prisma.usuario.findUnique({
      where: { username },
      include: {
        persona: true,
        rol: true,
      },
    });

    if (!user || !user.estado) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = {
      sub: user.id_usuario,
      username: user.username,
      rol: user.rol.nombre_rol,
      personaId: user.id_persona,
    };

    const contexto = await this.getContexto(user.id_usuario);

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id_usuario,
        username: user.username,
        nombre: this.formatNombreCorto(user.persona),
        nombres: user.persona.nombres,
        apellido_paterno: user.persona.apellido_paterno,
        apellido_materno: user.persona.apellido_materno,
        rol: user.rol.nombre_rol,
        genero: user.persona.genero,
        email: user.persona.correo,
        correo: user.persona.correo,
        avatar_url: user.avatar_url,
        contexto,
      },
    };
  }

  async getPerfil(userId: number) {
    const user = await this.prisma.usuario.findUnique({
      where: { id_usuario: userId },
      include: {
        persona: true,
        rol: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Token inválido o usuario no encontrado');
    }

    const contexto = await this.getContexto(user.id_usuario);

    return {
      id: user.id_usuario,
      username: user.username,
      nombres: user.persona.nombres,
      apellido_paterno: user.persona.apellido_paterno,
      apellido_materno: user.persona.apellido_materno,
      nombre: this.formatNombrePersona(user.persona),
      correo: user.persona.correo,
      email: user.persona.correo,
      telefono: user.persona.telefono,
      rol: user.rol.nombre_rol,
      avatar_url: user.avatar_url,
      tema: user.tema,
      notificaciones_activas: user.notificaciones_activas,
      estado_conexion: user.estado_conexion,
      ultima_conexion: user.ultima_conexion,
      contexto,
    };
  }

  async getContexto(userId: number, anioId = 1) {
    const user = await this.prisma.usuario.findUnique({
      where: { id_usuario: userId },
      include: {
        rol: true,
        persona: {
          include: {
            docentes: {
              include: {
                asignaciones: {
                  where: { id_anio: anioId },
                  include: {
                    curso: true,
                    seccion: {
                      include: {
                        grado: {
                          include: {
                            nivel: true,
                          },
                        },
                        colegio: true,
                      },
                    },
                    colegio: true,
                  },
                  orderBy: {
                    id_asignacion: 'asc',
                  },
                },
              },
            },
            staff: {
              include: {
                colegio: true,
                seccion: {
                  include: {
                    grado: {
                      include: {
                        nivel: true,
                      },
                    },
                    colegio: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Token inválido o usuario no encontrado');
    }

    const rol = user.rol.nombre_rol;
    const docente = user.persona.docentes?.[0] || null;
    const staff = user.persona.staff?.[0] || null;

    const saas = await this.getSaasContext(user.id_usuario, rol);

    const asignaciones = (docente?.asignaciones || []).map((asignacion) => ({
      id_asignacion: asignacion.id_asignacion,
      id_docente: asignacion.id_docente,
      id_curso: asignacion.id_curso,
      id_seccion: asignacion.id_seccion,
      id_anio: asignacion.id_anio,

      id_tenant: asignacion.id_tenant,
      id_colegio:
        asignacion.id_colegio ||
        asignacion.seccion?.id_colegio ||
        asignacion.colegio?.id_colegio ||
        null,

      colegio:
        asignacion.colegio?.nombre ||
        asignacion.seccion?.colegio?.nombre ||
        null,

      curso: asignacion.curso.nombre_curso,
      seccion: this.formatSeccion(asignacion.seccion),
      grado: asignacion.seccion.grado.nombre_grado,
      nivel: asignacion.seccion.grado.nivel.nombre_nivel,
      letra: asignacion.seccion.letra,
    }));

    const seccionesTutoria =
      staff?.es_tutor && staff.seccion
        ? [
            {
              id_seccion: staff.seccion.id_seccion,
              id_tenant: staff.id_tenant,
              id_colegio:
                staff.id_colegio ||
                staff.seccion?.id_colegio ||
                staff.colegio?.id_colegio ||
                null,
              colegio:
                staff.colegio?.nombre ||
                staff.seccion?.colegio?.nombre ||
                null,
              seccion: this.formatSeccion(staff.seccion),
              grado: staff.seccion.grado.nombre_grado,
              nivel: staff.seccion.grado.nivel.nombre_nivel,
              letra: staff.seccion.letra,
            },
          ]
        : [];

    const puedeVerDashboardInstitucional = ['Admin', 'Director', 'Secretaria'].includes(
      rol,
    );

    const puedeVerDashboardDocente = rol === 'Profesor' || asignaciones.length > 0;

    const puedeVerTutoria =
      Boolean(seccionesTutoria.length) || ['Admin', 'Director'].includes(rol);

    const puedeGestionarNotas = ['Admin', 'Director', 'Profesor'].includes(rol);

    const puedeGestionarAsistencia = ['Admin', 'Director', 'Profesor'].includes(rol);

    const puedeGestionarTesoreria = ['Admin', 'Director', 'Secretaria'].includes(rol);

    const puedeConfigurarSistema = ['Admin', 'Director'].includes(rol);

    const puedeGestionarSaas = ['Admin'].includes(rol);

    return {
      usuario: {
        id: user.id_usuario,
        id_persona: user.id_persona,
        username: user.username,
        nombre: this.formatNombreCorto(user.persona),
        nombre_completo: this.formatNombrePersona(user.persona),
        rol,
        avatar_url: user.avatar_url,
        email: user.persona.correo,
      },

      saas,

      cargo_principal: staff?.cargo || (docente ? 'Docente' : rol),

      docente: docente
        ? {
            id_docente: docente.id_persona,
            asignaciones,
            total_asignaciones: asignaciones.length,
            total_cursos: new Set(asignaciones.map((item) => item.id_curso)).size,
            total_secciones: new Set(asignaciones.map((item) => item.id_seccion))
              .size,
            colegios: Array.from(
              new Set(
                asignaciones
                  .map((item) => item.id_colegio)
                  .filter((value) => value !== null && value !== undefined),
              ),
            ),
          }
        : null,

      staff: staff
        ? {
            id_staff: staff.id_staff,
            id_tenant: staff.id_tenant,
            id_colegio:
              staff.id_colegio ||
              staff.seccion?.id_colegio ||
              staff.colegio?.id_colegio ||
              null,
            colegio:
              staff.colegio?.nombre ||
              staff.seccion?.colegio?.nombre ||
              null,
            cargo: staff.cargo,
            area: staff.area,
            es_tutor: staff.es_tutor,
            permite_citas: staff.permite_citas,
            id_seccion: staff.id_seccion,
            seccion: staff.seccion ? this.formatSeccion(staff.seccion) : null,
          }
        : null,

      tutoria: {
        es_tutor: Boolean(seccionesTutoria.length),
        secciones: seccionesTutoria,
      },

      permisos: {
        puedeVerDashboardInstitucional,
        puedeVerDashboardDocente,
        puedeVerTutoria,
        puedeGestionarNotas,
        puedeGestionarAsistencia,
        puedeGestionarTesoreria,
        puedeConfigurarSistema,
        puedeGestionarSaas,

        puedeVerConsolidado: saas.puedeVerConsolidado,
        colegiosPermitidos: saas.colegios_permitidos,
      },

      modulos_dashboard: [
        puedeVerDashboardInstitucional ? 'institucional' : null,
        puedeVerDashboardDocente ? 'docente' : null,
        seccionesTutoria.length ? 'tutoria' : null,
        saas.puedeVerConsolidado ? 'organizacion' : null,
      ].filter(Boolean),
    };
  }

  async cambiarPassword(
    usuarioId: number,
    passwordActual: string,
    passwordNueva: string,
  ) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: usuarioId },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const isPasswordValid = await bcrypt.compare(
      passwordActual,
      usuario.password_hash,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('La contraseña actual no es correcta');
    }

    const hashed = await bcrypt.hash(passwordNueva, 10);

    await this.prisma.usuario.update({
      where: { id_usuario: usuarioId },
      data: {
        password_hash: hashed,
      },
    });

    return {
      message: 'Contraseña actualizada correctamente',
    };
  }

  async updatePerfil(userId: number, data: any) {
    const user = await this.prisma.usuario.findUnique({
      where: { id_usuario: userId },
      include: {
        persona: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (
      data.nombres !== undefined ||
      data.apellido_paterno !== undefined ||
      data.apellido_materno !== undefined ||
      data.correo !== undefined ||
      data.telefono !== undefined
    ) {
      await this.prisma.persona.update({
        where: {
          id_persona: user.id_persona,
        },
        data: {
          nombres: data.nombres,
          apellido_paterno: data.apellido_paterno,
          apellido_materno: data.apellido_materno,
          correo: data.correo,
          telefono: data.telefono,
        },
      });
    }

    if (
      data.avatar_url !== undefined ||
      data.tema !== undefined ||
      data.notificaciones_activas !== undefined
    ) {
      await this.prisma.usuario.update({
        where: {
          id_usuario: userId,
        },
        data: {
          avatar_url: data.avatar_url,
          tema: data.tema,
          notificaciones_activas: data.notificaciones_activas,
        },
      });
    }

    return this.getPerfil(userId);
  }
}