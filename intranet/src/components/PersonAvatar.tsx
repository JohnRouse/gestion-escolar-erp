type PersonaAvatar = {
  nombres?: string | null;
  apellido_paterno?: string | null;
  avatar_url?: string | null;
};

type PersonAvatarProps = {
  persona: PersonaAvatar;
  size?: 'sm' | 'md' | 'lg';
  rounded?: 'xl' | '2xl' | 'full';
  className?: string;
};

const avatarColors = [
  'bg-violet-100 text-violet-700',
  'bg-sky-100 text-sky-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-indigo-100 text-indigo-700',
  'bg-teal-100 text-teal-700',
  'bg-orange-100 text-orange-700',
];

const sizes = {
  sm: 'h-9 w-9 text-xs',
  md: 'h-10 w-10 text-xs',
  lg: 'h-12 w-12 text-sm',
};

const roundedClasses = {
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-full',
};

export const getPersonInitials = (persona: PersonaAvatar) => {
  const nombre = persona.nombres?.trim()?.[0] || '';
  const apellido = persona.apellido_paterno?.trim()?.[0] || '';
  const initials = `${nombre}${apellido}`.toUpperCase();

  if (initials) return initials;

  const fallback = String(persona.nombres || persona.apellido_paterno || '').trim();
  return fallback ? fallback.slice(0, 2).toUpperCase() : '—';
};

const getAvatarColor = (persona: PersonaAvatar) => {
  const seed = `${persona.nombres || ''}${persona.apellido_paterno || ''}`;
  const sum = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return avatarColors[sum % avatarColors.length];
};

export default function PersonAvatar({
  persona,
  size = 'md',
  rounded = '2xl',
  className = '',
}: PersonAvatarProps) {
  const baseClass = `${sizes[size]} ${roundedClasses[rounded]} shrink-0 overflow-hidden`;

  if (persona.avatar_url) {
    return (
      <img
        src={persona.avatar_url}
        alt={`${persona.nombres || ''} ${persona.apellido_paterno || ''}`.trim() || 'Avatar'}
        className={`${baseClass} object-cover ring-1 ring-slate-100 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${baseClass} flex items-center justify-center font-black ${getAvatarColor(
        persona,
      )} ${className}`}
    >
      {getPersonInitials(persona)}
    </div>
  );
}
