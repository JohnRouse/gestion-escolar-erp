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
    <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="w-24 h-24 rounded-3xl bg-red-500 flex items-center justify-center shadow-2xl shadow-red-500/20 animate-bounce">
        <span className="text-3xl font-bold text-white">SMV</span>
      </div>
      <h1 className="mt-6 text-xl font-bold text-gray-900 tracking-tight">Santa María Victoria</h1>
      <div className="absolute bottom-12 w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
    </div>
  );
}