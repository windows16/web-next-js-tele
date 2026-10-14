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
 * Obtiene el token actual directamente desde las cookies (fuente de verdad).
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

          // Guardar cookie específica del token para que el interceptor de Axios la lea
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
        // La cookie nest_access_token es la fuente de verdad.
        // Leer primero desde la cookie; el estado de Zustand puede estar desactualizado.
        const currentToken = getAccessToken() || get().token;

        if (!currentToken) {
          set({ user: null, token: null, isLoading: false, isHydrated: true });
          return;
        }

        // Sincronizar el estado de Zustand si la cookie tiene un token más reciente
        if (get().token !== currentToken) {
          set({ token: currentToken });
        }

        set({ isLoading: true });
        try {
          // El interceptor de Axios inyecta el token desde la cookie automáticamente.
          // NO sobreescribir Authorization aquí: causaría enviar el token del estado (viejo).
          const response = await apiClient.get<AuthenticatedUser>("/v1/auth/me");
          set({ user: response.data, token: currentToken, isLoading: false, isHydrated: true });
        } catch {
          // Si el interceptor ya intentó el refresh y falló, clearAccessToken() ya fue llamado.
          // Si aún queda refresh token, el interceptor lo renueva y reintenta; no limpiar aquí.
          const refreshTokenAun = Cookies.get(REFRESH_TOKEN_COOKIE);
          if (!refreshTokenAun) {
            clearAccessToken();
            set({ user: null, token: null, isLoading: false, isHydrated: true });
          } else {
            // El interceptor puede haber renovado el token; actualizar estado
            const refreshedToken = getAccessToken();
            if (refreshedToken) {
              set({ token: refreshedToken, isLoading: false, isHydrated: true });
            } else {
              set({ isLoading: false, isHydrated: true });
            }
          }
        }
      },
    }),
    {
      name: AUTH_STORAGE_COOKIE,
      storage: createJSONStorage(() => cookieStorage),
      // Solo persistir token y user; isLoading e isHydrated son siempre efímeros
      partialize: (state) => ({
        token: state.token,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Siempre llamar checkAuth, que ya maneja ambos casos:
          //   • Sin token → setea isLoading:false + isHydrated:true sin hacer petición de red.
          //   • Con token → valida la sesión contra /v1/auth/me.
          // NO llamar solo setHydrated(true) sin token: isLoading queda en true (su valor inicial)
          // y AuthGuard se queda atascado en "Verificando sesión..." para siempre.
          void state.checkAuth();
        }
      },
    },
  ),
);

// Alias de compatibilidad
export const useAuth = useAuthStore;
