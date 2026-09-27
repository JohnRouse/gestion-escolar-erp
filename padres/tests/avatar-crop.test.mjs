import assert from "node:assert/strict";
import test from "node:test";
import { AVATAR_OUTPUT_SIZE, calculateAvatarDraw, clampAvatarCrop } from "../src/lib/avatarCrop.ts";

test("el crop oficial produce un lienzo cuadrado de 512 px", () => {
  assert.equal(AVATAR_OUTPUT_SIZE, 512);
  const draw = calculateAvatarDraw(
    { width: 3024, height: 4032 },
    { zoom: 1.4, position: { x: 0.08, y: -0.12 } },
  );
  assert.ok(draw.width >= AVATAR_OUTPUT_SIZE);
  assert.ok(draw.height >= AVATAR_OUTPUT_SIZE);
});

test("pan se limita para no dejar huecos dentro del cuadrado", () => {
  assert.deepEqual(
    clampAvatarCrop({ x: 9, y: -9 }, 1, { width: 1000, height: 2000 }),
    { x: 0, y: -0.5 },
  );
});
