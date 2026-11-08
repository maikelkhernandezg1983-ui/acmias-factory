import { QrMesas } from '@/components/demo/Impresiones';

export default async function Pagina({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <QrMesas slug={slug} />;
}
