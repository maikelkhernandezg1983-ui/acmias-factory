import { Sitio } from '@/components/demo/Sitio';

export default async function Pagina({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <Sitio slug={slug} />;
}
