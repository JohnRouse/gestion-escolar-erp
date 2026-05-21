import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AlbumesService {
  constructor(private prisma: PrismaService) {}

  // Obtener álbumes visibles para un apoderado (según las secciones de sus hijos)
  async getAlbumes(apoderadoId: number, seccionId?: number, busqueda?: string) {
  const relaciones = await this.prisma.apoderadoEstudiante.findMany({
    where: { id_apoderado: apoderadoId },
    select: { id_estudiante: true },
  });
  const estudianteIds = relaciones.map(r => r.id_estudiante);

  const matriculas = await this.prisma.matricula.findMany({
    where: { id_estudiante: { in: estudianteIds }, estado_matricula: 'Activo' },
    select: { id_seccion: true },
  });
  const seccionesHijos = [...new Set(matriculas.map(m => m.id_seccion))];

  const where: any = {
    id_seccion: { in: seccionesHijos },
  };
  if (seccionId) where.id_seccion = seccionId;

  // Obtener álbumes sin incluir fotos (evita duplicados por include)
  const albumes = await this.prisma.album.findMany({
    where,
    orderBy: { fecha: 'desc' },
    include: {
      docente: { include: { persona: true } },
      seccion: { include: { grado: { include: { nivel: true } } } },
    },
  });

  // Para cada álbum, contar fotos y obtener portada
  const result = await Promise.all(
    albumes.map(async (album) => {
      const [totalFotos, primeraFoto] = await Promise.all([
        this.prisma.foto.count({ where: { id_album: album.id_album } }),
        this.prisma.foto.findFirst({ where: { id_album: album.id_album }, orderBy: { id_foto: 'asc' }, select: { url: true } }),
      ]);
      return {
        id_album: album.id_album,
        titulo: album.titulo,
        descripcion: album.descripcion,
        fecha: album.fecha,
        portada_url: album.portada_url || primeraFoto?.url || null,
        docente: `${album.docente.persona.nombres} ${album.docente.persona.apellido_paterno}`,
        seccion: `${album.seccion.grado.nombre_grado} ${album.seccion.letra}`,
        nivel: album.seccion.grado.nivel.nombre_nivel,
        total_fotos: totalFotos,
      };
    })
  );

  if (busqueda) {
    const q = busqueda.toLowerCase();
    return result.filter(a => a.titulo.toLowerCase().includes(q));
  }
  return result;
}

  // Obtener fotos de un álbum con paginación
  async getFotosAlbum(idAlbum: number, page = 1, limit = 15) {
    const album = await this.prisma.album.findUnique({ where: { id_album: idAlbum } });
    if (!album) throw new NotFoundException('Álbum no encontrado');

    const skip = (page - 1) * limit;
    const [fotos, total] = await Promise.all([
      this.prisma.foto.findMany({
        where: { id_album: idAlbum },
        orderBy: { id_foto: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.foto.count({ where: { id_album: idAlbum } }),
    ]);

    return { fotos, total, page, limit };
  }

  // Comentarios de una foto
  async getComentarios(idFoto: number) {
  return this.prisma.comentarioFoto.findMany({
    where: { id_foto: idFoto },
    orderBy: { creado_en: 'desc' },
    include: {
      apoderado: {
        include: {
          persona: {
            include: {
              usuarios: {
                select: { avatar_url: true },
              },
            },
          },
        },
      },
    },
  }).then(comentarios =>
    comentarios.map(c => ({
      id_comentario: c.id_comentario,
      texto: c.texto,
      creado_en: c.creado_en,
      apoderado: {
        id_persona: c.apoderado.id_persona,
        persona: {
          nombres: c.apoderado.persona.nombres,
          apellido_paterno: c.apoderado.persona.apellido_paterno,
          avatar_url: c.apoderado.persona.usuarios?.[0]?.avatar_url || null,
        },
      },
    }))
  );
}

  // Crear comentario
  async crearComentario(idFoto: number, idApoderado: number, texto: string) {
    return this.prisma.comentarioFoto.create({
      data: {
        id_foto: idFoto,
        id_apoderado: idApoderado,
        texto,
      },
      include: {
        apoderado: { include: { persona: true } },
      },
    });
  }

  async editarComentario(idComentario: number, idApoderado: number, texto: string) {
  const comentario = await this.prisma.comentarioFoto.findUnique({ where: { id_comentario: idComentario } });
  if (!comentario) throw new NotFoundException('Comentario no encontrado');
  if (comentario.id_apoderado !== idApoderado) throw new ForbiddenException('No puedes editar este comentario');

  return this.prisma.comentarioFoto.update({
    where: { id_comentario: idComentario },
    data: { texto },
    include: { apoderado: { include: { persona: true } } },
  });
}

async eliminarComentario(idComentario: number, idApoderado: number) {
  const comentario = await this.prisma.comentarioFoto.findUnique({ where: { id_comentario: idComentario } });
  if (!comentario) throw new NotFoundException('Comentario no encontrado');
  if (comentario.id_apoderado !== idApoderado) throw new ForbiddenException('No puedes eliminar este comentario');

  await this.prisma.comentarioFoto.delete({ where: { id_comentario: idComentario } });
  return { message: 'Comentario eliminado' };
}

async toggleReaccion(idFoto: number, idApoderado: number) {
  const existente = await this.prisma.reaccionFoto.findUnique({
    where: { id_foto_id_apoderado: { id_foto: idFoto, id_apoderado: idApoderado } },
  });
  if (existente) {
    await this.prisma.reaccionFoto.delete({ where: { id_reaccion: existente.id_reaccion } });
    return { liked: false };
  } else {
    await this.prisma.reaccionFoto.create({ data: { id_foto: idFoto, id_apoderado: idApoderado } });
    return { liked: true };
  }
}

async getReacciones(idFoto: number, idApoderado?: number) {
  const total = await this.prisma.reaccionFoto.count({ where: { id_foto: idFoto } });
  let liked = false;
  if (idApoderado) {
    const existe = await this.prisma.reaccionFoto.findUnique({
      where: { id_foto_id_apoderado: { id_foto: idFoto, id_apoderado: idApoderado } },
    });
    liked = !!existe;
  }
  return { total, liked };
}
}