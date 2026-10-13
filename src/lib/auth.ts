export const ACCESS_TOKEN_COOKIE = "nest_access_token";

let memoryAccessToken: string | null = null;

export type AuthenticatedUser = {
  id: string;
  email?: string | null;
  [key: string]: unknown;
};

export type LoginResponse = {
  access_token: string;
  expires_in: number;
  user: AuthenticatedUser;
};

export function getAccessToken() {
  if (memoryAccessToken) {
    return memoryAccessToken;
  }

  if (typeof window !== "undefined") {
    try {
      const local = window.localStorage.getItem(ACCESS_TOKEN_COOKIE);
      if (local) {
        memoryAccessToken = local;
        return local;
      }
    } catch {
      // Ignora si localStorage no está disponible
    }
  }

  if (typeof document === "undefined") {
    return null;
  }

  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${ACCESS_TOKEN_COOKIE}=`));

  const token = cookie
    ? decodeURIComponent(cookie.slice(ACCESS_TOKEN_COOKIE.length + 1))
    : null;

  if (token) {
    memoryAccessToken = token;
  }
  return token;
}

export function setAccessToken(token: string, expiresIn?: number) {
  memoryAccessToken = token;

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(ACCESS_TOKEN_COOKIE, token);
    } catch {
      // Ignora si localStorage no está disponible
    }
  }

  if (typeof document === "undefined") {
    return;
  }

  const maxAge = Number(expiresIn) > 0 ? Number(expiresIn) : 3600 * 24;
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "Secure"
      : "";
  document.cookie = [
    `${ACCESS_TOKEN_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    `Max-Age=${maxAge}`,
    "SameSite=Lax",
    secure,
  ]
    .filter(Boolean)
    .join("; ");
}

export function clearAccessToken() {
  memoryAccessToken = null;

  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(ACCESS_TOKEN_COOKIE);
    } catch {
      // Ignora si localStorage no está disponible
    }
  }

  if (typeof document !== "undefined") {
    document.cookie = `${ACCESS_TOKEN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  }
}
