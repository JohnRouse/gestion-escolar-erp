import CenteredFormModal from './CenteredFormModal';

type JustificacionDraft = {
  alumno: string;
  motivo: string;
  observacion: string;
  archivo?: File | null;
  archivoActualUrl?: string | null;
  archivoActualNombre?: string | null;
};

type AttendanceJustificationModalProps = {
  draft: JustificacionDraft | null;
  motivos: string[];
  saving: boolean;
  error?: string | null;
  onChange: (draft: JustificacionDraft) => void;
  onPreviewCurrent: (preview: {
    url: string;
    nombre?: string | null;
  }) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export default function AttendanceJustificationModal({
  draft,
  motivos,
  saving,
  error,
  onChange,
  onPreviewCurrent,
  onClose,
  onSubmit,
}: AttendanceJustificationModalProps) {
  return (
    <CenteredFormModal
      open={Boolean(draft)}
      eyebrow="Justificación de asistencia"
      title={draft?.alumno || 'Alumno'}
      description="Registra el motivo y, de ser necesario, adjunta el documento de sustento."
      saving={saving}
      submitDisabled={!draft?.motivo.trim()}
      submitLabel={saving ? 'Guardando...' : 'Guardar justificación'}
      cancelLabel="Cancelar"
      maxWidthClassName="max-w-lg"
      message={error}
      messageTone="error"
      onClose={onClose}
      onSubmit={onSubmit}
    >
      {draft && (
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
              Motivo
            </span>
            <select
              value={draft.motivo}
              onChange={(event) =>
                onChange({
                  ...draft,
                  motivo: event.target.value,
                })
              }
              className="h-12 w-full rounded-sm border border-transparent border-b-slate-500 bg-slate-100 px-3 text-sm font-black text-slate-950 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            >
              {motivos.map((motivo) => (
                <option key={motivo} value={motivo}>
                  {motivo}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
              Observación opcional
            </span>
            <textarea
              value={draft.observacion}
              onChange={(event) =>
                onChange({
                  ...draft,
                  observacion: event.target.value,
                })
              }
              rows={4}
              maxLength={500}
              placeholder="Ejemplo: Presentó permiso del apoderado, cita médica, etc."
              className="w-full resize-none rounded-sm border border-transparent border-b-slate-500 bg-slate-100 px-3 py-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
              Documento de sustento opcional
            </span>
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              onChange={(event) =>
                onChange({
                  ...draft,
                  archivo: event.target.files?.[0] || null,
                })
              }
              className="w-full rounded-sm border border-transparent border-b-slate-500 bg-slate-100 px-3 py-3 text-sm font-semibold text-slate-950 outline-none file:mr-3 file:rounded-sm file:border-0 file:bg-slate-950 file:px-3 file:py-2 file:text-xs file:font-black file:text-white"
            />

            <span className="mt-2 block text-xs font-semibold text-slate-500">
              Formatos permitidos: PDF, JPG, PNG o WEBP. Máximo 5 MB.
            </span>
          </label>

          {draft.archivoActualUrl && (
            <button
              type="button"
              onClick={() =>
                onPreviewCurrent({
                  url: draft.archivoActualUrl || '',
                  nombre:
                    draft.archivoActualNombre ||
                    'Documento de sustento',
                })
              }
              className="inline-flex rounded-sm border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100"
            >
              Ver documento actual
              {draft.archivoActualNombre
                ? `: ${draft.archivoActualNombre}`
                : ''}
            </button>
          )}

          {draft.archivo && (
            <p className="text-xs font-black text-slate-600">
              Nuevo archivo: {draft.archivo.name}
            </p>
          )}
        </div>
      )}
    </CenteredFormModal>
  );
}
