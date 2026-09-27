const LEGACY_AVATAR_URL = /dicebear(?:\.com)?|avataaars|ui-avatars\.com|robohash\.org|multiavatar\.com|pravatar\.cc|adorable\.io|unavatar\.io|avatar[-_/ ]?generator/i;

export function studentInitials(name?: string | null): string {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length === 0) return '·';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function isRealStudentPhoto(value?: string | null): boolean {
  const src = value?.trim();
  if (!src || LEGACY_AVATAR_URL.test(src)) return false;

  try {
    const url = new URL(src, "https://portal.local/");
    return (url.protocol === "https:" || url.protocol === "http:") && !url.pathname.toLowerCase().endsWith(".svg");
  } catch {
    return false;
  }
}
