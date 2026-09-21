import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms — judah.guru',
  description: 'The terms for using judah.guru and its tools.',
};

export default function TermsPage() {
  return (
    <main>
      <div className="content legal">
        <p className="legal-back">
          <Link href="/">&larr; back to judah.guru</Link>
        </p>
        <h1>Terms</h1>
        <p className="legal-updated">Last updated: {new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

        <h2>What this is</h2>
        <p>
          judah.guru is a personal project, built and maintained by one person. The tools
          here &mdash; including the Student Quiz, Battle Mode, 30 Seconds, and the
          Randomizer &mdash; are provided free, for personal and study use, as-is.
        </p>

        <h2>No warranty</h2>
        <p>
          These tools are offered without any warranty, express or implied. Quiz content
          is practice material only &mdash; it is not affiliated with, endorsed by, or
          guaranteed accurate against any official BGCSE, JCE, or other examination
          board. Don&rsquo;t treat it as a substitute for verified syllabus material or
          official past papers.
        </p>

        <h2>Availability</h2>
        <p>
          This site, and any individual tool on it, may change, break, or be taken down
          at any time without notice &mdash; it&rsquo;s a side project, not a commercial
          service with any uptime guarantee.
        </p>

        <h2>Your use</h2>
        <p>
          You&rsquo;re responsible for how you use these tools, including for your own
          academic integrity. Don&rsquo;t use Battle Mode&rsquo;s admin access, or any
          part of this site, to interfere with someone else&rsquo;s session or to access
          data that isn&rsquo;t yours.
        </p>

        <h2>Liability</h2>
        <p>
          To the extent allowed by law, the site owner isn&rsquo;t liable for any loss or
          damage arising from your use of this site or its tools.
        </p>

        <h2>Changes</h2>
        <p>These terms may be updated as the site changes. Continued use means you accept the current version.</p>

        <h2>Contact</h2>
        <p>
          Questions go to{' '}
          <a href="mailto:hey@judah.guru" className="mail-link">hey@judah.guru</a>.
        </p>
      </div>
    </main>
  );
}
