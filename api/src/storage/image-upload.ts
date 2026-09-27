import { BadRequestException } from '@nestjs/common';

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

export const AVATAR_MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export const STUDENT_AVATAR_MAX_BYTES = AVATAR_MAX_BYTES;
export const STUDENT_AVATAR_MIME_EXTENSIONS = AVATAR_MIME_EXTENSIONS;

type BufferedUpload = {
  buffer?: Buffer;
  mimetype?: string;
  size?: number;
};

function hasPngSignature(buffer: Buffer) {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  return (
    buffer.length >= 24 &&
    signature.every((value, index) => buffer[index] === value) &&
    buffer.subarray(12, 16).toString('ascii') === 'IHDR'
  );
}

function hasJpegSignature(buffer: Buffer) {
  return (
    buffer.length >= 4 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff &&
    buffer[buffer.length - 2] === 0xff &&
    buffer[buffer.length - 1] === 0xd9
  );
}

function hasWebpSignature(buffer: Buffer) {
  return (
    buffer.length >= 16 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP' &&
    ['VP8 ', 'VP8L', 'VP8X'].includes(buffer.subarray(12, 16).toString('ascii'))
  );
}

export function detectImageMime(buffer?: Buffer) {
  if (!buffer) return null;
  if (hasJpegSignature(buffer)) return 'image/jpeg';
  if (hasPngSignature(buffer)) return 'image/png';
  if (hasWebpSignature(buffer)) return 'image/webp';
  return null;
}

export function assertValidAvatar(
  file: BufferedUpload,
  maxBytes = AVATAR_MAX_BYTES,
) {
  if (!file?.buffer?.length) {
    throw new BadRequestException('No se recibió una imagen válida.');
  }

  const size = file.size || file.buffer.length;
  if (size > maxBytes || file.buffer.length > maxBytes) {
    throw new BadRequestException('La imagen no debe superar los 5 MB.');
  }

  if (!file.mimetype || !AVATAR_MIME_EXTENSIONS[file.mimetype]) {
    throw new BadRequestException('Solo se permiten imágenes JPG, PNG o WEBP.');
  }

  const detectedMime = detectImageMime(file.buffer);
  if (!detectedMime || detectedMime !== file.mimetype) {
    throw new BadRequestException(
      'El contenido del archivo no corresponde a una imagen JPG, PNG o WEBP válida.',
    );
  }

  return detectedMime;
}

export const avatarFileFilter = (
  _req: unknown,
  file: { mimetype?: string },
  callback: (error: Error | null, acceptFile: boolean) => void,
) => {
  if (!file.mimetype || !AVATAR_MIME_EXTENSIONS[file.mimetype]) {
    callback(
      new BadRequestException('Solo se permiten imágenes JPG, PNG o WEBP.'),
      false,
    );
    return;
  }

  callback(null, true);
};

export const assertValidStudentAvatar = assertValidAvatar;
export const studentAvatarFileFilter = avatarFileFilter;
