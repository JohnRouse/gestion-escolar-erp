import assert from "node:assert/strict";
import test from "node:test";
import {
  buildComunicadoAudience,
  changeComunicadoYear,
} from "../src/pages/comunicados/comunicadosFormRules.ts";
import {
  clearAudienceSelection,
  filterAudienceSections,
  getAudienceSectionIds,
  groupAudienceSections,
  toggleAudienceGroup,
  toggleAudienceId,
} from "../src/pages/comunicados/audienceSelection.ts";

const levels = [
  { id_nivel: 1, nombre_nivel: "Inicial" },
  { id_nivel: 2, nombre_nivel: "Primaria" },
  { id_nivel: 3, nombre_nivel: "Secundaria" },
];

const sections = [
  {
    id_seccion: 101,
    id_nivel: 2,
    nombre: "Primaria · 5to Grado · Sección A",
  },
  {
    id_seccion: 102,
    id_nivel: 2,
    nombre: "Primaria · 5to Grado · Sección B",
  },
  {
    id_seccion: 103,
    id_nivel: 2,
    nombre: "Primaria · 6to Grado · Sección A",
  },
  {
    id_seccion: 201,
    id_nivel: 3,
    nombre: "Secundaria · 1er Grado · Sección A",
  },
  {
    id_seccion: 202,
    id_nivel: 3,
    nombre: "Secundaria · 1er Grado · Sección B",
  },
];

const groups = groupAudienceSections(levels, sections);

test("selecciona y deselecciona un nivel", () => {
  assert.deepEqual(toggleAudienceId([], 2), [2]);
  assert.deepEqual(toggleAudienceId([2], 2), []);
});

test("conserva selección múltiple de niveles", () => {
  const withPrimary = toggleAudienceId([], 2);
  assert.deepEqual(toggleAudienceId(withPrimary, 3), [2, 3]);
});

test("agrupa secciones por nivel y grado", () => {
  assert.deepEqual(
    groups.map((level) => ({
      level: level.name,
      grades: level.grades.map((grade) => ({
        grade: grade.name,
        sections: grade.sections.map((section) => section.sectionName),
      })),
    })),
    [
      {
        level: "Primaria",
        grades: [
          { grade: "5to Grado", sections: ["A", "B"] },
          { grade: "6to Grado", sections: ["A"] },
        ],
      },
      {
        level: "Secundaria",
        grades: [{ grade: "1er Grado", sections: ["A", "B"] }],
      },
    ],
  );
});

test("selecciona una sección", () => {
  assert.deepEqual(toggleAudienceId([], 101), [101]);
});

test("selecciona todas las secciones de un grado sin duplicar IDs", () => {
  const gradeIds = groups[0].grades[0].sections.map((section) => section.id);
  assert.deepEqual(toggleAudienceGroup([101], gradeIds), [101, 102]);
});

test("selecciona todas las secciones visibles de un nivel", () => {
  const primaryIds = getAudienceSectionIds(groups[0]);
  assert.deepEqual(toggleAudienceGroup([], primaryIds), [101, 102, 103]);
});

test("limpia la selección", () => {
  assert.deepEqual(clearAudienceSelection(), []);
});

test("filtra por grado", () => {
  const result = filterAudienceSections(groups, "5to");
  assert.equal(result.length, 1);
  assert.equal(result[0].name, "Primaria");
  assert.deepEqual(getAudienceSectionIds(result[0]), [101, 102]);
});

test("filtra por nivel y conserva todos sus grados", () => {
  const result = filterAudienceSections(groups, "Primaria");
  assert.equal(result.length, 1);
  assert.equal(result[0].grades.length, 2);
  assert.deepEqual(getAudienceSectionIds(result[0]), [101, 102, 103]);
});

test("una búsqueda corta por sección no coincide con el nombre del nivel", () => {
  const result = filterAudienceSections(groups, "A");
  assert.deepEqual(
    result.flatMap(getAudienceSectionIds),
    [101, 103, 201],
  );
});

test("devuelve estado sin resultados para una búsqueda inexistente", () => {
  assert.deepEqual(filterAudienceSections(groups, "Universidad"), []);
});

test("cambiar el año del comunicado limpia la audiencia anterior", () => {
  const result = changeComunicadoYear(
    {
      id_anio: "2026",
      audiencia_tipo: "secciones",
      audiencia_ids: [15],
      titulo: "Prueba",
    },
    "2027",
  );

  assert.equal(result.id_anio, "2027");
  assert.equal(result.audiencia_tipo, "colegio");
  assert.deepEqual(result.audiencia_ids, []);
  assert.equal(result.titulo, "Prueba");
});

test("el payload conserva exactamente los IDs seleccionados", () => {
  assert.deepEqual(buildComunicadoAudience("secciones", [103, 201, 102]), {
    tipo: "secciones",
    ids: [103, 201, 102],
  });
  assert.deepEqual(buildComunicadoAudience("colegio", [999]), {
    tipo: "colegio",
    ids: [],
  });
});
