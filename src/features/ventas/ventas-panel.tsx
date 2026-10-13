"use client";

import { useState, type FormEvent } from "react";
import { RefreshCw, ShoppingCart } from "lucide-react";
import { ventasApi } from "./ventas.api";
import type { Cliente, Producto, Venta } from "@/types/business";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable, EmptyState, ModuleHeader } from "@/components/module-ui";

const currency = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

export function VentasPanel({
  clientes,
  productos,
  onCatalogChanged,
}: {
  clientes: Cliente[];
  productos: Producto[];
  onCatalogChanged: () => Promise<void>;
}) {
  const [clienteId, setClienteId] = useState("");
  const [productoId, setProductoId] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [ventaId, setVentaId] = useState("");
  const [venta, setVenta] = useState<Venta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function createSale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setIsLoading(true); setError(null);
    try {
      const created = await ventasApi.create(clienteId);
      setVentaId(created.id); setVenta({ ...created, detalles: [], total: 0 });
      setNotice("Venta creada. Agrega productos.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo crear la venta."); }
    finally { setIsLoading(false); }
  }

  async function addProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!venta) return; setIsLoading(true); setError(null);
    try {
      await ventasApi.addProduct(venta.id, productoId, Number(cantidad));
      await loadSale(venta.id);
      await onCatalogChanged();
      setNotice("Producto agregado a la venta.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo agregar el producto."); }
    finally { setIsLoading(false); }
  }

  async function loadSale(id = ventaId) {
    if (!id) return;
    setIsLoading(true); setError(null);
    try { setVenta(await ventasApi.getComplete(id)); setVentaId(id); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo consultar la venta."); }
    finally { setIsLoading(false); }
  }

  return (
    <>
      <ModuleHeader title="Ventas" description="Crea ventas, agrega productos y consulta el total." />
      {notice && <p className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}
      {error && <p className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <div className="grid gap-5 xl:grid-cols-2">
        <Card><CardHeader><CardTitle>1. Crear venta</CardTitle><CardDescription>Selecciona el cliente.</CardDescription></CardHeader><CardContent><form className="space-y-4" onSubmit={createSale}><SelectField label="Cliente" value={clienteId} onChange={setClienteId} options={clientes.map((item) => ({ value: item.id, label: `${item.nombre} · ${item.correo}` }))} required /><Button disabled={isLoading || !clienteId} type="submit">Crear venta</Button></form></CardContent></Card>
        <Card><CardHeader><CardTitle>2. Agregar productos</CardTitle><CardDescription>{venta ? `Venta ${venta.id.slice(0, 8)}…` : "Primero crea una venta."}</CardDescription></CardHeader><CardContent><form className="space-y-4" onSubmit={addProduct}><SelectField label="Producto" value={productoId} onChange={setProductoId} options={productos.filter((item) => item.existencia > 0).map((item) => ({ value: item.id, label: `${item.nombre} · ${currency.format(Number(item.precio))} · ${item.existencia} disponibles` }))} required /><Field label="Cantidad" type="number" min="1" value={cantidad} onChange={setCantidad} required /><Button disabled={isLoading || !venta || !productoId} type="submit"><ShoppingCart /> Agregar producto</Button></form></CardContent></Card>
      </div>
      <Card className="mt-5"><CardHeader className="flex-row items-center justify-between"><div><CardTitle>3. Venta completa</CardTitle><CardDescription>Consulta la venta con su cliente, detalle y total.</CardDescription></div><Button disabled={isLoading || !ventaId} onClick={() => void loadSale()} variant="outline"><RefreshCw /> Actualizar</Button></CardHeader><CardContent className="space-y-5"><div className="flex gap-2"><Input placeholder="ID de la venta" value={ventaId} onChange={(event) => setVentaId(event.target.value)} /><Button disabled={isLoading || !ventaId} onClick={() => void loadSale()}>Consultar</Button></div>{venta ? <SaleDetails venta={venta} /> : <EmptyState>Crea una venta o consulta una existente.</EmptyState>}</CardContent></Card>
    </>
  );
}

function SaleDetails({ venta }: { venta: Venta }) {
  return <div className="space-y-5"><div className="grid gap-4 rounded-lg bg-slate-50 p-4 sm:grid-cols-3"><div><p className="text-xs text-muted-foreground">Cliente</p><p className="font-medium">{venta.cliente?.nombre ?? venta.cliente_id}</p><p className="text-xs text-muted-foreground">{venta.cliente?.correo}</p></div><div><p className="text-xs text-muted-foreground">Fecha</p><p className="font-medium">{new Date(venta.fecha).toLocaleString("es-MX")}</p></div><div><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-semibold text-indigo-600">{currency.format(Number(venta.total))}</p></div></div><DataTable headers={["Producto", "Cantidad", "Precio", "Importe"]}>{venta.detalles.map((detalle) => <tr className="border-b last:border-0" key={detalle.id}><td className="px-5 py-3 font-medium">{detalle.producto?.nombre ?? detalle.producto_id}</td><td className="px-5 py-3">{detalle.cantidad}</td><td className="px-5 py-3">{currency.format(Number(detalle.precio))}</td><td className="px-5 py-3">{currency.format(Number(detalle.precio) * detalle.cantidad)}</td></tr>)}</DataTable></div>;
}

function SelectField({ label, value, onChange, options, required }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }>; required?: boolean }) {
  return <div className="space-y-2"><Label>{label}</Label><select className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm" required={required} value={value} onChange={(event) => onChange(event.target.value)}><option value="">Selecciona una opción</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>;
}

function Field({ label, value, onChange, type, min, required }: { label: string; value: string; onChange: (value: string) => void; type: string; min?: string; required?: boolean }) {
  return <div className="space-y-2"><Label>{label}</Label><Input min={min} required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}
