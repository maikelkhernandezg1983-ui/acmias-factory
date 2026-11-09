import { CotizacionImprimible } from '@/components/repuestos/CotizacionImprimible';

export default async function Pagina({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CotizacionImprimible slug={slug} />;
}
