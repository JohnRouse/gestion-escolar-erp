import SectionTitle from '@/components/SectionTitle';

export default function AdmisionPage() {
  return (
    <section className="container-main pt-24 pb-20">
      <SectionTitle>Admisión 2026</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Información */}
        <div>
          <h3 className="text-xl font-semibold text-text mb-4">Forma parte de nuestra comunidad</h3>
          <p className="text-text-muted leading-relaxed mb-6">
            En Santa María Victoria ofrecemos una educación de calidad en los niveles Inicial, Primaria y Secundaria. Nuestro proceso de admisión está abierto para el año lectivo 2026.
          </p>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="text-primary text-xl mt-1">📅</span>
              <div>
                <p className="font-semibold text-text">Cronograma</p>
                <p className="text-sm text-text-muted">Inscripciones: Marzo a Mayo 2026</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-primary text-xl mt-1">📍</span>
              <div>
                <p className="font-semibold text-text">Lugar</p>
                <p className="text-sm text-text-muted">Av. Principal 123, Santiago de Surco, Lima</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-primary text-xl mt-1">📞</span>
              <div>
                <p className="font-semibold text-text">Contacto</p>
                <p className="text-sm text-text-muted">(01) 555-0123 | admision@smv.edu.pe</p>
              </div>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-text mb-4">Solicita información</h3>
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">Nombre completo</label>
              <input type="text" className="w-full px-4 py-3 border border-border rounded-xl text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all" placeholder="Tu nombre" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Correo electrónico</label>
              <input type="email" className="w-full px-4 py-3 border border-border rounded-xl text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all" placeholder="correo@ejemplo.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Nivel de interés</label>
              <select className="w-full px-4 py-3 border border-border rounded-xl text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all bg-white">
                <option>Inicial</option>
                <option>Primaria</option>
                <option>Secundaria</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary w-full">
              Enviar solicitud
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}