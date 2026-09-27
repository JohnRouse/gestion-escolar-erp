import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { AVATAR_OUTPUT_SIZE, calculateAvatarDraw } from '../src/lib/avatarCrop.ts';

test('el crop de Alumnos normaliza el avatar a 512 por 512', () => {
  assert.equal(AVATAR_OUTPUT_SIZE, 512);
  const draw = calculateAvatarDraw(
    { width: 4000, height: 3000 },
    { zoom: 1, position: { x: 0, y: 0 } },
  );
  assert.equal(draw.height, 512);
  assert.ok(draw.width > 512);
});

test('Alumnos sube exactamente el resultado final y amplía el recorte oficial completo', async () => {
  const page = await readFile(new URL('../src/pages/comunidad/AlumnosPage.tsx', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/styles/carbon/117-comunidad-tablas-credenciales.css', import.meta.url), 'utf8');
  assert.match(page, /<AvatarCropEditor/);
  assert.match(page, /subirFotoAlumno\(avatarCropResult\.file\)/);
  assert.match(page, /aspect-square[^\n]+object-contain object-center/);
  assert.match(styles, /community-student-list-photo[\s\S]*?object-fit: cover;[\s\S]*?object-position: center center;/);
  assert.match(styles, /community-linked-student-photo[\s\S]*?object-fit: cover;[\s\S]*?object-position: center center;/);
});

test('la ficha ERP del apoderado entrega Usuario.avatar_url al avatar compartido', async () => {
  const page = await readFile(new URL('../src/pages/comunidad/ApoderadosPage.tsx', import.meta.url), 'utf8');
  const rows = await readFile(new URL('../src/components/community/CommunityTableRows.tsx', import.meta.url), 'utf8');
  assert.match(page, /avatar_url\?: string \| null/);
  assert.match(page, /avatar_url: detalle\.avatar_url/);
  assert.match(rows, /avatar_url: apoderado\.avatar_url/);
});
