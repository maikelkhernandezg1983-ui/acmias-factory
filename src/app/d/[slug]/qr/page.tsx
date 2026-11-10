import { QrDemo } from '@/components/demo/QrDemo';

export default async function Pagina({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <QrDemo slug={slug} />;
}
