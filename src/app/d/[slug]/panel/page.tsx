import { PanelDuenio } from '@/components/demo/PanelDuenio';

export default async function Pagina({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PanelDuenio slug={slug} />;
}
