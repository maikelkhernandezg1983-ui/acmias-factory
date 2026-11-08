import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { faltaConfigurar, vendedorActual } from '@/lib/sesion';
import { FormIngreso } from './FormIngreso';

export const metadata: Metadata = { title: 'Ingresar · ACMIAS Factory', robots: { index: false, follow: false } };

export default async function Ingresar() {
  if (await vendedorActual()) redirect('/');
  return <FormIngreso falta={faltaConfigurar()} />;
}
