interface ScreenHeaderProps {
  title: string;
}

export default function ScreenHeader({ title }: ScreenHeaderProps) {
  return (
    <header className="bg-primary pt-12 pb-5 px-5 relative overflow-hidden">
      <div className="absolute right-[-30px] top-[-30px] w-44 h-44 rounded-full bg-white/5 blur-2xl" />
      <div className="relative z-10 flex items-center justify-center">
        <h1 className="text-white font-bold text-base">{title}</h1>
      </div>
    </header>
  );
}