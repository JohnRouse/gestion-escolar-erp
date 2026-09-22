import assert from 'node:assert/strict';
import test from 'node:test';
import { legacyComunicadosTarget } from '../src/pages/comunicados/comunicadosRoutes.ts';

test('la ruta intranet legacy redirige a Comunicados', () => {
  assert.equal(legacyComunicadosTarget(), '/comunicados');
});

test('la ruta intranet legacy conserva query params', () => {
  assert.equal(
    legacyComunicadosTarget('?id_circular=42&origen=historico'),
    '/comunicados?id_circular=42&origen=historico',
  );
});
