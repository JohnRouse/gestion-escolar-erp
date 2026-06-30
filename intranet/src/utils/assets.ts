export function assetUrl(value?: string | null) {
  const url = String(value || '').trim();

  if (!url || url === 'null' || url === 'undefined') return '';

  if (/^blob:/i.test(url)) return '';

  if (/^(https?:\/\/|data:image\/)/i.test(url)) return url;

  if (url.startsWith('/uploads/')) return `/api${url}`;

  if (url.startsWith('uploads/')) return `/api/${url}`;

  return url;
}

export function safePersistentAvatarUrl(value?: string | null) {
  const url = String(value || '').trim();

  if (!url || url === 'null' || url === 'undefined') return null;

  // Los blob: no deben quedar persistidos porque se rompen al recargar.
  if (/^blob:/i.test(url)) return null;

  return url;
}

export function initialsFromName(value?: string | null) {
  const clean = String(value || '').trim();

  if (!clean) return 'U';

  const parts = clean.split(/\s+/).filter(Boolean);

  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}
