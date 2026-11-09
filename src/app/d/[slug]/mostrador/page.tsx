import { Mostrador } from '@/components/tienda/Mostrador';

export default async function Pagina({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <Mostrador slug={slug} />;
}
