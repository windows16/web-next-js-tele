import { apiFetch } from "@/lib/api";
import type { Cliente } from "@/types/business";

export type ClienteInput = Pick<Cliente, "nombre" | "correo">;

export const clientesApi = {
  list: () => apiFetch<Cliente[]>("/v1/clientes"),
  create: (input: ClienteInput) =>
    apiFetch<Cliente>("/v1/clientes", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  update: (id: string, input: Partial<ClienteInput>) =>
    apiFetch<Cliente>(`/v1/clientes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  remove: (id: string) =>
    apiFetch<{ mensaje: string }>(`/v1/clientes/${id}`, { method: "DELETE" }),
};
