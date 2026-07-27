import { useMemo, useState } from 'react';
import {
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import CenteredFormModal from './CenteredFormModal';

interface NivelResumen {
  id_nivel: number;
  nombre_nivel: string;
}

interface GradoResumen {
  id_grado: number;
  nombre_grado: string;
}

interface GradeBatchModalProps {
  open: boolean;
  nivel: NivelResumen | null;
  existingGrades: GradoResumen[];
  saving: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (names: string[]) => void;
}

interface GradeRow {
  id: string;
  name: string;
}

let rowSequence = 0;

const createRow = (name = ''): GradeRow => ({
  id: `grade-row-${++rowSequence}`,
  name,
});

const normalizeName = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const getSuggestedNames = (levelName: string) => {
  const normalized = normalizeName(levelName);

  if (normalized.includes('inicial')) {
    return [
      '3 años',
      '4 años',
      '5 años',
    ];
  }

  if (normalized.includes('primaria')) {
    return [
      '1er Grado',
      '2do Grado',
      '3er Grado',
      '4to Grado',
      '5to Grado',
      '6to Grado',
    ];
  }

  if (normalized.includes('secundaria')) {
    return [
      '1er Secundaria',
      '2do Secundaria',
      '3ro Secundaria',
      '4to Secundaria',
      '5to Secundaria',
    ];
  }

  return [];
};

const getInitialRows = (
  nivel: NivelResumen | null,
  existingGrades: GradoResumen[],
) => {
  const existingKeys = new Set(
    existingGrades.map((grade) =>
      normalizeName(grade.nombre_grado),
    ),
  );

  const suggestedNames = nivel
    ? getSuggestedNames(nivel.nombre_nivel)
    : [];

  const missingNames = suggestedNames.filter(
    (name) =>
      !existingKeys.has(normalizeName(name)),
  );

  const initialNames =
    missingNames.length > 0
      ? missingNames
      : [''];

  return initialNames.map(createRow);
};

export default function GradeBatchModal({
  open,
  nivel,
  existingGrades,
  saving,
  error,
  onClose,
  onSubmit,
}: GradeBatchModalProps) {
  const [rows, setRows] = useState<GradeRow[]>(() =>
    getInitialRows(nivel, existingGrades),
  );

  const existingKeys = useMemo(
    () =>
      new Set(
        existingGrades.map((grade) =>
          normalizeName(grade.nombre_grado),
        ),
      ),
    [existingGrades],
  );

  const templateNames = useMemo(
    () =>
      nivel
        ? getSuggestedNames(nivel.nombre_nivel)
        : [],
    [nivel],
  );

  const missingTemplateNames = useMemo(
    () =>
      templateNames.filter(
        (name) =>
          !existingKeys.has(normalizeName(name)),
      ),
    [existingKeys, templateNames],
  );

  const cleanNames = useMemo(
    () =>
      rows.map((row) =>
        row.name
          .replace(/\s+/g, ' ')
          .trim(),
      ),
    [rows],
  );

  const validationMessage = useMemo(() => {
    if (rows.length === 0) {
      return 'Agrega al menos un grado.';
    }

    if (rows.length > 20) {
      return 'Solo puedes agregar hasta 20 grados.';
    }

    if (cleanNames.some((name) => !name)) {
      return 'Completa o elimina las filas vacías.';
    }

    if (
      cleanNames.some(
        (name) => name.length > 50,
      )
    ) {
      return 'Cada nombre puede tener hasta 50 caracteres.';
    }

    const usedKeys = new Set<string>();

    for (const name of cleanNames) {
      const key = normalizeName(name);

      if (usedKeys.has(key)) {
        return `El grado "${name}" está repetido.`;
      }

      if (existingKeys.has(key)) {
        return `El grado "${name}" ya está configurado.`;
      }

      usedKeys.add(key);
    }

    return null;
  }, [cleanNames, existingKeys, rows.length]);

  const updateRow = (
    rowId: string,
    value: string,
  ) => {
    setRows((current) =>
      current.map((row) =>
        row.id === rowId
          ? { ...row, name: value }
          : row,
      ),
    );
  };

  const removeRow = (rowId: string) => {
    setRows((current) =>
      current.filter((row) => row.id !== rowId),
    );
  };

  const addRow = () => {
    setRows((current) => {
      if (current.length >= 20) return current;

      return [
        ...current,
        createRow(),
      ];
    });
  };

  const restoreTemplate = () => {
    const names =
      missingTemplateNames.length > 0
        ? missingTemplateNames
        : [''];

    setRows(names.map(createRow));
  };

  const handleSubmit = () => {
    if (validationMessage) return;

    onSubmit(cleanNames);
  };

  const count = cleanNames.filter(Boolean).length;

  return (
    <CenteredFormModal
      open={open}
      eyebrow="Configuración académica"
      title="Configurar grados"
      description={
        nivel
          ? `Nivel: ${nivel.nombre_nivel}`
          : 'Selecciona los grados que deseas agregar.'
      }
      message={error}
      messageTone="error"
      saving={saving}
      submitDisabled={Boolean(validationMessage)}
      submitLabel={`Agregar ${count} ${
        count === 1 ? 'grado' : 'grados'
      }`}
      maxWidthClassName="max-w-2xl"
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      <div className="space-y-4">
        <section className="rounded-2xl border border-accent-100 bg-accent-50/60 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-accent-600 shadow-sm ring-1 ring-accent-100">
                <Sparkles size={18} />
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Plantilla sugerida
                </p>

                <p className="mt-1 text-xs leading-5 text-gray-600">
                  Los nombres están estandarizados, pero puedes
                  modificarlos antes de guardar.
                </p>

                <p className="mt-2 text-xs font-semibold text-accent-700">
                  {existingGrades.length} grados ya configurados
                </p>
              </div>
            </div>

            {templateNames.length > 0 && (
              <button
                type="button"
                onClick={restoreTemplate}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-accent-200 bg-white px-3 py-2 text-xs font-semibold text-accent-700 transition hover:border-accent-300 hover:bg-accent-50"
              >
                <RotateCcw size={14} />
                Restaurar sugeridos
              </button>
            )}
          </div>
        </section>

        <div className="space-y-2">
          {rows.map((row, index) => (
            <div
              key={row.id}
              className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50/70 p-2"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-semibold text-gray-500 shadow-sm">
                {index + 1}
              </span>

              <input
                value={row.name}
                onChange={(event) =>
                  updateRow(
                    row.id,
                    event.target.value,
                  )
                }
                maxLength={50}
                autoFocus={index === 0}
                aria-label={`Nombre del grado ${index + 1}`}
                placeholder="Nombre del grado"
                className="h-10 min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-800 outline-none transition focus:border-accent-300 focus:ring-4 focus:ring-accent-500/10"
              />

              <button
                type="button"
                onClick={() => removeRow(row.id)}
                aria-label={`Eliminar grado ${index + 1}`}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-gray-400 transition hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addRow}
          disabled={rows.length >= 20}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-600 transition hover:border-accent-300 hover:bg-accent-50 hover:text-accent-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={16} />
          Agregar otro grado
        </button>

        {validationMessage && (
          <p className="text-sm font-medium text-red-600">
            {validationMessage}
          </p>
        )}
      </div>
    </CenteredFormModal>
  );
}
