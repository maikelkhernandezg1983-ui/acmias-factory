import { redirect } from 'next/navigation';
import { PanelVendedor } from '@/components/vendedor/PanelVendedor';
import { vendedorActual } from '@/lib/sesion';

export default async function Inicio() {
  // Doble control además de src/proxy.ts: sin sesión no se muestra el portal.
  const usuario = await vendedorActual();
  if (!usuario) redirect('/ingresar');
  return <PanelVendedor usuario={usuario} />;
}
