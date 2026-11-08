import { Carta } from '@/components/demo/Carta';

export default async function PaginaCarta({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <Carta slug={slug} />;
}
