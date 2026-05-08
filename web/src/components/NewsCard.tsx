import Link from 'next/link';

interface NewsCardProps {
  id: number;
  title: string;
  excerpt: string;
  date: string;
  image?: string;
}

export default function NewsCard({ id, title, excerpt, date }: NewsCardProps) {
  return (
    <Link href={`/noticias/${id}`} className="group">
      <div className="card overflow-hidden h-full flex flex-col hover:scale-[1.02] transition-transform duration-300">
        <div className="h-48 bg-secondary-light flex items-center justify-center text-4xl text-text-muted">
          📰
        </div>
        <div className="p-5 flex-1 flex flex-col">
          <span className="text-xs text-text-muted mb-2">{date}</span>
          <h3 className="card-title text-lg group-hover:text-primary transition-colors mb-2 line-clamp-2">{title}</h3>
          <p className="card-text text-sm line-clamp-3 flex-1">{excerpt}</p>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-primary mt-4 group-hover:gap-2 transition-all">
            Leer más <span>→</span>
          </span>
        </div>
      </div>
    </Link>
  );
}