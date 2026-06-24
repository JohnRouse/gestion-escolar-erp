import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

type SaveImageOptions = {
  folder: string;
  prefix: string;
  entityId?: string | number;
};

@Injectable()
export class StorageService {
  private readonly localRoot = join(process.cwd(), 'uploads');

  private sanitizeSegment(value: string) {
    return String(value || '')
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
  }

  async saveImage(file: any, options: SaveImageOptions) {
    if (!file?.buffer) {
      throw new BadRequestException('No se recibió el archivo de imagen.');
    }

    const mimeToExt: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
    };

    const ext = mimeToExt[file.mimetype];

    if (!ext) {
      throw new BadRequestException('Solo se permiten imágenes JPG o PNG.');
    }

    const folder = this.sanitizeSegment(options.folder || 'general');
    const prefix = this.sanitizeSegment(options.prefix || 'archivo');
    const entity = options.entityId ? this.sanitizeSegment(String(options.entityId)) : 'item';
    const filename = `${prefix}-${entity}-${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;

    const dir = join(this.localRoot, folder);
    await mkdir(dir, { recursive: true });

    const fullPath = join(dir, filename);
    await writeFile(fullPath, file.buffer);

    return {
      provider: 'local',
      path: fullPath,
      url: `/uploads/${folder}/${filename}`,
      filename,
      mime_type: file.mimetype,
      size_bytes: file.size || file.buffer.length,
    };
  }
}
