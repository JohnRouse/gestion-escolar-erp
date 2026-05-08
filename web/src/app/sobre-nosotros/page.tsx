import SectionTitle from '@/components/SectionTitle';

export default function SobreNosotrosPage() {
  return (
    <section className="container-main pt-24 pb-20">
      <SectionTitle>Sobre Nosotros</SectionTitle>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        {/* Misión */}
        <div className="card p-6">
          <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center mb-4">
            <span className="text-2xl">🎯</span>
          </div>
          <h3 className="text-xl font-bold text-text font-serif mb-3">Misión</h3>
          <p className="card-text leading-relaxed">
            Brindar una educación integral de excelencia, basada en valores cristianos, que forme líderes comprometidos con la transformación positiva de la sociedad, desarrollando al máximo el potencial académico, artístico y deportivo de cada estudiante.
          </p>
        </div>

        {/* Visión */}
        <div className="card p-6">
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center mb-4">
            <span className="text-2xl">👁️</span>
          </div>
          <h3 className="text-xl font-bold text-text font-serif mb-3">Visión</h3>
          <p className="card-text leading-relaxed">
            Ser reconocidos como la institución educativa líder en la formación de ciudadanos íntegros, innovadores y con sólidos principios éticos, capaces de enfrentar los desafíos del mundo globalizado y contribuir al desarrollo sostenible del país.
          </p>
        </div>

        {/* Valores */}
        <div className="card p-6">
          <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center mb-4">
            <span className="text-2xl">❤️</span>
          </div>
          <h3 className="text-xl font-bold text-text font-serif mb-3">Valores</h3>
          <p className="card-text leading-relaxed">
            Respeto, responsabilidad, honestidad, solidaridad, perseverancia y fe. Estos valores fundamentales guían nuestra labor educativa y se reflejan en cada actividad y en la convivencia diaria de nuestra comunidad.
          </p>
        </div>
      </div>

      {/* Historia */}
      <div className="card p-8 mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-2xl">📖</span>
          </div>
          <h3 className="text-2xl font-bold text-text font-serif">Nuestra Historia</h3>
        </div>
        <div className="space-y-4 card-text leading-relaxed">
          <p>
            Santa María Victoria fue fundado en el año 2000 por un grupo de educadores comprometidos con la formación integral de la niñez y juventud. Desde nuestros inicios, nos propusimos crear un espacio donde la excelencia académica y los valores humanos caminaran de la mano.
          </p>
          <p>
            A lo largo de más de dos décadas, hemos crecido junto a nuestra comunidad, ampliando nuestras instalaciones y programas educativos para ofrecer una formación de calidad en los niveles Inicial, Primaria y Secundaria.
          </p>
          <p>
            Hoy, Santa María Victoria es un referente educativo reconocido por su enfoque innovador, su compromiso con la formación en valores y sus logros académicos. Nuestros egresados son jóvenes preparados para enfrentar con éxito los retos del mundo actual.
          </p>
          <p>
            Seguimos mirando al futuro con la misma pasión y dedicación que nos inspiró desde el primer día, convencidos de que la educación es la herramienta más poderosa para construir un mundo mejor.
          </p>
        </div>
      </div>
    </section>
  );
}