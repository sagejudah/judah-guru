# judah.guru

Next.js rebuild of the site. Same bones as the old static `index.html`
(same colors, same fonts, same footer), plus:

- an ambient canvas animation — fragments continuously gather into an
  abstract shape and drift apart again, no visible start/stop
- a Songs blurb, then the Spotify playlist embed, then a grid of
  click-to-open cards (Movies / Something to read / Something to think about
  / Prayer)
- the same `/stuff` list (Randomizer, live) plus a small student area
  (Student Quiz, Revision Material — both marked "building") and mailto
  footer

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

- **Student Quiz / Revision Material** are placeholder rows in the
  `/stuff` list right now (no link, marked "building"). Once either is
  real, give it an `href` in `app/page.tsx` and drop the `is-building`
  class + `status-building` tag so it matches Randomizer's styling.
- **`/randomizer`** is carried over untouched — same PWA files, byte for
  byte, just moved into `public/randomizer/`.
- **Spotify playlist ID** lives at the top of `components/VibeCard.tsx` if
  you ever swap playlists.
- **Recommend card copy** (Songs/Movies/Read/Think/Prayer) is inline in
  `app/page.tsx`, marked `// EDIT ME`.

## Notes on the animation

`components/BrainCanvas.tsx` draws ~70 particles on a `<canvas>`. Their
"scattered" and "assembled" positions are precomputed, and a slow sine wave
(`(Math.sin(elapsed * 0.28) + 1) / 2`) continuously blends between the two —
that's what gives it the breathing loop with no obvious loop point. It
respects `prefers-reduced-motion` (renders the assembled shape at rest, no
motion) and re-lays-out on resize.
