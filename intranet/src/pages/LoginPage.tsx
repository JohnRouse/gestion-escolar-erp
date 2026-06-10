import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, Loader, ShieldCheck, GraduationCap, BookOpen } from 'lucide-react';

const IMAGENES = [
  'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&q=80',
  'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80',
  'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800&q=80',
  'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&q=80',
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
    const interval = setInterval(() => {
      setImagenActual((prev) => (prev + 1) % IMAGENES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Panel izquierdo: Carrusel institucional (65%) ── */}
      <div className="hidden lg:flex lg:w-[65%] relative overflow-hidden bg-neutral-900">
        {/* Imágenes con crossfade */}
        {IMAGENES.map((img, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === imagenActual ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <img
              src={img}
              alt=""
              className="w-full h-full object-cover scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
          </div>
        ))}

        {/* Textura noise sutil */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none z-[1]"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
          }}
        />

        {/* Contenido superpuesto */}
        <div className="relative z-10 flex flex-col justify-between p-12 pb-16 text-white w-full">
          {/* Top bar con logo */}
          <div
            className={`flex items-center gap-3 transition-all duration-500 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-[#CCF32F] flex items-center justify-center shadow-lg">
              <GraduationCap size={20} className="text-black" />
            </div>
            <span className="text-lg font-medium tracking-tight">SMV</span>
          </div>

          {/* Bottom content */}
          <div>
            <div
              className={`mb-8 transition-all duration-700 delay-200 ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}
            >
              <h1 className="text-5xl font-semibold tracking-tight mb-4 leading-[1.1]">
                Santa María<br />
                <span className="text-[#CCF32F]">Victoria</span>
              </h1>
              <p className="text-base text-white/60 max-w-md leading-relaxed font-light">
                Sistema integral de gestión educativa para personal autorizado del colegio.
              </p>
            </div>

            {/* Feature pills */}
            <div
              className={`flex flex-wrap gap-3 mb-10 transition-all duration-700 delay-300 ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}
            >
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10">
                <ShieldCheck size={14} className="text-[#CCF32F]" />
                <span className="text-xs font-medium text-white/80">Acceso seguro</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10">
                <BookOpen size={14} className="text-[#CCF32F]" />
                <span className="text-xs font-medium text-white/80">Gestión académica</span>
              </div>
            </div>

            {/* Carousel indicators */}
            <div className="flex gap-2">
              {IMAGENES.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setImagenActual(index)}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    index === imagenActual
                      ? 'bg-[#CCF32F] w-8'
                      : 'bg-white/30 w-2 hover:bg-white/50'
                  }`}
                  aria-label={`Ir a imagen ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Panel derecho: Formulario de login (35%) ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-white lg:w-[35%] relative overflow-hidden">
        {/* Decorative blurred accents */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#CCF32F] rounded-full -mr-40 -mt-40 opacity-[0.07] blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-[#CCF32F] rounded-full -ml-30 -mb-30 opacity-[0.05] blur-3xl pointer-events-none" />

        <div className="w-full max-w-sm relative z-10">
          {/* Mobile-only logo */}
          <div
            className={`lg:hidden flex items-center justify-center gap-3 mb-10 transition-all duration-500 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-[#CCF32F] flex items-center justify-center shadow-lg">
              <GraduationCap size={20} className="text-black" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-neutral-900">
              Santa María Victoria
            </span>
          </div>

          {/* Header */}
          <div
            className={`text-center mb-10 transition-all duration-700 delay-100 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            <h2 className="text-3xl font-semibold text-neutral-900 tracking-tight mb-2">
              Bienvenido
            </h2>
            <p className="text-sm text-neutral-500 font-light">
              Ingresa tus credenciales para acceder al sistema
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className={`space-y-5 transition-all duration-700 delay-200 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            {/* Username */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-neutral-700">
                Usuario
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm text-neutral-900 placeholder-neutral-400 transition-all duration-150 focus:border-[#CCF32F] focus:ring-2 focus:ring-[#CCF32F]/20 focus:outline-none hover:border-neutral-300"
                placeholder="usuario@smv.edu.pe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-neutral-700">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full px-4 py-3 pr-12 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm text-neutral-900 placeholder-neutral-400 transition-all duration-150 focus:border-[#CCF32F] focus:ring-2 focus:ring-[#CCF32F]/20 focus:outline-none hover:border-neutral-300"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors duration-150"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-red-50 border border-red-200/60 text-red-600 text-sm rounded-2xl px-4 py-3 flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#CCF32F] hover:bg-[#BCE325] disabled:bg-neutral-300 disabled:text-neutral-500 text-black text-sm font-medium rounded-2xl transition-all duration-150 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:shadow-none disabled:scale-100"
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

          {/* Footer */}
          <div
            className={`mt-10 pt-8 border-t border-neutral-100 transition-all duration-700 delay-300 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            <p className="text-center text-xs text-neutral-500">
              ¿Olvidaste tu contraseña?{' '}
              <a
                href="#"
                className="text-neutral-900 hover:text-[#CCF32F] font-medium transition-colors duration-150"
              >
                Contacta al administrador
              </a>
            </p>
            <p className="text-center text-xs text-neutral-400 mt-3">
              © 2024 Colegio Santa María Victoria
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}