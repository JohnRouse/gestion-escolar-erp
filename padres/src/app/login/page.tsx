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
    <main className="min-h-screen flex flex-col" style={{ background: "linear-gradient(160deg, #0A0F2E 0%, #1A2766 50%, #2336A8 100%)" }}>
      {/* Top decoration */}
      <div className="flex-1 flex flex-col justify-end px-6 pb-8 pt-16 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-[-60px] right-[-40px] w-56 h-56 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #7C5CFC, transparent)" }} />
        <div className="absolute top-[80px] left-[-60px] w-40 h-40 rounded-full opacity-8" style={{ background: "radial-gradient(circle, #6179E8, transparent)" }} />

        {/* Logo area */}
        <div className="mb-10 relative z-10">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
            style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.18)" }}
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 24L16 6l12 18H4z" fill="white" opacity="0.9"/>
              <path d="M10 24V16h12v8" fill="white" opacity="0.5"/>
              <rect x="13" y="16" width="6" height="8" fill="white" opacity="0.8"/>
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Colegio XYZ</h1>
          <p className="text-white/50 mt-1.5 text-sm font-medium">Portal para apoderados</p>
        </div>

        {/* Card */}
        <div
          className="relative z-10 rounded-3xl p-6"
          style={{ background: "rgba(255,255,255,0.97)", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}
        >
          <h2 className="text-xl font-bold text-gray-900 mb-6">Inicia sesión</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="username" className="label">Correo o usuario</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 8l10 6 10-6"/></svg>
                </span>
                <input
                  id="username"
                  type="text"
                  className="input pl-10"
                  placeholder="usuario@colegio.edu.pe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="label">Contraseña</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                </span>
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  className="input pl-10 pr-11"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex justify-end -mt-1">
              <a href="#" className="text-xs font-semibold" style={{ color: "#2336A8" }}>¿Olvidaste tu contraseña?</a>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3">
                <svg className="flex-shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full mt-1 py-3.5 text-base"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                  Ingresando...
                </span>
              ) : "Ingresar"}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              ¿Primera vez?{" "}
              <a href="#" className="font-semibold" style={{ color: "#2336A8" }}>Solicitar acceso</a>
            </p>
          </div>
        </div>

        <p className="text-center text-white/30 text-[11px] mt-6 relative z-10">
          © 2025 Colegio XYZ · Todos los derechos reservados
        </p>
      </div>
    </main>
  );
}
