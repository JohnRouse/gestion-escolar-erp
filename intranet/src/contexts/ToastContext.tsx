import {
  AlertCircle,
  CheckCircle2,
  Info,
  X,
} from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { type ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

type ToastInput = {
  type?: ToastType;
  title?: string;
  message: string;
  duration?: number;
};

type ToastItem = ToastInput & {
  id: number;
  type: ToastType;
  exiting?: boolean;
};

type ToastContextValue = {
  showToast: (toast: ToastInput) => void;
  dismissToast: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toneClass: Record<ToastType, string> = {
  success: 'border-emerald-100 bg-white text-emerald-700 shadow-emerald-900/10',
  error: 'border-rose-100 bg-white text-rose-700 shadow-rose-900/10',
  warning: 'border-amber-100 bg-white text-amber-700 shadow-amber-900/10',
  info: 'border-sky-100 bg-white text-sky-700 shadow-sky-900/10',
};

const iconClass: Record<ToastType, string> = {
  success: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  error: 'bg-rose-50 text-rose-600 ring-rose-100',
  warning: 'bg-amber-50 text-amber-600 ring-amber-100',
  info: 'bg-sky-50 text-sky-600 ring-sky-100',
};

function ToastIcon({ type }: { type: ToastType }) {
  const className = `flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ring-1 ${iconClass[type]}`;

  if (type === 'success') {
    return (
      <span className={className}>
        <CheckCircle2 size={18} />
      </span>
    );
  }

  if (type === 'error' || type === 'warning') {
    return (
      <span className={className}>
        <AlertCircle size={18} />
      </span>
    );
  }

  return (
    <span className={className}>
      <Info size={18} />
    </span>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const dismissToast = useCallback(
    (id: number) => {
      setToasts((current) =>
        current.map((toast) =>
          toast.id === id ? { ...toast, exiting: true } : toast,
        ),
      );

      window.setTimeout(() => removeToast(id), 180);
    },
    [removeToast],
  );

  const showToast = useCallback(
    (toast: ToastInput) => {
      const id = Date.now() + Math.random();
      const type = toast.type || 'info';
      const duration = toast.duration ?? 4200;

      setToasts((current) => [
        ...current,
        {
          ...toast,
          id,
          type,
          duration,
          exiting: false,
        },
      ]);

      if (duration > 0) {
        window.setTimeout(() => dismissToast(id), duration);
      }
    },
    [dismissToast],
  );

  const value = useMemo(
    () => ({
      showToast,
      dismissToast,
    }),
    [dismissToast, showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="fixed bottom-6 right-6 z-[9999] flex w-[calc(100vw-3rem)] max-w-sm flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-start gap-3 rounded-[22px] border p-4 shadow-2xl backdrop-blur-xl transition ${toast.exiting ? 'animate-toast-out' : 'animate-toast-in'} ${toneClass[toast.type]}`}
          >
            <ToastIcon type={toast.type} />

            <div className="min-w-0 flex-1">
              {toast.title && (
                <p className="text-sm font-black text-slate-900">
                  {toast.title}
                </p>
              )}
              <p className="mt-0.5 text-sm font-bold leading-5 text-slate-500">
                {toast.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-300 transition hover:bg-slate-50 hover:text-slate-500"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast debe usarse dentro de ToastProvider');
  }

  return context;
}
