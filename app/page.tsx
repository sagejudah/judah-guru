import HeroCanvas from '@/components/HeroCanvas';
import VibeCard from '@/components/VibeCard';
import RecommendCard from '@/components/RecommendCard';
import Year from '@/components/Year';

export default function Home() {
  return (
    <main>
      <div className="content">
        <HeroCanvas />

        <p className="under-construction">still under construction, hey 🙃</p>
        <p className="help-yourself">but help yourself with what you can find.</p>
        <p className="confession">I don&rsquo;t even know if I&rsquo;ll ever finish this.</p>
        <p className="transition">
          In the meantime, while I&rsquo;m still coding, you can keep busy with these.
        </p>

        <hr className="rule-1" />

        <div className="bento">
          {/* EDIT ME: swap any of these blurbs whenever you find something worth passing on. */}
          <RecommendCard
            emoji="🎵"
            label="Songs"
            content={[
              "Whatever's on the playlist below, honestly. I'll drop more here when I find something worth passing on.",
            ]}
          />
          <VibeCard />
          <div className="recommend-grid">
            <RecommendCard
              emoji="🎬"
              label="Movies?"
              content={[
                "I pretty much don't watch anything. My mind is quite visual already, so I usually prefer sitting with my own thoughts.",
                "But don't leave me behind when you hit the cinema. I don't wanna miss the popcorn. 🍿",
              ]}
            />
            <RecommendCard
              emoji="📖"
              label="Something to read?"
              content={[
                "Poetry has always found its way to me, usually when I'm madly in love or completely heartbroken. 😜",
                'And I have a soft spot for philosophy. Existence, meaning, love, suffering, faith, the absurd... all that fun stuff.',
                'So naturally, I find myself around Dostoevsky, Kafka, Rilke, Camus, Nietzsche, Pessoa...',
                'And yeah, the Psalms. Probably the book I frequent the most. Nothing makes me feel the love of God quite like that book.',
              ]}
            />
            <RecommendCard
              emoji="💭"
              label="Something to think about"
              content={["Here's one: you don't have to have it figured out to keep going."]}
            />
            <RecommendCard
              emoji="🙏"
              label="Prayer?"
              content={[
                'oh, and yeah\u2026 we can pray too.',
                'He hears us when we pray. Even more when we pray together. So reach out when you need a prayer companion 😜',
              ]}
            />
          </div>
        </div>

        <hr className="rule-2" />

        <div className="student-world">
          <p className="section-label stuff">/stuff</p>
          <p className="stuff-intro">
            a small world for my students, with quizzes, tools and revision material. some of
            it&rsquo;s already live, some of it&rsquo;s still coming together.
          </p>
          <ul className="stuff">
            {/* EDIT ME: flip is-building off once a link is real, and give it an href. */}
            <li>
              <a href="/randomizer">
                <span className="stuff-name">
                  <span className="arrow">→</span> Randomizer
                  <span className="status status-live">live</span>
                </span>
                <span className="stuff-path">/randomizer</span>
              </a>
            </li>
            <li>
              <a href="/30seconds">
                <span className="stuff-name">
                  <span className="arrow">→</span> 30 Seconds
                  <span className="status status-live">live</span>
                </span>
                <span className="stuff-path">/30seconds</span>
              </a>
            </li>
            <li className="stuff-row is-building">
              <span className="stuff-name">
                <span className="arrow">→</span> Student Quiz
                <span className="status status-building">building</span>
              </span>
            </li>
            <li className="stuff-row is-building">
              <span className="stuff-name">
                <span className="arrow">→</span> Revision Material
                <span className="status status-building">building</span>
              </span>
            </li>
          </ul>
        </div>

        <p className="closing">
          Anyway.
          <br />
          Help yourself.
        </p>
      </div>

      <footer>
        <p className="reach-out">Do reach out.</p>
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
