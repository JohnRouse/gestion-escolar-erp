"use client";

import { useRouter } from "next/navigation";
import { useSelectedChild } from "@/contexts/SelectedChildContext";

interface ScreenHeaderProps {
  title: string;
}

export default function ScreenHeader({ title }: ScreenHeaderProps) {
  const router = useRouter();
  const { selectedChild } = useSelectedChild();

  const nombreEstudiante = selectedChild?.nombre?.split(" ")[0] || "";
  const generoEstudiante = nombreEstudiante.endsWith("a") ? "female" : "male";

  const avatarUrl = selectedChild
    ? `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(
        selectedChild.nombre
      )}&gender=${generoEstudiante}&backgroundColor=b6e3f4,c0aede,d1d4f9&radius=50`
    : "";

  return (
    <header className="bg-primary pt-12 pb-5 px-5 relative overflow-hidden">
      <div className="absolute right-[-30px] top-[-30px] w-44 h-44 rounded-full bg-white/5 blur-2xl" />
      <div className="relative z-10 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors font-semibold text-sm"
        >
          <span className="material-symbols-rounded">arrow_back</span>
          Volver
        </button>
        <h1 className="text-white font-bold text-base">{title}</h1>
        {selectedChild && (
          <img
            src={avatarUrl}
            alt={selectedChild.nombre}
            className="w-9 h-9 rounded-full border-2 border-white/20"
          />
        )}
      </div>
    </header>
  );
}