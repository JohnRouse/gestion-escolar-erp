import SectionTitle from '@/components/SectionTitle';
import NewsCard from '@/components/NewsCard';
import { noticias } from '@/lib/data';

export default function NoticiasPage() {
  return (
    <section className="container-main pt-24 pb-16">
      <SectionTitle>Noticias</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {noticias.map((noticia) => (
          <NewsCard key={noticia.id} {...noticia} />
        ))}
      </div>
    </section>
  );
}