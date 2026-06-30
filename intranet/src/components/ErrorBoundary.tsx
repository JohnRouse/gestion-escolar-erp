import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error capturado por ErrorBoundary:', error);
    console.error('Component stack:', info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const message =
      this.state.error?.message ||
      'Ocurrió un error inesperado al cargar la pantalla.';

    return (
      <main className="erp-error-boundary min-h-screen bg-slate-100 px-4 py-8 text-slate-950">
        <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl items-center justify-center">
          <div className="w-full overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600 ring-1 ring-red-100">
                  <AlertTriangle size={22} />
                </span>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-red-700">
                    Error de interfaz
                  </p>
                  <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                    No se pudo mostrar esta pantalla
                  </h1>
                </div>
              </div>
            </div>

            <div className="space-y-5 px-6 py-6">
              <p className="text-sm font-semibold leading-6 text-slate-700">
                La intranet encontró un error al renderizar un componente. Esto evita que toda
                la web quede en blanco y ayuda a identificar el problema más rápido.
              </p>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                  Mensaje técnico
                </p>
                <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-sm font-semibold text-slate-900">
                  {message}
                </pre>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={this.handleReload}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-sm bg-blue-600 px-5 text-sm font-black text-white transition-colors hover:bg-blue-700"
                >
                  <RefreshCcw size={17} />
                  Recargar página
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }
}
