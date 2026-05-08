import { noticias } from '@/lib/data';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function NoticiaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const noticia = noticias.find((n) => n.id === parseInt(id));

  if (!noticia) {
    notFound();
  }

  return (
    <section className="container-main pt-24 pb-16 max-w-3xl">
      <Link href="/noticias" className="text-sm text-primary font-medium hover:underline mb-4 inline-block">
        ← Volver a noticias
      </Link>
      <p className="text-sm text-text-muted mb-2">{noticia.date}</p>
      <h1 className="text-3xl md:text-4xl font-bold text-text mb-6">{noticia.title}</h1>
      <div className="prose prose-slate max-w-none">
        <p className="text-text-muted leading-relaxed text-lg">{noticia.content}</p>
        <p className="text-text-muted leading-relaxed mt-4">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
        </p>
      </div>
    </section>
  );
}