import apiClient from "@/lib/axios";
import type { Producto } from "@/types/business";

export type ProductoInput = Pick<Producto, "nombre" | "precio" | "existencia">;

export const productosApi = {
  list: async () => {
    const response = await apiClient.get<Producto[]>("/v1/productos");
    return response.data;
  },
  create: async (input: ProductoInput) => {
    const response = await apiClient.post<Producto>("/v1/productos", input);
    return response.data;
  },
  update: async (id: string, input: Partial<ProductoInput>) => {
    const response = await apiClient.patch<Producto>(`/v1/productos/${id}`, input);
    return response.data;
  },
  remove: async (id: string) => {
    const response = await apiClient.delete<{ mensaje: string }>(`/v1/productos/${id}`);
    return response.data;
  },
};
