import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import AccessibleDialog from '../AccessibleDialog';

type CommunityDetailModalProps = {
  open: boolean;
  eyebrow: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  leadingSlot?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  loading?: boolean;
  maxWidthClassName?: string;
  onClose: () => void;
};

export default function CommunityDetailModal({
  open,
  eyebrow,
  title,
  description,
  leadingSlot,
  actions,
  children,
  loading = false,
  maxWidthClassName = 'max-w-5xl',
  onClose,
}: CommunityDetailModalProps) {
  return (
    <AccessibleDialog
      open={open}
      eyebrow={eyebrow}
      title={title}
      description={description}
      icon={leadingSlot}
      headerActions={actions}
      onClose={onClose}
      closeOnEscape
      closeOnOverlay
      closeLabel="Cerrar detalle"
      maxWidthClassName={maxWidthClassName}
      headerClassName="bg-slate-50/50 !px-6 !py-6"
      bodyClassName="max-h-[72vh] !px-6 !py-6"
    >
      {loading ? (
        <div className="flex min-h-[260px] items-center justify-center">
          <Loader2
            size={22}
            aria-hidden="true"
            className="animate-spin text-accent-500 motion-reduce:animate-none"
          />
        </div>
      ) : (
        children
      )}
    </AccessibleDialog>
  );
}
