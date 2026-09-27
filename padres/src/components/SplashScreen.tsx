"use client";
import { useEffect, useState } from "react";

export default function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(false), 2000);
    const removeTimer = setTimeout(() => setShouldRender(false), 2500);
    return () => {
      clearTimeout(timer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!shouldRender) return null;

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-accent/20 bg-accent-soft">
        <span className="text-xl font-semibold text-accent">GE</span>
      </div>
      <h1 className="mt-6 text-xl font-bold text-gray-900 tracking-tight">Gestión Escolar</h1>
      <div className="absolute bottom-12 h-1 w-20 overflow-hidden rounded-full bg-border"><div className="h-full w-2/3 bg-accent" /></div>
    </div>
  );
}
