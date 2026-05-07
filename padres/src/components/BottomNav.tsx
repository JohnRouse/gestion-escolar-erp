"use client";

import { usePathname, useRouter } from "next/navigation";

const navItems = [
  {
    label: "Inicio",
    path: "/dashboard",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.8} xmlns="http://www.w3.org/2000/svg">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" strokeLinejoin="round"/>
        <path d="M9 21V12h6v9" strokeLinecap="round" strokeLinejoin="round" fill="none" stroke="currentColor" strokeWidth="1.8"/>
      </svg>
    ),
  },
  {
    label: "Notas",
    path: "/dashboard/calificaciones",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" strokeLinecap="round"/>
        <rect x="9" y="3" width="6" height="4" rx="1" strokeLinecap="round"/>
        <path d="M9 12h6M9 16h4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: "Asistencia",
    path: "/dashboard/asistencia",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round"/>
        <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round"/>
        <path d="M8 14l2.5 2.5L16 13" strokeLinecap="round" strokeLinejoin="round" fill="none" stroke="currentColor" strokeWidth="1.8"/>
      </svg>
    ),
  },
  {
    label: "Pagos",
    path: "/dashboard/pagos",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="5" width="20" height="14" rx="2" strokeLinecap="round"/>
        <path d="M2 10h20" strokeLinecap="round"/>
        <circle cx="8" cy="15" r="1.5" fill="currentColor" stroke="none"/>
      </svg>
    ),
  },
  {
    label: "Avisos",
    path: "/dashboard/circulares",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    label: "Horario",
    path: "/dashboard/horario",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="9" strokeLinecap="round"/>
        <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-30 flex justify-around items-end px-2 pt-2 pb-4"
      style={{
        background: "rgba(255,255,255,0.96)",
        borderTop: "1px solid rgba(228,231,245,0.8)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      {navItems.map((item) => {
        const isActive = pathname === item.path;
        return (
          <button
            key={item.path}
            onClick={() => router.push(item.path)}
            className="flex flex-col items-center gap-0.5 transition-all duration-150 active:scale-90 min-w-0 flex-1"
            style={{
              color: isActive ? "#2336A8" : "#9499C0",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <span
              className="flex items-center justify-center w-9 h-7 rounded-full transition-all duration-150"
              style={{
                background: isActive ? "#E8EBFD" : "transparent",
              }}
            >
              {item.icon(isActive)}
            </span>
            <span
              className="text-[10px] font-semibold truncate"
              style={{ color: isActive ? "#2336A8" : "#9499C0" }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
