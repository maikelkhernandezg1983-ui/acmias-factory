import { GestionTurno } from '@/components/barberia/GestionTurno';

export default async function Pagina({ params }: { params: Promise<{ slug: string; token: string }> }) {
  const { slug, token } = await params;
  return <GestionTurno slug={slug} token={token} />;
}
