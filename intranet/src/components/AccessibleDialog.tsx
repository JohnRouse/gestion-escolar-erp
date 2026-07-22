import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

let openDialogCount = 0;
let originalBodyOverflow = '';

function lockBodyScroll() {
  if (openDialogCount === 0) {
    originalBodyOverflow =
      document.body.style.overflow;
  }

  openDialogCount += 1;
  document.body.style.overflow = 'hidden';
}

function unlockBodyScroll() {
  openDialogCount = Math.max(
    0,
    openDialogCount - 1,
  );

  if (openDialogCount === 0) {
    document.body.style.overflow =
      originalBodyOverflow;
  }
}

function getFocusableElements(
  container: HTMLElement,
): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      FOCUSABLE_SELECTOR,
    ),
  ).filter((element) => {
    const isHidden =
      element.getAttribute('aria-hidden') ===
      'true';

    const isDisabled =
      element.hasAttribute('disabled');

    const isVisible =
      element.getClientRects().length > 0;

    return (
      !isHidden &&
      !isDisabled &&
      isVisible &&
      element.tabIndex >= 0
    );
  });
}

const cx = (
  ...classes: Array<
    string | false | null | undefined
  >
) => classes.filter(Boolean).join(' ');

export type AccessibleDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  eyebrow?: string;
  icon?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  closeLabel?: string;
  closeOnOverlay?: boolean;
  closeOnEscape?: boolean;
  preventClose?: boolean;
  showCloseButton?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  maxWidthClassName?: string;
  panelClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
};

export default function AccessibleDialog({
  open,
  title,
  description,
  eyebrow,
  icon,
  children,
  footer,
  onClose,
  closeLabel = 'Cerrar diálogo',
  closeOnOverlay = true,
  closeOnEscape = true,
  preventClose = false,
  showCloseButton = true,
  initialFocusRef,
  maxWidthClassName = 'max-w-2xl',
  panelClassName,
  headerClassName,
  bodyClassName,
  footerClassName,
}: AccessibleDialogProps) {
  const titleId = useId();
  const descriptionId = useId();

  const dialogRef =
    useRef<HTMLElement | null>(null);

  const onCloseRef = useRef(onClose);

  const closeOptionsRef = useRef({
    closeOnEscape,
    preventClose,
  });

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    closeOptionsRef.current = {
      closeOnEscape,
      preventClose,
    };
  }, [
    closeOnEscape,
    preventClose,
  ]);

  useEffect(() => {
    if (
      !open ||
      typeof document === 'undefined'
    ) {
      return;
    }

    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    const previouslyFocusedElement =
      document.activeElement instanceof
      HTMLElement
        ? document.activeElement
        : null;

    lockBodyScroll();

    const animationFrame =
      window.requestAnimationFrame(() => {
        const firstFocusable =
          initialFocusRef?.current ??
          getFocusableElements(dialog)[0] ??
          dialog;

        firstFocusable.focus({
          preventScroll: true,
        });
      });

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      const options =
        closeOptionsRef.current;

      if (
        event.key === 'Escape' &&
        options.closeOnEscape &&
        !options.preventClose
      ) {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusableElements =
        getFocusableElements(dialog);

      if (focusableElements.length === 0) {
        event.preventDefault();
        dialog.focus({
          preventScroll: true,
        });
        return;
      }

      const firstElement =
        focusableElements[0];

      const lastElement =
        focusableElements[
          focusableElements.length - 1
        ];

      const activeElement =
        document.activeElement;

      if (
        !activeElement ||
        !dialog.contains(activeElement)
      ) {
        event.preventDefault();

        const targetElement =
          event.shiftKey
            ? lastElement
            : firstElement;

        targetElement.focus({
          preventScroll: true,
        });

        return;
      }

      if (
        event.shiftKey &&
        activeElement === firstElement
      ) {
        event.preventDefault();

        lastElement.focus({
          preventScroll: true,
        });

        return;
      }

      if (
        !event.shiftKey &&
        activeElement === lastElement
      ) {
        event.preventDefault();

        firstElement.focus({
          preventScroll: true,
        });
      }
    };

    document.addEventListener(
      'keydown',
      handleKeyDown,
      true,
    );

    return () => {
      window.cancelAnimationFrame(
        animationFrame,
      );

      document.removeEventListener(
        'keydown',
        handleKeyDown,
        true,
      );

      unlockBodyScroll();

      if (
        previouslyFocusedElement &&
        document.contains(
          previouslyFocusedElement,
        )
      ) {
        previouslyFocusedElement.focus({
          preventScroll: true,
        });
      }
    };
  }, [
    open,
    initialFocusRef,
  ]);

  if (
    !open ||
    typeof document === 'undefined'
  ) {
    return null;
  }

  const requestClose = () => {
    if (!preventClose) {
      onClose();
    }
  };

  return createPortal(
    <div
      className="
        fixed inset-0 z-[12000]
        flex items-center justify-center
        overflow-y-auto p-4 sm:p-6
      "
    >
      <div
        aria-hidden="true"
        className="
          absolute inset-0
          bg-slate-950/40
          backdrop-blur-sm
          animate-in fade-in
          duration-200
          motion-reduce:animate-none
        "
        onMouseDown={() => {
          if (closeOnOverlay) {
            requestClose();
          }
        }}
      />

      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={
          description
            ? descriptionId
            : undefined
        }
        aria-busy={
          preventClose || undefined
        }
        tabIndex={-1}
        className={cx(
          'relative my-auto flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden',
          'rounded-[1.75rem] border border-white bg-white',
          'shadow-[0_30px_90px_-45px_rgba(15,23,42,0.75)] ring-1 ring-slate-200/70',
          'animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200',
          'motion-reduce:animate-none',
          'focus:outline-none',
          maxWidthClassName,
          panelClassName,
        )}
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
      >
        <header
          className={cx(
            'flex items-start gap-4 border-b border-slate-100 px-5 py-5',
            headerClassName,
          )}
        >
          {icon && (
            <div className="shrink-0">
              {icon}
            </div>
          )}

          <div className="min-w-0 flex-1">
            {eyebrow && (
              <p
                className="
                  text-xs font-black
                  uppercase tracking-[0.14em]
                  text-slate-500
                "
              >
                {eyebrow}
              </p>
            )}

            <h2
              id={titleId}
              className="
                mt-1 text-lg font-black
                tracking-[-0.02em]
                text-slate-950
              "
            >
              {title}
            </h2>

            {description && (
              <p
                id={descriptionId}
                className="
                  mt-2 text-sm
                  leading-6 text-slate-600
                "
              >
                {description}
              </p>
            )}
          </div>

          {showCloseButton && (
            <button
              type="button"
              onClick={requestClose}
              disabled={preventClose}
              aria-label={closeLabel}
              className="
                inline-flex h-10 w-10
                shrink-0 items-center
                justify-center rounded-xl
                text-slate-500
                transition-colors duration-150
                hover:bg-slate-100
                hover:text-slate-800
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-blue-600
                focus-visible:ring-offset-2
                disabled:cursor-not-allowed
                disabled:opacity-50
                motion-reduce:transition-none
              "
            >
              <X
                size={18}
                aria-hidden="true"
              />
            </button>
          )}
        </header>

        {children && (
          <div
            className={cx(
              'min-h-0 overflow-y-auto px-5 py-5',
              bodyClassName,
            )}
          >
            {children}
          </div>
        )}

        {footer && (
          <footer
            className={cx(
              'flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:flex-row sm:justify-end',
              footerClassName,
            )}
          >
            {footer}
          </footer>
        )}
      </section>
    </div>,
    document.body,
  );
}
