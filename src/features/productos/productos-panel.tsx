"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { productosApi, type ProductoInput } from "./productos.api";
import type { Producto } from "@/types/business";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable, EmptyState, FormCard, ModuleHeader, RowActions } from "@/components/module-ui";

const currency = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

export function ProductosPanel({
  onChange,
  onNotify,
}: {
  onChange: (productos: Producto[]) => void;
  onNotify: (message: string) => void;
}) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [editing, setEditing] = useState<Producto | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState({ nombre: "", precio: "", existencia: "" });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function load() {
    setError(null); 
    try { setProductos(await productosApi.list()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudieron cargar los productos."); }
  }
  useEffect(() => { void Promise.resolve().then(load); }, []);
  useEffect(() => { onChange(productos); }, [productos, onChange]);

  function openForm(producto?: Producto) {
    setEditing(producto ?? null);
    setForm(producto ? { nombre: producto.nombre, precio: String(producto.precio), existencia: String(producto.existencia) } : { nombre: "", precio: "", existencia: "" });
    setIsFormOpen(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setIsSaving(true);
    const input: ProductoInput = { nombre: form.nombre, precio: Number(form.precio), existencia: Number(form.existencia) };
    try {
      const saved = editing ? await productosApi.update(editing.id, input) : await productosApi.create(input);
      setProductos((current) => editing ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved]);
      setIsFormOpen(false); onNotify(editing ? "Producto actualizado." : "Producto creado.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar el producto."); }
    finally { setIsSaving(false); }
  }

  async function remove(producto: Producto) {
    if (!window.confirm(`¿Eliminar ${producto.nombre}?`)) return;
    try { await productosApi.remove(producto.id); setProductos((current) => current.filter((item) => item.id !== producto.id)); onNotify("Producto eliminado."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo eliminar el producto."); }
  }

  return (
    <>
      <ModuleHeader title="Productos" description="Administra precios y existencias." action={<Button onClick={() => openForm()}><Plus /> Nuevo producto</Button>} />
      {error && <p className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {isFormOpen && <FormCard title={editing ? "Editar producto" : "Nuevo producto"}><form className="grid gap-4 sm:grid-cols-3" onSubmit={save}><Field label="Nombre" value={form.nombre} onChange={(nombre) => setForm({ ...form, nombre })} required /><Field label="Precio" type="number" min="0" step="0.01" value={form.precio} onChange={(precio) => setForm({ ...form, precio })} required /><Field label="Existencia" type="number" min="0" step="1" value={form.existencia} onChange={(existencia) => setForm({ ...form, existencia })} required /><div className="flex gap-2 sm:col-span-3"><Button disabled={isSaving} type="submit">{isSaving ? "Guardando..." : "Guardar"}</Button><Button onClick={() => setIsFormOpen(false)} type="button" variant="outline">Cancelar</Button></div></form></FormCard>}
      <Card><CardContent className="p-0"><DataTable headers={["Producto", "Precio", "Existencia", "Acciones"]}>{productos.map((producto) => <tr className="border-b last:border-0" key={producto.id}><td className="px-5 py-4 font-medium">{producto.nombre}</td><td className="px-5 py-4">{currency.format(Number(producto.precio))}</td><td className={`px-5 py-4 ${producto.existencia === 0 ? "font-semibold text-red-600" : ""}`}>{producto.existencia}</td><td className="px-5 py-4"><RowActions onDelete={() => void remove(producto)} onEdit={() => openForm(producto)} /></td></tr>)}</DataTable>{productos.length === 0 && <EmptyState>No hay productos registrados.</EmptyState>}</CardContent></Card>
    </>
  );
}

function Field({ label, value, onChange, type = "text", required, min, step }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; min?: string; step?: string }) {
  return <div className="space-y-2"><Label>{label}</Label><Input min={min} required={required} step={step} type={type} value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}
