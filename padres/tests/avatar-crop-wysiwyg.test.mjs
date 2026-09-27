import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import sharp from 'sharp';
import * as portalCrop from '../src/lib/avatarCrop.ts';
import * as intranetCrop from '../../intranet/src/lib/avatarCrop.ts';

const verticalImage = { width: 1080, height: 2400 };

test('Portal e Intranet exportan una única geometría canónica', () => {
  assert.equal(portalCrop.calculateAvatarDraw, intranetCrop.calculateAvatarDraw);
  assert.equal(portalCrop.calculateAvatarSourceRect, intranetCrop.calculateAvatarSourceRect);
  assert.equal(portalCrop.clampAvatarCrop, intranetCrop.clampAvatarCrop);

  const crop = { zoom: 1.65, position: { x: 0, y: -0.31 } };
  assert.deepEqual(
    portalCrop.calculateAvatarSourceRect(verticalImage, crop),
    intranetCrop.calculateAvatarSourceRect(verticalImage, crop),
  );
});

test('la escala inicial es cover y el viewport cuadrado completo define el crop', () => {
  const draw = portalCrop.calculateAvatarDraw(
    verticalImage,
    { zoom: 1, position: { x: 0, y: 0 } },
  );
  assert.equal(draw.scale, 512 / 1080);
  assert.equal(draw.width, 512);
  assert.ok(draw.height > 512);

  const source = portalCrop.calculateAvatarSourceRect(
    verticalImage,
    { zoom: 1, position: { x: 0, y: 0 } },
  );
  assert.deepEqual(source, { x: 0, y: 660, width: 1080, height: 1080 });
});

test('pan y zoom se limitan sin huecos y el zoom conserva el punto visual', () => {
  assert.deepEqual(
    portalCrop.clampAvatarCrop({ x: 10, y: -10 }, 1, verticalImage),
    { x: 0, y: -0.6111111111111112 },
  );

  const anchor = { x: 0.2, y: -0.15 };
  const zoomed = portalCrop.zoomAvatarCropAround(
    { zoom: 1, position: { x: 0, y: 0 } },
    2,
    anchor,
    verticalImage,
  );
  assert.equal(zoomed.zoom, 2);
  assert.deepEqual(zoomed.position, { x: -0.2, y: 0.15 });
});

test('fixture vertical 1080x2400 genera el cuadrado 512x512 esperado', async () => {
  const svg = Buffer.from(`
    <svg width="1080" height="2400" xmlns="http://www.w3.org/2000/svg">
      <rect width="1080" height="800" fill="#ff0000"/>
      <rect y="800" width="1080" height="800" fill="#00ff00"/>
      <rect y="1600" width="1080" height="800" fill="#0000ff"/>
    </svg>
  `);
  const sourceRect = portalCrop.calculateAvatarSourceRect(
    verticalImage,
    { zoom: 1, position: { x: 0, y: 0 } },
  );
  const { data, info } = await sharp(svg)
    .extract({
      left: Math.round(sourceRect.x),
      top: Math.round(sourceRect.y),
      width: Math.round(sourceRect.width),
      height: Math.round(sourceRect.height),
    })
    .resize(512, 512, { fit: 'fill', kernel: 'nearest' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  assert.equal(info.width, 512);
  assert.equal(info.height, 512);
  const pixel = (x, y) => Array.from(data.subarray((y * info.width + x) * info.channels, (y * info.width + x) * info.channels + 3));
  assert.deepEqual(pixel(256, 10), [255, 0, 0]);
  assert.deepEqual(pixel(256, 256), [0, 255, 0]);
  assert.deepEqual(pixel(256, 501), [0, 0, 255]);
});

test('el círculo es solo overlay y la preview proviene del mismo resultado final', async () => {
  const shared = await readFile(new URL('../../shared/avatar-crop.ts', import.meta.url), 'utf8');
  const portal = await readFile(new URL('../src/components/AvatarCropDialog.tsx', import.meta.url), 'utf8');
  const intranet = await readFile(new URL('../../intranet/src/components/AvatarCropEditor.tsx', import.meta.url), 'utf8');

  assert.doesNotMatch(shared, /circle|radius|diameter/i);
  assert.match(portal, /<canvas ref=\{canvasRef\}/);
  assert.match(portal, /src=\{result\.dataUrl\}/);
  assert.match(portal, /onConfirm\(finalResult\.file\)/);
  assert.match(intranet, /src=\{result\.dataUrl\}/);
  assert.match(intranet, /onResultChange\(nextResult\)/);
});

test('el pipeline visual no crea, revoca ni persiste object URLs', async () => {
  const files = await Promise.all([
    readFile(new URL('../../shared/avatar-crop.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/AvatarCropDialog.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../intranet/src/components/AvatarCropEditor.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../../intranet/src/pages/comunidad/AlumnosPage.tsx', import.meta.url), 'utf8'),
  ]);
  const pipeline = files.join('\n');
  assert.doesNotMatch(pipeline, /URL\.createObjectURL|URL\.revokeObjectURL/);
  assert.doesNotMatch(pipeline, /src=\{[^}]*blob/i);
  assert.match(files[0], /reader\.readAsDataURL\(blob\)/);
});

test('cancelar no muta el avatar y un error conserva la referencia anterior', async () => {
  const guardian = await readFile(new URL('../src/components/TabDatos.tsx', import.meta.url), 'utf8');
  const children = await readFile(new URL('../src/components/TabHijos.tsx', import.meta.url), 'utf8');
  const intranet = await readFile(new URL('../../intranet/src/pages/comunidad/AlumnosPage.tsx', import.meta.url), 'utf8');

  assert.match(guardian, /onCancel=\{\(\) => setCropDraft\(null\)\}/);
  assert.match(guardian, /const nextAvatar = response\.data\.avatar_url[\s\S]*?setAvatar\(nextAvatar\)/);
  assert.match(children, /onCancel=\{\(\) => setCropDraft\(null\)\}/);
  assert.match(children, /await uploadPhoto\(cropDraft\.studentId, file\);\s*setCropDraft\(null\)/);
  assert.match(intranet, /const saved = await subirFotoAlumno\(avatarCropResult\.file\);\s*if \(saved\)/);
  assert.match(intranet, /catch \(error: any\)[\s\S]*?return false;/);
});
