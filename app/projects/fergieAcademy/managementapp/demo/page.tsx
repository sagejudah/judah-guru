import type { Metadata } from 'next';
import Demo from './Demo';

export const metadata: Metadata = {
  title: 'Admin demo | Fergie Academy',
  description: 'Interactive demo of a tuition management app, using sample data.',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <Demo />;
}
