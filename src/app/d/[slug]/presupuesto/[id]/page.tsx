import { PresupuestoFer } from '@/components/ferreteria/PresupuestoFer';

export default async function Pagina({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  return <PresupuestoFer slug={slug} id={id} />;
}
