# judah.guru

Next.js rebuild of the site. Same bones as the old static `index.html`
(same colors, same fonts, same footer), plus:

- an ambient canvas animation — fragments continuously gather into an
  abstract shape and drift apart again, no visible start/stop
- `/vibe`: a Spotify playlist embed + four click-to-open recommend cards
  (Songs / Movies / Something to read / Something to think about)
- a "Need a prayer?" card that opens into five short options
- the same `/stuff` list (Student Quiz, Randomizer) and mailto footer

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deploy (Vercel via GitHub — your usual flow)

1. `git init && git add -A && git commit -m "rebuild site in next.js"`
2. Push to your `judah.guru` GitHub repo (new repo, or force-push over the old
   static one — your call).
3. In Vercel: import the repo, framework preset auto-detects **Next.js**,
   no env vars needed. Deploy.
4. Point the `judah.guru` domain at the new Vercel project the same way you
   did last time.

## Things to know before you push

- **`/stuff/quiz` isn't in this repo.** The zip you sent only had `/randomizer`
  in it — the quiz app lives somewhere else (a different deploy, or a route
  you had set up separately). The homepage link still points at
  `/stuff/quiz`, but you'll need to either drop that app into
  `public/stuff/quiz/` here, or keep it deployed elsewhere and add a rewrite
  in `next.config.js` pointing at it.
- **`/randomizer`** is carried over untouched — same PWA files, byte for
  byte, just moved into `public/randomizer/`.
- **Spotify playlist ID** lives at the top of `components/VibeCard.tsx` if
  you ever swap playlists.
- **Recommend card copy** (Songs/Movies/Read/Think) is inline in
  `app/page.tsx`, marked `// EDIT ME`.
- **Prayer option text** lives in `components/PraySection.tsx`, also marked
  `// EDIT ME`.

## Notes on the animation

`components/BrainCanvas.tsx` draws ~70 particles on a `<canvas>`. Their
"scattered" and "assembled" positions are precomputed, and a slow sine wave
(`(Math.sin(elapsed * 0.28) + 1) / 2`) continuously blends between the two —
that's what gives it the breathing loop with no obvious loop point. It
respects `prefers-reduced-motion` (renders the assembled shape at rest, no
motion) and re-lays-out on resize.
