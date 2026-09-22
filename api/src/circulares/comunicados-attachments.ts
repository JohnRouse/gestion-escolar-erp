import { BadRequestException } from '@nestjs/common';
import { extname } from 'path';

export const COMUNICADO_MAX_ADJUNTOS_POR_CARGA = 5;
export const COMUNICADO_MAX_BYTES_POR_ADJUNTO = 10 * 1024 * 1024;

const EXTENSIONES_POR_MIME: Record<string, readonly string[]> = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    '.docx',
  ],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
    '.xlsx',
  ],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': [
    '.pptx',
  ],
};

export const COMUNICADO_STORAGE_MIME_EXTENSIONS = Object.fromEntries(
  Object.entries(EXTENSIONES_POR_MIME).map(([mime, extensions]) => [
    mime,
    extensions[0],
  ]),
) as Record<string, string>;

export const COMUNICADO_ATTACHMENT_MIME_TYPES = new Set(
  Object.keys(EXTENSIONES_POR_MIME),
);

export function validateComunicadoAttachments(files: Express.Multer.File[]) {
  if (!files.length) {
    throw new BadRequestException('Selecciona al menos un archivo.');
  }
  if (files.length > COMUNICADO_MAX_ADJUNTOS_POR_CARGA) {
    throw new BadRequestException(
      `Puedes adjuntar como máximo ${COMUNICADO_MAX_ADJUNTOS_POR_CARGA} archivos por carga.`,
    );
  }

  for (const file of files) {
    const allowedExtensions = EXTENSIONES_POR_MIME[file.mimetype];
    const extension = extname(String(file.originalname || '')).toLowerCase();
    const size = Number(file.size || file.buffer?.length || 0);
    if (!allowedExtensions || !allowedExtensions.includes(extension)) {
      throw new BadRequestException(
        'El tipo y la extensión de uno de los adjuntos no coinciden o no están permitidos.',
      );
    }
    if (size <= 0 || size > COMUNICADO_MAX_BYTES_POR_ADJUNTO) {
      throw new BadRequestException(
        'Cada adjunto debe tener contenido y pesar como máximo 10 MB.',
      );
    }
  }
}
