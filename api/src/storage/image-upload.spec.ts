import { BadRequestException } from '@nestjs/common';
import {
  assertValidStudentAvatar,
  detectImageMime,
  STUDENT_AVATAR_MAX_BYTES,
} from './image-upload';

function pngBuffer() {
  const buffer = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer);
  Buffer.from('IHDR').copy(buffer, 12);
  return buffer;
}

function webpBuffer() {
  const buffer = Buffer.alloc(20);
  Buffer.from('RIFF').copy(buffer, 0);
  Buffer.from('WEBP').copy(buffer, 8);
  Buffer.from('VP8X').copy(buffer, 12);
  return buffer;
}

describe('Validación de fotografía del estudiante', () => {
  test('acepta PNG cuando MIME y firma real coinciden', () => {
    const buffer = pngBuffer();
    expect(detectImageMime(buffer)).toBe('image/png');
    expect(
      assertValidStudentAvatar({
        buffer,
        mimetype: 'image/png',
        size: buffer.length,
      }),
    ).toBe('image/png');
  });

  test('rechaza contenido ejecutable aunque declare MIME de imagen', () => {
    expect(() =>
      assertValidStudentAvatar({
        buffer: Buffer.from('#!/bin/sh\necho no'),
        mimetype: 'image/png',
      }),
    ).toThrow(BadRequestException);
  });

  test('acepta WEBP normalizado cuando MIME y firma real coinciden', () => {
    const buffer = webpBuffer();
    expect(detectImageMime(buffer)).toBe('image/webp');
    expect(
      assertValidStudentAvatar({
        buffer,
        mimetype: 'image/webp',
        size: buffer.length,
      }),
    ).toBe('image/webp');
  });

  test('rechaza una imagen mayor de 5 MB', () => {
    expect(() =>
      assertValidStudentAvatar({
        buffer: Buffer.alloc(STUDENT_AVATAR_MAX_BYTES + 1),
        mimetype: 'image/jpeg',
        size: STUDENT_AVATAR_MAX_BYTES + 1,
      }),
    ).toThrow('La imagen no debe superar los 5 MB.');
  });

  test('rechaza SVG incluso cuando se presenta como archivo de imagen', () => {
    expect(() =>
      assertValidStudentAvatar({
        buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
        mimetype: 'image/svg+xml',
      }),
    ).toThrow('Solo se permiten imágenes JPG, PNG o WEBP.');
  });
});
