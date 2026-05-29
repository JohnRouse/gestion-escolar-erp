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

    return `${grado} "${seccion.letra}" · ${nivel}`;
  }

  async login(username: string, password: string) {
    const user = await this.prisma.usuario.findUnique({
      where: { username },
      include: { persona: true, rol: true },
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
        nombre: `${user.persona.nombres} ${user.persona.apellido_paterno}`,
        rol: user.rol.nombre_rol,
        genero: user.persona.genero,
        contexto,
      },
    };
  }

  async getPerfil(userId: number) {
    const user = await this.prisma.usuario.findUnique({
      where: { id_usuario: userId },
      include: { persona: true, rol: true },
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
      nombre: `${user.persona.nombres} ${user.persona.apellido_paterno} ${user.persona.apellido_materno}`.trim(),
      correo: user.persona.correo,
      telefono: user.persona.telefono,
      rol: user.rol.nombre_rol,
      avatar_url: user.avatar_url,
      email: user.persona.correo,
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
                          include: { nivel: true },
                        },
                      },
                    },
                  },
                  orderBy: { id_asignacion: 'asc' },
                },
              },
            },
            staff: {
              include: {
                seccion: {
                  include: {
                    grado: {
                      include: { nivel: true },
                    },
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

    const asignaciones = (docente?.asignaciones || []).map((asignacion) => ({
      id_asignacion: asignacion.id_asignacion,
      id_docente: asignacion.id_docente,
      id_curso: asignacion.id_curso,
      id_seccion: asignacion.id_seccion,
      id_anio: asignacion.id_anio,
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
              seccion: this.formatSeccion(staff.seccion),
              grado: staff.seccion.grado.nombre_grado,
              nivel: staff.seccion.grado.nivel.nombre_nivel,
              letra: staff.seccion.letra,
            },
          ]
        : [];

    const puedeVerDashboardInstitucional = ['Admin', 'Director', 'Secretaria'].includes(rol);
    const puedeVerDashboardDocente = rol === 'Profesor' || asignaciones.length > 0;
    const puedeVerTutoria = Boolean(seccionesTutoria.length) || ['Admin', 'Director'].includes(rol);

    return {
      usuario: {
        id: user.id_usuario,
        id_persona: user.id_persona,
        username: user.username,
        nombre: `${user.persona.nombres} ${user.persona.apellido_paterno}`.trim(),
        rol,
        avatar_url: user.avatar_url,
      },

      cargo_principal: staff?.cargo || (docente ? 'Docente' : rol),

      docente: docente
        ? {
            id_docente: docente.id_persona,
            asignaciones,
            total_asignaciones: asignaciones.length,
            total_cursos: new Set(asignaciones.map((item) => item.id_curso)).size,
            total_secciones: new Set(asignaciones.map((item) => item.id_seccion)).size,
          }
        : null,

      staff: staff
        ? {
            id_staff: staff.id_staff,
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
        puedeGestionarNotas: ['Admin', 'Profesor'].includes(rol),
        puedeGestionarAsistencia: ['Admin', 'Profesor', 'Director'].includes(rol),
        puedeGestionarTesoreria: ['Admin', 'Secretaria'].includes(rol),
        puedeConfigurarSistema: rol === 'Admin',
      },

      modulos_dashboard: [
        puedeVerDashboardInstitucional ? 'institucional' : null,
        puedeVerDashboardDocente ? 'docente' : null,
        seccionesTutoria.length ? 'tutoria' : null,
      ].filter(Boolean),
    };
  }

  async cambiarPassword(usuarioId: number, passwordActual: string, passwordNueva: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id_usuario: usuarioId },
    });

    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    const isPasswordValid = await bcrypt.compare(passwordActual, usuario.password_hash);

    if (!isPasswordValid) {
      throw new BadRequestException('La contraseña actual no es correcta');
    }

    const hashed = await bcrypt.hash(passwordNueva, 10);

    await this.prisma.usuario.update({
      where: { id_usuario: usuarioId },
      data: { password_hash: hashed },
    });

    return { message: 'Contraseña actualizada correctamente' };
  }

  async updatePerfil(userId: number, data: any) {
    const user = await this.prisma.usuario.findUnique({
      where: { id_usuario: userId },
      include: { persona: true },
    });

    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (
      data.nombres ||
      data.apellido_paterno ||
      data.apellido_materno ||
      data.correo ||
      data.telefono
    ) {
      await this.prisma.persona.update({
        where: { id_persona: user.id_persona },
        data: {
          nombres: data.nombres,
          apellido_paterno: data.apellido_paterno,
          apellido_materno: data.apellido_materno,
          correo: data.correo,
          telefono: data.telefono,
        },
      });
    }

    if (data.avatar_url !== undefined) {
      await this.prisma.usuario.update({
        where: { id_usuario: userId },
        data: { avatar_url: data.avatar_url },
      });
    }

    return this.getPerfil(userId);
  }
}