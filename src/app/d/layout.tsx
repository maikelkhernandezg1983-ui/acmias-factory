import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Carta digital · Demo ilustrativa',
  robots: { index: false, follow: false, nocache: true },
};

export default function LayoutDemos({ children }: { children: React.ReactNode }) {
  return children;
}
