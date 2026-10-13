import { apiFetch } from "@/lib/api";
import type { Producto } from "@/types/business";

export type ProductoInput = Pick<Producto, "nombre" | "precio" | "existencia">;

export const productosApi = {
  list: () => apiFetch<Producto[]>("/v1/productos"),
  create: (input: ProductoInput) =>
    apiFetch<Producto>("/v1/productos", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  update: (id: string, input: Partial<ProductoInput>) =>
    apiFetch<Producto>(`/v1/productos/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  remove: (id: string) =>
    apiFetch<{ mensaje: string }>(`/v1/productos/${id}`, { method: "DELETE" }),
};
