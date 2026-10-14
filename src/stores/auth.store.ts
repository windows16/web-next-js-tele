import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import Cookies from "js-cookie";
import apiClient from "@/lib/axios";

export const ACCESS_TOKEN_COOKIE = "nest_access_token";
export const REFRESH_TOKEN_COOKIE = "nest_refresh_token";
export const AUTH_STORAGE_COOKIE = "auth_session";

export type AuthenticatedUser = {
  id: string;
  email?: string | null;
  [key: string]: unknown;
};

export type LoginResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  user: AuthenticatedUser;
};

/**
 * Adaptador de almacenamiento estándar de Zustand que opera ÚNICAMENTE sobre Cookies (sin localStorage).
 */
export const cookieStorage: StateStorage = {
  getItem: (name: string): string | null => {
    return Cookies.get(name) ?? null;
  },
  setItem: (name: string, value: string): void => {
    Cookies.set(name, value, {
      expires: 7, // 7 días de persistencia en cookie
      path: "/",
      sameSite: "lax",
      secure: typeof window !== "undefined" && window.location.protocol === "https:",
    });
  },
  removeItem: (name: string): void => {
    Cookies.remove(name, { path: "/" });
  },
};

/**
 * Obtiene el token actual directamente desde las cookies.
 */
export function getAccessToken(): string | null {
  return Cookies.get(ACCESS_TOKEN_COOKIE) ?? null;
}

/**
 * Elimina las cookies de autenticación.
 */
export function clearAccessToken(): void {
  Cookies.remove(ACCESS_TOKEN_COOKIE, { path: "/" });
  Cookies.remove(REFRESH_TOKEN_COOKIE, { path: "/" });
  Cookies.remove(AUTH_STORAGE_COOKIE, { path: "/" });
}

export interface AuthState {
  user: AuthenticatedUser | null;
  token: string | null;
  isLoading: boolean;
  isHydrated: boolean;
  setHydrated: (isHydrated: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: true,
      isHydrated: false,
      setHydrated: (isHydrated) => set({ isHydrated }),

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await apiClient.post<LoginResponse>("/v1/auth/login", {
            email,
            password,
          });

          const { access_token, refresh_token, user } = response.data;

          // Guardar cookie específica del token para Axios
          Cookies.set(ACCESS_TOKEN_COOKIE, access_token, {
            expires: 7,
            path: "/",
            sameSite: "lax",
            secure: typeof window !== "undefined" && window.location.protocol === "https:",
          });

          if (refresh_token) {
            Cookies.set(REFRESH_TOKEN_COOKIE, refresh_token, {
              expires: 30,
              path: "/",
              sameSite: "lax",
              secure: typeof window !== "undefined" && window.location.protocol === "https:",
            });
          }

          set({ token: access_token, user, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await apiClient.post<{ mensaje: string }>("/v1/auth/logout");
        } catch {
          // Si el servidor falla o el token ya expiró, continuamos limpiando localmente
        } finally {
          clearAccessToken();
          set({ user: null, token: null, isLoading: false });
        }
      },

      checkAuth: async () => {
        const currentToken = get().token || getAccessToken();
        if (!currentToken) {
          set({ user: null, token: null, isLoading: false, isHydrated: true });
          return;
        }

        set({ isLoading: true });
        try {
          const response = await apiClient.get<AuthenticatedUser>("/v1/auth/me", {
            headers: {
              Authorization: `Bearer ${currentToken}`,
            },
          });
          set({ user: response.data, token: currentToken, isLoading: false, isHydrated: true });
        } catch {
          clearAccessToken();
          set({ user: null, token: null, isLoading: false, isHydrated: true });
        }
      },
    }),
    {
      name: AUTH_STORAGE_COOKIE,
      storage: createJSONStorage(() => cookieStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated(true);
          void state.checkAuth();
        }
      },
    },
  ),
);

// Alias de compatibilidad
export const useAuth = useAuthStore;
