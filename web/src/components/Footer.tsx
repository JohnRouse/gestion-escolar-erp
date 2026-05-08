import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-primary-dark mt-auto">
      <div className="container-main py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <p className="text-white font-serif text-xl font-bold mb-2">Santa María Victoria</p>
          <p className="text-white/70 text-sm">Formando líderes con propósito desde hace más de 20 años.</p>
        </div>
        <div>
          <h3 className="text-white font-semibold mb-4">Enlaces rápidos</h3>
          <div className="flex flex-col gap-2 text-sm text-white/70">
            <Link href="/" className="hover:text-accent transition-colors">Inicio</Link>
            <Link href="/niveles" className="hover:text-accent transition-colors">Niveles</Link>
            <Link href="/noticias" className="hover:text-accent transition-colors">Noticias</Link>
            <Link href="/admision" className="hover:text-accent transition-colors">Admisión</Link>
          </div>
        </div>
        <div>
          <h3 className="text-white font-semibold mb-4">Contacto</h3>
          <div className="space-y-2 text-sm text-white/70">
            <p>Av. Principal 123, Lima</p>
            <p>(01) 555-0123</p>
            <p>info@smv.edu.pe</p>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-white/50">
        © 2026 Santa María Victoria. Todos los derechos reservados.
      </div>
    </footer>
  );
}