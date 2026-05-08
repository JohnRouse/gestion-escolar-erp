import SectionTitle from '@/components/SectionTitle';

const niveles = [
  {
    nombre: 'Inicial',
    edad: '3 a 5 años',
    metodologia: 'Aprendizaje basado en el juego y la exploración sensorial. Desarrollo de habilidades socioemocionales a través de actividades lúdicas.',
    areas: ['Psicomotricidad', 'Comunicación', 'Matemática', 'Arte', 'Música', 'Inglés'],
    color: 'bg-red-500',
  },
  {
    nombre: 'Primaria',
    edad: '6 a 11 años',
    metodologia: 'Enfoque por competencias con énfasis en lectura crítica, razonamiento matemático y proyectos interdisciplinarios.',
    areas: ['Comunicación', 'Matemática', 'Ciencia y Tecnología', 'Personal Social', 'Inglés', 'Arte', 'Educación Física'],
    color: 'bg-amber-500',
  },
  {
    nombre: 'Secundaria',
    edad: '12 a 16 años',
    metodologia: 'Formación preuniversitaria con pensamiento crítico, investigación y tecnología. Preparación integral para la vida y la educación superior.',
    areas: ['Comunicación', 'Matemática', 'Ciencia y Tecnología', 'Ciencias Sociales', 'Inglés avanzado', 'Arte', 'Educación Física'],
    color: 'bg-primary-dark',
  },
];

export default function NivelesPage() {
  return (
    <section className="container-main pt-24 pb-20">
      <SectionTitle>Niveles Educativos</SectionTitle>
      <p className="text-text-muted text-lg mb-12 max-w-3xl">
        En Santa María Victoria ofrecemos una formación completa desde los primeros años hasta la adolescencia, con metodologías innovadoras y un enfoque integral que desarrolla las capacidades académicas, artísticas y deportivas de nuestros estudiantes.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {niveles.map((nivel) => (
          <div key={nivel.nombre} className="card overflow-hidden">
            <div className={`${nivel.color} h-2`} />
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-text font-serif">{nivel.nombre}</h3>
                <span className="text-xs font-medium text-text-muted bg-surface-alt px-3 py-1 rounded-full">{nivel.edad}</span>
              </div>

              <h4 className="text-sm font-semibold text-text mb-2">Metodología</h4>
              <p className="card-text text-sm leading-relaxed mb-4">{nivel.metodologia}</p>

              <h4 className="text-sm font-semibold text-text mb-2">Áreas de aprendizaje</h4>
              <div className="flex flex-wrap gap-1.5">
                {nivel.areas.map((area) => (
                  <span key={area} className="text-xs bg-surface-alt text-text-muted px-2.5 py-1 rounded-full border border-border">
                    {area}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}