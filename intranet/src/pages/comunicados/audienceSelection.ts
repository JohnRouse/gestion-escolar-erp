import type { ComunicadoOptions } from "./comunicadosApi";

type LevelOption = ComunicadoOptions["niveles"][number];
type SectionOption = ComunicadoOptions["secciones"][number];

export type AudienceSectionItem = {
  id: number;
  label: string;
  levelId: number;
  levelName: string;
  gradeName: string;
  sectionName: string;
};

export type AudienceGradeGroup = {
  name: string;
  sections: AudienceSectionItem[];
};

export type AudienceLevelGroup = {
  id: number;
  name: string;
  grades: AudienceGradeGroup[];
};

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();
}

function parseSectionName(section: SectionOption, levelName: string) {
  const parts = section.nombre
    .split("·")
    .map((part) => part.trim())
    .filter(Boolean);
  const firstPartIsLevel =
    parts.length > 1 &&
    normalizeSearch(parts[0]) === normalizeSearch(levelName);
  const details = firstPartIsLevel ? parts.slice(1) : parts;
  const sectionPart = details.at(-1) ?? section.nombre;
  const sectionName =
    sectionPart.replace(/^secci[oó]n\s+/i, "").trim() || sectionPart;
  const gradeParts = details.slice(0, -1);
  const gradeName = gradeParts.join(" · ") || "Grado sin nombre";

  return { gradeName, sectionName };
}

export function groupAudienceSections(
  levels: LevelOption[],
  sections: SectionOption[],
): AudienceLevelGroup[] {
  const levelNames = new Map(
    levels.map((level) => [level.id_nivel, level.nombre_nivel]),
  );
  const groups = new Map<number, AudienceLevelGroup>();

  for (const level of levels) {
    groups.set(level.id_nivel, {
      id: level.id_nivel,
      name: level.nombre_nivel,
      grades: [],
    });
  }

  for (const section of sections) {
    const fallbackLevelName = section.nombre.split("·")[0]?.trim();
    const levelName =
      levelNames.get(section.id_nivel) || fallbackLevelName || "Nivel sin nombre";
    const group = groups.get(section.id_nivel) ?? {
      id: section.id_nivel,
      name: levelName,
      grades: [],
    };
    if (!groups.has(section.id_nivel)) groups.set(section.id_nivel, group);

    const { gradeName, sectionName } = parseSectionName(section, levelName);
    let grade = group.grades.find((item) => item.name === gradeName);
    if (!grade) {
      grade = { name: gradeName, sections: [] };
      group.grades.push(grade);
    }
    grade.sections.push({
      id: section.id_seccion,
      label: section.nombre,
      levelId: section.id_nivel,
      levelName,
      gradeName,
      sectionName,
    });
  }

  return Array.from(groups.values()).filter((group) => group.grades.length > 0);
}

export function filterAudienceSections(
  groups: AudienceLevelGroup[],
  search: string,
): AudienceLevelGroup[] {
  const query = normalizeSearch(search);
  if (!query) return groups;
  const searchSectionOnly = query.length === 1;

  return groups.flatMap((group) => {
    if (!searchSectionOnly && normalizeSearch(group.name).includes(query)) {
      return [group];
    }

    const grades = group.grades.flatMap((grade) => {
      if (!searchSectionOnly && normalizeSearch(grade.name).includes(query)) {
        return [grade];
      }

      const sections = grade.sections.filter((section) => {
        const sectionName = normalizeSearch(section.sectionName);
        return (
          sectionName.includes(query) ||
          normalizeSearch(`Sección ${section.sectionName}`).includes(query)
        );
      });
      return sections.length ? [{ ...grade, sections }] : [];
    });

    return grades.length ? [{ ...group, grades }] : [];
  });
}

export function toggleAudienceId(selectedIds: number[], id: number) {
  return selectedIds.includes(id)
    ? selectedIds.filter((selectedId) => selectedId !== id)
    : [...selectedIds, id];
}

export function toggleAudienceGroup(
  selectedIds: number[],
  targetIds: number[],
) {
  const uniqueTargetIds = Array.from(new Set(targetIds));
  const targetIsSelected = uniqueTargetIds.every((id) => selectedIds.includes(id));
  if (targetIsSelected) {
    return selectedIds.filter((id) => !uniqueTargetIds.includes(id));
  }
  return Array.from(new Set([...selectedIds, ...uniqueTargetIds]));
}

export function clearAudienceSelection() {
  return [] as number[];
}

export function getAudienceSectionIds(group: AudienceLevelGroup) {
  return group.grades.flatMap((grade) =>
    grade.sections.map((section) => section.id),
  );
}
