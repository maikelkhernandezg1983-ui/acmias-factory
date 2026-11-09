import { formatoPrecio } from '@/lib/utiles';
import type { DemoConfig } from '@/lib/tipos';
import type { EstadoTienda, LineaPedido, MedioPago, Movimiento, Origen, PedidoTienda, Producto, Variante } from './tipos';

const DIA = 86_400_000;

export const detalleVariante = (v: Variante) => [v.talle && `Talle ${v.talle}`, v.color].filter(Boolean).join(' · ') || 'Único';
export const stockTotal = (p: Producto) => p.variantes.reduce((s, v) => s + v.stock, 0);
export const tieneVariantes = (p: Producto) => p.variantes.length > 1;

export function buscarProductos(productos: Producto[], q: string) {
  const t = q.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (!t) return productos;
  const codigo = t.replace(/\D/g, '');
  return productos.filter((p) => {
    const texto = `${p.nombre} ${p.categoria}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    return t.split(/\s+/).every((w) => texto.includes(w)) || (codigo.length >= 4 && p.variantes.some((v) => v.codigoBarras.includes(codigo)));
  });
}

export function porCodigo(productos: Producto[], codigo: string) {
  const c = codigo.replace(/\D/g, '');
  for (const p of productos) for (const v of p.variantes) if (v.codigoBarras === c) return { producto: p, variante: v };
  return null;
}

const ventas = (movs: Movimiento[]) => movs.filter((m) => m.cantidad < 0 && (m.origen === 'mostrador' || m.origen === 'whatsapp'));

export function resumenVentas(movs: Movimiento[], desde: number, hasta: number) {
  const ms = ventas(movs).filter((m) => {
    const t = new Date(m.fecha).getTime();
    return t >= desde && t < hasta;
  });
  return { unidades: ms.reduce((s, m) => s - m.cantidad, 0), total: ms.reduce((s, m) => s - m.cantidad * (m.precio ?? 0), 0), tickets: new Set(ms.map((m) => m.ventaId ?? m.id)).size };
}

export function inicioDelDia(ahora = Date.now()) {
  const d = new Date(ahora);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function topProductos(productos: Producto[], movs: Movimiento[], dias: number, n = 5) {
  const desde = Date.now() - dias * DIA;
  const cuenta: Record<string, number> = {};
  ventas(movs).forEach((m) => {
    if (new Date(m.fecha).getTime() >= desde) cuenta[m.productoId] = (cuenta[m.productoId] ?? 0) - m.cantidad;
  });
  return productos
    .map((p) => ({ producto: p, unidades: cuenta[p.id] ?? 0 }))
    .filter((r) => r.unidades > 0)
    .sort((a, b) => b.unidades - a.unidades)
    .slice(0, n);
}

/** Productos sin ninguna venta en los últimos días (por defecto 30). */
export function noRotan(productos: Producto[], movs: Movimiento[], dias = 30) {
  const desde = Date.now() - dias * DIA;
  const vendidos = new Set(ventas(movs).filter((m) => new Date(m.fecha).getTime() >= desde).map((m) => m.productoId));
  return productos.filter((p) => !vendidos.has(p.id) && stockTotal(p) > 0);
}

export function alertasStock(productos: Producto[]) {
  return productos.flatMap((p) => p.variantes.filter((v) => v.stock <= v.minimo).map((v) => ({ producto: p, variante: v })));
}

export function porVencer(productos: Producto[], dias = 7) {
  const limite = new Date(Date.now() + dias * DIA).toISOString().slice(0, 10);
  return productos.flatMap((p) =>
    p.variantes.flatMap((v) => (v.lotes ?? []).filter((l) => l.cantidad > 0 && l.vence <= limite).map((l) => ({ producto: p, variante: v, lote: l }))),
  );
}

export function diasHasta(fecha: string) {
  return Math.round((new Date(`${fecha}T12:00:00`).getTime() - Date.now()) / DIA);
}

/** Promedio de unidades vendidas por día en las últimas 4 semanas. */
export function ventaDiaria(movs: Movimiento[], varianteId: string) {
  const desde = Date.now() - 28 * DIA;
  return ventas(movs).filter((m) => m.varianteId === varianteId && new Date(m.fecha).getTime() >= desde).reduce((s, m) => s - m.cantidad, 0) / 28;
}

/** Pedido sugerido = ventas promedio × días de cobertura − stock (al menos lo que falta para el mínimo). */
export function reposicion(estado: EstadoTienda) {
  return estado.productos
    .flatMap((p) =>
      p.variantes.map((v) => {
        const diaria = ventaDiaria(estado.movimientos, v.id);
        const sugerido = Math.max(Math.ceil(diaria * estado.coberturaDias - v.stock), v.stock <= v.minimo ? v.minimo * 2 - v.stock : 0);
        return { producto: p, variante: v, diaria, sugerido };
      }),
    )
    .filter((r) => r.sugerido > 0)
    .sort((a, b) => a.variante.stock / Math.max(1, a.variante.minimo) - b.variante.stock / Math.max(1, b.variante.minimo));
}

/** Descuenta stock (primero los lotes que vencen antes) y registra el movimiento con su origen. */
export function descontar(
  e: EstadoTienda,
  items: { productoId: string; varianteId: string; cantidad: number; precio: number }[],
  origen: Origen,
  medio?: MedioPago,
): EstadoTienda | string {
  const ventaId = `v${Date.now().toString(36)}`;
  const productos = e.productos.map((p) => ({ ...p, variantes: p.variantes.map((v) => ({ ...v, lotes: v.lotes?.map((l) => ({ ...l })) })) }));
  const movimientos: Movimiento[] = [];
  for (const it of items) {
    const p = productos.find((x) => x.id === it.productoId);
    const v = p?.variantes.find((x) => x.id === it.varianteId);
    if (!p || !v) return 'Uno de los productos ya no está en el catálogo.';
    if (v.stock < it.cantidad) return `No alcanza el stock de ${p.nombre} (${detalleVariante(v)}): quedan ${v.stock}.`;
    v.stock -= it.cantidad;
    let resta = it.cantidad;
    for (const l of [...(v.lotes ?? [])].sort((a, b) => a.vence.localeCompare(b.vence))) {
      const usa = Math.min(l.cantidad, resta);
      l.cantidad -= usa;
      resta -= usa;
      if (!resta) break;
    }
    movimientos.push({ id: `${ventaId}-${movimientos.length}`, ventaId, fecha: new Date().toISOString(), productoId: p.id, varianteId: v.id, cantidad: -it.cantidad, origen, precio: it.precio, medio });
  }
  return { ...e, productos, movimientos: [...e.movimientos, ...movimientos] };
}

export function sumarEntrada(e: EstadoTienda, productoId: string, varianteId: string, cantidad: number, vence?: string): EstadoTienda {
  return {
    ...e,
    productos: e.productos.map((p) =>
      p.id !== productoId
        ? p
        : {
            ...p,
            variantes: p.variantes.map((v) =>
              v.id !== varianteId
                ? v
                : { ...v, stock: v.stock + cantidad, lotes: vence || v.lotes ? [...(v.lotes ?? []), ...(vence ? [{ id: `${v.id}-L${Date.now().toString(36)}`, vence, cantidad }] : [])] : undefined },
            ),
          },
    ),
    movimientos: [...e.movimientos, { id: `en${Date.now().toString(36)}`, fecha: new Date().toISOString(), productoId, varianteId, cantidad, origen: 'entrada' }],
  };
}

export function mensajePedido(config: DemoConfig, items: LineaPedido[], entrega: PedidoTienda['entrega'], envio: number, direccion?: string, nombre?: string) {
  const p = (v: number) => formatoPrecio(v, config.moneda);
  const sub = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
  return [
    `Hola ${config.negocio}, quiero hacer este pedido:`,
    '',
    ...items.map((i) => `• ${i.cantidad} × ${i.nombre} (${i.detalle}) · ${p(i.precio * i.cantidad)}`),
    '',
    entrega === 'envio' ? `Envío a: ${direccion} · ${p(envio)}` : 'Retiro en el local',
    `Total: ${p(sub + (entrega === 'envio' ? envio : 0))}`,
    nombre ? `Nombre: ${nombre}` : '',
  ]
    .filter((l, i, a) => !(l === '' && a[i - 1] === ''))
    .join('\n')
    .trim();
}

export function mensajeProveedor(config: DemoConfig, proveedor: string, filas: { producto: Producto; variante: Variante; sugerido: number }[]) {
  return [
    `Hola ${proveedor}, soy de ${config.negocio}. Te paso el pedido:`,
    '',
    ...filas.map((f) => `• ${f.sugerido} × ${f.producto.nombre} (${detalleVariante(f.variante)})`),
    '',
    '¿Me confirmás disponibilidad y fecha de entrega? Gracias.',
  ].join('\n');
}
