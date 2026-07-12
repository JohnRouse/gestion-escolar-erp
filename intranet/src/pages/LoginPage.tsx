import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Eye,
  EyeOff,
  GraduationCap,
  Loader,
  LogIn,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const IMAGENES = [
  'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1200&q=85',
  'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&q=85',
  'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=1200&q=85',
  'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200&q=85',
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [imagenActual, setImagenActual] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const interval = window.setInterval(() => {
      setImagenActual((current) => (current + 1) % IMAGENES.length);
    }, 6000);

    return () => window.clearInterval(interval);
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (loginError: any) {
      setError(
        loginError.response?.data?.message ||
          'No se pudo iniciar sesión. Revisa tus credenciales.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="erp-login-page flex min-h-screen bg-white">
      <section className="erp-login-visual relative hidden overflow-hidden bg-slate-950 lg:flex lg:w-[60%]">
        {IMAGENES.map((image, index) => (
          <div
            key={image}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === imagenActual ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <img
              src={image}
              alt=""
              className="h-full w-full scale-105 object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/25" />
            <div className="absolute inset-0 bg-gradient-to-r from-blue-950/25 via-transparent to-transparent" />
          </div>
        ))}

        <div className="relative z-10 flex w-full flex-col justify-between p-12 pb-14 text-white xl:p-14">
          <div
            className={`flex items-center gap-3 transition-all duration-500 ${
              mounted
                ? 'translate-y-0 opacity-100'
                : '-translate-y-4 opacity-0'
            }`}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0F62FE] shadow-lg shadow-blue-950/20">
              <GraduationCap size={22} className="text-white" />
            </div>

            <div>
              <p className="text-sm font-semibold text-white">
                Santa María Victoria
              </p>
              <p className="text-xs text-white/70">
                Gestión educativa institucional
              </p>
            </div>
          </div>

          <div>
            <div
              className={`mb-8 transition-all delay-200 duration-700 ${
                mounted
                  ? 'translate-y-0 opacity-100'
                  : 'translate-y-6 opacity-0'
              }`}
            >
              <p className="mb-3 text-sm font-semibold text-blue-200">
                Plataforma de gestión escolar
              </p>

              <h1 className="erp-login-hero-title mb-5 text-5xl font-bold leading-[1.06] tracking-tight text-white xl:text-6xl">
                Santa María
                <br />
                <span className="erp-login-hero-accent text-[#78A9FF]">
                  Victoria
                </span>
              </h1>

              <p className="max-w-md text-base font-normal leading-7 text-white/85">
                Sistema integral para gestionar información académica,
                administrativa y financiera de manera segura.
              </p>
            </div>

            <div
              className={`mb-9 flex flex-wrap gap-3 transition-all delay-300 duration-700 ${
                mounted
                  ? 'translate-y-0 opacity-100'
                  : 'translate-y-6 opacity-0'
              }`}
            >
              <div className="flex items-center gap-2 rounded-lg border border-white/20 bg-black/25 px-4 py-2.5 backdrop-blur-sm">
                <ShieldCheck size={15} className="text-[#78A9FF]" />
                <span className="text-xs font-semibold text-white">
                  Acceso seguro
                </span>
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-white/20 bg-black/25 px-4 py-2.5 backdrop-blur-sm">
                <BookOpen size={15} className="text-[#78A9FF]" />
                <span className="text-xs font-semibold text-white">
                  Gestión académica
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              {IMAGENES.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setImagenActual(index)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    index === imagenActual
                      ? 'w-9 bg-[#78A9FF]'
                      : 'w-2.5 bg-white/35 hover:bg-white/60'
                  }`}
                  aria-label={`Mostrar imagen ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="erp-login-form-panel relative flex flex-1 items-center justify-center overflow-hidden bg-white px-6 py-12 lg:w-[40%]">
        <div className="pointer-events-none absolute -right-32 -top-32 h-72 w-72 rounded-full bg-blue-500/[0.06] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-72 w-72 rounded-full bg-sky-500/[0.05] blur-3xl" />

        <div className="erp-login-form-card relative z-10 w-full max-w-md">
          <div
            className={`mb-9 text-center transition-all delay-100 duration-700 ${
              mounted
                ? 'translate-y-0 opacity-100'
                : 'translate-y-6 opacity-0'
            }`}
          >
            <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
              <ShieldCheck size={14} />
              Acceso institucional
            </div>

            <h2 className="mb-2 text-3xl font-bold tracking-tight text-slate-950">
              Bienvenido
            </h2>

            <p className="text-sm font-normal leading-6 text-slate-600">
              Ingresa tus credenciales para acceder al sistema
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className={`space-y-5 transition-all delay-200 duration-700 ${
              mounted
                ? 'translate-y-0 opacity-100'
                : 'translate-y-6 opacity-0'
            }`}
          >
            <div className="space-y-2">
              <label
                htmlFor="login-username"
                className="block text-sm font-semibold text-slate-800"
              >
                Usuario
              </label>

              <input
                id="login-username"
                type="text"
                autoComplete="username"
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-500 hover:border-slate-400 focus:border-[#0F62FE] focus:ring-4 focus:ring-blue-100"
                placeholder="Ingresa tu usuario"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="login-password"
                className="block text-sm font-semibold text-slate-800"
              >
                Contraseña
              </label>

              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 pr-12 text-sm text-slate-950 outline-none transition placeholder:text-slate-500 hover:border-slate-400 focus:border-[#0F62FE] focus:ring-4 focus:ring-blue-100"
                  placeholder="Ingresa tu contraseña"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  disabled={loading}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                  disabled={loading}
                  aria-label={
                    showPassword
                      ? 'Ocultar contraseña'
                      : 'Mostrar contraseña'
                  }
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0F62FE] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#0043CE] focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
            >
              {loading ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  <span>Verificando...</span>
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  <span>Acceder al sistema</span>
                </>
              )}
            </button>
          </form>

          <div
            className={`mt-9 border-t border-slate-200 pt-7 transition-all delay-300 duration-700 ${
              mounted
                ? 'translate-y-0 opacity-100'
                : 'translate-y-6 opacity-0'
            }`}
          >
            <p className="text-center text-xs leading-5 text-slate-600">
              ¿Olvidaste tu contraseña?{' '}
              <a
                href="#"
                className="font-semibold text-blue-700 transition hover:text-blue-900"
              >
                Contacta al administrador
              </a>
            </p>

            <p className="mt-3 text-center text-xs text-slate-500">
              © 2026 Colegio Santa María Victoria
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
