import BrainCanvas from '@/components/BrainCanvas';
import VibeCard from '@/components/VibeCard';
import RecommendCard from '@/components/RecommendCard';
import PraySection from '@/components/PraySection';
import Year from '@/components/Year';

export default function Home() {
  return (
    <main>
      <div className="content">
        <BrainCanvas />

        <p className="under-construction">still under construction, hey 🙃</p>
        <p className="help-yourself">but help yourself with what you can find.</p>
        <p className="confession">I don&rsquo;t even know if I&rsquo;ll ever finish this.</p>
        <p className="transition">In the meantime&hellip;</p>

        <hr className="rule-1" />

        <p className="section-label vibe">/vibe</p>
        <div className="bento">
          <VibeCard />
          <div className="recommend-grid">
            {/* EDIT ME: swap any of these four blurbs whenever you find something worth passing on. */}
            <RecommendCard
              emoji="🎵"
              label="Songs"
              content="Whatever's on the playlist above, honestly. I'll drop more here when I find something worth passing on."
            />
            <RecommendCard
              emoji="🎬"
              label="Movies"
              content="Still building this list. Ask me in person — I have opinions."
            />
            <RecommendCard
              emoji="📖"
              label="Something to read"
              content="Nothing pinned yet. Come back later, or email me and I'll actually reply with something."
            />
            <RecommendCard
              emoji="💭"
              label="Something to think about"
              content="Here's one: you don't have to have it figured out to keep going."
            />
          </div>
        </div>

        <PraySection />

        <hr className="rule-2" />

        <p className="section-label stuff">/stuff</p>
        <ul className="stuff">
          <li>
            <a href="/stuff/quiz">
              <span className="stuff-name">
                <span className="arrow">→</span> Student Quiz
              </span>
              <span className="stuff-path">/stuff/quiz</span>
            </a>
          </li>
          <li>
            <a href="/randomizer">
              <span className="stuff-name">
                <span className="arrow">→</span> Randomizer
              </span>
              <span className="stuff-path">/randomizer</span>
            </a>
          </li>
        </ul>

        <p className="closing">
          Anyway.
          <br />
          Help yourself.
        </p>
      </div>

      <footer>
        <p className="sustains">He sustains us, hey.</p>
        <div className="footer-row">
          <a href="mailto:hey@judah.guru" className="mail-link">
            hey@judah.guru
          </a>
          <Year />
        </div>
      </footer>
    </main>
  );
}
