'use client';

import { useState } from 'react';

// EDIT ME: these are short and plain on purpose — change the wording any time.
const OPTIONS: { key: string; label: string; text: string }[] = [
  {
    key: 'me',
    label: 'Me',
    text: 'For steadiness today — a clear mind, a settled heart, and enough strength for what\u2019s in front of you.',
  },
  {
    key: 'love',
    label: 'Someone I love',
    text: 'For the people you carry in the back of your mind — that they\u2019d feel a little less alone today, and a little more held.',
  },
  {
    key: 'carrying',
    label: 'Something I\u2019m carrying',
    text: 'For whatever\u2019s heavy right now — that it would get lighter, and that you wouldn\u2019t have to carry it by yourself.',
  },
  {
    key: 'grateful',
    label: 'Something I\u2019m grateful for',
    text: 'Thank you — for this, and for the small good things that are easy to miss.',
  },
  {
    key: 'unsure',
    label: 'I don\u2019t know. Just pray.',
    text: 'That\u2019s enough. He already knows what you didn\u2019t say.',
  },
];

export default function PraySection() {
  const [expanded, setExpanded] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  return (
    <div className="pray-card">
      <button
        type="button"
        className="pray-trigger"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="pray-icon" aria-hidden="true">
          🙏
        </span>
        <span>
          <span className="pray-title">Need a prayer?</span>
          <span className="pray-sub">We can pray together.</span>
        </span>
      </button>

      {expanded && (
        <div className="pray-body">
          <p className="pray-prompt">What should we pray about?</p>
          <div className="pray-options">
            {OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                className={`pray-option${active === opt.key ? ' is-active' : ''}`}
                onClick={() => setActive(opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {active && (
            <p className="pray-answer">
              {OPTIONS.find((o) => o.key === active)?.text}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
