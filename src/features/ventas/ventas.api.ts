import { apiFetch } from "@/lib/api";
import type { Venta } from "@/types/business";

export const ventasApi = {
  create: (clienteId: string) =>
    apiFetch<Venta>("/v1/ventas/base", {
      method: "POST",
      body: JSON.stringify({ clienteId }),
    }),
  addProduct: (ventaId: string, productoId: string, cantidad: number) =>
    apiFetch<unknown>(`/v1/ventas/${ventaId}/productos`, {
      method: "POST",
      body: JSON.stringify({ productoId, cantidad }),
    }),
  getComplete: (ventaId: string) =>
    apiFetch<Venta>(`/v1/ventas/${ventaId}/total`),
};
