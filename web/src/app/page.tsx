"use client";

import Link from 'next/link';
import NewsCard from '@/components/NewsCard';
import EventCard from '@/components/EventCard';
import { noticias, eventos } from '@/lib/data';

export default function HomePage() {
  const ultimasNoticias = noticias.slice(0, 3);
  const proximosEventos = eventos.slice(0, 3);

  return (
    <>
      {/* Hero con gradiente institucional */}
      <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-red-700 via-red-600 to-amber-500">
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative z-10 text-center px-4 py-20">
          <p className="text-sm uppercase tracking-[0.3em] text-amber-200 font-semibold mb-4">Bienvenidos</p>
          <h1 className="font-serif text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Formando líderes <span className="text-amber-300">con propósito</span>
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto mb-8">
            Más de 20 años de excelencia educativa comprometidos con el desarrollo integral de cada estudiante.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/admision" className="btn bg-amber-400 hover:bg-amber-500 text-red-900 font-bold px-8 py-3 text-lg shadow-xl">
              Admisión 2026
            </Link>
            <Link href="/niveles" className="btn bg-white/10 text-white border border-white/30 hover:bg-white/20 px-8 py-3 text-lg">
              Conócenos
            </Link>
          </div>
        </div>
      </section>

      {/* Noticias recientes */}
      <section className="bg-surface-alt">
        <div className="container-main py-20">
          <div className="flex items-center justify-between mb-12">
            <h2 className="section-title">Noticias recientes</h2>
            <Link href="/noticias" className="text-sm font-semibold text-primary hover:underline">Ver todas →</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {ultimasNoticias.map((noticia) => (
              <NewsCard key={noticia.id} {...noticia} />
            ))}
          </div>
        </div>
      </section>

      {/* Próximos eventos */}
      <section className="container-main py-20">
        <h2 className="section-title">Próximos eventos</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {proximosEventos.map((evento, idx) => (
            <EventCard key={idx} {...evento} />
          ))}
        </div>
      </section>
    </>
  );
}