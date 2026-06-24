import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

type SaveFileOptions = {
  folder: string;
  prefix: string;
  entityId?: string | number;
  filenameBase?: string | number;
  cacheBust?: boolean;
  allowedMimeExtensions?: Record<string, string>;
};

@Injectable()
export class StorageService {
  private readonly localRoot = join(process.cwd(), 'uploads');

  private sanitizeSegment(value: string) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  async saveFile(file: any, options: SaveFileOptions) {
    if (!file?.buffer) {
      throw new BadRequestException('No se recibió el archivo.');
    }

    const allowed =
      options.allowedMimeExtensions || {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp',
        'application/pdf': '.pdf',
      };

    const ext = allowed[file.mimetype];

    if (!ext) {
      throw new BadRequestException('Tipo de archivo no permitido.');
    }

    const folder = this.sanitizeSegment(options.folder || 'general');
    const prefix = this.sanitizeSegment(options.prefix || 'archivo');
    const entity = options.entityId ? this.sanitizeSegment(String(options.entityId)) : 'item';

    const baseName = options.filenameBase
      ? this.sanitizeSegment(String(options.filenameBase))
      : `${prefix}-${entity}-${Date.now()}-${randomUUID().slice(0, 8)}`;

    const filename = `${baseName}${ext}`;

    const dir = join(this.localRoot, folder);
    await mkdir(dir, { recursive: true });

    const fullPath = join(dir, filename);
    await writeFile(fullPath, file.buffer);

    const version = options.cacheBust === false ? '' : `?v=${Date.now()}`;

    return {
      provider: 'local',
      path: fullPath,
      url: `/uploads/${folder}/${filename}${version}`,
      filename,
      mime_type: file.mimetype,
      size_bytes: file.size || file.buffer.length,
    };
  }

  async saveImage(file: any, options: SaveFileOptions) {
    return this.saveFile(file, {
      ...options,
      allowedMimeExtensions: {
        'image/jpeg': '.jpg',
        'image/png': '.png',
      },
    });
  }
}
