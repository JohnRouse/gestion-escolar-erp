"use client";

import { useState } from "react";
import { AlertCircle, Eye, EyeOff, LockKeyhole, School, UserRound } from "lucide-react";
import axios from "axios";
import { establishPortalSession, isValidPortalToken } from "@/lib/portalSession";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await axios.post("/api/auth/portal/login", { username, password });
      const { access_token, user } = res.data;
      if (!isValidPortalToken(access_token)) throw new Error("La sesión recibida no pertenece al Portal de familias.");
      establishPortalSession(localStorage, access_token, user);
      window.location.href = "/dashboard";
    } catch (requestError: unknown) {
      if (axios.isAxiosError(requestError) && requestError.response) {
        setError(requestError.response.data.message || "Credenciales inválidas");
      } else {
        setError("No pudimos conectarnos. Intenta nuevamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-alt px-5 py-8 sm:px-8">
      <div className="w-full max-w-[400px] animate-fade-in">
        <div className="portal-login-panel">
        <header className="portal-brand portal-login-brand">
          <span className="portal-login-mark" aria-hidden="true">
            <School size={26} strokeWidth={2} />
          </span>
          <p className="portal-brand-caption mt-4 text-xs font-semibold tracking-wide">Gestión Escolar ERP</p>
          <h1 className="mt-1 text-2xl font-bold tracking-[-0.025em] text-white">Portal de familias</h1>
          <p className="portal-brand-caption mt-2 text-sm leading-6">Acompaña su día a día escolar.</p>
        </header>

        <form className="p-5 sm:p-6" onSubmit={handleSubmit}>
          <h2 className="mb-5 text-lg font-bold text-text">Bienvenido a tu portal</h2>
          <div>
            <label htmlFor="portal-username" className="mb-1.5 block text-sm font-medium text-text">Correo o usuario</label>
            <div className="relative">
              <UserRound size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden="true" />
              <input
                id="portal-username"
                type="text"
                placeholder="Ingresa tu usuario"
                autoComplete="username"
                required
                className="portal-field portal-field-leading"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="portal-password" className="mb-1.5 block text-sm font-medium text-text">Contraseña</label>
            <div className="relative">
              <LockKeyhole size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden="true" />
              <input
                id="portal-password"
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                required
                className="portal-field portal-field-leading portal-field-trailing"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button type="button" onClick={() => setShowPw((value) => !value)} aria-label={showPw ? "Ocultar contraseña" : "Mostrar contraseña"} className="absolute right-0 top-0 grid h-11 w-11 place-items-center rounded-lg text-text-muted hover:bg-surface-muted hover:text-text">
                {showPw ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>
          </div>

          {error ? (
            <div role="alert" aria-live="polite" className="mt-4 flex gap-2 rounded-lg border border-danger/20 bg-danger-soft p-3 text-sm text-danger">
              <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          ) : null}

          <button type="submit" disabled={loading} className="portal-button mt-5 w-full">
            {loading ? "Ingresando…" : "Ingresar"}
          </button>

          <p className="mt-4 text-center text-xs leading-5 text-text-muted">Las credenciales son entregadas por tu institución educativa.</p>
        </form>
        </div>

        <p className="mt-5 text-center text-xs text-text-muted">© {new Date().getFullYear()} Gestión Escolar ERP</p>
      </div>
    </main>
  );
}
