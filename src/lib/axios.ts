import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { clearAccessToken, getAccessToken } from "./auth";

const baseURL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

if (!baseURL) {
  throw new Error("La variable de entorno NEXT_PUBLIC_API_URL no está definida.");
}

/**
 * Instancia estándar de Axios para comunicarse con la API de NestJS.
 */
export const apiClient = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

/**
 * Interceptor de Peticiones:
 * Inyecta automáticamente el token Bearer si existe en memoria, localStorage o cookies.
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

/**
 * Interceptor de Respuestas:
 * Centraliza el formateo de errores de NestJS y gestiona la expiración de sesión (401).
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string | string[]; error?: string; statusCode?: number }>) => {
    if (error.response) {
      const { status, data } = error.response;
      const url = error.config?.url ?? "";

      // Si el token es inválido o expiró (401) y no es la ruta de login, limpiar sesión
      if (status === 401 && !url.includes("/v1/auth/login")) {
        clearAccessToken();
        if (typeof window !== "undefined" && window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }

      // Extraer mensaje amigable de la respuesta de NestJS
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
