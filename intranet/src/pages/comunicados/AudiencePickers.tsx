import { useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";
import type { ComunicadoOptions } from "./comunicadosApi";
import {
  filterAudienceSections,
  getAudienceSectionIds,
  groupAudienceSections,
  toggleAudienceGroup,
  toggleAudienceId,
  type AudienceSectionItem,
} from "./audienceSelection";

const buttonFocus =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2";

type SelectionItem = {
  id: number;
  label: string;
};

type SelectionSummaryProps = {
  singular: string;
  plural: string;
  selectedLabel: string;
  items: SelectionItem[];
  onRemove: (id: number) => void;
  onClear: () => void;
};

function AudienceSelectionSummary({
  singular,
  plural,
  selectedLabel,
  items,
  onRemove,
  onClear,
}: SelectionSummaryProps) {
  if (!items.length) return null;
  const visibleItems = items.slice(0, 3);
  const remaining = items.length - visibleItems.length;

  return (
    <div className="border-t border-slate-200 px-3 py-3 sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-700" aria-live="polite">
          {items.length} {items.length === 1 ? singular : plural} {selectedLabel}
        </p>
        <button
          type="button"
          onClick={onClear}
          className={`min-h-9 rounded-lg px-2.5 text-sm font-semibold text-blue-700 transition-colors duration-150 hover:bg-blue-50 motion-reduce:transition-none ${buttonFocus}`}
        >
          Limpiar
        </button>
      </div>
      <div className="mt-2 flex min-w-0 flex-wrap gap-2">
        {visibleItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onRemove(item.id)}
            aria-label={`Quitar ${item.label}`}
            className={`inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 text-sm font-semibold text-blue-800 transition-colors duration-150 hover:bg-blue-100 motion-reduce:transition-none ${buttonFocus}`}
          >
            <span className="truncate">{item.label}</span>
            <X aria-hidden="true" className="shrink-0" size={14} />
          </button>
        ))}
        {remaining > 0 && (
          <span className="inline-flex min-h-9 items-center rounded-full bg-slate-200 px-3 text-sm font-semibold text-slate-700">
            +{remaining} más
          </span>
        )}
      </div>
    </div>
  );
}

type LevelPickerProps = {
  levels: ComunicadoOptions["niveles"];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
};

