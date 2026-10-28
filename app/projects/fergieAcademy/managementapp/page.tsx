import type { Metadata } from 'next';
import Proposal from './Proposal';

export const metadata: Metadata = {
  title: 'Management app proposal | Fergie Academy',
  description: 'Draft proposal for a tuition management app for Fergie Academy.',
  // Private client page: keep it out of search results.
  robots: { index: false, follow: false },
};

export default function Page() {
  return <Proposal />;
}
