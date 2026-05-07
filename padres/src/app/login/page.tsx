"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Estados para los modales
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await axios.post("/api/auth/login", { username, password });
      const { access_token, user } = response.data;
      localStorage.setItem("token", access_token);
      localStorage.setItem("user", JSON.stringify(user));
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data.message || "Credenciales inválidas");
      } else {
        setError("Error de conexión con el servidor");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo y nombre del colegio */}
        <div className="flex flex-col items-center mb-10">
          {/* Logo – reemplaza este div por tu imagen cuando la tengas */}
          <div className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center mb-4 shadow-lg shadow-red-500/20">
            <span className="text-2xl font-bold text-white">SMV</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 text-center">Santa María Victoria</h1>
          <p className="text-sm text-gray-500 mt-1">Portal para apoderados</p>
        </div>

        {/* Tarjeta de login */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">Inicia sesión</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="username" className="block text-xs font-medium text-gray-500 mb-1">Usuario o email</label>
              <input
                id="username"
                type="text"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100 transition-all"
                placeholder="usuario@smv.edu.pe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-gray-500 mb-1">Contraseña</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-xl text-sm outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100 transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-xs font-medium text-yellow-600 hover:text-yellow-700"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3">
                <span>⚠️</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              ¿Primera vez?{" "}
              <button
                type="button"
                onClick={() => setShowRequestModal(true)}
                className="font-medium text-yellow-600 hover:text-yellow-700"
              >
                Solicitar acceso
              </button>
            </p>
          </div>
        </div>

        <p className="text-center text-gray-400 text-xs mt-6">
          © 2025 Santa María Victoria · Todos los derechos reservados
        </p>
      </div>

      {/* Modal "Olvidé mi contraseña" */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Recuperar contraseña</h3>
            <p className="text-sm text-gray-500 mb-4">
              Por favor, contacta a la administración del colegio para restablecer tu contraseña.
            </p>
            <p className="text-xs text-gray-400 mb-4">
              📧 admin@smv.edu.pe<br />
              📞 (01) 555-0123
            </p>
            <button
              onClick={() => setShowForgotModal(false)}
              className="w-full py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-all"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Modal "Solicitar acceso" */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Solicitar acceso</h3>
            <p className="text-sm text-gray-500 mb-4">
              Para solicitar una cuenta de apoderado, por favor acércate a la oficina de administración del colegio o envía un correo a:
            </p>
            <p className="text-xs text-gray-400 mb-4">
              📧 registro@smv.edu.pe<br />
              📞 (01) 555-0123
            </p>
            <button
              onClick={() => setShowRequestModal(false)}
              className="w-full py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-all"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </main>
  );
}