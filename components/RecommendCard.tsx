'use client';

import { useState } from 'react';

export default function RecommendCard({
  emoji,
  label,
  content,
}: {
  emoji: string;
  label: string;
  content: string[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <button
      type="button"
      className="rec-card"
      aria-expanded={open}
      onClick={() => setOpen((v) => !v)}
    >
      <span className="rec-top">
        <span className="rec-emoji" aria-hidden="true">
          {emoji}
        </span>
        <span className="rec-label">{label}</span>
        <span className="rec-chevron" aria-hidden="true">
          {open ? '–' : '+'}
        </span>
      </span>
      {open && (
        <span className="rec-content">
          {content.map((para, i) => (
            <span className="rec-para" key={i}>
              {para}
            </span>
          ))}
        </span>
      )}
    </button>
  );
}
