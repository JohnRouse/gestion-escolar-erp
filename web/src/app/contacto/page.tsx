import SectionTitle from '@/components/SectionTitle';

export default function ContactoPage() {
  return (
    <section className="container-main pt-24 pb-20">
      <SectionTitle>Contacto</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {/* Información de contacto */}
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="text-xl font-bold text-text font-serif mb-4">Información de contacto</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">📍</span>
                <div>
                  <p className="font-semibold text-text">Dirección</p>
                  <p className="card-text text-sm">Av. Principal 123, Santiago de Surco, Lima</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">📞</span>
                <div>
                  <p className="font-semibold text-text">Teléfonos</p>
                  <p className="card-text text-sm">Central: (01) 555-0123</p>
                  <p className="card-text text-sm">Admisión: (01) 555-0124</p>
                  <p className="card-text text-sm">Administración: (01) 555-0125</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">✉️</span>
                <div>
                  <p className="font-semibold text-text">Correos electrónicos</p>
                  <p className="card-text text-sm">Información: info@smv.edu.pe</p>
                  <p className="card-text text-sm">Admisión: admision@smv.edu.pe</p>
                  <p className="card-text text-sm">Dirección: direccion@smv.edu.pe</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mapa */}
        <div className="card overflow-hidden h-80 md:h-full min-h-[300px]">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3901.0!2d-77.0!3d-12.0!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTLCsDAwJzAwLjAiUyA3N8KwMDAnMDAuMCJX!5e0!3m2!1ses!2spe!4v1234567890"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Ubicación del colegio"
            className="grayscale"
          />
        </div>
      </div>
    </section>
  );
}