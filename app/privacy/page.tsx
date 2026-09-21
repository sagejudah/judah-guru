import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy — judah.guru',
  description: 'What judah.guru collects, why, and how to get it deleted.',
};

export default function PrivacyPage() {
  return (
    <main>
      <div className="content legal">
        <p className="legal-back">
          <Link href="/">&larr; back to judah.guru</Link>
        </p>
        <h1>Privacy</h1>
        <p className="legal-updated">Last updated: {new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

        <h2>The short version</h2>
        <p>
          This site doesn&rsquo;t have accounts, doesn&rsquo;t track you, and doesn&rsquo;t
          sell or share data with anyone. The only personal information collected is the
          name you type into the quiz or battle tools, and it&rsquo;s deleted automatically
          within a few hours.
        </p>

        <h2>What&rsquo;s collected</h2>
        <p>
          The Student Quiz and Battle Mode tools ask for a display name so a group can
          play together and see a shared scoreboard. That name, along with your answers,
          score, and timing for that one session, is stored temporarily to make the
          live game work. Nothing verifies who you actually are &mdash; you can type
          anything.
        </p>
        <p>
          That data is stored in a database with an automatic expiry: unused rooms and
          finished games are deleted within about 6 hours. There&rsquo;s no long-term
          record of who played, what they scored, or when.
        </p>

        <h2>What&rsquo;s not collected</h2>
        <p>
          No accounts, no passwords from students, no email addresses, no analytics or
          tracking scripts, no advertising, and no cookies used for tracking. Admin
          passwords used by tutors are set by the site owner directly, not typed in by
          students, and are never stored alongside any student data.
        </p>

        <h2>Third parties</h2>
        <p>
          The homepage embeds a Spotify playlist, which may set its own cookies under
          Spotify&rsquo;s own privacy policy &mdash; that&rsquo;s outside this site&rsquo;s
          control. Nothing else on this site loads third-party trackers.
        </p>

        <h2>Children&rsquo;s use</h2>
        <p>
          These tools are built for BGCSE/JCE students, some of whom are minors. Because
          no account or verified identity is required, and the only stored information
          is a self-chosen display name that auto-deletes within hours, this is designed
          to collect as little as possible from anyone using it, including students.
        </p>

        <h2>Questions or deletion requests</h2>
        <p>
          Given the short auto-expiry, there&rsquo;s rarely anything left to delete on
          request &mdash; but if you want something removed sooner, or have any question
          about this, reach out to{' '}
          <a href="mailto:hey@judah.guru" className="mail-link">hey@judah.guru</a>.
        </p>
      </div>
    </main>
  );
}