export function AudienceLevelPicker({
  levels,
  selectedIds,
  onChange,
  disabled = false,
}: LevelPickerProps) {
  const selectedItems = levels
    .filter((level) => selectedIds.includes(level.id_nivel))
    .map((level) => ({ id: level.id_nivel, label: level.nombre_nivel }));

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70">
      <div className="p-3 sm:p-4">
        <p className="text-sm font-semibold text-slate-800">Selecciona los niveles</p>
        <p className="mt-0.5 text-sm text-slate-500">
          Puedes elegir uno o varios niveles del año lectivo.
        </p>
        <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-2">
          {levels.map((level) => {
            const selected = selectedIds.includes(level.id_nivel);
            return (
              <button
                key={level.id_nivel}
                type="button"
                aria-pressed={selected}
                disabled={disabled}
                onClick={() =>
                  onChange(toggleAudienceId(selectedIds, level.id_nivel))
                }
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-[background-color,border-color,color] duration-150 motion-reduce:transition-none ${buttonFocus} ${
                  selected
                    ? "border-blue-600 bg-blue-50 text-blue-800"
                    : "border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50/60"
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {selected && <Check aria-hidden="true" size={16} strokeWidth={2.5} />}
                {level.nombre_nivel}
                <span className="sr-only">
                  {selected ? ", seleccionado" : ", no seleccionado"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <AudienceSelectionSummary
        singular="nivel"
        plural="niveles"
        selectedLabel={selectedItems.length === 1 ? "seleccionado" : "seleccionados"}
        items={selectedItems}
        onRemove={(id) => onChange(toggleAudienceId(selectedIds, id))}
        onClear={() => onChange([])}
      />
    </div>
  );
}

type SectionPickerProps = {
  levels: ComunicadoOptions["niveles"];
  sections: ComunicadoOptions["secciones"];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
};

export function AudienceSectionPicker({
  levels,
  sections,
  selectedIds,
  onChange,
  disabled = false,
}: SectionPickerProps) {
  const [search, setSearch] = useState("");
  const groups = useMemo(
    () => groupAudienceSections(levels, sections),
    [levels, sections],
  );
  const filteredGroups = useMemo(
    () => filterAudienceSections(groups, search),
    [groups, search],
  );
  const selectedItems = useMemo(
    () =>
      groups
        .flatMap((group) => group.grades)
        .flatMap((grade) => grade.sections)
        .filter((section) => selectedIds.includes(section.id))
        .map((section) => ({
          id: section.id,
          label: `${section.levelName} · ${section.gradeName} · ${section.sectionName}`,
        })),
    [groups, selectedIds],
  );

  const toggleItem = (section: AudienceSectionItem) => {
    onChange(toggleAudienceId(selectedIds, section.id));
  };

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70">
      <div className="border-b border-slate-200 p-3 sm:p-4">
        <label className="block text-sm font-semibold text-slate-800" htmlFor="comunicado-section-search">
          Buscar secciones
        </label>
        <div className="relative mt-2">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={17}
          />
          <input
            id="comunicado-section-search"
            type="search"
            value={search}
            disabled={disabled}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar grado o sección"
            className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 motion-reduce:transition-none"
          />
        </div>
      </div>

      <div className="relative isolate max-h-[280px] overflow-x-hidden overflow-y-auto overscroll-contain">
        {filteredGroups.length === 0 ? (
          <div className="flex min-h-40 flex-col items-center justify-center px-4 py-8 text-center">
            <Search aria-hidden="true" className="text-slate-400" size={24} />
            <p className="mt-3 text-sm font-semibold text-slate-800">
              No encontramos secciones con esa búsqueda.
            </p>
            <button
              type="button"
              onClick={() => setSearch("")}
              className={`mt-2 min-h-10 rounded-lg px-3 text-sm font-semibold text-blue-700 transition-colors duration-150 hover:bg-blue-50 motion-reduce:transition-none ${buttonFocus}`}
            >
              Limpiar búsqueda
            </button>
          </div>
        ) : (
          filteredGroups.map((group) => {
            const levelIds = getAudienceSectionIds(group);
            const levelIsSelected = levelIds.every((id) =>
              selectedIds.includes(id),
            );
            return (
              <section
                key={group.id}
                aria-labelledby={`audience-level-${group.id}`}
                className="border-b border-slate-200 last:border-b-0"
              >
                <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-100 px-3 py-2.5 sm:px-4">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <h3
                      id={`audience-level-${group.id}`}
                      className="text-sm font-bold text-slate-900"
                    >
                      {group.name}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {levelIds.length} {levelIds.length === 1 ? "sección" : "secciones"}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      onChange(toggleAudienceGroup(selectedIds, levelIds))
                    }
                    aria-label={`${levelIsSelected ? "Quitar todas las secciones de" : "Seleccionar todas las secciones de"} ${group.name}`}
                    className={`min-h-9 rounded-lg px-2.5 text-sm font-medium text-slate-600 transition-colors duration-150 hover:bg-white hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none ${buttonFocus}`}
                  >
                    {levelIsSelected ? "Quitar" : "Todas"}
                  </button>
                </div>
                <div className="grid items-start gap-x-6 gap-y-5 px-3 py-3 sm:grid-cols-2 sm:px-4 sm:py-3.5">
                  {group.grades.map((grade) => {
                    const gradeIds = grade.sections.map((section) => section.id);
                    const gradeIsSelected = gradeIds.every((id) =>
                      selectedIds.includes(id),
                    );
                    return (
                      <div key={grade.name} className="min-w-0">
                        <div className="flex min-h-9 items-center justify-between gap-2 border-b border-slate-200 pb-1.5">
                          <h4 className="text-sm font-semibold text-slate-800">
                            {grade.name}
                          </h4>
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() =>
                              onChange(toggleAudienceGroup(selectedIds, gradeIds))
                            }
                            aria-label={`${gradeIsSelected ? "Quitar todas las secciones de" : "Seleccionar todas las secciones de"} ${grade.name}, ${group.name}`}
                            className={`min-h-9 shrink-0 rounded-lg px-2 text-sm font-medium text-slate-500 transition-colors duration-150 hover:bg-slate-100 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none ${buttonFocus}`}
                          >
                            {gradeIsSelected ? "Quitar" : "Todas"}
                          </button>
                        </div>
                        <div className="mt-2.5 flex flex-wrap gap-2">
                          {grade.sections.map((section) => {
                            const selected = selectedIds.includes(section.id);
                            return (
                              <button
                                key={section.id}
                                type="button"
                                aria-pressed={selected}
                                aria-label={`${section.levelName}, ${section.gradeName}, sección ${section.sectionName}${selected ? ", seleccionada" : ""}`}
                                disabled={disabled}
                                onClick={() => toggleItem(section)}
                                className={`inline-flex min-h-10 min-w-14 items-center justify-center gap-1 rounded-xl border px-3 text-sm font-bold transition-[background-color,border-color,color,box-shadow] duration-150 motion-reduce:transition-none ${buttonFocus} ${
                                  selected
                                    ? "border-blue-600 bg-blue-100 text-blue-900 shadow-sm"
                                    : "border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50/70"
                                } disabled:cursor-not-allowed disabled:opacity-50`}
                              >
                                {selected && (
                                  <Check aria-hidden="true" size={15} strokeWidth={2.5} />
                                )}
                                {section.sectionName}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </div>

      <AudienceSelectionSummary
        singular="sección"
        plural="secciones"
        selectedLabel={selectedItems.length === 1 ? "seleccionada" : "seleccionadas"}
        items={selectedItems}
        onRemove={(id) => onChange(toggleAudienceId(selectedIds, id))}
        onClear={() => onChange([])}
      />
    </div>
  );
}
