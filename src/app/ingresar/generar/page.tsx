import type { Metadata } from 'next';
import { Generador } from './Generador';

export const metadata: Metadata = { title: 'Crear usuario · ACMIAS Factory', robots: { index: false, follow: false } };

export default function Generar() {
  return <Generador />;
}
