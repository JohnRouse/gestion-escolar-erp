export const PORTAL_STORAGE_KEYS = [
  "token",
  "user",
  "selectedChild",
  "avatar_url",
] as const;

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function decodeTokenPayload(token: string) {
  const segment = token.split(".")[1] || "";
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return JSON.parse(atob(padded)) as { canal?: string; exp?: number };
}

export function isValidPortalToken(token: string, now = Date.now()) {
  try {
    const payload = decodeTokenPayload(token);
    return (
      payload.canal === "portal-padres" &&
      (typeof payload.exp !== "number" || payload.exp * 1000 > now)
    );
  } catch {
    return false;
  }
}

export function clearPortalSession(storage: StorageLike = localStorage) {
  for (const key of PORTAL_STORAGE_KEYS) storage.removeItem(key);
}

export function establishPortalSession(
  storage: StorageLike,
  token: string,
  user: unknown,
) {
  clearPortalSession(storage);
  storage.setItem("token", token);
  storage.setItem("user", JSON.stringify(user));
}
