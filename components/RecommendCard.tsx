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
        <svg
          className={`rec-chevron${open ? ' is-open' : ''}`}
          aria-hidden="true"
          width="11"
          height="11"
          viewBox="0 0 12 12"
          fill="none"
        >
          <path
            d="M2.5 4.5L6 8L9.5 4.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
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
