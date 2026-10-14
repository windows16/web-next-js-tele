import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import Cookies from "js-cookie";

const baseURL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
export const ACCESS_TOKEN_COOKIE = "nest_access_token";
export const REFRESH_TOKEN_COOKIE = "nest_refresh_token";
export const AUTH_STORAGE_COOKIE = "auth_session";

if (!baseURL) {
  throw new Error("La variable de entorno NEXT_PUBLIC_API_URL no está definida.");
}

/**
 * Instancia estándar de Axios para comunicarse con la API de NestJS.
 */
export const apiClient = axios.create({
  baseURL,
  timeout: 15000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

/**
 * Interceptor de Peticiones:
 * Inyecta automáticamente el token Bearer leyéndolo exclusivamente de las Cookies.
 * La cookie nest_access_token es la fuente de verdad; el store de Zustand es secundario.
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 1. Leer desde la cookie directa (fuente principal)
    let token = Cookies.get(ACCESS_TOKEN_COOKIE);

    // 2. Fallback: extraer desde la cookie del store de Zustand
    if (!token) {
      try {
        const rawStore = Cookies.get(AUTH_STORAGE_COOKIE);
        if (rawStore) {
          const parsed = JSON.parse(rawStore) as { state?: { token?: string } };
          token = parsed?.state?.token ?? undefined;
        }
      } catch {
        // Ignorar error de parsing
      }
    }

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

function processQueue(error: Error | null, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

/**
 * Interceptor de Respuestas:
 * Centraliza errores y renueva automáticamente el token en caso de 401 si hay un refresh token.
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string | string[]; error?: string; statusCode?: number }>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response) {
      const { status, data } = error.response;
      const url = originalRequest?.url ?? "";
      const isAuthRoute = url.includes("/v1/auth/login") || url.includes("/v1/auth/refresh");

      // Si es 401 y no es login/refresh, intentar renovación silenciosa con refresh token
      if (status === 401 && !isAuthRoute && !originalRequest._retry) {
        const refreshToken = Cookies.get(REFRESH_TOKEN_COOKIE);

        if (refreshToken) {
          if (isRefreshing) {
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            })
              .then((token) => {
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                }
                return apiClient(originalRequest);
              })
              .catch((err) => Promise.reject(err));
          }

          originalRequest._retry = true;
          isRefreshing = true;

          try {
            // IMPORTANTE: usar apiClient (con withCredentials) en vez de axios bare,
            // para que las cookies sean enviadas correctamente al endpoint de refresh.
            const refreshResponse = await apiClient.post<{
              access_token: string;
              refresh_token?: string;
            }>("/v1/auth/refresh", { refreshToken });

            const newAccessToken = refreshResponse.data.access_token;
            const newRefreshToken = refreshResponse.data.refresh_token;

            Cookies.set(ACCESS_TOKEN_COOKIE, newAccessToken, {
              expires: 7,
              path: "/",
              sameSite: "lax",
              secure: typeof window !== "undefined" && window.location.protocol === "https:",
            });

            if (newRefreshToken) {
              Cookies.set(REFRESH_TOKEN_COOKIE, newRefreshToken, {
                expires: 30,
                path: "/",
                sameSite: "lax",
                secure: typeof window !== "undefined" && window.location.protocol === "https:",
              });
            }

            processQueue(null, newAccessToken);

            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            }
            return apiClient(originalRequest);
          } catch (refreshErr) {
            processQueue(refreshErr as Error, null);
            Cookies.remove(ACCESS_TOKEN_COOKIE, { path: "/" });
            Cookies.remove(REFRESH_TOKEN_COOKIE, { path: "/" });
            Cookies.remove(AUTH_STORAGE_COOKIE, { path: "/" });
            if (typeof window !== "undefined" && window.location.pathname !== "/login") {
              window.location.href = "/login";
            }
            return Promise.reject(refreshErr);
          } finally {
            isRefreshing = false;
          }
        } else {
          // No hay refresh token disponible → redirigir a login
          Cookies.remove(ACCESS_TOKEN_COOKIE, { path: "/" });
          Cookies.remove(AUTH_STORAGE_COOKIE, { path: "/" });
          if (typeof window !== "undefined" && window.location.pathname !== "/login") {
            window.location.href = "/login";
          }
        }
      }

      // Extraer mensaje amigable de NestJS
      let message = `Error en el servidor (${status})`;
      if (data?.message) {
        message = Array.isArray(data.message) ? data.message.join(", ") : data.message;
      } else if (data?.error) {
        message = data.error;
      }

      return Promise.reject(new Error(message));
    }

    if (error.request) {
      return Promise.reject(new Error("No se pudo conectar con el servidor. Verifica tu conexión."));
    }

    return Promise.reject(error);
  },
);

export default apiClient;
