import apiClient from "@/lib/axios";
import type { Venta } from "@/types/business";

export const ventasApi = {
  create: async (clienteId: string) => {
    const response = await apiClient.post<Venta>("/v1/ventas/base", { clienteId });
    return response.data;
  },
  addProduct: async (ventaId: string, productoId: string, cantidad: number) => {
    const response = await apiClient.post<unknown>(`/v1/ventas/${ventaId}/productos`, {
      productoId,
      cantidad,
    });
    return response.data;
  },
  getComplete: async (ventaId: string) => {
    const response = await apiClient.get<Venta>(`/v1/ventas/${ventaId}/total`);
    return response.data;
  },
};
