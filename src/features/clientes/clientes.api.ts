import apiClient from "@/lib/axios";
import type { Cliente } from "@/types/business";

export type ClienteInput = Pick<Cliente, "nombre" | "correo">;

export const clientesApi = {
  list: async () => {
    const response = await apiClient.get<Cliente[]>("/v1/clientes");
    return response.data;
  },
  create: async (input: ClienteInput) => {
    const response = await apiClient.post<Cliente>("/v1/clientes", input);
    return response.data;
  },
  update: async (id: string, input: Partial<ClienteInput>) => {
    const response = await apiClient.patch<Cliente>(`/v1/clientes/${id}`, input);
    return response.data;
  },
  remove: async (id: string) => {
    const response = await apiClient.delete<{ mensaje: string }>(`/v1/clientes/${id}`);
    return response.data;
  },
};
