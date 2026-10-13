export type Cliente = {
  id: string;
  nombre: string;
  correo: string;
};

export type Producto = {
  id: string;
  nombre: string;
  precio: number;
  existencia: number;
};

export type DetalleVenta = {
  id: string;
  producto_id: string;
  cantidad: number;
  precio: number;
  producto?: Pick<Producto, "id" | "nombre"> | null;
};

export type Venta = {
  id: string;
  fecha: string;
  cliente_id: string;
  cliente?: Cliente | null;
  detalles: DetalleVenta[];
  total: number;
};
