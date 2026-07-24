import type { ReactNode } from 'react';
import CenteredFormModal from '../CenteredFormModal';

type CommunityEditModalProps = {
  open: boolean;
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  message?: string | null;
  saving?: boolean;
  submitDisabled?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  maxWidthClassName?: string;
  onClose: () => void;
  onSubmit: () => void;
};

export default function CommunityEditModal({
  open,
  eyebrow,
  title,
  description,
  children,
  message,
  saving = false,
  submitDisabled = false,
  submitLabel = 'Guardar cambios',
  cancelLabel = 'Cancelar',
  maxWidthClassName = 'max-w-5xl',
  onClose,
  onSubmit,
}: CommunityEditModalProps) {
  return (
    <CenteredFormModal
      open={open}
      eyebrow={eyebrow}
      title={title}
      description={description}
      message={message}
      saving={saving}
      submitDisabled={submitDisabled}
      submitLabel={submitLabel}
      cancelLabel={cancelLabel}
      maxWidthClassName={maxWidthClassName}
      onClose={onClose}
      onSubmit={onSubmit}
    >
      {children}
    </CenteredFormModal>
  );
}
