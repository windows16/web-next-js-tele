"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { clientesApi, type ClienteInput } from "./clientes.api";
import type { Cliente } from "@/types/business";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable, EmptyState, FormCard, ModuleHeader, RowActions } from "@/components/module-ui";

export function ClientesPanel({
  onChange,
  onNotify,
}: {
  onChange: (clientes: Cliente[]) => void;
  onNotify: (message: string) => void;
}) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<ClienteInput>({ nombre: "", correo: "" });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function load() {
    setError(null);
    try {
      setClientes(await clientesApi.list());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron cargar los clientes.");
    }
  }

  useEffect(() => { void Promise.resolve().then(load); }, []);
  useEffect(() => { onChange(clientes); }, [clientes, onChange]);

  function openForm(cliente?: Cliente) {
    setEditing(cliente ?? null);
    setForm(cliente ? { nombre: cliente.nombre, correo: cliente.correo } : { nombre: "", correo: "" });
    setIsFormOpen(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    try {
      const saved = editing
        ? await clientesApi.update(editing.id, form)
        : await clientesApi.create(form);
      setClientes((current) => editing ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved]);
      setIsFormOpen(false);
      onNotify(editing ? "Cliente actualizado." : "Cliente creado.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar el cliente.");
    } finally {
      setIsSaving(false);
    }
  }

  async function remove(cliente: Cliente) {
    if (!window.confirm(`¿Eliminar a ${cliente.nombre}?`)) return;
    try {
      await clientesApi.remove(cliente.id);
      setClientes((current) => current.filter((item) => item.id !== cliente.id));
      onNotify("Cliente eliminado.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo eliminar el cliente.");
    }
  }

  return (
    <>
      <ModuleHeader title="Clientes" description="Administra los clientes de tu negocio." action={<Button onClick={() => openForm()}><Plus /> Nuevo cliente</Button>} />
      {error && <ErrorMessage message={error} />}
      {isFormOpen && (
        <FormCard title={editing ? "Editar cliente" : "Nuevo cliente"}>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={save}>
            <Field label="Nombre" value={form.nombre} onChange={(nombre) => setForm({ ...form, nombre })} required />
            <Field label="Correo" type="email" value={form.correo} onChange={(correo) => setForm({ ...form, correo })} required />
            <div className="flex gap-2 sm:col-span-2">
              <Button disabled={isSaving} type="submit">{isSaving ? "Guardando..." : "Guardar"}</Button>
              <Button onClick={() => setIsFormOpen(false)} type="button" variant="outline">Cancelar</Button>
            </div>
          </form>
        </FormCard>
      )}
      <Card><CardContent className="p-0">
        <DataTable headers={["Nombre", "Correo", "Acciones"]}>
          {clientes.map((cliente) => <tr className="border-b last:border-0" key={cliente.id}><td className="px-5 py-4 font-medium">{cliente.nombre}</td><td className="px-5 py-4 text-muted-foreground">{cliente.correo}</td><td className="px-5 py-4"><RowActions onDelete={() => void remove(cliente)} onEdit={() => openForm(cliente)} /></td></tr>)}
        </DataTable>
        {clientes.length === 0 && <EmptyState>No hay clientes registrados.</EmptyState>}
      </CardContent></Card>
    </>
  );
}

function Field({ label, value, onChange, type = "text", required }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return <div className="space-y-2"><Label>{label}</Label><Input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}

function ErrorMessage({ message }: { message: string }) {
  return <p className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p>;
}
