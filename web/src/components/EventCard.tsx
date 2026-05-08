interface EventCardProps {
  title: string;
  date: string;
  time?: string;
  location?: string;
}

export default function EventCard({ title, date, time, location }: EventCardProps) {
  const fecha = new Date(date);
  const dia = fecha.getDate();
  const mes = fecha.toLocaleDateString('es-PE', { month: 'short' }).toUpperCase();

  return (
    <div className="card flex items-center gap-4 p-4">
      <div className="w-14 h-14 rounded-xl bg-primary flex-shrink-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-secondary">{dia}</span>
        <span className="text-xs font-semibold text-secondary">{mes}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="card-title text-sm">{title}</p>
        {time && <p className="card-text text-xs mt-1">🕒 {time}</p>}
        {location && <p className="card-text text-xs">📍 {location}</p>}
      </div>
    </div>
  );
}