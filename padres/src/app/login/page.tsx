"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"splash" | "form">("splash");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [splashProgress, setSplashProgress] = useState(0);

  // Animación del birrete
  useEffect(() => {
    if (step !== "splash") return;
    const interval = setInterval(() => {
      setSplashProgress((prev) => {
        const next = prev + 4;
        if (next >= 100) {
          clearInterval(interval);
          setTimeout(() => setStep("form"), 350);
          return 100;
        }
        return next;
      });
    }, 60);
    return () => clearInterval(interval);
  }, [step]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await axios.post("/api/auth/login", { username, password });
      const { access_token, user } = res.data;
      localStorage.setItem("token", access_token);
      localStorage.setItem("user", JSON.stringify(user));
      window.location.href = "/dashboard";
    } catch (err: any) {
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data.message || "Credenciales inválidas");
      } else {
        setError("Error de conexión");
      }
    } finally {
      setLoading(false);
    }
  };

  // Splash screen (birrete llenándose)
  if (step === "splash") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-8 bg-brand-redSoft relative overflow-hidden">
        {/* Decoración */}
        <div className="absolute right-[-30px] top-[-30px] w-44 h-44 rounded-full bg-white/70 blur-2xl" />
        <div className="absolute left-[-20px] bottom-[-30px] w-32 h-32 rounded-full bg-white/50 blur-2xl" />

        <div className="relative w-36 h-36 mb-6">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <defs>
              <clipPath id="capClip">
                <circle cx="158" cy="78" r="6" />
                <rect x="156" y="78" width="4" height="36" rx="2" />
                <path d="M40 110 Q100 90 160 110 L160 130 Q100 150 40 130 Z" />
                <polygon points="100,55 180,80 100,105 20,80" />
              </clipPath>
              <linearGradient id="fillGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#E8788A" />
                <stop offset="100%" stopColor="#F5D372" />
              </linearGradient>
            </defs>
            <g clipPath="url(#capClip)">
              <rect x="0" y="0" width="200" height="200" fill="#F4E1E5" />
              <rect x="0" y={200 - splashProgress * 2} width="200" height="200" fill="url(#fillGrad)" />
            </g>
            <g fill="none" stroke="#C95A6E" strokeWidth="2" strokeLinejoin="round" opacity=".35">
              <polygon points="100,55 180,80 100,105 20,80" />
              <path d="M40 110 Q100 90 160 110 L160 130 Q100 150 40 130 Z" />
              <line x1="158" y1="84" x2="158" y2="114" />
              <circle cx="158" cy="78" r="5" />
            </g>
          </svg>
        </div>

        <h1 className="text-2xl font-extrabold text-brand-ink tracking-tight">
          Colegio <span className="text-brand-redDeep">Santa María</span>
        </h1>
        <p className="text-brand-inkSoft text-sm mt-1">Portal para apoderados</p>

        <div className="mt-8 w-56 h-1.5 rounded-full bg-brand-redSoft overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-75"
            style={{
              width: `${splashProgress}%`,
              background: "linear-gradient(90deg, #E8788A, #F5D372)",
            }}
          />
        </div>
        <p className="mt-3 text-[11px] tracking-[.2em] font-bold text-brand-inkSoft">CARGANDO</p>
      </main>
    );
  }

  // Login form (centrado)
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-7 bg-brand-redSoft relative overflow-hidden">
      <div className="absolute right-[-30px] top-[-30px] w-44 h-44 rounded-full bg-white/70 blur-2xl" />
      <div className="absolute left-[-20px] bottom-[-30px] w-32 h-32 rounded-full bg-white/50 blur-2xl" />

      <div className="relative w-full max-w-sm flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-3xl bg-white border border-brand-line grid place-items-center shadow-md mb-5">
          <span className="material-symbols-rounded text-brand-redDeep" style={{ fontSize: 40 }}>
            school
          </span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-brand-ink">
          Colegio <span className="text-brand-redDeep">Santa María</span>
        </h1>
        <p className="text-brand-inkSoft text-sm mt-1">Portal para apoderados</p>

        <div className="mt-8 w-full bg-white rounded-3xl border border-brand-line shadow-md p-6 text-left">
          <h2 className="text-xl font-extrabold text-brand-ink text-center">Inicia sesión</h2>

          <label className="block mt-5 text-[11px] tracking-[.18em] font-bold text-brand-inkSoft">
            CORREO O USUARIO
          </label>
          <div className="mt-2 relative">
            <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-brand-inkSoft text-xl">
              mail
            </span>
            <input
              type="text"
              placeholder="usuario@colegio.edu.pe"
              className="w-full bg-brand-paper border border-brand-line rounded-xl pl-10 pr-3 py-3.5 text-sm text-brand-ink placeholder:text-brand-inkSoft/60 focus:border-brand-red transition"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <label className="block mt-4 text-[11px] tracking-[.18em] font-bold text-brand-inkSoft">
            CONTRASEÑA
          </label>
          <div className="mt-2 relative">
            <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-brand-inkSoft text-xl">
              lock
            </span>
            <input
              type={showPw ? "text" : "password"}
              className="w-full bg-brand-paper border border-brand-line rounded-xl pl-10 pr-10 py-3.5 text-sm text-brand-ink focus:border-brand-red transition"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full text-brand-inkSoft hover:bg-brand-paper grid place-items-center"
            >
              <span className="material-symbols-rounded text-xl">
                {showPw ? "visibility_off" : "visibility"}
              </span>
            </button>
          </div>

          <div className="text-center mt-3">
            <button className="text-sm font-semibold text-brand-redDeep hover:underline">
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          {error && (
            <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="press mt-4 w-full py-4 rounded-2xl text-white font-bold text-[15px] shadow-md relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #E8788A 0%, #F0A6B0 100%)",
            }}
          >
            <span className="relative z-10">{loading ? "Ingresando..." : "Ingresar"}</span>
          </button>

          <p className="text-center text-sm text-brand-inkSoft mt-4">
            ¿Primera vez?{" "}
            <button className="font-semibold text-brand-redDeep">Solicitar acceso</button>
          </p>
        </div>

        <p className="text-center text-[11px] text-brand-inkSoft mt-6">
          © 2026 Colegio Santa María
        </p>
      </div>
    </main>
  );
}