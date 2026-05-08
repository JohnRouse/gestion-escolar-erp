"use client";

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function Header() {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const solid = !isHome || scrolled;
  const intranetUrl = process.env.NEXT_PUBLIC_INTRANET_URL || '#';

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        solid
          ? 'bg-white/95 backdrop-blur-md shadow-md border-b border-border'
          : 'bg-transparent'
      }`}
    >
      <div className="container-main flex items-center justify-between py-3">
        {/* Nombre del colegio - alineado a la izquierda */}
        <Link href="/" className={`transition-colors ${solid ? 'text-text' : 'text-white'}`}>
          <p className="text-xl font-bold leading-tight font-serif">Santa María Victoria</p>
          <p className="text-xs opacity-70">Excelencia educativa</p>
        </Link>

        {/* Navegación + Botones - alineados a la derecha */}
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex items-center gap-6">
            {[
              { href: '/', label: 'Inicio' },
              { href: '/sobre-nosotros', label: 'Sobre Nosotros' },
              { href: '/niveles', label: 'Niveles' },
              { href: '/admision', label: 'Admisión' },
              { href: '/contacto', label: 'Contacto' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-colors ${
                  solid ? 'text-text-muted hover:text-primary' : 'text-white/80 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href={intranetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`btn px-5 py-2.5 text-sm font-semibold rounded-full transition-all duration-300 ${
                solid
                  ? 'bg-slate-100 text-text hover:bg-slate-200'
                  : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
              }`}
            >
              Intranet
            </Link>
            <Link
              href="/admision"
              className={`btn btn-accent px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                !solid && 'ring-2 ring-white/30'
              }`}
            >
              Admisión 2026
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}