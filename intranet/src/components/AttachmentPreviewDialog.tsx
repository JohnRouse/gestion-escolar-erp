import AccessibleDialog from './AccessibleDialog';

type AttachmentPreview = {
  url: string;
  nombre?: string | null;
  mime?: string | null;
};

type AttachmentPreviewDialogProps = {
  preview: AttachmentPreview | null;
  eyebrow?: string;
  onClose: () => void;
};

function isPdfFile(preview: AttachmentPreview | null) {
  const url = String(preview?.url || '').toLowerCase();
  const mime = String(preview?.mime || '').toLowerCase();

  return mime.includes('pdf') || url.includes('.pdf');
}

export default function AttachmentPreviewDialog({
  preview,
  eyebrow = 'Documento adjunto',
  onClose,
}: AttachmentPreviewDialogProps) {
  const title = preview?.nombre || 'Archivo adjunto';

  return (
    <AccessibleDialog
      open={Boolean(preview?.url)}
      eyebrow={eyebrow}
      title={title}
      description="Vista previa del archivo registrado."
      onClose={onClose}
      closeOnEscape
      closeOnOverlay
      closeLabel="Cerrar vista previa del archivo"
      maxWidthClassName="max-w-5xl"
      bodyClassName="!min-h-[60vh] !bg-slate-100 !p-4"
    >
      {preview?.url &&
        (isPdfFile(preview) ? (
          <iframe
            src={preview.url}
            title={title}
            className="h-[72vh] w-full rounded-sm border border-slate-200 bg-white"
          />
        ) : (
          <img
            src={preview.url}
            alt={title}
            className="mx-auto max-h-[72vh] max-w-full rounded-sm bg-white object-contain shadow-sm"
          />
        ))}
    </AccessibleDialog>
  );
}
