"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { AppShell, type AppSection } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { clientesApi } from "@/features/clientes/clientes.api";
import { ClientesPanel } from "@/features/clientes/clientes-panel";
import { productosApi } from "@/features/productos/productos.api";
import { ProductosPanel } from "@/features/productos/productos-panel";
import { VentasPanel } from "@/features/ventas/ventas-panel";
import type { Cliente, Producto } from "@/types/business";

export default function Home() {
  const { user } = useAuth();
  const [section, setSection] = useState<AppSection>("dashboard");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    const [nextClientes, nextProductos] = await Promise.all([clientesApi.list(), productosApi.list()]);
    setClientes(nextClientes);
    setProductos(nextProductos);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadCatalog).catch(() => undefined);
  }, [loadCatalog]);

  return (
    <AppShell activeSection={section} onSectionChange={setSection}>
      {notice && <p className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}
      {section === "dashboard" && <Dashboard userEmail={user?.email} clientes={clientes} productos={productos} />}
      {section === "clientes" && <ClientesPanel onChange={setClientes} onNotify={setNotice} />}
      {section === "productos" && <ProductosPanel onChange={setProductos} onNotify={setNotice} />}
      {section === "ventas" && <VentasPanel clientes={clientes} productos={productos} onCatalogChanged={loadCatalog} />}
    </AppShell>
  );
}

function Dashboard({ userEmail, clientes, productos }: { userEmail?: string | null; clientes: Cliente[]; productos: Producto[] }) {
  const inventory = productos.reduce((total, producto) => total + producto.existencia, 0);
  return <div className="space-y-8"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">Panel de control</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Bienvenido{userEmail ? `, ${userEmail}` : ""}</h1><p className="mt-2 text-muted-foreground">Administra clientes, productos y ventas desde un solo lugar.</p></div><div className="grid gap-4 sm:grid-cols-3"><Metric title="Clientes" value={clientes.length} /><Metric title="Productos" value={productos.length} /><Metric title="Unidades en existencia" value={inventory} /></div><Card><CardHeader><CardTitle>Operación comercial</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Usa el menú lateral para administrar catálogos y registrar ventas.</CardContent></Card></div>;
}

function Metric({ title, value }: { title: string; value: number }) {
  return <Card><CardContent className="pt-6"><p className="text-3xl font-semibold">{value}</p><p className="mt-1 text-sm text-muted-foreground">{title}</p></CardContent></Card>;
}
