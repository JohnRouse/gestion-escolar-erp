import assert from "node:assert/strict";
import test from "node:test";
import { isRealStudentPhoto, studentInitials } from "../src/lib/portalAvatar.ts";

test("un avatar DiceBear legacy usa iniciales aunque siga guardado como URL", () => {
  assert.equal(isRealStudentPhoto("https://api.dicebear.com/9.x/avataaars/svg?seed=Mateo"), false);
  assert.equal(isRealStudentPhoto("https://dicebear.com/legacy.svg"), false);
  assert.equal(isRealStudentPhoto("https://cdn.example.edu/avataaars/mateo.svg"), false);
  assert.equal(isRealStudentPhoto("https://cdn.example.edu/uploads/generated.svg"), false);
  assert.equal(isRealStudentPhoto("https://i.pravatar.cc/150?img=1"), false);
});

test("una foto real conserva su URL", () => {
  assert.equal(isRealStudentPhoto("https://cdn.example.edu/uploads/mateo.jpg"), true);
  assert.equal(isRealStudentPhoto("/uploads/estudiantes/mateo.png"), true);
});

test("sin foto o con protocolo no apto se usan iniciales", () => {
  assert.equal(isRealStudentPhoto(null), false);
  assert.equal(isRealStudentPhoto(""), false);
  assert.equal(isRealStudentPhoto("javascript:alert(1)"), false);
});

test("las iniciales usan una regla canónica de primer nombre y último apellido", () => {
  assert.equal(studentInitials("Víctor Alonso Díaz"), "VD");
  assert.equal(studentInitials("Ana"), "AN");
  assert.equal(studentInitials(""), "·");
});
