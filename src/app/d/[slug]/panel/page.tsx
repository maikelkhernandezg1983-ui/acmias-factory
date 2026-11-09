import { PorRubro } from '@/components/demo/PorRubro';

export default async function Pagina({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PorRubro slug={slug} vista="panel" />;
}
