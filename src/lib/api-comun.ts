/** Utilidades compartidas por las rutas de IA. */
export function mismoOrigen(req: Request) {
  const origen = req.headers.get('origin');
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  if (!origen || !host) return false;
  try {
    return new URL(origen).host === host;
  } catch {
    return false;
  }
}

/** Límite simple por IP y por instancia de servidor. */
export function crearLimite(porHora: number) {
  const usos = new Map<string, number[]>();
  return (req: Request) => {
    const ip = (req.headers.get('x-forwarded-for') ?? 'local').split(',')[0].trim();
    const ahora = Date.now();
    const recientes = (usos.get(ip) ?? []).filter((t) => ahora - t < 3600_000);
    if (recientes.length >= porHora) return false;
    recientes.push(ahora);
    usos.set(ip, recientes);
    if (usos.size > 5000) usos.clear();
    return true;
  };
}

export function error(mensaje: string, status: number) {
  return Response.json({ error: mensaje }, { status });
}
